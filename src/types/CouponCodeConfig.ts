export interface ICouponCodeConfig {
  id: string;
  productName: string;
  couponName: string;
  description: string;
  couponCode: string;
  discountPercent: number;
  couponStart: Date;
  couponEnd: Date;
}
