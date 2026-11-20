begin;

alter table public.growthkit_coupons
  drop constraint if exists growthkit_coupons_coupon_code_check,
  add constraint growthkit_coupons_coupon_code_check check (
    coupon_code ~ '^[A-Za-z0-9]+$'
    or coupon_code ~* '^https://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$'
  );

commit;
