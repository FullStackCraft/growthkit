import { analyzeEnglishLikeText } from './analyzeEnglishLikeText';
import type { ContactMessageAnalysis, ContactMessageOptions, ContactMessageSpamReason } from './types';

// Require an offer AND a request to engage. Words such as "SEO", "keywords",
// "traffic", or "sales page" alone also occur in legitimate customer questions.
const ENGAGEMENT = /\b(?:(?:can|could|may) (?:i|we) (?:show|send|share)|want me to send|would you like (?:me|us) to (?:send|show|share)|happy to (?:show|send|share)|(?:open to|interested in) (?:a |an )?(?:quick )?(?:call|chat|demo))\b/;
const SALES_PAGE_OFFER = /\b(?:i|we)(?:'ve| have)? (?:put together|built|created|made|designed)\b.{0,100}\b(?:sales|landing) page\b.{0,60}\bfor (?:you|your|it)\b/;
const BUSINESS_HELP_OFFER = /\b(?:we|i) (?:help|can help) (?:businesses|companies|brands|you)\b/;
const TRAFFIC_PROMISE = /\b(?:we|i) (?:can |will )?(?:drive|send|bring|deliver|boost|increase)\b.{0,80}\b(?:visitors|traffic|leads)\b.{0,80}\b(?:your|you)\b/;
const SEO_OFFER = /\b(?:we|i|our team) (?:can |will )?(?:offer|provide|speciali[sz]es? in|help (?:you|businesses) with)\b.{0,100}\b(?:seo|search engine optimi[sz]ation|backlinks?|link building)\b/;

/** Deterministic heuristics for known contact-form spam; not a universal spam classifier. */
export function analyzeContactMessage(
  message: string,
  options: ContactMessageOptions = {}
): ContactMessageAnalysis {
  const normalized = message
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const reasons: ContactMessageSpamReason[] = [];
  const englishLike = options.englishLike === false
    ? null
    : analyzeEnglishLikeText(message, options.englishLike);

  if (englishLike && !englishLike.isEnglishLike) reasons.push('not_english_like');

  if (ENGAGEMENT.test(normalized)) {
    if (SALES_PAGE_OFFER.test(normalized)) reasons.push('sales_page_pitch');
    if (BUSINESS_HELP_OFFER.test(normalized) && TRAFFIC_PROMISE.test(normalized)) {
      reasons.push('traffic_generation_pitch');
    }
    if (SEO_OFFER.test(normalized)) reasons.push('seo_service_pitch');
  }

  return { isSpam: reasons.length > 0, reasons, englishLike };
}

export function isSpamContactMessage(message: string, options?: ContactMessageOptions): boolean {
  return analyzeContactMessage(message, options).isSpam;
}
