import { act, fireEvent, render, screen } from '@testing-library/react';
import { appendCouponCodeToStripeLink } from '../src/appendCouponCodeToStripeLink';
import { CouponBanner, CouponCampaignProvider, useCouponCode } from '../src/coupons';
import { getCouponArtwork, getDiscountedAmount } from '../src/couponPresentation';

const productName = 'hindsightapi.com';
const paymentLink = 'https://buy.stripe.com/test_link?client_reference_id=checkout#top';
const originalFetch = globalThis.fetch;

function Checkout() {
  const coupon = useCouponCode(productName);
  return <a href={appendCouponCodeToStripeLink(paymentLink, coupon?.couponCode)}>Buy now</a>;
}

function renderCampaign(endpoint?: string) {
  return render(
    <CouponCampaignProvider productName={productName} endpoint={endpoint}>
      <Checkout />
      <CouponBanner productName={productName} />
    </CouponCampaignProvider>,
  );
}

function couponResponse(now: Date, start: Date, end: Date, couponName = 'Black Friday', couponCode = 'FRIDAY50') {
  return {
    ok: true,
    headers: { get: () => now.toISOString() },
    json: async () => ({
      id: 'test-campaign', productName, couponName, description: 'Save at Stripe Checkout.',
      couponCode, discountPercent: 50, couponStart: start.toISOString(), couponEnd: end.toISOString(),
    }),
  };
}

afterEach(() => {
  window.sessionStorage.clear();
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

test('loads asynchronously, keeps prefill after dismissal, then clears it at expiry', async () => {
  jest.useFakeTimers();
  const now = new Date('2026-11-27T10:00:00Z');
  const end = new Date(now.getTime() + 1000);
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(couponResponse(now, now, end))
    .mockResolvedValue({ ok: true, headers: { get: () => end.toISOString() }, json: async () => null });
  globalThis.fetch = fetchMock;

  renderCampaign('/coupons');
  const link = screen.getByRole('link', { name: 'Buy now' });
  expect(link.getAttribute('href')).toBe(paymentLink);
  expect(screen.queryByRole('dialog')).toBeNull();

  await act(async () => {});
  expect(fetchMock.mock.calls[0][0].searchParams.get('product_name')).toBe(productName);
  const dialog = screen.getByRole('dialog', { name: 'Black Friday' });
  expect(dialog.getAttribute('data-season')).toBe('black-friday');
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Black Friday' }));
  expect(dialog.querySelector('code')?.textContent).toBe('FRIDAY50');
  expect(dialog.querySelector('.gk-coupon-amount')?.textContent).toBe('50%');
  expect(dialog.querySelector('.gk-coupon-rate')?.textContent).toBe('50% off');
  expect(screen.getByText('Use code')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /background animation/i })).toBeNull();
  expect(link.getAttribute('href')).toBe(
    'https://buy.stripe.com/test_link?client_reference_id=checkout&prefilled_promo_code=FRIDAY50#top',
  );

  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(link.getAttribute('href')).toContain('prefilled_promo_code=FRIDAY50');

  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(link.getAttribute('href')).toBe(paymentLink);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('uses a campaign HTTPS link as the AppSumo action instead of a promo code', async () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const end = new Date(now.getTime() + 60_000);
  const appSumoUrl = 'https://appsumo.com/products/example/?ref=campaign#pricing';
  globalThis.fetch = jest.fn().mockResolvedValue(couponResponse(now, now, end, 'Black Friday', appSumoUrl));
  render(
    <CouponCampaignProvider productName={productName} endpoint="/coupons">
      <Checkout />
      <CouponBanner productName={productName} plansHref="/pricing" />
    </CouponCampaignProvider>,
  );
  await act(async () => {});

  const action = screen.getByRole('link', { name: 'Visit AppSumo' });
  expect(action.getAttribute('href')).toBe(appSumoUrl);
  expect(action.getAttribute('target')).toBe('_blank');
  expect(screen.queryByText('Use code')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Copy coupon code' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'See discounted plans' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Buy now' }).getAttribute('href')).toBe(paymentLink);
});

test.each(['http://appsumo.com', 'https:///appsumo.com'])('rejects unusable coupon link %s', async (couponCode) => {
  const now = new Date('2026-11-27T10:00:00Z');
  const end = new Date(now.getTime() + 60_000);
  globalThis.fetch = jest.fn().mockResolvedValue(couponResponse(now, now, end, 'Black Friday', couponCode));
  renderCampaign('/coupons');
  await act(async () => {});

  expect(screen.queryByRole('dialog')).toBeNull();
});

test('ignores a future campaign even when the visitor clock is ahead', async () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const start = new Date(now.getTime() + 1000);
  const end = new Date(now.getTime() + 2000);
  globalThis.fetch = jest.fn().mockResolvedValue(couponResponse(now, start, end));
  renderCampaign('/coupons');

  await act(async () => {});
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('link', { name: 'Buy now' }).getAttribute('href')).toBe(paymentLink);
});

