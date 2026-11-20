begin;

create table if not exists public.growthkit_coupons (
  id uuid primary key default gen_random_uuid(),
  product_name text not null check (
    product_name <> '' and product_name = lower(btrim(product_name))
  ),
  coupon_name text not null check (btrim(coupon_name) <> ''),
  description text not null check (btrim(description) <> ''),
  coupon_code text not null check (coupon_code ~ '^[A-Za-z0-9]+$'),
  discount_percent numeric(5, 2) not null check (
    discount_percent > 0 and discount_percent <= 100
  ),
  coupon_start timestamptz not null,
  coupon_end timestamptz not null,
  check (coupon_start < coupon_end)
);

create index if not exists growthkit_coupons_product_window_idx
  on public.growthkit_coupons (product_name, coupon_start, coupon_end);

alter table public.growthkit_coupons enable row level security;
revoke all on table public.growthkit_coupons from public, anon, authenticated, service_role;
grant select on table public.growthkit_coupons to service_role;

commit;
