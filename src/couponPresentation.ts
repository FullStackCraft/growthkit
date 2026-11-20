export type CouponArtwork = 'black-friday' | 'christmas' | 'new-year' | 'cyber-monday' | 'labor-day' | 'default';

const seasons = [
  ['blackfriday', 'black-friday'],
  ['blackweek', 'black-friday'],
  ['christmas', 'christmas'],
  ['xmas', 'christmas'],
  ['newyear', 'new-year'],
  ['cybermonday', 'cyber-monday'],
  ['laborday', 'labor-day'],
  ['labourday', 'labor-day'],
] as const;

export function getCouponArtwork(couponName: string): CouponArtwork {
  const name = couponName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return seasons.find(([keyword]) => name.includes(keyword))?.[1] ?? 'default';
}

export function getCouponOfferUrl(value: string): string | null {
  if (!/^https:\/\/[^/?#]/i.test(value) || /[\s\\]/.test(value)) return null;

  try {
    const url = new URL(value);
    return url.hostname && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** Returns a discounted subtotal in the same minor units as the input, rounded to the nearest unit. */
export function getDiscountedAmount(regularAmount: number, discountPercent: number): number {
  if (!Number.isSafeInteger(regularAmount) || regularAmount < 0) {
    throw new RangeError('The regular amount must be a nonnegative integer in minor currency units.');
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new RangeError('The discount percentage must be between 0 and 100.');
  }
  const remainingBasisPoints = BigInt(10_000 - Math.round(discountPercent * 100));
  return Number((BigInt(regularAmount) * remainingBasisPoints + 5_000n) / 10_000n);
}
