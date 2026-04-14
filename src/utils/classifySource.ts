import { SEARCH_HINTS, SOCIAL_HINTS } from '../constants/constants';
import type { SourceType } from '../types';

export function classifySource(source: string, referrerHost: string | null): SourceType {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource === 'direct') return 'direct';
  if (SOCIAL_HINTS.some((hint) => normalizedSource.includes(hint))) return 'social';
  if (SEARCH_HINTS.some((hint) => normalizedSource.includes(hint))) return 'search';
  if (referrerHost) return 'referral';

  return 'unknown';
}
