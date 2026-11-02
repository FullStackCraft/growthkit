// Install the tarball or exact npm version in a clean consumer and verify published surfaces.
const { mkdtempSync, writeFileSync, existsSync, readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const spec = process.argv[2];
if (!spec) throw new Error('Usage: node scripts/smoke-package.cjs <tarball-or-exact-package-version>');
const cwd = mkdtempSync(join(tmpdir(), 'growthkit-consumer-'));
writeFileSync(join(cwd, 'package.json'), JSON.stringify({ private: true, name: 'growthkit-smoke', version: '1.0.0' }));
execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', spec, 'react@19.2.2'], { cwd, stdio: 'inherit' });
const packageDir = join(cwd, 'node_modules/@fullstackcraftllc/growthkit');
for (const file of ['README.md', 'CHANGELOG.md', 'sql/0.0.6_events.sql', 'examples/README.md']) {
  if (!existsSync(join(packageDir, file))) throw new Error(`Missing packed artifact: ${file}`);
}
const imports = `
  if (typeof api.createGrowthKit !== 'function' || typeof api.useReferralUrl !== 'function' ||
      typeof api.isSpamContactMessage !== 'function') throw new Error('Missing exports');
  const client = api.createGrowthKit({ productName: 'ssr', onEvent() { throw new Error('SSR delivery'); } });
  Promise.resolve(client.track({ name: 'test' })).then(() => client.reset());
`;
execFileSync(process.execPath, ['-e', `const api = require('@fullstackcraftllc/growthkit');${imports}`], { cwd, stdio: 'inherit' });
execFileSync(process.execPath, ['--input-type=module', '-e', `import * as api from '@fullstackcraftllc/growthkit';${imports}`], { cwd, stdio: 'inherit' });
const consumer = join(cwd, 'consumer.ts');
writeFileSync(consumer, `import { createGrowthKit, IUserEvent } from '@fullstackcraftllc/growthkit';
const event: IUserEvent = {name: 'analysis_completed', properties: {symbol: 'SPY'}};
void createGrowthKit({productName: 'test', onEvent: async event => { console.log(event.visitor_id); }}).track(event);
`);
const examples = readdirSync(join(packageDir, 'examples')).filter(f => f.endsWith('.ts')).map(f => join(packageDir, 'examples', f));
execFileSync(process.execPath, [resolve(__dirname, '../node_modules/typescript/bin/tsc'), '--noEmit', '--strict',
  '--skipLibCheck', '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node',
  '--lib', 'ES2020,DOM', consumer, ...examples], { cwd, stdio: 'inherit' });
console.log(`CommonJS, ESM, SSR, TypeScript, packaged examples and SQL passed: ${spec}`);
