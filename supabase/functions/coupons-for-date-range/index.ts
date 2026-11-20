interface CouponRow {
  id: string;
  product_name: string;
  coupon_name: string;
  description: string;
  coupon_code: string;
  discount_percent: number;
  coupon_start: string;
  coupon_end: string;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Expose-Headers': 'X-GrowthKit-Server-Time',
  'Cache-Control': 'no-store',
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, {
        status: 405,
        headers: { ...headers, Allow: 'GET, OPTIONS' },
      });
    }

    const products = new URL(request.url).searchParams.getAll('product_name');
    const product = products[0];
    if (products.length !== 1 || !/^[a-z0-9][a-z0-9._-]{0,252}$/.test(product)) {
      return Response.json({ error: 'A valid product_name is required' }, { status: 400, headers });
    }

    try {
      const projectUrl = Deno.env.get('SUPABASE_URL');
      const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
      const secret = secretKeys ? JSON.parse(secretKeys).default : undefined;
      const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const apiKey = secret || legacyKey;
      if (!projectUrl || !apiKey) throw new Error('Missing Supabase connection settings');

      const now = new Date().toISOString();
      const url = new URL('/rest/v1/growthkit_coupons', projectUrl);
      url.search = new URLSearchParams({
        select: 'id,product_name,coupon_name,description,coupon_code,discount_percent,coupon_start,coupon_end',
        product_name: `eq.${product}`,
        coupon_start: `lte.${now}`,
        coupon_end: `gt.${now}`,
        order: 'discount_percent.desc,coupon_start.desc,id.asc',
        limit: '1',
      }).toString();

      const response = await fetch(url, {
        headers: secret ? { apikey: apiKey } : { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Coupon lookup failed (HTTP ${response.status})`);

      const [row] = await response.json() as CouponRow[];
      const coupon = row ? {
        id: row.id,
        productName: row.product_name,
        couponName: row.coupon_name,
        description: row.description,
        couponCode: row.coupon_code,
        discountPercent: row.discount_percent,
        couponStart: new Date(row.coupon_start).toISOString(),
        couponEnd: new Date(row.coupon_end).toISOString(),
      } : null;
      return Response.json(coupon, {
        headers: { ...headers, 'X-GrowthKit-Server-Time': new Date().toISOString() },
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Coupon lookup failed');
      return Response.json({ error: 'Coupon lookup unavailable' }, { status: 502, headers });
    }
  },
};
