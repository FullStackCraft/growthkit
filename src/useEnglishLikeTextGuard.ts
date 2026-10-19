import { useMemo } from 'react';
import { analyzeEnglishLikeText } from './analyzeEnglishLikeText';
import type { EnglishLikeTextAnalysis, EnglishLikeTextOptions } from './types';

export function useEnglishLikeTextGuard(
  text: string,
  options?: EnglishLikeTextOptions
): EnglishLikeTextAnalysis {
  return useMemo(() => analyzeEnglishLikeText(text, options), [options, text]);
}
