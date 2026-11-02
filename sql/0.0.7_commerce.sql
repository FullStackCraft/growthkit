-- GrowthKit commerce extension. Optional; requires sql/0.0.6_events.sql.
-- Run explicitly as database owner. Compatible with the 0.0.6 runtime; no automatic migrations.
begin;
-- One Stripe mapping supports both guests and verified accounts; preserve existing mappings.
alter table public.growthkit_stripe_customers alter column user_id drop not null;
alter table public.growthkit_stripe_customers add column if not exists visitor_id uuid;
alter table public.growthkit_stripe_customers add column if not exists session_id uuid;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.growthkit_stripe_customers'::regclass and conname='growthkit_customer_identity') then
    alter table public.growthkit_stripe_customers add constraint growthkit_customer_identity check(user_id is not null or visitor_id is not null);
  end if;
end $$;
create index if not exists growthkit_customers_visitor_idx on public.growthkit_stripe_customers(product_name,visitor_id);

create table if not exists public.growthkit_checkout_attempts (
  product_name text not null,
  event_id uuid not null,
  visitor_id uuid not null,
  session_id uuid not null,
  user_id text,
  plan text not null check(length(plan) between 1 and 128),
  checkout_session_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  primary key(product_name,event_id),
  unique(product_name,checkout_session_id)
);
create index if not exists growthkit_checkouts_visitor_idx on public.growthkit_checkout_attempts(product_name,visitor_id);
create table if not exists public.growthkit_webhook_receipts (
  product_name text not null,
  provider text not null check(length(provider) between 1 and 128),
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key(product_name,provider,event_id)
);
-- Signed financial observations awaiting association; no fabricated browser/account IDs.
create table if not exists public.growthkit_pending_payments (
  product_name text not null,
  provider text not null,
  source_event_id text not null,
  webhook_event_id text not null,
  stripe_customer_id text,
  event jsonb not null check(jsonb_typeof(event)='object'),
  received_at timestamptz not null default now(),
  primary key(product_name,provider,source_event_id),
  check(event->>'product_name' is not distinct from product_name),
  check(event->>'source_event_id' is not distinct from source_event_id)
);
create index if not exists growthkit_pending_webhook_idx on public.growthkit_pending_payments(product_name,provider,webhook_event_id);
alter table public.growthkit_checkout_attempts enable row level security;
alter table public.growthkit_webhook_receipts enable row level security;
alter table public.growthkit_pending_payments enable row level security;
revoke all on public.growthkit_checkout_attempts,public.growthkit_webhook_receipts,public.growthkit_pending_payments from public;

-- Serialize commerce links per product so checkout mapping and late signup cannot race.
-- Product names are selected by trusted backend configuration, never the browser.
create or replace function public.growthkit_identify(p_product_name text,p_visitor_id uuid,p_user_id text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('growthkit-commerce:'||p_product_name,0));
  perform public.growthkit_link_identity(p_product_name,p_visitor_id,p_user_id);
  if exists(select 1 from public.growthkit_stripe_customers
    where product_name=p_product_name and visitor_id=p_visitor_id and user_id is not null and user_id<>p_user_id) then
    raise exception 'Customer identity conflict' using errcode='23505';
  end if;
  update public.growthkit_checkout_attempts set user_id=p_user_id
    where product_name=p_product_name and visitor_id=p_visitor_id and user_id is null;
  update public.growthkit_stripe_customers set user_id=p_user_id
    where product_name=p_product_name and visitor_id=p_visitor_id and user_id is null;
end $$;

create or replace function public.growthkit_checkout(p_product_name text,p_event jsonb,p_plan text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_event->>'product_name' is distinct from p_product_name then raise exception 'Product mismatch'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('growthkit-commerce:'||p_product_name,0));
  if p_event->>'user_id' is not null then
    perform public.growthkit_identify(p_product_name,(p_event->>'visitor_id')::uuid,p_event->>'user_id');
  end if;
  insert into public.growthkit_checkout_attempts(product_name,event_id,visitor_id,session_id,user_id,plan)
    values(p_product_name,(p_event->>'event_id')::uuid,(p_event->>'visitor_id')::uuid,(p_event->>'session_id')::uuid,p_event->>'user_id',p_plan)
    on conflict do nothing;
  if not exists(select 1 from public.growthkit_checkout_attempts where product_name=p_product_name and event_id=(p_event->>'event_id')::uuid
    and visitor_id=(p_event->>'visitor_id')::uuid and session_id=(p_event->>'session_id')::uuid and plan=p_plan
    and user_id is not distinct from p_event->>'user_id') then
    raise exception 'Checkout conflict' using errcode='23505';
  end if;
  perform public.growthkit_ingest_event(p_event);
