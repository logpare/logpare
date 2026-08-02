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
    target: 'node22',
    outDir: 'dist',
    external: ['logpare'],
    // No `banner` shebang here: src/cli.ts already starts with one and tsup
    // preserves it. Adding a banner emits a second shebang on line 2, which is a
    // syntax error and makes the built `logpare-mcp` binary unrunnable.
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
    target: 'node22',
    outDir: 'dist',
    external: ['logpare'],
  },
]);
