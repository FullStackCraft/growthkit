# Contributing to growthkit

## Setup

```bash
git clone https://github.com/FullStackCraft/growthkit.git
cd growthkit
npm ci
```

## Quality checks

```bash
npm run type-check
npm test
npm run build
npm run verify:dist-version
```

## Release

`0.0.1` release flow:

```bash
npm publish --access public --provenance
```
