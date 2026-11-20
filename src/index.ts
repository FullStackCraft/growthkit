export { analyzeContactMessage, isSpamContactMessage } from './analyzeContactMessage';
export { analyzeEnglishLikeText, isEnglishLikeText } from './analyzeEnglishLikeText';
export { useEnglishLikeTextGuard } from './useEnglishLikeTextGuard';
export { useReferralUrl } from './useReferralUrl';
export { appendCouponCodeToStripeLink } from './appendCouponCodeToStripeLink';
export { getDiscountedAmount } from './couponPresentation';
export type { ICouponCodeConfig } from './types/CouponCodeConfig';
export type {
  ContactMessageAnalysis,
  ContactMessageOptions,
  ContactMessageSpamReason,
  EnglishLikeTextAnalysis,
  EnglishLikeTextMetrics,
  EnglishLikeTextOptions,
  JsonValue,
  ReferralEvent,
  SourceType,
  UseReferralUrlOptions,
  UseReferralUrlResult,
} from './types';
export { createGrowthKit, GrowthKitTransportError } from './createGrowthKit';
export { validateUserEvent } from './utils/validateUserEvent';
export type { IUserEvent, AttributionTouch, GrowthKitEvent, GrowthKitOptions, GrowthKit, DeliveryContext } from './types/GrowthKit';