end $$;

-- Receipt, associations, payment events and pending cleanup commit atomically.
create or replace function public.growthkit_process_webhook(
  p_product_name text,p_provider text,p_event_id text,p_events jsonb,p_attempt_id uuid default null,
  p_session_id text default null,p_customer_id text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare attempt public.growthkit_checkout_attempts; e jsonb; linked_user text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('growthkit-commerce:'||p_product_name,0));
  for e in select value from jsonb_array_elements(p_events) loop
    if e->>'product_name' is distinct from p_product_name then raise exception 'Product mismatch'; end if;
  end loop;
  insert into public.growthkit_webhook_receipts(product_name,provider,event_id) values(p_product_name,p_provider,p_event_id) on conflict do nothing;
  if not found then return; end if;
  if p_attempt_id is not null then
    select * into strict attempt from public.growthkit_checkout_attempts where product_name=p_product_name and event_id=p_attempt_id for update;
    select user_id into linked_user from public.growthkit_identity_links where product_name=p_product_name and visitor_id=attempt.visitor_id;
    attempt.user_id:=coalesce(attempt.user_id,linked_user);
    update public.growthkit_checkout_attempts set user_id=attempt.user_id,
      checkout_session_id=coalesce(checkout_session_id,p_session_id),stripe_customer_id=coalesce(stripe_customer_id,p_customer_id)
      where product_name=p_product_name and event_id=p_attempt_id;
    if p_customer_id is not null then
      insert into public.growthkit_stripe_customers(product_name,stripe_customer_id,visitor_id,session_id,user_id)
        values(p_product_name,p_customer_id,attempt.visitor_id,attempt.session_id,attempt.user_id) on conflict do nothing;
      if exists(select 1 from public.growthkit_stripe_customers where product_name=p_product_name and stripe_customer_id=p_customer_id
        and user_id is not null and attempt.user_id is not null and user_id<>attempt.user_id) then
        raise exception 'Customer identity conflict' using errcode='23505';
      end if;
      update public.growthkit_stripe_customers set user_id=coalesce(user_id,attempt.user_id),
        visitor_id=coalesce(visitor_id,attempt.visitor_id),session_id=coalesce(session_id,attempt.session_id)
        where product_name=p_product_name and stripe_customer_id=p_customer_id;
    end if;
  end if;
  delete from public.growthkit_pending_payments where product_name=p_product_name and provider=p_provider
    and (webhook_event_id=p_event_id or source_event_id in (select value->>'source_event_id' from jsonb_array_elements(p_events)));
  for e in select value from jsonb_array_elements(p_events) loop
    perform public.growthkit_ingest_event(e);
  end loop;
end $$;
revoke all on function public.growthkit_identify(text,uuid,text),public.growthkit_checkout(text,jsonb,text),
  public.growthkit_process_webhook(text,text,text,jsonb,uuid,text,text) from public;
do $$
declare role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on public.growthkit_checkout_attempts,public.growthkit_webhook_receipts,public.growthkit_pending_payments from %I',role_name);
      execute format('revoke all on function public.growthkit_identify(text,uuid,text),public.growthkit_checkout(text,jsonb,text),public.growthkit_process_webhook(text,text,text,jsonb,uuid,text,text) from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant select,insert,update,delete on public.growthkit_checkout_attempts,public.growthkit_webhook_receipts,public.growthkit_pending_payments to service_role;
    grant execute on function public.growthkit_identify(text,uuid,text),public.growthkit_checkout(text,jsonb,text),public.growthkit_process_webhook(text,text,text,jsonb,uuid,text,text) to service_role;
  end if;
end $$;
commit;
