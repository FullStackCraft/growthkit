const { readFileSync } = require('node:fs');
const path = require('node:path');

const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const mjs = readFileSync(path.resolve(process.cwd(), 'dist/index.mjs'), 'utf8');
const cjs = readFileSync(path.resolve(process.cwd(), 'dist/index.cjs'), 'utf8');

const token = '__GROWTHKIT_PKG_VERSION__';

if (mjs.includes(token) || cjs.includes(token)) {
  throw new Error('Version token was not replaced in built output.');
}

if (!mjs.includes(pkg.version) || !cjs.includes(pkg.version)) {
  throw new Error(`Built output does not include package version ${pkg.version}.`);
}

console.log(`Verified dist version replacement: ${pkg.version}`);
