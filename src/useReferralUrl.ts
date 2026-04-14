import { useEffect, useMemo, useState } from 'react';
import type { ReferralEvent, UseReferralUrlOptions, UseReferralUrlResult } from './types';
import { alreadyTracked, asError, buildEvent, markTracked, storageKey } from './utils';

export function useReferralUrl(options: UseReferralUrlOptions): UseReferralUrlResult {
  const { productName, enabled = true, onEvent, metadata } = options;

  const [event, setEvent] = useState<ReferralEvent | null>(null);
  const [tracked, setTracked] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const key = useMemo(() => storageKey(productName), [productName]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const cleanedProductName = productName?.trim();
    if (!cleanedProductName) {
      setError(new Error('`options.productName` is required.'));
      return;
    }

    if (alreadyTracked(key)) return;

    const nextEvent = buildEvent(cleanedProductName, metadata);
    setEvent(nextEvent);
    markTracked(key);

    let cancelled = false;

    (async () => {
      try {
        if (onEvent) {
          await onEvent(nextEvent);
        }

        if (!cancelled) {
          setTracked(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(asError(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, key, metadata, onEvent, productName]);

  return { event, tracked, error };
}
