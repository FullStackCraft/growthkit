create table if not exists public.growthkit_referral_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event_id text not null unique,
  occurred_at timestamptz not null,
  product_name text not null,
  source text not null,
  source_type text not null,
  page_url text not null,
  page_path text not null,
  referrer_url text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists growthkit_referral_events_created_at_idx
  on public.growthkit_referral_events (created_at desc);

create index if not exists growthkit_referral_events_product_created_idx
  on public.growthkit_referral_events (product_name, created_at desc);

alter table public.growthkit_referral_events enable row level security;

drop policy if exists growthkit_referral_events_insert on public.growthkit_referral_events;
create policy growthkit_referral_events_insert
  on public.growthkit_referral_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists growthkit_referral_events_no_select on public.growthkit_referral_events;
create policy growthkit_referral_events_no_select
  on public.growthkit_referral_events
  for select
  to anon, authenticated
  using (false);
