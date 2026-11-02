# GrowthKit integration examples

These examples are application code, not a hosted collector. Copy and adapt them;
they import the public `@fullstackcraftllc/growthkit` API. Clerk, Stripe and Supabase
are optional application dependencies, never GrowthKit dependencies. Node 18+ is
required for the server examples (Request, Response and fetch).

## Database installation and upgrade

Run [../sql/0.0.6_events.sql](../sql/0.0.6_events.sql) as the database owner in your
SQL editor or with `psql -v ON_ERROR_STOP=1 -f sql/0.0.6_events.sql`.

- **Fresh install:** run that file. If also using the legacy referral hook, run
  `sql/growthkit_referral_events.sql` first, then `sql/0.0.6_events.sql`.
- **Upgrade from 0.0.5:** keep the existing referral table and run only
  `sql/0.0.6_events.sql`. Do not rerun legacy setup or backfill invented identities.
- New SQL can be rerun; existing referral data and policies are untouched.
- Nothing runs automatically when installing or importing the package.
- On plain Postgres, grant your trusted ingestion role table privileges and EXECUTE
  on the two RPC functions. It needs an appropriate owner/BYPASSRLS role because
  there are intentionally no browser-accessible policies. On Supabase, the SQL
  grants the existing `service_role` role access and revokes anon/authenticated access.
- The Supabase Data API must expose `public` for the server RPC adapter to work.
  Use a server-only secret or legacy service-role key; never put it in client code.
- The legacy referral schema permits anonymous inserts. The new schema does not
  change that legacy policy; do not send identity or authoritative events there.

## Browser transport

Use [browser.ts](browser.ts) as a starting point. Construct one tracker per product
outside component render paths. `track()` sends one event per call; page views and
activation are explicit calls, not automatic effects.

```ts
await growthkit.track({ name: 'page_viewed' });
// Only after the chart/exposure analysis actually succeeds:
await growthkit.track({
  name: 'analysis_completed',
  properties: { symbol: 'SPY', analysisType: 'gamma' },
});
```

A page view is needed at session entry to capture acquisition before signup. If you
only call `track` on activation, unactivated visitors will be absent from the funnel.
Browser events carry first touch, last non-direct touch, and session touch. Query
strings/fragments are omitted from URLs; UTM fields are retained explicitly. Do not
put secrets or personal information in UTMs or event properties. Events are capped
at 64 KiB UTF-8; JSON properties may nest at most ten levels.

Set `enabled: false` until your application permits analytics. Disabled clients
perform no delivery or storage writes. Construct a new enabled client when the
application enables tracking; reset and replace it when disabling. Import/construction
is SSR-safe; operations on the server are no-ops. Browser IDs persist per origin and
product; different devices or cleared storage create new IDs. Blocked storage falls
back to one tracker instance's memory. Sessions expire after 30 minutes without a
tracking/identification call. Reset rotates IDs and clears attribution, so a new
visitor's first touch may be the current logout page.

`onEvent(event, {signal})` and `onIdentify({visitorId}, {signal})` must forward the
AbortSignal to fetch. `reset()` aborts pending delivery/retries, but cannot undo a
request already committed by your backend. Transient `TypeError` network errors or
`GrowthKitTransportError(message, true)` receive two retries at 100/200 ms; ordinary
errors fail immediately. There is no durable queue or delivery guarantee. Keep
callbacks idempotent; SQL deduplicates retries by event ID. Handle rejected promises
in your application without breaking its primary user flow.

## Verified ingestion and Clerk

[ingestion.ts](ingestion.ts) provides handlers with body limits, origin checks,
event allowlisting and dependency-injected authentication/rate limiting.
[supabase-store.ts](supabase-store.ts) persists using the atomic server-only RPCs.

Configure `productName` and `allowedOrigin` on the server. They are not selected by
browser payloads. Supply a shared atomic rate limiter keyed using your platform's
trusted client-IP/session facilities. Do not trust arbitrary forwarding headers.
Authentication must reject invalid supplied credentials, rather than treating them
as signed out. Allow browser names such as `page_viewed`, `analysis_completed`, and
`checkout_started`; keep signup/payment/subscription names server-only.

Example with Next.js and Clerk (`@clerk/nextjs` is installed by the application):

```ts
import { auth } from '@clerk/nextjs/server';

const handlers = createIngestionHandlers({
  productName: 'example.com',
  allowedOrigin: 'https://example.com',
  authenticate: async () => {
    const { userId } = await auth();
    return userId ? { userId } : null;
  },
  rateLimit: request => applicationRateLimiter.allow(request),
  store: createSupabaseStore(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!),
  allowedBrowserEvents: ['page_viewed', 'analysis_completed', 'checkout_started'],
});
// /api/growthkit/track/route.ts: export const POST = handlers.track;
// /api/growthkit/identify/route.ts: export const POST = handlers.identify;
```

