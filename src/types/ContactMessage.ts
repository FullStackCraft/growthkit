import type { EnglishLikeTextAnalysis, EnglishLikeTextOptions } from './EnglishLikeText';

export type ContactMessageSpamReason =
  | 'not_english_like'
  | 'sales_page_pitch'
  | 'traffic_generation_pitch'
  | 'seo_service_pitch'
  | 'agency_marketing_pitch';

export interface ContactMessageOptions {
  /** Existing gibberish guard, enabled by default. Set false for multilingual forms. */
  englishLike?: EnglishLikeTextOptions | false;
}

export interface ContactMessageAnalysis {
  isSpam: boolean;
  reasons: ContactMessageSpamReason[];
  englishLike: EnglishLikeTextAnalysis | null;
}
