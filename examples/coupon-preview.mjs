import { createServer } from 'node:http';

const campaignStart = Date.now() - 60_000;
const campaignEnd = Date.now() + 20 * 60_000;
const campaigns = new Map([
  ['hindsightapi.com', {
    id: 'hindsight-local-preview',
    couponName: 'Holiday sale preview',
    description: 'Example offer for previewing the campaign on HindsightAPI.',
    couponCode: 'PREVIEW25',
    discountPercent: 25,
  }],
  ['vannacharm.com', {
    id: 'vannacharm-local-preview',
    couponName: 'Christmas Sale',
    description: 'Use PREVIEW50 for 50% off at Stripe Checkout.',
    couponCode: 'PREVIEW50',
    discountPercent: 50,
  }],
]);

createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787');
  const now = Date.now();
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-GrowthKit-Server-Time',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-GrowthKit-Server-Time': new Date(now).toISOString(),
  };
  if (req.method !== 'GET' || url.pathname !== '/coupons-for-date-range') {
    res.writeHead(404, headers).end('null');
    return;
  }

  const productName = url.searchParams.get('product_name');
  const campaign = campaigns.get(productName);
  const coupon = campaign && now >= campaignStart && now < campaignEnd ? {
    ...campaign,
    productName,
    couponStart: new Date(campaignStart).toISOString(),
    couponEnd: new Date(campaignEnd).toISOString(),
  } : null;
  res.writeHead(200, headers).end(JSON.stringify(coupon));
}).listen(8787, '127.0.0.1', () => {
  console.log('Coupon preview: http://127.0.0.1:8787/coupons-for-date-range');
});
