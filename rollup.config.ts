import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import type { RollupOptions } from 'rollup';

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

const external = ['react', 'react/jsx-runtime'];

function jsConfig(entry: 'index' | 'coupons'): RollupOptions {
  const banner = entry === 'coupons' ? "'use client';" : undefined;
  return {
    input: `src/${entry}.ts`,
    output: [
      { file: `dist/${entry}.mjs`, format: 'esm', banner, sourcemap: true },
      { file: `dist/${entry}.cjs`, format: 'cjs', banner, sourcemap: true, exports: 'named' }
    ],
    external,
    plugins: [
      replace({
        preventAssignment: true,
        values: { __GROWTHKIT_PKG_VERSION__: JSON.stringify(pkg.version) }
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  };
}

function dtsConfig(entry: 'index' | 'coupons'): RollupOptions {
  return {
    input: `src/${entry}.ts`,
    output: [{ file: `dist/${entry}.d.ts`, format: 'es' }],
    external,
    plugins: [dts()]
  };
}

export default [jsConfig('index'), jsConfig('coupons'), dtsConfig('index'), dtsConfig('coupons')];
