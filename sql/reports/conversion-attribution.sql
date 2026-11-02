-- One row per account's first recorded successful payment, including unknown attribution.
-- First/last touches are bounded by conversion time; no later browsing leaks into attribution.
with resolved as (
  select e.*,coalesce(e.user_id,l.user_id) as account_id
  from public.growthkit_events e left join public.growthkit_identity_links l using(product_name,visitor_id)
  where e.product_name=current_setting('growthkit.product')
), first_payments as (
  select distinct on(account_id) * from resolved
  where name='payment_succeeded' and origin='server' and account_id is not null
  order by account_id,occurred_at,event_id
)
select c.account_id,c.occurred_at as first_paid_at,
  coalesce(first_touch.source,'unknown') as first_touch_source,
  coalesce(last_touch.source,'unknown') as last_non_direct_source,
  first_touch.source is not null as attributable,
  c.properties->>'currency' as currency
from first_payments c
left join lateral (
  select t.source from public.growthkit_attribution_touches t
  join public.growthkit_identity_links l using(product_name,visitor_id)
  where t.product_name=c.product_name and l.user_id=c.account_id and t.occurred_at<=c.occurred_at
  order by t.occurred_at,t.session_id limit 1
) first_touch on true
left join lateral (
  select t.source from public.growthkit_attribution_touches t
  join public.growthkit_identity_links l using(product_name,visitor_id)
  where t.product_name=c.product_name and l.user_id=c.account_id and t.occurred_at<=c.occurred_at and t.source<>'direct'
  order by t.occurred_at desc,t.session_id limit 1
) last_touch on true
where c.occurred_at>=current_setting('growthkit.start_at')::timestamptz
  and c.occurred_at<current_setting('growthkit.end_at')::timestamptz
order by first_paid_at desc;
-- Attribution coverage = attributable rows / all rows in this result. Unknown is not direct.
