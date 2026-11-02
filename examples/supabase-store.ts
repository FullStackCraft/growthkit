// Server-only: use a Supabase secret/service-role credential from your deployment secret store.
// No Supabase runtime dependency; this adapter uses the PostgREST API.
import { HttpError, Store } from './ingestion';
export function createSupabaseStore(url: string, secret: string): Store {
  const base = new URL('/rest/v1/', url).href;
  async function rpc(name: string, body: unknown): Promise<void> {
    const response = await fetch(`${base}rpc/${name}`, {
      method: 'POST', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) return;
    const error = await response.json().catch(() => ({})) as { code?: string };
    if (error.code === '23505') throw new HttpError(409, 'Identity conflict: reset before switching accounts');
    throw new Error('Supabase ingestion failed');
  }
  return {
    linkIdentity: (product, visitorId, userId) => rpc('growthkit_link_identity', {
      p_product_name: product, p_visitor_id: visitorId, p_user_id: userId,
    }),
    ingest: event => rpc('growthkit_ingest_event', { p_event: event }),
  };
}
