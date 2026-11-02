# Changelog

## 0.0.7 (unreleased)

- Add optional shared commerce SQL with product-scoped checkout attempts, webhook receipts and pending payments.
- Extend the existing Stripe customer mapping to support guests without a duplicate customer table.
- Add generic atomic identify, checkout and webhook RPCs, product mismatch guards and serialized commerce linking.
- Cover fresh/upgrade installs, existing mappings, product isolation, RLS, rollback and retries.
- Keep browser APIs unchanged; the commerce SQL is compatible with the 0.0.6 runtime.

## 0.0.6

- Add `createGrowthKit`, `IUserEvent`, event envelopes, `track`, verified `identify`, and `reset`.
- Persist anonymous visitor/session IDs with blocked-storage fallback and SSR-safe initialization.
- Preserve first-touch and last non-direct attribution with safe URL capture and host exclusions.
- Validate JSON properties and payload limits; retry transient failures twice with stable event IDs.
- Ship additive SQL with RLS, atomic ingestion, identity conflict checks and payment deduplication.
- Include HTTP, Clerk, Supabase, Stripe and reporting examples in the package.
- Preserve existing referral and contact-form APIs. Database setup and application integration are explicit.
