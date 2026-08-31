/**
 * Documentation Guardrail Test — Agent-Facing Docs
 * ============================================================================
 * The public docs drifted badly from src/ once already: dead Drain methods, flat
 * option shapes that do not typecheck, invented CLI environment variables, and
 * install commands for an unpublished package. This test is the tripwire.
 *
 * It checks three things:
 *   1. llms.txt / llms-full.txt (four copies) match what scripts/generate-llms.mjs
 *      produces from docs/content/docs/**. Edit the MDX, run `pnpm docs:llms`.
 *   2. No public doc mentions an API, flag, or env var that does not exist.
 *   3. The npm package ships the agent-readable files.
 *
 * Follows the same file-reading pattern as test/architecture.test.ts.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
// @ts-expect-error -- plain ESM helper, no type declarations by design
import { expectedOutputs } from '../scripts/generate-llms.mjs';

// ============================================================================
// Helpers
// ============================================================================

const DOCS_CONTENT_DIR = 'docs/content/docs';

/** Recursively collect every .mdx file under a directory. */
function mdxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...mdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Every file an agent or user reads as public documentation. */
function publicDocs(): string[] {
  return [
    'README.md',
    'AGENTS.md',
    'llms.txt',
    'llms-full.txt',
    'docs/public/llms.txt',
    'docs/public/llms-full.txt',
    ...mdxFiles(DOCS_CONTENT_DIR),
  ];
}

/** Lines in a file matching a predicate, formatted as `path:line: text` for failures. */
function findLines(file: string, predicate: (line: string) => boolean): string[] {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const hits: string[] = [];
  for (const [i, line] of lines.entries()) {
    if (predicate(line)) {
      hits.push(`${file}:${i + 1}: ${line.trim()}`);
    }
  }
  return hits;
}

// ============================================================================
// Generated file drift
// ============================================================================

describe('Docs: generated llms files', () => {
  it('should match what scripts/generate-llms.mjs produces', () => {
    // Arrange
    const outputs = expectedOutputs() as { file: string; path: string; content: string }[];

    // Act
    const stale = outputs.filter(
      (output) =>
        !fs.existsSync(output.path) ||
        fs.readFileSync(output.path, 'utf-8') !== output.content
    );

    // Assert
    if (stale.length > 0) {
      expect.fail(
        `Stale generated files:\n${stale.map((s) => `  - ${s.file}`).join('\n')}\n\n` +
          'These are generated from docs/content/docs/** and docs/content/llms-intro.md.\n' +
          'Edit those, then run `pnpm docs:llms`.'
      );
    }
  });

  it('should keep the repository and docs-site copies byte-identical', () => {
    // Arrange & Act
    const pairs: [string, string][] = [
      ['llms.txt', 'docs/public/llms.txt'],
      ['llms-full.txt', 'docs/public/llms-full.txt'],
    ];

    // Assert
    for (const [root, site] of pairs) {
      expect(fs.readFileSync(root, 'utf-8'), `${root} vs ${site}`).toBe(
        fs.readFileSync(site, 'utf-8')
      );
    }
  });

  it('should keep llms.txt short enough to be a navigation file', () => {
    // Arrange
    const lines = fs.readFileSync('llms.txt', 'utf-8').split('\n');

    // Act — count prose/link lines, excluding blanks and fenced code
    let inCode = false;
    let useful = 0;
    for (const line of lines) {
      if (line.trimStart().startsWith('```')) {
        inCode = !inCode;
        continue;
      }
      if (!inCode && line.trim().length > 0) useful++;
    }

    // Assert
    expect(useful).toBeGreaterThanOrEqual(25);
    expect(useful).toBeLessThanOrEqual(60);
  });
});

// ============================================================================
// API drift
// ============================================================================

