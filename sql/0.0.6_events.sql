-- GrowthKit 0.0.6. Run as the database owner. Additive; safe to rerun.
-- Legacy referral tables are deliberately untouched.
begin;
create table if not exists public.growthkit_events (
  product_name text not null,
  event_id uuid not null,
  name text not null check (name ~ '^[A-Za-z][A-Za-z0-9_.:-]{0,127}$'),
  visitor_id uuid,
  session_id uuid,
  user_id text,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  page_url text,
  attribution jsonb not null default '{}'::jsonb check (jsonb_typeof(attribution) = 'object'),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  origin text not null default 'browser' check (origin in ('browser', 'server')),
  source_event_id text,
  primary key (product_name, event_id),
  unique (product_name, source_event_id),
  check (visitor_id is not null or user_id is not null)
);
create index if not exists growthkit_events_visitor_time_idx on public.growthkit_events(product_name, visitor_id, occurred_at);
create index if not exists growthkit_events_user_time_idx on public.growthkit_events(product_name, user_id, occurred_at);
create index if not exists growthkit_events_name_time_idx on public.growthkit_events(product_name, name, occurred_at);
create table if not exists public.growthkit_identity_links (
  product_name text not null,
  visitor_id uuid not null,
  user_id text not null check (length(user_id) > 0),
  linked_at timestamptz not null default now(),
  primary key (product_name, visitor_id)
);
create index if not exists growthkit_identity_links_user_idx on public.growthkit_identity_links(product_name, user_id);
create table if not exists public.growthkit_attribution_touches (
  product_name text not null,
  visitor_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  source text not null,
  source_type text not null,
  landing_page text not null,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  primary key (product_name, visitor_id, session_id)
);
create index if not exists growthkit_touches_time_idx on public.growthkit_attribution_touches(product_name, occurred_at);
create table if not exists public.growthkit_stripe_customers (
  product_name text not null,
  user_id text not null,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  primary key(product_name, stripe_customer_id)
);
create index if not exists growthkit_stripe_customers_user_idx on public.growthkit_stripe_customers(product_name, user_id);

alter table public.growthkit_events enable row level security;
alter table public.growthkit_identity_links enable row level security;
alter table public.growthkit_attribution_touches enable row level security;
alter table public.growthkit_stripe_customers enable row level security;
revoke all on public.growthkit_events, public.growthkit_identity_links,
  public.growthkit_attribution_touches, public.growthkit_stripe_customers from public;

-- Called only by trusted ingestion after authentication. Never takes user_id from browser JSON.
create or replace function public.growthkit_link_identity(p_product_name text, p_visitor_id uuid, p_user_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.growthkit_identity_links(product_name, visitor_id, user_id)
    values(p_product_name, p_visitor_id, p_user_id) on conflict do nothing;
  if not exists (select 1 from public.growthkit_identity_links
    where product_name = p_product_name and visitor_id = p_visitor_id and user_id = p_user_id) then
    raise exception 'GrowthKit identity conflict' using errcode = '23505';
  end if;
end;
$$;

-- Atomic event + touch persistence. p_event must already be validated by trusted ingestion.
create or replace function public.growthkit_ingest_event(p_event jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare t jsonb;
begin
  insert into public.growthkit_events(product_name,event_id,name,visitor_id,session_id,user_id,
    occurred_at,page_url,attribution,properties,origin,source_event_id)
  values(p_event->>'product_name',(p_event->>'event_id')::uuid,p_event->>'name',
    (p_event->>'visitor_id')::uuid,(p_event->>'session_id')::uuid,p_event->>'user_id',
    (p_event->>'occurred_at')::timestamptz,p_event->>'page_url',coalesce(p_event->'attribution','{}'::jsonb),
    coalesce(p_event->'properties','{}'::jsonb),p_event->>'origin',p_event->>'source_event_id')
  on conflict do nothing;
  if not found then return; end if;
  for t in select value from jsonb_each(coalesce(p_event->'attribution','{}'::jsonb)) loop
    if t is null or t = 'null'::jsonb or p_event->>'visitor_id' is null then continue; end if;
    insert into public.growthkit_attribution_touches(product_name,visitor_id,session_id,occurred_at,
      source,source_type,landing_page,referrer_url,utm_source,utm_medium,utm_campaign,utm_content,utm_term)
    values(p_event->>'product_name',(p_event->>'visitor_id')::uuid,(t->>'session_id')::uuid,
      (t->>'occurred_at')::timestamptz,t->>'source',t->>'source_type',t->>'landing_page',t->>'referrer_url',
      t->>'utm_source',t->>'utm_medium',t->>'utm_campaign',t->>'utm_content',t->>'utm_term')
    on conflict do nothing;
  end loop;
end;
$$;
revoke all on function public.growthkit_link_identity(text,uuid,text) from public;
revoke all on function public.growthkit_ingest_event(jsonb) from public;
-- Supabase roles are optional: this SQL also runs on ordinary PostgreSQL.
do $$
declare role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on public.growthkit_events, public.growthkit_identity_links, public.growthkit_attribution_touches, public.growthkit_stripe_customers from %I', role_name);
      execute format('revoke all on function public.growthkit_link_identity(text,uuid,text), public.growthkit_ingest_event(jsonb) from %I', role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on public.growthkit_events, public.growthkit_identity_links,
      public.growthkit_attribution_touches, public.growthkit_stripe_customers to service_role;
    grant execute on function public.growthkit_link_identity(text,uuid,text), public.growthkit_ingest_event(jsonb) to service_role;
  end if;
end;
$$;
commit;
