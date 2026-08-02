import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, '../dist/cli.js');

/**
 * These run against the built artifact, so `pnpm build` must have run first —
 * the same contract as the root package's test/cli.test.ts.
 */
describe('logpare-mcp CLI', () => {
  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error(`dist/cli.js not found. Run "pnpm build" in packages/mcp first.`);
    }
  });

  it('emits exactly one shebang, on the first line', () => {
    // Regression guard: src/cli.ts already carries a shebang. A tsup `banner`
    // added a second one on line 2, which is a syntax error that made the
    // published binary unrunnable while every other check still passed.
    const contents = readFileSync(cliPath, 'utf-8');
    const lines = contents.split('\n');

    expect(lines[0]).toBe('#!/usr/bin/env node');
    expect(lines[1]).not.toMatch(/^#!/);
    expect(contents.match(/^#!\/usr\/bin\/env node$/gm)).toHaveLength(1);
  });

  it('is executable by node and passes its self-check', () => {
    const output = execFileSync('node', [cliPath, '--test'], { encoding: 'utf-8' });

    expect(output).toContain('All tests passed');
  });

  it('reports a version', () => {
    const output = execFileSync('node', [cliPath, '--version'], { encoding: 'utf-8' });

    expect(output.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it('prints help', () => {
    const output = execFileSync('node', [cliPath, '--help'], { encoding: 'utf-8' });

    expect(output).toContain('--ucp');
  });

  it('rejects unknown flags', () => {
    expect(() =>
      execFileSync('node', [cliPath, '--not-a-real-flag'], {
        encoding: 'utf-8',
        stdio: 'pipe',
      })
    ).toThrow();
  });
});
