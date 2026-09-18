#!/usr/bin/env node
// Build dsh-bi-dashboards: bundle src/index.js (Node half) into a fully
// self-contained lib/index.js so a fresh `dsh plugin add https://gitee.com/LYJ132/dsh-bi-dashboards.git`
// boots with zero external bare imports (same shape as dsh-notification).
// lib/client.js is already self-contained (DSH ModuleLoader factory, `react`
// provided by the host) and is left as-is.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.js'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  minify: false,
  legalComments: 'none',
  external: ['node:*'],
  banner: {
    js:
      "// GENERATED FILE — do not edit. Source: src/index.js. Rebuild: pnpm build (esbuild).\n" +
      "import { createRequire as __createRequire } from 'node:module';\n" +
      "const require = __createRequire(import.meta.url);",
  },
})

console.log('built lib/index.js (bundled, zero external imports)')
