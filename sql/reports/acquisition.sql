-- Configure product/window with SET growthkit.product/start/end (see examples/README.md).
-- Acquisition cohort: first observed touch in [start,end). Missing browser history is excluded.
-- Every visitor appears under exactly one first-touch source. IDs describe browsers, not people.
with scoped as (
  select e.*, coalesce(e.user_id, l.user_id) as account_id
  from public.growthkit_events e
  left join public.growthkit_identity_links l using(product_name,visitor_id)
  where e.product_name=current_setting('growthkit.product')
    and e.occurred_at < current_setting('growthkit.end_at')::timestamptz
), visitors as (
  select distinct on(visitor_id) visitor_id, account_id,
    attribution->'first_touch'->>'source' as source,
    (attribution->'first_touch'->>'occurred_at')::timestamptz as acquired_at
  from scoped where visitor_id is not null and attribution ? 'first_touch'
  order by visitor_id, occurred_at, event_id
), cohort as (
  select * from visitors where acquired_at >= current_setting('growthkit.start_at')::timestamptz
), outcomes as (
  select c.*,
    exists(select 1 from scoped e where e.account_id=c.account_id and e.name='signup_completed'
      and e.origin='server' and e.occurred_at>=c.acquired_at) as signed_up,
    exists(select 1 from scoped e where e.account_id=c.account_id and e.name='analysis_completed'
      and e.occurred_at>=c.acquired_at) as activated,
    exists(select 1 from scoped e where e.account_id=c.account_id and e.name='payment_succeeded'
      and e.origin='server' and e.occurred_at>=c.acquired_at) as paid
  from cohort c
)
select source,count(*) as visitors,
  count(distinct account_id) filter(where signed_up) as signups,
  count(distinct account_id) filter(where activated) as activated_accounts,
  count(distinct account_id) filter(where paid) as paid_accounts,
  round(100.0 * count(distinct account_id) filter(where signed_up and paid)
    / nullif(count(distinct account_id) filter(where signed_up),0),2) as signup_to_paid_percent
from outcomes group by source order by visitors desc;
-- Accounts may have multiple browsers/sources: account counts are not additive across source rows.
