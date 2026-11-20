export function appendCouponCodeToStripeLink(
  stripeLink: string,
  couponCode?: string | null,
): string {
  if (!couponCode || !/^[A-Za-z0-9]+$/.test(couponCode)) return stripeLink;

  try {
    const url = new URL(stripeLink);
    if (url.protocol !== 'https:') return stripeLink;
    url.searchParams.set('prefilled_promo_code', couponCode);
    return url.href;
  } catch {
    return stripeLink;
  }
}
