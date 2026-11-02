// Server-only. verify must call Stripe's webhooks.constructEvent with the RAW request body.
import type { Store } from './ingestion';
export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: {
    id: string;
    customer?: string | { id: string } | null;
    mode?: string;
    payment_status?: string;
    amount_total?: number | null;
    amount_paid?: number;
    currency?: string | null;
    status?: string;
  } };
}
export interface StripeWebhookOptions {
  productName: string;
  verify(rawBody: string, signature: string): StripeEvent;
  lookupUser(customerId: string): Promise<string | null>;
  /** Retrieve current subscription/prices and normalize recurring amounts; exclude tax and one-time items. */
  subscriptionMrr(subscriptionId: string): Promise<{ amountMinor: number; currency: string }>;
  store: Store;
}
export function createStripeWebhookHandler(options: StripeWebhookOptions) {
  return async (request: Request): Promise<Response> => {
    let event: StripeEvent;
    try { event = options.verify(await request.text(), request.headers.get('stripe-signature') ?? ''); }
    catch { return new Response('Invalid signature', { status: 400 }); }
    try {
      const object = event.data.object;
      const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
      const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded',
        'invoice.paid', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'];
      if (!supported.includes(event.type)) return new Response(null, { status: 204 });
      if (!customerId) return new Response('Missing customer mapping', { status: 503 });
      const userId = await options.lookupUser(customerId);
      if (!userId) return new Response('Missing customer mapping', { status: 503 });
      let name: string, sourceId = event.id;
      const properties: Record<string, string | number> = { stripe_event_id: event.id, stripe_customer_id: customerId };
      if (event.type.startsWith('checkout.session.')) {
        // Recurring payments are recorded from invoice.paid, avoiding double counting.
        if (object.mode !== 'payment' || object.payment_status !== 'paid') return new Response(null, { status: 204 });
        name = 'payment_succeeded'; sourceId = `checkout:${object.id}:paid`;
        properties.purchase_type = 'one_time'; // Label lifetime only if YOUR catalog says it is lifetime.
        properties.cash_minor = object.amount_total ?? 0;
        properties.currency = object.currency ?? '';
        properties.new_mrr_minor = 0;
      } else if (event.type === 'invoice.paid') {
        name = 'payment_succeeded'; sourceId = `invoice:${object.id}:paid`;
        properties.cash_minor = object.amount_paid ?? 0;
        properties.currency = object.currency ?? '';
      } else {
        // State observations, not MRR deltas. Re-fetch on updated events, which can arrive out of order.
        name = event.type === 'customer.subscription.deleted' ? 'subscription_canceled' : 'subscription_state';
        properties.subscription_id = object.id;
        const mrr = name === 'subscription_canceled' ? null : await options.subscriptionMrr(object.id);
        properties.mrr_minor = mrr?.amountMinor ?? 0;
        properties.currency = mrr?.currency ?? object.currency ?? '';
        properties.status = name === 'subscription_canceled' ? 'canceled' : 'observed';
      }
      await options.store.ingest({ product_name: options.productName, event_id: crypto.randomUUID(), name,
        visitor_id: null, session_id: null, user_id: userId, occurred_at: new Date(event.created * 1000).toISOString(),
        page_url: null, attribution: {}, properties, origin: 'server', source_event_id: sourceId });
      return new Response(null, { status: 204 });
    } catch { return new Response('Webhook processing failed', { status: 500 }); }
  };
}
