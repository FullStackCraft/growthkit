import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { useReferralUrl } from '../src/useReferralUrl';

describe('useReferralUrl', () => {
  const originalReferrer = Object.getOwnPropertyDescriptor(document, 'referrer');

  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: '',
    });
  });

  afterAll(() => {
    if (originalReferrer) {
      Object.defineProperty(document, 'referrer', originalReferrer);
    }
  });

  it('prefers utm_source over referrer host and classifies as social', async () => {
    window.history.replaceState(
      {},
      '',
      '/?utm_source=reddit&utm_medium=social&utm_campaign=launch'
    );
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://www.google.com/search?q=growthkit',
    });

    const onEvent = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReferralUrl({
        productName: 'site-a',
        onEvent,
      })
    );

    await waitFor(() => expect(result.current.tracked).toBe(true));

    expect(onEvent).toHaveBeenCalledTimes(1);

    const event = onEvent.mock.calls[0][0];
    expect(event.source).toBe('reddit');
    expect(event.source_type).toBe('social');
    expect(event.utm_medium).toBe('social');
    expect(event.utm_campaign).toBe('launch');
  });

  it('falls back to referrer host and classifies as search', async () => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://www.google.com/search?q=test',
    });

    const onEvent = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReferralUrl({
        productName: 'site-b',
        onEvent,
      })
    );

    await waitFor(() => expect(result.current.tracked).toBe(true));

    const event = onEvent.mock.calls[0][0];
    expect(event.source).toContain('google.com');
    expect(event.source_type).toBe('search');
  });

  it('classifies direct traffic when no utm_source or referrer are present', async () => {
    const onEvent = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReferralUrl({
        productName: 'site-c',
        onEvent,
      })
    );

    await waitFor(() => expect(result.current.tracked).toBe(true));

    const event = onEvent.mock.calls[0][0];
    expect(event.source).toBe('direct');
    expect(event.source_type).toBe('direct');
  });

  it('skips tracking when enabled is false', async () => {
    const onEvent = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReferralUrl({
        productName: 'site-d',
        enabled: false,
        onEvent,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(result.current.tracked).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('reports onEvent errors', async () => {
    const onEvent = jest.fn().mockRejectedValue(new Error('insert failed'));

    const { result } = renderHook(() =>
      useReferralUrl({
        productName: 'site-e',
        onEvent,
      })
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.tracked).toBe(false);
    expect(result.current.error?.message).toContain('insert failed');
  });

  it('dedupes landing tracking per tab session', async () => {
    const onEvent = jest.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ productName }) =>
        useReferralUrl({
          productName,
          onEvent,
        }),
      {
        initialProps: { productName: 'site-f' },
      }
    );

    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));

    rerender({ productName: 'site-f' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('merges custom metadata with default metadata', async () => {
    const onEvent = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useReferralUrl({
        productName: 'site-g',
        onEvent,
        metadata: {
          experiment: 'hero-copy-v2',
          variant: 'B',
        },
      })
    );

    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));

    const event = onEvent.mock.calls[0][0];
    expect(event.metadata.library).toBe('@fullstackcraftllc/growthkit');
    expect(event.metadata.library_version).toBeDefined();
    expect(event.metadata.experiment).toBe('hero-copy-v2');
    expect(event.metadata.variant).toBe('B');
  });

  it('returns a clear error when productName is empty', async () => {
    const onEvent = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReferralUrl({
        productName: '   ',
        onEvent,
      })
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toContain('options.productName');
    expect(onEvent).not.toHaveBeenCalled();
  });
});
