import { createGrowthKit, GrowthKitTransportError } from '../src/createGrowthKit';
import { validateUserEvent } from '../src/utils/validateUserEvent';
import type { GrowthKitEvent } from '../src/types/GrowthKit';

function setup(productName = 'test', extra = {}) {
  const events: GrowthKitEvent[] = [];
  const onIdentify = jest.fn(async (_request: { visitorId: string }) => ({ userId: 'user_123' }));
  const tracker = createGrowthKit({ productName, onEvent: async e => { events.push(e); }, onIdentify, ...extra });
  return { tracker, events, onIdentify };
}
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-02T10:00:00Z'));
  localStorage.clear(); window.history.replaceState({}, '', '/');
  Object.defineProperty(document, 'referrer', { configurable: true, value: 'https://www.google.com/search?q=private' });
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const event = { name: 'analysis_completed', properties: { symbol: 'SPY' } };
it('persists browser identity across instances and adds safe attribution snapshots', async () => {
  window.history.replaceState({}, '', '/learn?secret=private&utm_source=medium&utm_campaign=test#token');
  const a = setup(); await a.tracker.track(event);
  const b = setup(); await b.tracker.track(event);
  expect(a.events[0].visitor_id).toBe(b.events[0].visitor_id);
  expect(a.events[0].event_id).not.toBe(b.events[0].event_id);
  expect(a.events[0].page_url).toBe('http://localhost/learn');
  expect(a.events[0].attribution.first_touch.source).toBe('medium');
  expect(JSON.stringify(a.events[0])).not.toContain('private');
});
it('does not create IDs or call transports while disabled', async () => {
  const a = setup('disabled', { enabled: false });
  await a.tracker.track(event); await a.tracker.identify(); a.tracker.reset();
  expect(localStorage.length).toBe(0); expect(a.events).toHaveLength(0); expect(a.onIdentify).not.toHaveBeenCalled();
});
it('isolates products', async () => {
  const a=setup('a'), b=setup('b'); await a.tracker.track(event); await b.tracker.track(event);
  expect(a.events[0].visitor_id).not.toBe(b.events[0].visitor_id);
});
it('renews sessions after 30 minutes while preserving acquisition on direct returns', async () => {
  const a=setup(); await a.tracker.track(event);
  Object.defineProperty(document,'referrer',{value:'',configurable:true});
  jest.advanceTimersByTime(30*60*1000); await a.tracker.track(event);
  expect(a.events[1].session_id).not.toBe(a.events[0].session_id);
  expect(a.events[1].visitor_id).toBe(a.events[0].visitor_id);
  expect(a.events[1].attribution.last_non_direct_touch?.source).toBe('www.google.com');
  expect(a.events[1].attribution.session_touch.source).toBe('direct');
});
it('captures each session only once and updates last non-direct on subsequent campaigns', async () => {
  const a=setup(); await a.tracker.track(event);
  window.history.replaceState({}, '', '/?utm_source=reddit'); await a.tracker.track(event);
  expect(a.events[1].attribution.session_touch.source).toBe('www.google.com');
  jest.advanceTimersByTime(30*60*1000); await a.tracker.track(event);
  expect(a.events[2].attribution.last_non_direct_touch?.source).toBe('reddit');
  expect(a.events[2].attribution.first_touch.source).toBe('www.google.com');
});
it.each(['http://localhost/internal','https://sub.localhost/internal','https://accounts.google.com/login','https://buy.stripe.com/pay'])('ignores internal/auth/checkout referrals: %s', async value => {
  Object.defineProperty(document,'referrer',{value,configurable:true});
  const a=setup(); await a.tracker.track(event); expect(a.events[0].attribution.session_touch.source).toBe('direct');
});
it('supports configurable excluded hosts and ignores internal UTMs',async()=>{
  Object.defineProperty(document,'referrer',{value:'https://auth.provider.example/sign-in',configurable:true});
  window.history.replaceState({}, '', '/?utm_source=localhost&utm_campaign=internal');
  const a=setup('test',{excludedReferrerHosts:['provider.example']}); await a.tracker.track(event);
  expect(a.events[0].attribution.session_touch.source).toBe('direct');
  expect(a.events[0].attribution.session_touch.utm_campaign).toBeNull();
});
it('uses memory when storage is blocked',async()=>{
  jest.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')});
  const a=setup();await a.tracker.track(event);await a.tracker.track(event);
  expect(a.events[0].visitor_id).toBe(a.events[1].visitor_id);
});
it('recovers from malformed storage',async()=>{
  localStorage.setItem('growthkit:v1:test','null');const a=setup();await a.tracker.track(event);expect(a.events).toHaveLength(1);
});
it('links an anonymous visitor with verified identity and prevents account reassignment',async()=>{
  const a=setup();await a.tracker.track(event);await Promise.all([a.tracker.identify(),a.tracker.identify()]);
  expect(a.onIdentify).toHaveBeenCalledTimes(1);
  expect(a.onIdentify.mock.calls[0][0]).toEqual({visitorId:a.events[0].visitor_id});
  await a.tracker.identify();await a.tracker.track(event);
  expect(a.events[1].user_id).toBe('user_123');expect(a.events[1].visitor_id).toBe(a.events[0].visitor_id);
  a.onIdentify.mockResolvedValue({userId:'user_other'});await expect(a.tracker.identify()).rejects.toThrow('conflict');
  a.tracker.reset();await a.tracker.identify();await a.tracker.track(event);
  expect(a.events[2].user_id).toBe('user_other');expect(a.events[2].visitor_id).not.toBe(a.events[0].visitor_id);
});
it('reset invalidates an identification already in flight',async()=>{
  let resolve!: (value:{userId:string})=>void;
  const a=setup('test',{onIdentify:()=>new Promise(r=>{resolve=r})});
  const pending=a.tracker.identify();a.tracker.reset();resolve({userId:'old_user'});
  await expect(pending).rejects.toMatchObject({name:'AbortError'});
  await a.tracker.track(event);expect(a.events[0].user_id).toBeNull();
});
it('observes resets in another tracker instance before retrying',async()=>{
  const onEvent=jest.fn().mockRejectedValue(new GrowthKitTransportError('retry',true));
  const a=setup('test',{onEvent});const pending=a.tracker.track(event);
  const rejection=expect(pending).rejects.toMatchObject({name:'AbortError'});
  await Promise.resolve();setup().tracker.reset();await jest.runAllTimersAsync();await rejection;
  expect(onEvent).toHaveBeenCalledTimes(1);
});
it('retries transient errors twice with immutable original IDs and payloads',async()=>{
  const seen:GrowthKitEvent[]=[];
  const onEvent=jest.fn(async(e:GrowthKitEvent)=>{seen.push(JSON.parse(JSON.stringify(e)));e.name='mutated';throw new GrowthKitTransportError('retry',true)});
  const a=setup('test',{onEvent});const pending=a.tracker.track(event);
  const rejection=expect(pending).rejects.toThrow('retry');await jest.runAllTimersAsync();await rejection;
  expect(onEvent).toHaveBeenCalledTimes(3);expect(seen[1]).toEqual(seen[0]);expect(seen[2]).toEqual(seen[0]);
});
it('does not retry permanent errors',async()=>{
  const onEvent=jest.fn().mockRejectedValue(new Error('invalid'));
  await expect(setup('test',{onEvent}).tracker.track(event)).rejects.toThrow('invalid');expect(onEvent).toHaveBeenCalledTimes(1);
});
it('reset cancels queued retries and clears account identity',async()=>{
  const onEvent=jest.fn().mockRejectedValue(new GrowthKitTransportError('retry',true));
  const a=setup('test',{onEvent});const pending=a.tracker.track(event);
  const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'});
  await Promise.resolve();a.tracker.reset();await jest.runAllTimersAsync();await rejected;expect(onEvent).toHaveBeenCalledTimes(1);
});
it('validates JSON, nesting and UTF-8 payload limits',()=>{
  expect(()=>validateUserEvent({name:''})).toThrow();
  for(const properties of [[],null,{bad:NaN},{bad:undefined},{bad:new Date()}])
    expect(()=>validateUserEvent({name:'test',properties:properties as never})).toThrow();
  const circular:Record<string,unknown>={};circular.self=circular;
  expect(()=>validateUserEvent({name:'test',properties:circular as never})).toThrow();
  let deep:unknown={};for(let i=0;i<12;i++)deep={nested:deep};
  expect(()=>validateUserEvent({name:'test',properties:deep as never})).toThrow('nesting');
  expect(()=>validateUserEvent({name:'test',properties:{message:'é'.repeat(40000)}})).toThrow('64 KiB');
});
it('treats www host variants as internal',async()=>{
  Object.defineProperty(document,'referrer',{value:'http://www.localhost/internal',configurable:true});
  const a=setup();await a.tracker.track(event);expect(a.events[0].attribution.session_touch.source).toBe('direct');
});
it('limits the full envelope as well as properties',async()=>{
  window.history.replaceState({}, '', '/?utm_source='+'x'.repeat(30000));
  const a=setup();await expect(a.tracker.track({name:'test',properties:{x:'x'.repeat(15000)}})).rejects.toThrow('64 KiB');
  expect(a.events).toHaveLength(0);
});
it('clears identity when another instance rotates the visitor',async()=>{
  const a=setup();await a.tracker.identify();await a.tracker.track(event);setup().tracker.reset();
  await a.tracker.track(event);expect(a.events[1].user_id).toBeNull();
});
it('uses memory when storage writes fail and rotates it on reset',async()=>{
  jest.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')});
  const a=setup();await a.tracker.track(event);a.tracker.reset();await a.tracker.track(event);
  expect(a.events[1].visitor_id).not.toBe(a.events[0].visitor_id);
});
