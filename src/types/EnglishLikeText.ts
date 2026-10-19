export interface EnglishLikeTextOptions {
  minCharacters?: number;
  minLetters?: number;
  minWords?: number;
  minScore?: number;
  commonWords?: readonly string[];
  technicalTerms?: readonly string[];
}

export interface EnglishLikeTextMetrics {
  characterCount: number;
  letterCount: number;
  wordCount: number;
  commonWordCount: number;
  technicalTermCount: number;
  vowelRatio: number;
  longestWordLength: number;
  longUnrecognizedWordCount: number;
  mixedCaseTransitionRatio: number;
  maxConsonantRun: number;
  hasSentenceStructure: boolean;
}

export interface EnglishLikeTextAnalysis {
  isEnglishLike: boolean;
  score: number;
  reasons: string[];
  normalizedText: string;
  metrics: EnglishLikeTextMetrics;
}
