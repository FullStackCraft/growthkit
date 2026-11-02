-- Subscription observations from the server-only Stripe example. Currency values remain separate.
-- First positive observed MRR is a proxy for acquisition, not a full billing ledger.
-- Missing pre-instrumentation subscription history can misclassify existing subscribers as new.
with states as (
  select * from public.growthkit_events
  where product_name=current_setting('growthkit.product') and origin='server'
    and name in ('subscription_state','subscription_canceled')
    and occurred_at<current_setting('growthkit.end_at')::timestamptz
), first_positive as (
  select distinct on(properties->>'subscription_id') * from states
  where (properties->>'mrr_minor')::numeric>0
  order by properties->>'subscription_id',occurred_at,event_id
), latest as (
  select distinct on(properties->>'subscription_id') * from states
  order by properties->>'subscription_id',occurred_at desc,received_at desc,event_id
), cohort as (
  select f.*,coalesce(t.source,'unknown') as source,
    coalesce((l.properties->>'mrr_minor')::numeric,0) as retained_mrr_minor
  from first_positive f join latest l on l.properties->>'subscription_id'=f.properties->>'subscription_id'
  left join lateral (
    select t.source from public.growthkit_attribution_touches t
    join public.growthkit_identity_links i using(product_name,visitor_id)
    where t.product_name=f.product_name and i.user_id=f.user_id and t.occurred_at<=f.occurred_at
    order by t.occurred_at,t.session_id limit 1
  ) t on true
  where f.occurred_at>=current_setting('growthkit.start_at')::timestamptz
)
select source,properties->>'currency' as currency,
  count(*) as new_subscriptions,sum((properties->>'mrr_minor')::numeric) as new_observed_mrr_minor,
  count(distinct user_id) filter(where retained_mrr_minor>0) as retained_paying_accounts,
  sum(retained_mrr_minor) as retained_mrr_minor
from cohort group by source,properties->>'currency' order by new_observed_mrr_minor desc;
-- Lifetime/one-time payments never enter this report. Reconcile financial totals against Stripe.
