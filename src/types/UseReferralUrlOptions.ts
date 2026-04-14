import type { JsonValue } from './JsonValue';
import type { ReferralEvent } from './ReferralEvent';

export interface UseReferralUrlOptions {
  productName: string;
  enabled?: boolean;
  onEvent?: (event: ReferralEvent) => void | Promise<void>;
  metadata?: Record<string, JsonValue>;
}
