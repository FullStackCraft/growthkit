# GrowthKit

[![npm version](https://img.shields.io/npm/v/@fullstackcraftllc/growthkit)](https://www.npmjs.com/package/@fullstackcraftllc/growthkit)

React hooks and TypeScript library for growth instrumentation. Currently focused on referral URL tracking, but may expand in the future.

This is 100% open source with MIT license, enjoy!

## Installation

```bash
npm install @fullstackcraftllc/growthkit
```

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

## Recommended schema

Use [sql/growthkit_referral_events.sql](./sql/growthkit_referral_events.sql).

## Behavior notes

- Landing-only attribution: one event per browser tab session and `productName`.
- Dedupe is intentionally backed by `sessionStorage`.
- If `enabled` is `false`, tracking is skipped.

## Contact-form spam filtering (0.0.4)

`analyzeContactMessage(message)` combines the existing English-like gibberish
guard with deterministic rules for unsolicited sales-page, traffic-generation,
and SEO-service pitches. It catches the two observed marketing messages in
[FUL-389](https://linear.app/full-stack-craft/issue/FUL-389).

```ts
import { analyzeContactMessage, isSpamContactMessage } from '@fullstackcraftllc/growthkit';

const result = analyzeContactMessage(message);
// result: { isSpam, reasons, englishLike }
// reasons: not_english_like | sales_page_pitch | traffic_generation_pitch | seo_service_pitch

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

The source version is `0.0.4`. To integrate, install
`@fullstackcraftllc/growthkit@0.0.4` after that version is published to npm, then
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
