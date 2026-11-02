# GrowthKit

[![npm version](https://img.shields.io/npm/v/@fullstackcraftllc/growthkit)](https://www.npmjs.com/package/@fullstackcraftllc/growthkit)

React hooks and TypeScript library for growth instrumentation. Includes referral tracking, typed product events, anonymous identity, verified account linking, attribution, and contact-form spam filtering.

This is 100% open source with MIT license, enjoy!

## Installation

```bash
npm install @fullstackcraftllc/growthkit
```

## Events, identity and attribution (0.0.6)

```ts
import { createGrowthKit } from '@fullstackcraftllc/growthkit';

const growthkit = createGrowthKit({
  productName: 'example.com',
  onEvent: async (event, { signal }) => {
    // POST to your application collector; validate HTTP status and forward signal.
    await applicationTransport.track(event, signal);
  },
  onIdentify: async ({ visitorId }, { signal }) => {
    // Your server verifies authentication and returns { userId }.
    return applicationTransport.identify(visitorId, signal);
  },
});

await growthkit.track({ name: 'analysis_completed', properties: { symbol: 'SPY' } });
await growthkit.identify(); // after authenticated signup/login; no user ID argument
// On logout or account switching:
growthkit.reset();
```

`IUserEvent` requires `name` and accepts JSON `properties`. GrowthKit attaches anonymous
visitor/session IDs, occurrence time, sanitized page and attribution snapshots. Browser
storage is product-scoped; blocked storage falls back to memory. First touch is preserved,
and direct returns do not overwrite last non-direct touch. Tracking is explicit; call
`track({ name: 'page_viewed' })` at session entry to measure unactivated visitors too.

**Setup SQL:** [sql/0.0.6_events.sql](./sql/0.0.6_events.sql).
Fresh installs run this file; if using the legacy referral hook too, run
[sql/growthkit_referral_events.sql](./sql/growthkit_referral_events.sql) first.
Existing 0.0.5 installations keep their referral table and run only the new 0.0.6 file.
No migration runs automatically. New identity/event tables require trusted server ingestion;
never expose a database secret in browser code. Existing hook and spam-filter APIs are unchanged.

See [integration examples](./examples/README.md) for working HTTP transport, ingestion,
Clerk, Supabase, Stripe, consent/identity limitations, retries and
[first/last-touch, funnel and recurring-revenue SQL](./sql/reports/).
All SQL and examples are included in the npm package. GrowthKit adds no provider SDK dependencies.

## Shared checkout and billing SQL (0.0.7)

The optional [commerce extension](./sql/0.0.7_commerce.sql) supports multiple products
in one database. It adds three tables: `growthkit_checkout_attempts`,
`growthkit_webhook_receipts`, and `growthkit_pending_payments`. It extends the existing
`growthkit_stripe_customers` with nullable guest visitor/session IDs and permits a
missing account until verified signup. Existing account mappings are preserved.
All seven tables use `product_name` in keys/lookups; no per-product tables are needed.

Execution order (explicit, never automatic):

1. Optional legacy referrals: [sql/growthkit_referral_events.sql](./sql/growthkit_referral_events.sql).
2. Events/identity base: [sql/0.0.6_events.sql](./sql/0.0.6_events.sql).
3. Optional checkout/billing: [sql/0.0.7_commerce.sql](./sql/0.0.7_commerce.sql).

Upgrading an existing 0.0.6 database for commerce requires only step 3. This SQL is
compatible with the 0.0.6 client runtime and can be rerun. Run as database owner.
Use the same shared schema for every product; see the [commerce integration guide](./examples/commerce.md)
for RPCs and trusted backend responsibilities. No provider SDK dependencies are added.

## API

```ts
useReferralUrl(options: UseReferralUrlOptions): UseReferralUrlResult
```

```ts
export interface UseReferralUrlOptions {
  productName: string;
  enabled?: boolean;
  onEvent?: (event: ReferralEvent) => void | Promise<void>;
  metadata?: Record<string, JsonValue>;
}
```

## Usage

```tsx
import { useReferralUrl } from '@fullstackcraftllc/growthkit';

function MarketingLayout() {
  useReferralUrl({
    productName: 'vannacharm.com',
    onEvent: async (event) => {
      console.log('track event', event);
    },
    metadata: {
      experiment: 'hero-copy-v2',
      variant: 'B',
    },
  });

  return null;
}
```

### Supabase example

```tsx
import { useReferralUrl } from '@fullstackcraftllc/growthkit';
import { supabase } from './supabaseClient';

function MarketingLayout() {
  useReferralUrl({
    productName: 'vannacharm.com',
    onEvent: async (event) => {
      const { error } = await supabase.from('growthkit_referral_events').insert(event);
      if (error) throw error;
    },
  });

  return null;
}
```

## Legacy referral schema

Use [sql/growthkit_referral_events.sql](./sql/growthkit_referral_events.sql).

## Behavior notes

- Landing-only attribution: one event per browser tab session and `productName`.
- Dedupe is intentionally backed by `sessionStorage`.
- If `enabled` is `false`, tracking is skipped.

## Contact-form spam filtering (0.0.5)

`analyzeContactMessage(message)` combines the existing English-like gibberish
guard with deterministic rules for unsolicited sales-page, traffic-generation,
SEO-service, and agency/marketing outreach pitches. It catches the observed
marketing messages in [FUL-389](https://linear.app/full-stack-craft/issue/FUL-389).

```ts
import { analyzeContactMessage, isSpamContactMessage } from '@fullstackcraftllc/growthkit';

const result = analyzeContactMessage(message);
// result: { isSpam, reasons, englishLike }
// reasons: not_english_like | sales_page_pitch | traffic_generation_pitch | seo_service_pitch | agency_marketing_pitch

if (isSpamContactMessage(message)) {
  // Skip the email/Slack workflow or send to your review queue.
  return;
}
// Continue the normal contact workflow.
```

Run this check in the **server handler before sending email or Slack messages**.
A browser check is optional; direct POSTs bypass it. Validate the request and
required fields separately. The library performs no I/O, sends no messages, and
does not choose your HTTP response or discard submissions itself.

Upgrading alone does **not** enable the new rules: replace contact-form calls to
`isEnglishLikeText(message)` with `!isSpamContactMessage(message)`, or use the
analysis result. `isEnglishLikeText`, `analyzeEnglishLikeText`, and
`useEnglishLikeTextGuard` keep their existing language-only behavior.

The English-like guard is enabled by default and can reject non-English text.
For multilingual forms, use `analyzeContactMessage(message, { englishLike: false })`
or pass that option to `isSpamContactMessage`; the English sales-pitch rules still
run. You can pass existing `EnglishLikeTextOptions` as `englishLike` instead.

The outreach rules require a service offer plus a request to engage; mentioning
"SEO", "keywords", "traffic", or "sales page" alone is not a spam verdict.
They are heuristics for known patterns, not a comprehensive spam classifier.
Other wording may pass, and quoted pitches or unusual legitimate messages may
match. Review flagged submissions during rollout, monitor reason codes without
logging private message bodies, and add both spam and legitimate regression
fixtures as new examples arrive. Sender blacklists, job solicitations, rate
limiting, and CAPTCHA are outside this filter's scope.

### Release and colleague handoff

The source version is `0.0.5`. To integrate, install
`@fullstackcraftllc/growthkit@0.0.5` after that version is published to npm, then
add the server check above to each SaaS contact handler. GitHub source availability
and npm publication are separate steps. Go handlers need an equivalent Go check
or a JavaScript handler capable of using this package; a client-only import does
not protect a Go endpoint.

## Development

```bash
npm ci
npm run type-check
npm test
npm run build
npm run verify:dist-version
```

## License

MIT
