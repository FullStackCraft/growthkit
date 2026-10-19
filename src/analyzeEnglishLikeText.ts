import type { EnglishLikeTextAnalysis, EnglishLikeTextOptions } from './types';

const DEFAULT_COMMON_WORDS = [
  'a',
  'about',
  'access',
  'account',
  'again',
  'also',
  'am',
  'an',
  'and',
  'any',
  'are',
  'at',
  'billing',
  'but',
  'by',
  'can',
  'cannot',
  'comments',
  'contact',
  'could',
  'data',
  'do',
  'does',
  'download',
  'email',
  'exports',
  'feedback',
  'for',
  'from',
  'get',
  'have',
  'hello',
  'help',
  'hi',
  'how',
  'i',
  'in',
  'into',
  'is',
  'issue',
  'it',
  'like',
  'login',
  'market',
  'me',
  'message',
  'my',
  'need',
  'not',
  'on',
  'or',
  'plan',
  'please',
  'pricing',
  'question',
  'questions',
  'refund',
  'reset',
  'see',
  'session',
  'should',
  'subscription',
  'support',
  'thanks',
  'the',
  'there',
  'this',
  'to',
  'try',
  'use',
  'want',
  'what',
  'when',
  'with',
  'would',
  'you',
  'your',
] as const;

const DEFAULT_TECHNICAL_TERMS = [
  'api',
  'amt',
  'csv',
  'es',
  'json',
  'nq',
  'tpo',
  'val',
  'vah',
  'vanna',
  'vpoc',
] as const;

const DEFAULTS = {
  minCharacters: 10,
  minLetters: 6,
  minWords: 2,
  minScore: 55,
} as const;

const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
const VOWEL_PATTERN = /[aeiou]/i;
const LETTER_PATTERN = /[A-Za-z]/;

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function countLetters(words: readonly string[]): string {
  return words.join('');
}

function countMixedCaseTransitions(word: string): number {
  let transitions = 0;

  for (let i = 1; i < word.length; i += 1) {
    const previous = word[i - 1];
    const current = word[i];

    if (!LETTER_PATTERN.test(previous) || !LETTER_PATTERN.test(current)) continue;
    if (previous.toLowerCase() === previous.toUpperCase()) continue;
    if (current.toLowerCase() === current.toUpperCase()) continue;

    const previousIsUpper = previous === previous.toUpperCase();
    const currentIsUpper = current === current.toUpperCase();

    if (previousIsUpper !== currentIsUpper) {
      transitions += 1;
    }
  }

  return transitions;
}

function maxConsonantRun(letters: string): number {
  let currentRun = 0;
  let longestRun = 0;

  for (const character of letters.toLowerCase()) {
    if (!LETTER_PATTERN.test(character) || VOWEL_PATTERN.test(character)) {
      currentRun = 0;
      continue;
    }

    currentRun += 1;
    longestRun = Math.max(longestRun, currentRun);
  }

  return longestRun;
}

function toSet(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.toLowerCase()));
}

function uniqueReasons(reasons: readonly string[]): string[] {
  return Array.from(new Set(reasons));
}

