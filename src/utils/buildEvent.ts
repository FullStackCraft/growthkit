import type { JsonValue, ReferralEvent } from '../types';
import { LIB_VERSION } from '../constants/constants';
import { classifySource } from './classifySource';
import { getHostname } from './getHostname';
import { makeEventId } from './makeEventId';
import { normalizeValue } from './normalizeValue';

export function buildEvent(
  productName: string,
  additionalMetadata?: Record<string, JsonValue>
): ReferralEvent {
  const page = new URL(window.location.href);
  const params = page.searchParams;

  const referrerUrl = normalizeValue(document.referrer);
  const referrerHost = getHostname(referrerUrl);

  const utmSource = normalizeValue(params.get('utm_source'));
  const source = utmSource ?? referrerHost ?? 'direct';

  const metadata: Record<string, JsonValue> = {
    library: '@fullstackcraftllc/growthkit',
    library_version: LIB_VERSION,
    ...(additionalMetadata ?? {}),
  };

  return {
    event_id: makeEventId(),
    occurred_at: new Date().toISOString(),
    product_name: productName,
    source,
    source_type: classifySource(source, referrerHost),
    page_url: page.toString(),
    page_path: page.pathname,
    referrer_url: referrerUrl,
    referrer_host: referrerHost,
    utm_source: utmSource,
    utm_medium: normalizeValue(params.get('utm_medium')),
    utm_campaign: normalizeValue(params.get('utm_campaign')),
    utm_content: normalizeValue(params.get('utm_content')),
    utm_term: normalizeValue(params.get('utm_term')),
    user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent,
    metadata,
  };
}
