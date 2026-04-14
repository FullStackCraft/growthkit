import type { JsonValue } from './JsonValue';
import type { SourceType } from './SourceType';

export interface ReferralEvent {
  event_id: string;
  occurred_at: string;
  product_name: string;
  source: string;
  source_type: SourceType;
  page_url: string;
  page_path: string;
  referrer_url: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  user_agent: string | null;
  metadata: Record<string, JsonValue>;
}