describe('Docs: no stale API surface', () => {
  /** Names that were documented but never existed, or were removed. */
  const FORBIDDEN: { pattern: RegExp; why: string }[] = [
    { pattern: /\bdrain\.process\(/, why: 'Drain has addLogLine()/addLogLines(), not process()' },
    { pattern: /\bgetClusters\(\)/, why: 'Drain has getTemplates(), not getClusters()' },
    { pattern: /\bcluster\.size\(\)/, why: 'LogCluster is internal; use template.occurrences' },
    { pattern: /\bgetMetadata\(\)/, why: 'no such method; template fields are plain properties' },
    { pattern: /\bLOGPARE_(DEPTH|THRESHOLD|FORMAT)\b/, why: 'the CLI reads no environment variables' },
    { pattern: /\bLOGPARE_MCP_/, why: 'the MCP server reads no environment variables' },
    { pattern: /\blogpare\s+compress\b/, why: 'there is no `compress` subcommand' },
    { pattern: /--sim-threshold\b/, why: 'the CLI flag is --threshold' },
  ];

  /**
   * Several docs pages deliberately name a dead API in order to warn against it
   * ("There is no `compress` subcommand", "There are no `LOGPARE_MCP_*` variables").
   * Those sentences are the fix, not the bug, so a line that reads as a denial is
   * exempt. A line that merely *uses* the dead API has no such wording.
   */
  const DENIAL = /\b(no|not|never|instead of|rather than|would look for|is read as)\b/i;

  it('should not reference removed or invented API in public docs', () => {
    // Arrange & Act
    const violations: string[] = [];
    for (const file of publicDocs()) {
      for (const { pattern, why } of FORBIDDEN) {
        for (const hit of findLines(
          file,
          (line) => pattern.test(line) && !DENIAL.test(line)
        )) {
          violations.push(`${hit}\n  → ${why}`);
        }
      }
    }

    // Assert
    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} stale API reference(s) in public docs:\n\n` +
          violations.join('\n\n')
      );
    }
  });

  it('should nest Drain options under `drain` in every compress() example', () => {
    // Arrange
    const flatOption = /^\s*(depth|simThreshold|maxChildren|maxClusters|maxSamples|preprocessing|onProgress)\s*:/;
    const compressCall = /\bcompress(Text)?\(/;
    const violations: string[] = [];

    // Act
    for (const file of publicDocs()) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n');

      for (const [i, line] of lines.entries()) {
        if (!compressCall.test(line)) continue;

        // The options object may open on the call line or several lines later, so
        // scan forward for it rather than requiring `{` at the end of the call line.
        // Bail out if the call closes first — that call passes no options at all.
        let start = -1;
        for (let j = i; j < lines.length && j <= i + 6; j++) {
          const candidate = lines[j];
          if (candidate === undefined) break;
          const afterCall = j === i ? candidate.slice(candidate.search(compressCall)) : candidate;
          if (afterCall.includes('{')) {
            start = j;
            break;
          }
          if (afterCall.includes(')')) break;
        }
        if (start === -1) continue;

        // Walk the options object, tracking brace depth so that keys nested inside
        // `drain: { ... }` (depth > 1) are not mistaken for top-level ones.
        let depth = 0;
        let seenOpen = false;
        for (let j = start; j < lines.length; j++) {
          const next = lines[j];
          if (next === undefined) break;

          if (seenOpen && depth === 1 && flatOption.test(next)) {
            violations.push(
              `${file}:${j + 1}: ${next.trim()}\n` +
                '  → Drain options belong inside `drain: { ... }` when calling compress()'
            );
          }

          for (const char of next) {
            if (char === '{') {
              depth++;
              seenOpen = true;
            } else if (char === '}') {
              depth--;
            }
          }
          if (seenOpen && depth <= 0) break;
        }
      }
    }

    // Assert
    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} flat Drain option(s) in compress() examples:\n\n` +
          violations.join('\n\n')
      );
    }
  });
});

// ============================================================================
// Unpublished package claims
// ============================================================================

describe('Docs: unpublished packages', () => {
  const MCP_INSTALL = /(npm (install|i)( -g)?|npx( -y)?|pnpm add|yarn add)\s+(-y\s+)?@logpare\/mcp/;

  it('should not present @logpare/mcp as installable without a qualifier', () => {
    // Arrange — @logpare/mcp is not published; every install command must sit near an
    // explicit unpublished notice. Scoped to a window around the command rather than
    // the whole file, so unrelated prose elsewhere cannot vouch for it.
    const QUALIFIERS = [
      'not published to npm',
      'not published',
      'from source',
      'will fail',
      'registry 404',
    ];
    const WINDOW = 40;

    // Act
    const violations: string[] = [];
    for (const file of publicDocs()) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n');

      const unqualified: string[] = [];
      for (const [i, line] of lines.entries()) {
        if (!MCP_INSTALL.test(line)) continue;

        const context = lines
          .slice(Math.max(0, i - WINDOW), i + WINDOW)
          .join('\n')
          .toLowerCase();

        if (!QUALIFIERS.some((q) => context.includes(q))) {
          unqualified.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }

      if (unqualified.length > 0) {
        violations.push(
          `${file} shows an @logpare/mcp install command with no nearby unpublished notice:\n` +
            unqualified.map((l) => `  ${l}`).join('\n')
        );
      }
    }

    // Assert
    if (violations.length > 0) {
      expect.fail(violations.join('\n\n'));
    }
  });

  it('should not link @logpare/mcp on npm', () => {
    // Arrange & Act
    const violations: string[] = [];
    for (const file of [...publicDocs(), 'docs/app/(home)/page.tsx']) {
      violations.push(
        ...findLines(file, (line) => /npmjs\.com\/package\/@logpare\/mcp/.test(line))
      );
    }

    // Assert
    if (violations.length > 0) {
      expect.fail(
        'The @logpare/mcp npm page does not exist (404):\n\n' + violations.join('\n')
      );
    }
  });
});

// ============================================================================
// npm package contents
// ============================================================================

describe('Docs: npm package contents', () => {
  it('should ship the agent-readable files', () => {
    // Arrange
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8')) as {
      files?: string[];
    };
    const required = ['AGENTS.md', 'README.md', 'llms.txt', 'llms-full.txt', 'dist'];

    // Act & Assert
    expect(pkg.files, 'package.json needs an explicit files allowlist').toBeDefined();
    for (const entry of required) {
      expect(pkg.files, `package.json files must include ${entry}`).toContain(entry);
    }

    // Every listed file (other than the build output) must actually exist.
    for (const entry of pkg.files ?? []) {
      if (entry === 'dist') continue;
      expect(fs.existsSync(entry), `${entry} is listed in package.json files but missing`).toBe(
        true
      );
    }
  });

  it('should not ship the docs app, tests, or workspace packages', () => {
    // Arrange
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8')) as {
      files?: string[];
    };
    const forbiddenPrefixes = ['docs', 'test', 'examples', 'packages', 'scripts', '.claude', '.cursor'];

    // Act & Assert
    for (const entry of pkg.files ?? []) {
      for (const prefix of forbiddenPrefixes) {
        expect(
          entry === prefix || entry.startsWith(`${prefix}/`),
          `package.json files must not include ${entry}`
        ).toBe(false);
      }
    }
  });
});
