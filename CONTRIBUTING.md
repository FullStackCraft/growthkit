# Contributing to GrowthKit

## Setup

```bash
git clone https://github.com/FullStackCraft/growthkit.git
cd growthkit
npm ci
```

## Quality checks

```bash
npm run type-check
npm test -- --runInBand --watchman=false
npm run test:sql # Docker; disposable PostgreSQL 15 only
npm run build
npm run verify:dist-version
npm pack --dry-run
```

SQL is a reusable reference schema, not an automatic migration runner. Test both fresh
installation and upgrade without deleting historical referral rows. Examples are type-checked
with the package; keep provider SDKs out of runtime dependencies.

## Release

1. Update `package.json`, lockfile, README and CHANGELOG together (target: 0.0.7).
2. Complete quality checks. Pack with `npm pack`; inspect the archive for dist/types,
   README, examples and SQL. Install the tarball in a clean temporary consumer.
3. Run `node scripts/smoke-package.cjs /absolute/path/to/the.tgz` to smoke-test CommonJS, ESM, TypeScript, SSR and the packaged examples.
4. Publish the verified tarball with `npm publish ./fullstackcraftllc-growthkit-0.0.7.tgz --access public`.
   Use `--provenance` in supported CI with OIDC. Never claim source availability means npm publication.
5. Verify `npm view @fullstackcraftllc/growthkit@0.0.7 version dist.integrity`, then install
   that exact published version into a fresh consumer and repeat the import checks.

Do not apply reference migrations to production databases or integrate consuming apps as
part of a package release. Review schema changes in each consuming application separately.
