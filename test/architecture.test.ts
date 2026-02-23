/**
 * Architecture Guardrail Test — Import Boundary Enforcement
 * ============================================================================
 * Enforces the dependency DAG documented in .cursor/rules/003-architecture.mdc.
 * Dependencies flow inward: cli → api → drain → preprocessing, output, types.
 * Leaf modules (preprocessing, output, types) must never import upward.
 *
 * This test catches boundary violations at CI time, preventing AI agents and
 * contributors from creating circular dependencies or breaking module isolation.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Boundary Rules
// ============================================================================

/**
 * For each module group, define which other groups it must NOT import from.
 * Paths are relative to src/ and matched against import specifiers.
 */
const BOUNDARY_RULES: { module: string; forbiddenImports: string[] }[] = [
  {
    // preprocessing/ is a leaf — must not import from drain, output, api, or cli
    module: 'src/preprocessing/',
    forbiddenImports: ['./drain/', '../drain/', './output/', '../output/', './api', '../api', './cli', '../cli'],
  },
  {
    // output/ is a leaf — must not import from drain, preprocessing, api, or cli
    module: 'src/output/',
    forbiddenImports: ['./drain/', '../drain/', './preprocessing/', '../preprocessing/', './api', '../api', './cli', '../cli'],
  },
  {
    // drain/ may use preprocessing and output, but must not import api or cli
    module: 'src/drain/',
    forbiddenImports: ['./api', '../api', './cli', '../cli'],
  },
  {
    // types.ts is the dependency root — must not import from any project module
    module: 'src/types.ts',
    forbiddenImports: ['./drain/', '../drain/', './output/', '../output/', './preprocessing/', '../preprocessing/', './api', '../api', './cli', '../cli'],
  },
];

// ============================================================================
// Helpers
// ============================================================================

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      files.push(...getTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(filePath: string): { specifier: string; line: number; text: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const imports: { specifier: string; line: number; text: string }[] = [];

  // Match: import ... from './path' or import './path' or import type ... from './path'
  const importPattern = /from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/;

  for (const [i, line] of lines.entries()) {
    const match = importPattern.exec(line);
    if (match) {
      const specifier = match[1] !== undefined ? match[1] : match[2];
      if (!specifier) continue;
      // Only check relative imports (project modules)
      if (specifier.startsWith('.')) {
        imports.push({ specifier, line: i + 1, text: line.trim() });
      }
    }
  }

  return imports;
}

// ============================================================================
// Tests
// ============================================================================

describe('Architecture: Import boundaries', () => {
  it('should respect module dependency DAG', () => {
    const allFiles = getTypeScriptFiles('src');
    const violations: string[] = [];

    for (const rule of BOUNDARY_RULES) {
      // Find files that belong to this module group
      const moduleFiles = allFiles.filter((f) => {
        const relative = path.relative('.', f);
        if (rule.module.endsWith('.ts')) {
          return relative === rule.module;
        }
        return relative.startsWith(rule.module);
      });

      for (const file of moduleFiles) {
        const imports = extractImports(file);

        for (const imp of imports) {
          for (const forbidden of rule.forbiddenImports) {
            const isMatch = forbidden.endsWith('/')
              ? imp.specifier.startsWith(forbidden) || imp.specifier === forbidden.slice(0, -1)
              : imp.specifier === forbidden || imp.specifier.startsWith(forbidden + '/') || imp.specifier.startsWith(forbidden + '.');
            if (isMatch) {
              violations.push(
                `${file}:${imp.line} imports '${imp.specifier}' which violates boundary.\n` +
                `  Found: ${imp.text}\n` +
                `  Rule: Files in ${rule.module} must not import from ${forbidden}`,
              );
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} import boundary violation(s):\n\n` +
        violations.join('\n\n') +
        '\n\nFix: Move shared code to types.ts or restructure the dependency.',
      );
    }
  });

  it('should only export public API through src/index.ts', () => {
    const indexContent = fs.readFileSync('src/index.ts', 'utf-8');
    const allFiles = getTypeScriptFiles('src');
    const violations: string[] = [];

    // Check that no src/ file other than index.ts re-exports from other modules
    // (barrel re-exports from submodule index.ts files are fine for internal use)
    for (const file of allFiles) {
      const relative = path.relative('.', file);

      // Skip the main index.ts and submodule index files
      if (relative === 'src/index.ts') continue;
      if (relative.endsWith('/index.ts')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (const [i, line] of lines.entries()) {
        // Check for re-exports: export { ... } from or export * from
        if (/^export\s+(\{[^}]+\}|\*)\s+from\s+['"]/.test(line)) {
          // Allow re-exports within the same submodule (e.g., drain/index.ts re-exporting drain/drain.ts)
          // This is already skipped by the index.ts check above
          // Flag re-exports that cross module boundaries in non-index files
          const match = /from\s+['"]([^'"]+)['"]/.exec(line);
          if (match && match[1]) {
            const specifier = match[1];
            // Only flag if it's crossing a module boundary (going up with ../)
            if (specifier.startsWith('../')) {
              violations.push(
                `${relative}:${i + 1} re-exports across module boundary: ${line.trim()}\n` +
                `  Only src/index.ts should aggregate cross-module exports.`,
              );
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} export boundary violation(s):\n\n` +
        violations.join('\n\n'),
      );
    }

    // Verify index.ts actually exports the expected public API
    expect(indexContent).toContain('compress');
    expect(indexContent).toContain('createDrain');
    expect(indexContent).toContain('CompressionResult');
  });
});
