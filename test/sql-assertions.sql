-- Run after both schemas, using a disposable database only.
insert into public.growthkit_referral_events(event_id,occurred_at,product_name,source,source_type,page_url,page_path)
values('legacy-keep',now(),'test','direct','direct','https://example.com/','/') on conflict do nothing;
select public.growthkit_link_identity('test','03ee41dc-782e-4fce-9eea-253c9930f5e0','user_1');
select public.growthkit_link_identity('test','03ee41dc-782e-4fce-9eea-253c9930f5e0','user_1');
select public.growthkit_link_identity('other','03ee41dc-782e-4fce-9eea-253c9930f5e0','user_other');
do $$ begin
  begin
    perform public.growthkit_link_identity('test','03ee41dc-782e-4fce-9eea-253c9930f5e0','user_2');
    raise exception 'Expected identity conflict';
  exception when unique_violation then null;
  end;
end $$;
select public.growthkit_ingest_event('{
 "product_name":"test","event_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","name":"analysis_completed",
 "visitor_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","session_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0",
 "user_id":null,"occurred_at":"2026-11-01T00:00:00Z","origin":"browser","properties":{},
 "attribution":{"first_touch":{"session_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","occurred_at":"2026-11-01T00:00:00Z","source":"google.com","source_type":"search","landing_page":"https://example.com/"}}
}');
-- Identical event delivery does not change immutable event/touch records.
select public.growthkit_ingest_event('{
 "product_name":"test","event_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","name":"analysis_completed",
 "visitor_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","occurred_at":"2026-11-01T00:00:00Z","origin":"browser"}');
select public.growthkit_ingest_event('{
 "product_name":"test","event_id":"13ee41dc-782e-4fce-9eea-253c9930f5e0","name":"payment_succeeded",
 "user_id":"user_1","occurred_at":"2026-11-01T00:01:00Z","origin":"server","source_event_id":"invoice:1:paid","properties":{"cash_minor":2900,"currency":"usd"}}');
select public.growthkit_ingest_event('{
 "product_name":"test","event_id":"23ee41dc-782e-4fce-9eea-253c9930f5e0","name":"payment_succeeded",
 "user_id":"user_1","occurred_at":"2026-11-01T00:01:00Z","origin":"server","source_event_id":"invoice:1:paid","properties":{"cash_minor":2900,"currency":"usd"}}');
do $$ begin
 if (select count(*) from public.growthkit_events)<>2 then raise exception 'Event dedupe failed'; end if;
 if (select count(*) from public.growthkit_attribution_touches)<>1 then raise exception 'Touch dedupe failed'; end if;
 if not exists(select 1 from public.growthkit_referral_events where event_id='legacy-keep') then raise exception 'Legacy lost'; end if;
 -- Touch failure rolls back event insertion as well.
 begin
  perform public.growthkit_ingest_event('{"product_name":"test","event_id":"33ee41dc-782e-4fce-9eea-253c9930f5e0","name":"bad_touch","visitor_id":"03ee41dc-782e-4fce-9eea-253c9930f5e0","occurred_at":"2026-11-01T00:01:00Z","origin":"browser","attribution":{"first_touch":{"session_id":"invalid"}}}');
  raise exception 'Expected invalid touch failure';
 exception when invalid_text_representation then null;
 end;
 if exists(select 1 from public.growthkit_events where name='bad_touch') then raise exception 'Atomicity failed'; end if;
end $$;
set role anon;
do $$ begin
 begin
  perform public.growthkit_link_identity('test','03ee41dc-782e-4fce-9eea-253c9930f5e0','forged');
  raise exception 'Public identity write allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform count(*) from public.growthkit_events;
  raise exception 'Public read allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin
  insert into public.growthkit_identity_links values('test','43ee41dc-782e-4fce-9eea-253c9930f5e0','forged',now());
  raise exception 'Authenticated identity write allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set role service_role;
select public.growthkit_link_identity('test','43ee41dc-782e-4fce-9eea-253c9930f5e0','user_1');
reset role;
