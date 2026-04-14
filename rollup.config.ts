import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import type { RollupOptions } from 'rollup';

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

const jsConfig: RollupOptions = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    }
  ],
  external: ['react'],
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __GROWTHKIT_PKG_VERSION__: JSON.stringify(pkg.version)
      }
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false
    })
  ]
};

const dtsConfig: RollupOptions = {
  input: 'src/index.ts',
  output: [{ file: 'dist/index.d.ts', format: 'es' }],
  external: ['react'],
  plugins: [dts()]
};

export default [jsConfig, dtsConfig];
