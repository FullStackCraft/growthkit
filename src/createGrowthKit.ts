import type { AttributionTouch, GrowthKit, GrowthKitEvent, GrowthKitOptions } from './types/GrowthKit';
import { classifySource } from './utils/classifySource';
import { assertEventSize, validateUserEvent } from './utils/validateUserEvent';

const SESSION_TIMEOUT = 30 * 60 * 1000;
interface BrowserState {
  visitorId: string;
  sessionId: string;
  lastActivity: number;
  firstTouch: AttributionTouch;
  lastNonDirectTouch: AttributionTouch | null;
  sessionTouch: AttributionTouch;
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(): string {
  const crypto = globalThis.crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  if (!crypto?.getRandomValues) throw new Error('GrowthKit requires browser cryptography.');
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function safePage(url: string): string {
  try { const parsed = new URL(url); return `${parsed.origin}${parsed.pathname}`; } catch { return ''; }
}

function touch(sessionId: string, excluded: string[]): AttributionTouch {
  const page = new URL(window.location.href);
  let referrer: URL | null = null;
  try { referrer = new URL(document.referrer); } catch { /* no referrer */ }
  const host = page.hostname.toLowerCase().replace(/^www\./, '');
  const ignored = (value: string) => {
    const candidate = value.replace(/^www\./, '');
    return candidate === host || candidate.endsWith(`.${host}`) ||
      excluded.some(item => candidate === item || candidate.endsWith(`.${item}`));
  };
  const external = referrer && !ignored(referrer.hostname.toLowerCase()) ? referrer : null;
  const param = (key: string) => page.searchParams.get(key)?.trim() || null;
  const utmSource = param('utm_source');
  const internalCampaign = utmSource && ignored(utmSource.toLowerCase());
  const source = (internalCampaign ? null : utmSource) ?? external?.hostname ?? 'direct';
  return {
    occurred_at: new Date().toISOString(), session_id: sessionId, source,
    source_type: classifySource(source, external?.hostname ?? null),
    landing_page: safePage(page.href), referrer_url: external ? safePage(external.href) : null,
    utm_source: internalCampaign ? null : utmSource,
    utm_medium: internalCampaign ? null : param('utm_medium'),
    utm_campaign: internalCampaign ? null : param('utm_campaign'),
    utm_content: internalCampaign ? null : param('utm_content'),
    utm_term: internalCampaign ? null : param('utm_term'),
  };
}

/** Mark only transient failures retryable. Ordinary errors fail immediately. */
export class GrowthKitTransportError extends Error {
  constructor(message: string, public readonly retryable = false) { super(message); this.name = 'GrowthKitTransportError'; }
}

function aborted(): Error { const error = new Error('GrowthKit operation canceled by reset.'); error.name = 'AbortError'; return error; }
function transient(error: unknown): boolean {
  if (error instanceof GrowthKitTransportError) return error.retryable;
  return error instanceof TypeError; // fetch network errors; map HTTP errors explicitly in the transport.
}

export function createGrowthKit(options: GrowthKitOptions): GrowthKit {
  const productName = options.productName?.trim();
  if (!productName) throw new Error('productName is required.');
  if (typeof options.onEvent !== 'function') throw new Error('onEvent is required.');
  const enabled = options.enabled !== false;
  const key = `growthkit:v1:${encodeURIComponent(productName)}`;
  const excluded = (options.excludedReferrerHosts ?? ['accounts.google.com', 'buy.stripe.com', 'checkout.stripe.com'])
    .map(host => host.trim().toLowerCase()).filter(Boolean);
  let memory: BrowserState | null = null;
  let userId: string | null = null;
  let linkedVisitor: string | null = null;
  let identification: Promise<void> | null = null;
  let epoch = 0;
  let controller = new AbortController();
  let persistent = true;

  function read(): BrowserState | null {
    if (persistent) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw) as BrowserState;
        if (uuidPattern.test(value.visitorId) && uuidPattern.test(value.sessionId) && Number.isFinite(value.lastActivity) &&
            value.firstTouch && value.sessionTouch && value.firstTouch.landing_page && value.sessionTouch.landing_page) {
          // Storage is browser-controlled; attribution is never authoritative server data.
          return value;
        }
        return null;
      } catch { persistent = false; }
    }
    return memory;
  }
  function write(state: BrowserState): void {
    memory = state;
    if (persistent) {
      try { window.localStorage.setItem(key, JSON.stringify(state)); } catch { persistent = false; }
    }
  }
  function state(): BrowserState {
    const now = Date.now();
    let current = read();
    if (!current) {
      const sessionId = uuid();
      const initial = touch(sessionId, excluded);
      current = { visitorId: uuid(), sessionId, lastActivity: now, firstTouch: initial,
        lastNonDirectTouch: initial.source === 'direct' ? null : initial, sessionTouch: initial };
    } else if (now - current.lastActivity >= SESSION_TIMEOUT || now < current.lastActivity) {
      current.sessionId = uuid();
      current.sessionTouch = touch(current.sessionId, excluded);
      if (current.sessionTouch.source !== 'direct') current.lastNonDirectTouch = current.sessionTouch;
    }
    if (linkedVisitor && linkedVisitor !== current.visitorId) { userId = null; linkedVisitor = null; }
    current.lastActivity = now;
    write(current);
    return current;
  }
  function available(): boolean { return enabled && typeof window !== 'undefined' && typeof document !== 'undefined'; }
  function guard(generation: number, visitorId: string): void {
    if (generation !== epoch || controller.signal.aborted || read()?.visitorId !== visitorId) throw aborted();
  }
  async function deliver(action: (signal: AbortSignal) => Promise<void>, generation: number, visitorId: string): Promise<void> {
    const signal = controller.signal;
    for (let attempt = 0; ; attempt++) {
      guard(generation, visitorId);
      try { await action(signal); guard(generation, visitorId); return; }
      catch (error) {
        guard(generation, visitorId);
        if (attempt === 2 || !transient(error)) throw error;
        await new Promise<void>((resolve, reject) => {
          const cancel = () => { clearTimeout(timer); reject(aborted()); };
          const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 100 * 2 ** attempt);
          signal.addEventListener('abort', cancel, { once: true });
          if (signal.aborted) cancel();
        });
      }
    }
  }

  return {
    async track(input) {
      if (!available()) return;
      const validated = validateUserEvent(input);
      const current = state();
      const event: GrowthKitEvent = {
        ...validated, event_id: uuid(), product_name: productName,
        visitor_id: current.visitorId, session_id: current.sessionId, user_id: userId,
        occurred_at: new Date().toISOString(), page_url: safePage(window.location.href),
        attribution: { first_touch: current.firstTouch, last_non_direct_touch: current.lastNonDirectTouch, session_touch: current.sessionTouch },
      };
      const serialized = JSON.stringify(event);
      assertEventSize(serialized);
      await deliver(async signal => { await options.onEvent(JSON.parse(serialized), { signal }); }, epoch, current.visitorId);
    },
    identify() {
      if (!available()) return Promise.resolve();
      if (identification) return identification;
      if (!options.onIdentify) return Promise.reject(new Error('onIdentify is required for identify().'));
      const current = state();
      const generation = epoch;
      const pending = deliver(async signal => {
        const result = await options.onIdentify!({ visitorId: current.visitorId }, { signal });
        guard(generation, current.visitorId);
        if (!result || typeof result.userId !== 'string' || !result.userId.trim()) throw new Error('Identification requires a verified userId.');
        if (userId && userId !== result.userId) throw new Error('Account conflict: reset() before switching accounts.');
        userId = result.userId;
        linkedVisitor = current.visitorId;
      }, generation, current.visitorId);
      identification = pending;
      void pending.finally(() => { if (identification === pending) identification = null; }).catch(() => undefined);
      return pending;
    },
    reset() {
      epoch++;
      controller.abort();
      controller = new AbortController();
      userId = null; linkedVisitor = null; identification = null; memory = null;
      if (!available()) return;
      try { window.localStorage.removeItem(key); } catch { persistent = false; }
      // Initialize a fresh generation immediately; the previous attribution is gone.
      state();
    },
  };
}
