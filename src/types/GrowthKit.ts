import type { JsonValue } from './JsonValue';
import type { SourceType } from './SourceType';

export interface IUserEvent {
  name: string;
  properties?: Record<string, JsonValue>;
}

export interface AttributionTouch {
  occurred_at: string;
  session_id: string;
  source: string;
  source_type: SourceType;
  landing_page: string;
  referrer_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

export interface GrowthKitEvent extends Required<IUserEvent> {
  event_id: string;
  product_name: string;
  visitor_id: string;
  session_id: string;
  /** Advisory in browser payloads. Ingestion must derive this from authentication. */
  user_id: string | null;
  occurred_at: string;
  page_url: string;
  attribution: {
    first_touch: AttributionTouch;
    last_non_direct_touch: AttributionTouch | null;
    session_touch: AttributionTouch;
  };
}

export interface DeliveryContext { signal: AbortSignal }
export interface GrowthKitOptions {
  productName: string;
  enabled?: boolean;
  excludedReferrerHosts?: string[];
  onEvent: (event: GrowthKitEvent, context: DeliveryContext) => void | Promise<void>;
  /** Call your authenticated endpoint; never trust an ID supplied by the browser. */
  onIdentify?: (request: { visitorId: string }, context: DeliveryContext) => Promise<{ userId: string }>;
}

export interface GrowthKit {
  track(event: IUserEvent): Promise<void>;
  identify(): Promise<void>;
  reset(): void;
}
