import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ICouponCodeConfig } from './types/CouponCodeConfig';

export interface CouponCampaignProviderProps {
  productName: string;
  endpoint?: string;
  children: ReactNode;
}

interface CampaignSnapshot {
  source: string;
  coupon: ICouponCodeConfig;
  expiresAt: number;
}

const CouponContext = createContext<CampaignSnapshot | null>(null);
const MAX_TIMEOUT_MS = 2_147_483_647;

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseCoupon(value: unknown, productName: string): ICouponCodeConfig | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const { id, couponName, description, couponCode, discountPercent, couponStart, couponEnd } = row;
  if (
    row.productName !== productName || !isNonemptyString(id) || !isNonemptyString(couponName) ||
    !isNonemptyString(description) || !isNonemptyString(couponCode) || !/^[A-Za-z0-9]+$/.test(couponCode) ||
    typeof discountPercent !== 'number' || !(discountPercent > 0 && discountPercent <= 100) ||
    typeof couponStart !== 'string' || typeof couponEnd !== 'string'
  ) return null;

  const start = new Date(couponStart);
  const end = new Date(couponEnd);
  if (!(start.getTime() < end.getTime())) return null;
  return { id, productName, couponName, description, couponCode, discountPercent, couponStart: start, couponEnd: end };
}

export function CouponCampaignProvider({ productName, endpoint, children }: CouponCampaignProviderProps) {
  const normalizedProduct = productName.trim().toLowerCase();
  const source = JSON.stringify([endpoint, normalizedProduct]);
  const [snapshot, setSnapshot] = useState<CampaignSnapshot | null>(null);

  useEffect(() => {
    if (!endpoint || !normalizedProduct) return;
    const lookupEndpoint = endpoint;
    let request: AbortController | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    function clearExpiry() {
      clearTimeout(expiryTimer);
    }

    async function refresh() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const requestTimeout = setTimeout(() => controller.abort('timeout'), 8000);
      try {
        const url = new URL(lookupEndpoint, window.location.href);
        url.searchParams.set('product_name', normalizedProduct);
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Coupon lookup failed');
        const coupon = parseCoupon(await response.json(), normalizedProduct);
        if (controller.signal.aborted) return;
        clearExpiry();

        const serverTime = Date.parse(response.headers.get('X-GrowthKit-Server-Time') ?? '');
        const serverClock = Number.isFinite(serverTime) ? serverTime : Date.now();
        const remaining = coupon ? coupon.couponEnd.getTime() - serverClock : 0;
        const expiresAt = performance.now() + remaining;

        if (!coupon || coupon.couponStart.getTime() > serverClock || remaining <= 0) {
          setSnapshot(null);
          return;
        }

        setSnapshot({ source, coupon, expiresAt });
        function expire() {
          const wait = expiresAt - performance.now();
          if (wait > 0) {
            expiryTimer = setTimeout(expire, Math.min(wait, MAX_TIMEOUT_MS));
            return;
          }
          setSnapshot(null);
          void refresh();
        }
        expiryTimer = setTimeout(expire, Math.min(expiresAt - performance.now(), MAX_TIMEOUT_MS));
      } catch {
        if (!controller.signal.aborted || controller.signal.reason === 'timeout') {
          clearExpiry();
          setSnapshot(null);
        }
      } finally {
        clearTimeout(requestTimeout);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void refresh();
    }

    void refresh();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      request?.abort();
      clearExpiry();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [endpoint, normalizedProduct, source]);

  const campaign = snapshot?.source === source ? snapshot : null;
  return <CouponContext.Provider value={campaign}>{children}</CouponContext.Provider>;
}

export function useCouponCampaign(productName: string): CampaignSnapshot | null {
  const campaign = useContext(CouponContext);
  return campaign?.coupon.productName === productName.trim().toLowerCase() ? campaign : null;
}

export function useCouponCode(productName: string): ICouponCodeConfig | null {
  return useCouponCampaign(productName)?.coupon ?? null;
}