export function analyzeEnglishLikeText(text: string, options: EnglishLikeTextOptions = {}): EnglishLikeTextAnalysis {
  const normalizedText = normalizeText(text);
  const words = normalizedText.match(WORD_PATTERN) ?? [];
  const letters = countLetters(words);
  const letterCount = letters.length;
  const commonWords = toSet([...(options.commonWords ?? []), ...DEFAULT_COMMON_WORDS]);
  const technicalTerms = toSet([...(options.technicalTerms ?? []), ...DEFAULT_TECHNICAL_TERMS]);

  const commonWordCount = words.filter((word) => commonWords.has(word.toLowerCase())).length;
  const technicalTermCount = words.filter((word) => technicalTerms.has(word.toLowerCase())).length;
  const vowelCount = Array.from(letters).filter((character) => VOWEL_PATTERN.test(character)).length;
  const vowelRatio = letterCount > 0 ? vowelCount / letterCount : 0;
  const longestWordLength = words.reduce((longest, word) => Math.max(longest, word.length), 0);
  const mixedCaseTransitions = words.reduce((total, word) => total + countMixedCaseTransitions(word), 0);
  const mixedCaseTransitionRatio = letterCount > 1 ? mixedCaseTransitions / (letterCount - 1) : 0;
  const longUnrecognizedWordCount = words.filter((word) => {
    const lowerWord = word.toLowerCase();
    return word.length >= 16 && !commonWords.has(lowerWord) && !technicalTerms.has(lowerWord);
  }).length;
  const sentenceSignalCount = (normalizedText.match(/[.!?,'"/()\-:;]/g) ?? []).length;
  const hasSentenceStructure = words.length >= 2 || sentenceSignalCount > 0;
  const reasons: string[] = [];
  let score = 0;

  if (normalizedText.length < (options.minCharacters ?? DEFAULTS.minCharacters)) {
    reasons.push('too_short');
  } else {
    score += 10;
  }

  if (letterCount < (options.minLetters ?? DEFAULTS.minLetters)) {
    reasons.push('too_few_letters');
  } else {
    score += 10;
  }

  if (words.length < (options.minWords ?? DEFAULTS.minWords)) {
    reasons.push('too_few_words');
  } else {
    score += 20;
  }

  if (commonWordCount + technicalTermCount === 0) {
    reasons.push('no_english_signals');
  } else {
    score += Math.min(25, 10 + (commonWordCount + technicalTermCount) * 5);
  }

  if (vowelRatio >= 0.2 && vowelRatio <= 0.62) {
    score += 15;
  } else {
    reasons.push('abnormal_vowel_ratio');
  }

  if (mixedCaseTransitionRatio <= 0.18) {
    score += 15;
  } else {
    reasons.push('excessive_mixed_case');
  }

  const consonantRun = maxConsonantRun(letters);
  if (consonantRun <= 5) {
    score += 10;
  } else {
    reasons.push('long_consonant_run');
  }

  if (hasSentenceStructure) {
    score += 10;
  } else {
    reasons.push('weak_sentence_structure');
  }

  if (longUnrecognizedWordCount === 0) {
    score += 10;
  } else {
    reasons.push('long_unrecognized_token');
  }

  const minScore = options.minScore ?? DEFAULTS.minScore;
  const signalCount = commonWordCount + technicalTermCount;
  const hardFail =
    normalizedText.length === 0 ||
    letterCount < (options.minLetters ?? DEFAULTS.minLetters) ||
    (longUnrecognizedWordCount > 0 && (signalCount === 0 || mixedCaseTransitionRatio > 0.24)) ||
    (signalCount === 0 && words.length < (options.minWords ?? DEFAULTS.minWords)) ||
    (signalCount === 0 && mixedCaseTransitionRatio > 0.24) ||
    (signalCount === 0 && (vowelRatio < 0.18 || vowelRatio > 0.68)) ||
    (signalCount === 0 && consonantRun > 5);

  const rawScore = Math.max(0, Math.min(100, score));
  const boundedScore = hardFail ? Math.min(rawScore, minScore - 1) : rawScore;

  return {
    isEnglishLike: !hardFail && boundedScore >= minScore,
    score: boundedScore,
    reasons: uniqueReasons(reasons),
    normalizedText,
    metrics: {
      characterCount: normalizedText.length,
      letterCount,
      wordCount: words.length,
      commonWordCount,
      technicalTermCount,
      vowelRatio,
      longestWordLength,
      longUnrecognizedWordCount,
      mixedCaseTransitionRatio,
      maxConsonantRun: consonantRun,
      hasSentenceStructure,
    },
  };
}

export function isEnglishLikeText(text: string, options?: EnglishLikeTextOptions): boolean {
  return analyzeEnglishLikeText(text, options).isEnglishLike;
}
