import type { ReferralEvent } from './ReferralEvent';

export interface UseReferralUrlResult {
  event: ReferralEvent | null;
  tracked: boolean;
  error: Error | null;
}
