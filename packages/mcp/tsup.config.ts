import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

// Read version from package.json for build-time injection
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = pkg.version;

export default defineConfig([
  // CLI entry with shebang and version injection
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
    define: {
      '__VERSION__': JSON.stringify(version),
    },
  },
  // Library entry without shebang
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    clean: true, // tsup handles duplicate cleaning gracefully
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    external: ['logpare'],
  },
]);
