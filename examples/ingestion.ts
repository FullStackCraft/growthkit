// Server-only reference. Compile with DOM Request/Response types and Node 18+.
import { validateUserEvent } from '@fullstackcraftllc/growthkit';
import type { GrowthKitEvent, AttributionTouch } from '@fullstackcraftllc/growthkit';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface Store {
  linkIdentity(product: string, visitorId: string, verifiedUserId: string): Promise<void>;
  ingest(event: Record<string, unknown>): Promise<void>;
}
export interface IngestionOptions {
  productName: string;
  allowedOrigin: string;
  /** Verify the session signature/expiry; return null only when genuinely signed out. */
  authenticate(request: Request): Promise<{ userId: string } | null>;
  /** Use a shared, atomic rate limiter in production; key by trusted proxy IP/session. */
  rateLimit(request: Request): Promise<boolean>;
  store: Store;
  allowedBrowserEvents: string[];
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireUuid(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new HttpError(400, 'Invalid UUID');
  return value;
}
function page(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'Invalid page');
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); return url.origin + url.pathname; }
  catch { throw new HttpError(400, 'Invalid page'); }
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new HttpError(400, 'Invalid timestamp');
  return new Date(value).toISOString();
}
function attributionTouch(input: unknown): AttributionTouch {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Invalid touch');
  const t = input as AttributionTouch;
  const nullableText = (value: unknown) => typeof value === 'string' ? value : null;
  if (typeof t.source !== 'string' || !['direct','search','social','referral','unknown'].includes(t.source_type)) throw new HttpError(400, 'Invalid source');
  return {
    session_id: requireUuid(t.session_id), occurred_at: timestamp(t.occurred_at), source: t.source,
    source_type: t.source_type, landing_page: page(t.landing_page),
    referrer_url: t.referrer_url ? page(t.referrer_url) : null,
    utm_source: nullableText(t.utm_source), utm_medium: nullableText(t.utm_medium),
    utm_campaign: nullableText(t.utm_campaign), utm_content: nullableText(t.utm_content), utm_term: nullableText(t.utm_term),
  };
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) throw new HttpError(400, 'Missing body');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 65536) { await reader.cancel(); throw new HttpError(413, 'Payload too large'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Invalid JSON');
  } finally { reader.releaseLock(); }
}
export function createIngestionHandlers(options: IngestionOptions) {
  async function handle(request: Request, identify: boolean): Promise<Response> {
    try {
      if (request.method !== 'POST') throw new HttpError(405, 'POST required');
      if (request.headers.get('origin') !== options.allowedOrigin) throw new HttpError(403, 'Invalid origin');
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON required');
      if (!await options.rateLimit(request)) throw new HttpError(429, 'Rate limited');
      const account = await options.authenticate(request); // Invalid supplied tokens must throw, not downgrade.
      const body = await readBody(request);
      if (identify) {
        if (!account) throw new HttpError(401, 'Authentication required');
        await options.store.linkIdentity(options.productName, requireUuid(body.visitorId), account.userId);
        return Response.json({ userId: account.userId });
      }
      let event;
      try { event = validateUserEvent(body as unknown as GrowthKitEvent); }
      catch { throw new HttpError(400, 'Invalid event'); }
      if (!options.allowedBrowserEvents.includes(event.name)) throw new HttpError(403, 'Event is server-only or unknown');
      const attribution = body.attribution as GrowthKitEvent['attribution'];
      if (!attribution) throw new HttpError(400, 'Missing attribution');
      const canonical = {
        ...event, event_id: requireUuid(body.event_id), product_name: options.productName,
        visitor_id: requireUuid(body.visitor_id), session_id: requireUuid(body.session_id),
        user_id: account?.userId ?? null, occurred_at: timestamp(body.occurred_at), page_url: page(body.page_url),
        attribution: { first_touch: attributionTouch(attribution.first_touch),
          last_non_direct_touch: attribution.last_non_direct_touch ? attributionTouch(attribution.last_non_direct_touch) : null,
          session_touch: attributionTouch(attribution.session_touch) },
        origin: 'browser', source_event_id: null,
      };
      if (account) await options.store.linkIdentity(options.productName, canonical.visitor_id, account.userId);
      await options.store.ingest(canonical);
      return new Response(null, { status: 204 });
    } catch (error) {
      // Store adapters map uniqueness conflicts to 409. Never expose database/error details.
      return Response.json({ error: error instanceof HttpError ? error.message : 'Ingestion failed' },
        { status: error instanceof HttpError ? error.status : 500 });
    }
  }
  return { track: (request: Request) => handle(request, false), identify: (request: Request) => handle(request, true) };
}
