import { createGrowthKit, GrowthKitTransportError } from '@fullstackcraftllc/growthkit';
async function post(path: string, body: unknown, signal: AbortSignal): Promise<Response> {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new GrowthKitTransportError('GrowthKit request failed',
    response.status === 408 || response.status === 429 || response.status >= 500);
  return response;
}
export function makeBrowserTracker() {
  return createGrowthKit({
    productName: 'example.com',
    excludedReferrerHosts: ['accounts.google.com', 'buy.stripe.com', 'checkout.stripe.com', 'auth.example.com'],
    onEvent: async (event, { signal }) => { await post('/api/growthkit/track', event, signal); },
    onIdentify: async (body, { signal }) => (await post('/api/growthkit/identify', body, signal)).json(),
  });
}