test('shows a server-time countdown and compact offer with the supplied plan scope', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2027-01-01T00:00:00Z'));
  const now = new Date('2026-11-27T10:00:00Z');
  const end = new Date(now.getTime() + 62_000);
  globalThis.fetch = jest.fn().mockResolvedValue(couponResponse(now, now, end, 'Flash Sale'));
  render(
    <CouponCampaignProvider productName={productName} endpoint="/coupons">
      <CouponBanner productName={productName} discountScope="lifetime plans" plansHref="/pricing" />
    </CouponCampaignProvider>,
  );
  await act(async () => {});

  const dialog = screen.getByRole('dialog', { name: 'Flash Sale' });
  expect(dialog.getAttribute('data-layout')).toBe('compact');
  expect(dialog.querySelector('.gk-coupon-art')).toBeNull();
  expect(dialog.querySelector('.gk-coupon-rate')?.textContent).toBe('50% off');
  expect(screen.getByText('lifetime plans')).toBeTruthy();
  const plansLink = screen.getByRole('link', { name: 'See discounted plans' });
  expect(plansLink.getAttribute('href')).toBe('/pricing');
  const countdown = screen.getByRole('timer');
  const digits = () => Array.from(countdown.querySelectorAll('strong'), cell => cell.textContent);
  expect(digits()).toEqual(['00', '00', '01', '02']);
  const seconds = () => countdown.querySelector('[data-unit="sec"] strong');
  const initialSeconds = seconds();
  expect(initialSeconds?.textContent).toBe('02');
  await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
  expect(digits()).toEqual(['00', '00', '01', '00']);
  expect(seconds()).toBe(initialSeconds);
  plansLink.addEventListener('click', (event) => event.preventDefault());
  fireEvent.click(plansLink);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(window.sessionStorage.getItem(`growthkit:coupon:${productName}:test-campaign`)).toBe('1');
});

test.each([
  ['XMAS Christmas Sale', 'christmas'],
  ['BlackFriday 2026', 'black-friday'],
  ['Black Week', 'black-friday'],
  ["New Year's Eve", 'new-year'],
  ['Cyber-Monday 2026', 'cyber-monday'],
  ['Labor day sale', 'labor-day'],
  ['Holiday Coupon Test', 'default'],
])('uses the matching artwork for %s', (name, artwork) => {
  expect(getCouponArtwork(name)).toBe(artwork);
});

test.each([
  [19995, 20, 15996],
  [19995, 50, 9998],
  [19995, 49.99, 9999],
  [9995, 20, 7996],
  [9995, 100, 0],
])('rounds %i minor units at %f percent off to %i', (amount, percent, expected) => {
  expect(getDiscountedAmount(amount, percent)).toBe(expected);
});

test('suppresses CouponBanner when enabled is false without dismissing or clearing useCouponCode', async () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const end = new Date(now.getTime() + 60_000);
  globalThis.fetch = jest.fn().mockResolvedValue(couponResponse(now, now, end));

  const { rerender } = render(
    <CouponCampaignProvider productName={productName} endpoint="/coupons">
      <Checkout />
      <CouponBanner productName={productName} enabled={false} />
    </CouponCampaignProvider>,
  );
  await act(async () => {});

  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('link', { name: 'Buy now' }).getAttribute('href')).toContain('prefilled_promo_code=FRIDAY50');
  expect(window.sessionStorage.getItem(`growthkit:coupon:${productName}:test-campaign`)).toBeNull();

  rerender(
    <CouponCampaignProvider productName={productName} endpoint="/coupons">
      <Checkout />
      <CouponBanner productName={productName} enabled />
    </CouponCampaignProvider>,
  );
  expect(screen.getByRole('dialog', { name: 'Black Friday' })).toBeTruthy();

  rerender(
    <CouponCampaignProvider productName={productName} endpoint="/coupons">
      <Checkout />
      <CouponBanner productName={productName} enabled={false} />
    </CouponCampaignProvider>,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(window.sessionStorage.getItem(`growthkit:coupon:${productName}:test-campaign`)).toBeNull();
});

test('skips fetching and clears campaign context when CouponCampaignProvider enabled is false', async () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const end = new Date(now.getTime() + 60_000);
  const fetchMock = jest.fn().mockResolvedValue(couponResponse(now, now, end));
  globalThis.fetch = fetchMock;

  const { rerender } = render(
    <CouponCampaignProvider productName={productName} endpoint="/coupons" enabled={false}>
      <Checkout />
      <CouponBanner productName={productName} />
    </CouponCampaignProvider>,
  );
  await act(async () => {});

  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('link', { name: 'Buy now' }).getAttribute('href')).toBe(paymentLink);

  rerender(
    <CouponCampaignProvider productName={productName} endpoint="/coupons" enabled>
      <Checkout />
      <CouponBanner productName={productName} />
    </CouponCampaignProvider>,
  );
  await act(async () => {});

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('dialog', { name: 'Black Friday' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Buy now' }).getAttribute('href')).toContain('prefilled_promo_code=FRIDAY50');

  rerender(
    <CouponCampaignProvider productName={productName} endpoint="/coupons" enabled={false}>
      <Checkout />
      <CouponBanner productName={productName} />
    </CouponCampaignProvider>,
  );

  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('link', { name: 'Buy now' }).getAttribute('href')).toBe(paymentLink);
});
