import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI entry with shebang
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    external: ['logpare'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  // Library entry without shebang
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    clean: false, // Don't clean since CLI build already did
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    external: ['logpare'],
  },
]);
