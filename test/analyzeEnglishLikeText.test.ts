import { analyzeEnglishLikeText, isEnglishLikeText } from '../src';

describe('analyzeEnglishLikeText', () => {
  it('rejects the observed AMT JOY random contact payloads', () => {
    const examples = ['UFbwWZaefxpMaphkVDvcTKWg', 'WHshuGOZIdPDWXDd'];

    for (const example of examples) {
      const result = analyzeEnglishLikeText(example);

      expect(result.isEnglishLike).toBe(false);
      expect(result.score).toBeLessThan(55);
      expect(result.metrics.wordCount).toBe(1);
      expect(result.metrics.longUnrecognizedWordCount).toBe(1);
      expect(result.reasons).toEqual(expect.arrayContaining(['long_unrecognized_token']));
    }
  });

  it('rejects common random strings and documents the failing signals', () => {
    const result = analyzeEnglishLikeText('asdfasdfasdfasdf');

    expect(result.isEnglishLike).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(['long_unrecognized_token', 'no_english_signals']));
    expect(result.metrics.commonWordCount).toBe(0);
    expect(result.metrics.technicalTermCount).toBe(0);
  });

  it('rejects mixed-case machine-looking tokens', () => {
    const result = analyzeEnglishLikeText('XESZIwUzTdmOfVBaLnHNckn');

    expect(result.isEnglishLike).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(['excessive_mixed_case', 'long_unrecognized_token']));
    expect(result.metrics.mixedCaseTransitionRatio).toBeGreaterThan(0.24);
  });

  it('accepts normal contact messages', () => {
    const result = analyzeEnglishLikeText('Hi, can you help me with my subscription?');

    expect(result.isEnglishLike).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.reasons).not.toContain('no_english_signals');
    expect(result.metrics.commonWordCount).toBeGreaterThanOrEqual(4);
  });

  it('accepts technical trading messages with product terms', () => {
    const result = analyzeEnglishLikeText('Need help with ES/NQ exports and VPOC data.');

    expect(result.isEnglishLike).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.metrics.technicalTermCount).toBeGreaterThanOrEqual(3);
  });

  it('exposes a boolean convenience function backed by the analyzer', () => {
    expect(isEnglishLikeText('Can you help me export CSV data?')).toBe(true);
    expect(isEnglishLikeText('WHshuGOZIdPDWXDd')).toBe(false);
  });
});
