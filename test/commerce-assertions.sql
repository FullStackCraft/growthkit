-- Shared commerce isolation and retry checks. Roll back fixtures so reports remain independent.
begin;
select public.growthkit_checkout('commerce-a','{"product_name":"commerce-a","event_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","name":"checkout_started","visitor_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","session_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","origin":"browser","occurred_at":"2026-11-01T00:00:00Z"}','any-product-plan');
select public.growthkit_checkout('commerce-b','{"product_name":"commerce-b","event_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","name":"checkout_started","visitor_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","session_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","origin":"browser","occurred_at":"2026-11-01T00:00:00Z"}','other-plan');
select public.growthkit_process_webhook('commerce-a','stripe','evt_same','[]','03ee41dc-782e-4fce-9eea-253c9930f5e0','cs_same','cus_same');
select public.growthkit_process_webhook('commerce-a','stripe','evt_same','[]','03ee41dc-782e-4fce-9eea-253c9930f5e0','cs_same','cus_same');
select public.growthkit_process_webhook('commerce-b','stripe','evt_same','[]','03ee41dc-782e-4fce-9eea-253c9930f5e0','cs_same','cus_same');
select public.growthkit_identify('commerce-a','03ee41dc-782e-4fce-9eea-253c9930f5e0','account-a');
select public.growthkit_identify('commerce-a','03ee41dc-782e-4fce-9eea-253c9930f5e0','account-a');
select public.growthkit_identify('commerce-b','03ee41dc-782e-4fce-9eea-253c9930f5e0','account-b');
insert into public.growthkit_pending_payments(product_name,provider,source_event_id,webhook_event_id,event)
select product,'stripe','invoice:same:paid','evt_pending',jsonb_build_object('product_name',product,'source_event_id','invoice:same:paid')
from unnest(array['commerce-a','commerce-b']) product;
select public.growthkit_process_webhook('commerce-a','stripe','evt_pending','[]');
do $$ begin
 if (select count(*) from public.growthkit_checkout_attempts where product_name like 'commerce-%')<>2 then raise exception 'Checkout product collision'; end if;
 if (select count(*) from public.growthkit_webhook_receipts where event_id='evt_same')<>2 then raise exception 'Receipt product collision or failed dedupe'; end if;
 if not exists(select 1 from public.growthkit_stripe_customers where product_name='commerce-a' and stripe_customer_id='cus_same' and user_id='account-a') then raise exception 'Late account linking failed'; end if;
 if not exists(select 1 from public.growthkit_stripe_customers where product_name='commerce-b' and stripe_customer_id='cus_same' and user_id='account-b') then raise exception 'Customer mapping crossed products'; end if;
 if (select count(*) from public.growthkit_pending_payments where source_event_id='invoice:same:paid')<>1 then raise exception 'Pending cleanup crossed products'; end if;
 begin
  perform public.growthkit_process_webhook('commerce-a','stripe','evt_forbidden','[{"product_name":"commerce-b"}]');
  raise exception 'Expected product mismatch';
 exception when raise_exception then
  if sqlerrm<>'Product mismatch' then raise; end if;
 end;
 if exists(select 1 from public.growthkit_webhook_receipts where event_id='evt_forbidden') then raise exception 'Failed request consumed receipt'; end if;
 begin
  perform public.growthkit_identify('commerce-a','03ee41dc-782e-4fce-9eea-253c9930f5e0','wrong-account');
  raise exception 'Expected account conflict';
 exception when unique_violation then null;
 end;
 begin
  perform public.growthkit_process_webhook('commerce-a','stripe','evt_missing','[]','13ee41dc-782e-4fce-9eea-253c9930f5e0');
  raise exception 'Expected unresolved reference';
 exception when no_data_found then null;
 end;
 if exists(select 1 from public.growthkit_webhook_receipts where event_id='evt_missing') then raise exception 'Failed mapping consumed receipt'; end if;
end $$;
set role anon;
do $$ begin
 begin
  perform public.growthkit_identify('commerce-a','03ee41dc-782e-4fce-9eea-253c9930f5e0','forged');
  raise exception 'Public RPC accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  perform count(*) from public.growthkit_checkout_attempts;
  raise exception 'Public table read accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set role service_role;
select public.growthkit_identify('commerce-a','03ee41dc-782e-4fce-9eea-253c9930f5e0','account-a');
reset role;
rollback;
