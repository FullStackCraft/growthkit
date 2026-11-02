# Changelog

## 0.0.6

- Add `createGrowthKit`, `IUserEvent`, event envelopes, `track`, verified `identify`, and `reset`.
- Persist anonymous visitor/session IDs with blocked-storage fallback and SSR-safe initialization.
- Preserve first-touch and last non-direct attribution with safe URL capture and host exclusions.
- Validate JSON properties and payload limits; retry transient failures twice with stable event IDs.
- Ship additive SQL with RLS, atomic ingestion, identity conflict checks and payment deduplication.
- Include HTTP, Clerk, Supabase, Stripe and reporting examples in the package.
- Preserve existing referral and contact-form APIs. Database setup and application integration are explicit.
