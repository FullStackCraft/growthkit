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