Call `await growthkit.identify()` after Clerk is loaded and signed in. It sends only
the browser ID; the server derives the account ID from Clerk and returns it. Concurrent
calls share one request; subsequent calls reverify authentication without duplicating
the SQL link. Account IDs are retained in memory, never treated as credentials.
Ignore browser `user_id` on every authenticated event. The sample does this and
rejects links already associated with another account. Call `reset()` before logout
or switching accounts; identify again after the new account's login completes.

A UUID is not proof of browser ownership: anyone who obtains a visitor ID could
attempt to claim that anonymous history. Treat pre-login attribution as untrusted
analytics. For stronger protection, issue and verify a server-signed browser binding
cookie before accepting links. Never use identity links to authorize access or billing.

Use [server-events.ts](server-events.ts) to record `signup_completed` from a verified
account-creation event. Reuse its stable source ID on retries. Account linking alone
does not establish signup time or successful payment.

Clerk reference: https://clerk.com/docs/reference/backend/authenticate-request
Supabase RLS reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Stripe and recurring revenue

Use [stripe-webhook.ts](stripe-webhook.ts) with these application adapters:

```ts
const handler = createStripeWebhookHandler({
  productName: 'example.com',
  verify: (raw, signature) => stripe.webhooks.constructEvent(raw, signature, webhookSecret),
  lookupUser: customerId => lookupGrowthKitStripeMapping(customerId),
  subscriptionMrr: subscriptionId => retrieveNormalizedSubscriptionMrr(subscriptionId),
  store,
});
```

Create the Stripe customer for an authenticated account and persist its explicit
`growthkit_stripe_customers` mapping in your trusted checkout handler. Keep that
mapping immutable per customer; email matching is not an identity mechanism. For
one-time Checkout, ensure it uses a mapped customer. Missing mappings return 503
so webhook delivery can retry. Store credentials in the deployment secret store.

Subscribe to Checkout completion/asynchronous success, `invoice.paid`, and subscription
created/updated/deleted events. Verify the signature against the untouched request
body. Paid one-time Checkout records cash and zero new MRR; invoice events handle
recurring cash, avoiding double counting with Checkout. Stable invoice/Checkout IDs
also deduplicate separate Stripe events for the same logical payment.

`subscriptionMrr` must retrieve the latest subscription and prices, return zero for
incomplete/trialing/canceled subscriptions, normalize year / 12 and month / interval
count, account for quantity/discounts, and exclude tax and one-time items. Do not
combine currencies. Use Stripe's billing metrics for usage-based prices. The example
records subscription state observations, not blindly additive MRR deltas.

Snapshot webhooks may arrive out of order; the example re-fetches subscription state.
For production financial reporting, reconcile current state with Stripe and serialize
processing per subscription if concurrent deliveries matter. The SQL revenue report
is an instrumentation report, not a full invoice/refund/discount/FX ledger. Extend the
handler with refund events when reporting net cash. Cancellation of a subscription
does not imply a refund. Lifetime purchases are one-time cash and zero MRR.

Stripe reference: https://docs.stripe.com/webhooks

## Reports

Execute the following settings and a report in the same SQL session:

```sql
set growthkit.product = 'example.com';
set growthkit.start_at = '2026-11-01T00:00:00Z';
set growthkit.end_at = '2026-12-01T00:00:00Z';
```

- [Acquisition funnel](../sql/reports/acquisition.sql): browser acquisition cohort,
  signups, activation, payment and signup-to-paid rate. Activation name defaults to
  `analysis_completed`; adapt it to your product. Account counts across sources can
  overlap when an account has several browsers; do not sum them as unique people.
- [Conversion attribution](../sql/reports/conversion-attribution.sql): each account's
  first recorded payment with first touch, last non-direct touch and an attributable
  flag. Coverage is attributable rows / total rows. Missing attribution is unknown.
- [Recurring revenue](../sql/reports/recurring-revenue.sql): first positive observed
  subscription MRR and retained MRR/accounts by source and currency, separately from
  one-time revenue. Existing subscribers without earlier history are not provably new.

Historical anonymous traffic cannot be reliably linked retroactively. Reports become
useful after the app records identity, signup, activation and authoritative payment events.

For reusable guest checkout, shared customer mappings and atomic webhook receipts, see
[commerce.md](./commerce.md) and the optional [commerce SQL](../sql/0.0.7_commerce.sql).
