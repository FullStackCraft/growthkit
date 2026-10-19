import { renderHook } from '@testing-library/react';
import { analyzeEnglishLikeText, useEnglishLikeTextGuard } from '../src';

describe('useEnglishLikeTextGuard', () => {
  it('returns the analyzer result for an accepted message', () => {
    const message = 'Can you help me with ES/NQ exports?';
    const expected = analyzeEnglishLikeText(message);

    const { result } = renderHook(() => useEnglishLikeTextGuard(message));

    expect(result.current).toEqual(expected);
  });

  it('returns the analyzer result for a rejected message', () => {
    const message = 'UFbwWZaefxpMaphkVDvcTKWg';
    const expected = analyzeEnglishLikeText(message);

    const { result } = renderHook(() => useEnglishLikeTextGuard(message));

    expect(result.current).toEqual(expected);
  });
});
