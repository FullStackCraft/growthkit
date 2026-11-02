/** @jest-environment node */
import { createIngestionHandlers, HttpError } from '../examples/ingestion';
import { createStripeWebhookHandler, StripeEvent } from '../examples/stripe-webhook';
import { createSupabaseStore } from '../examples/supabase-store';
const id='03ee41dc-782e-4fce-9eea-253c9930f5e0';
const touch={occurred_at:'2026-11-02T10:00:00Z',session_id:id,source:'google.com',source_type:'search',landing_page:'https://example.com/?token=secret'};
const event={name:'analysis_completed',event_id:id,visitor_id:id,session_id:id,user_id:'forged',product_name:'forged',
  occurred_at:'2026-11-02T10:00:00Z',page_url:'https://example.com/?token=secret',properties:{symbol:'SPY'},origin:'server',source_event_id:'forged',
  attribution:{first_touch:touch,session_touch:touch,last_non_direct_touch:null}};
function request(body:unknown,origin='https://example.com'){
 return new Request('https://example.com/api/track',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
}
function setup(){
 const store={linkIdentity:jest.fn(async()=>{}),ingest:jest.fn(async(_event:Record<string,unknown>)=>{})};
 const authenticate=jest.fn(async():Promise<{userId:string}|null>=>({userId:'verified'}));
 const rateLimit=jest.fn(async()=>true);
 return {store,authenticate,rateLimit,handler:createIngestionHandlers({productName:'example.com',allowedOrigin:'https://example.com',
  authenticate,rateLimit,store,allowedBrowserEvents:['analysis_completed']})};
}
it('ignores forged identity, product and authoritative-event fields',async()=>{
 const a=setup();expect((await a.handler.track(request(event))).status).toBe(204);
 const saved=a.store.ingest.mock.calls[0][0];
 expect(saved).toMatchObject({product_name:'example.com',user_id:'verified',origin:'browser',source_event_id:null,page_url:'https://example.com/'});
 expect(JSON.stringify(saved)).not.toContain('secret');
});
it('never derives authenticated identity from a browser ID',async()=>{
 const a=setup();a.authenticate.mockResolvedValue(null);await a.handler.track(request(event));
 expect(a.store.ingest.mock.calls[0][0].user_id).toBeNull();expect(a.store.linkIdentity).not.toHaveBeenCalled();
 expect((await a.handler.identify(request({visitorId:id,userId:'forged'}))).status).toBe(401);
});
it('identify accepts only verified account identity and reports conflicts',async()=>{
 const a=setup();const response=await a.handler.identify(request({visitorId:id,userId:'forged'}));
 expect(await response.json()).toEqual({userId:'verified'});
 expect(a.store.linkIdentity).toHaveBeenCalledWith('example.com',id,'verified');
 a.store.linkIdentity.mockRejectedValue(new HttpError(409,'Identity conflict'));
 expect((await a.handler.identify(request({visitorId:id}))).status).toBe(409);
});
it('rejects bad origins, rate limits, server-only events and oversized payloads',async()=>{
 const a=setup();expect((await a.handler.track(request(event,'https://evil.com'))).status).toBe(403);
 expect((await a.handler.track(request({...event,name:'payment_succeeded'}))).status).toBe(403);
 expect((await a.handler.track(request({...event,properties:{x:'x'.repeat(70000)}}))).status).toBe(413);
 a.rateLimit.mockResolvedValue(false);expect((await a.handler.track(request(event))).status).toBe(429);
});
it('maps Supabase identity conflict without leaking database errors',async()=>{
 const fetchMock=jest.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({code:'23505',message:'private'},{status:409}));
 const store=createSupabaseStore('https://project.supabase.co','server-secret');
 await expect(store.linkIdentity('test',id,'verified')).rejects.toMatchObject({status:409});
 expect(fetchMock.mock.calls[0][0]).toBe('https://project.supabase.co/rest/v1/rpc/growthkit_link_identity');fetchMock.mockRestore();
});
function stripe(type='checkout.session.completed'):StripeEvent{return{id:'evt_stripe',type,created:1793613600,
 data:{object:{id:'cs_123',customer:'cus_123',mode:'payment',payment_status:'paid',amount_total:49900,currency:'usd'}}};}
it('verifies Stripe signatures before writing and deduplicates logical payments',async()=>{
 const store={linkIdentity:jest.fn(),ingest:jest.fn(async(_event:Record<string,unknown>)=>{})};
 const options={productName:'test',verify:jest.fn((_raw:string,_signature:string)=>stripe()),lookupUser:async()=> 'verified',
  subscriptionMrr:async()=>({amountMinor:2900,currency:'usd'}),store};
 const handler=createStripeWebhookHandler(options);
 const webhook=()=>new Request('https://example.com/webhook',{method:'POST',headers:{'stripe-signature':'signature'},body:'raw'});
 expect((await handler(webhook())).status).toBe(204);expect(options.verify).toHaveBeenCalledWith('raw','signature');
 expect(store.ingest.mock.calls[0][0]).toMatchObject({source_event_id:'checkout:cs_123:paid',user_id:'verified',origin:'server',properties:{new_mrr_minor:0,cash_minor:49900}});
 options.verify.mockReturnValue(stripe('checkout.session.async_payment_succeeded'));await handler(webhook());
 expect(store.ingest.mock.calls[1][0].source_event_id).toBe(store.ingest.mock.calls[0][0].source_event_id);
 options.verify.mockImplementation(()=>{throw new Error('bad')});expect((await handler(webhook())).status).toBe(400);expect(store.ingest).toHaveBeenCalledTimes(2);
});
it('does not count unpaid or recurring checkout as additional cash and retries missing mappings',async()=>{
 const store={linkIdentity:jest.fn(),ingest:jest.fn()};const e=stripe();e.data.object.payment_status='unpaid';
 const options={productName:'test',verify:()=>e,lookupUser:async():Promise<string|null>=>'verified',subscriptionMrr:async()=>({amountMinor:2900,currency:'usd'}),store};
 const req=()=>new Request('https://example.com/webhook',{method:'POST',body:'raw'});
 expect((await createStripeWebhookHandler(options)(req())).status).toBe(204);expect(store.ingest).not.toHaveBeenCalled();
 options.lookupUser=async()=>null;expect((await createStripeWebhookHandler(options)(req())).status).toBe(503);
});
