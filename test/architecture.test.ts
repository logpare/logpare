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
    // api.ts may use drain, preprocessing, output, types, but must not import cli
    module: 'src/api.ts',
    forbiddenImports: ['./cli', '../cli'],
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

  let inBlockComment = false;

  for (const [i, line] of lines.entries()) {
    const trimmed = line.trim();

    // Track block comments
    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    // Skip single-line comments
    if (trimmed.startsWith('//')) {
      continue;
    }

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
    // Arrange
    const allFiles = getTypeScriptFiles('src');
    const violations: string[] = [];

    // Act
    for (const rule of BOUNDARY_RULES) {
      // Find files that belong to this module group
      const moduleFiles = allFiles.filter((f) => {
        const relative = path.relative('.', f);
        if (rule.module.endsWith('.ts')) {
          return relative === rule.module;
        }
        return relative.startsWith(rule.module);
      });

      // Pre-resolve each forbidden pattern to a canonical absolute path
      // using the module directory as the reference point
      const moduleDir = rule.module.endsWith('.ts')
        ? path.dirname(rule.module)
        : rule.module.replace(/\/$/, '');
      const resolvedForbidden = rule.forbiddenImports.map((f) => ({
        original: f,
        resolved: path.resolve(moduleDir, f),
      }));

      for (const file of moduleFiles) {
        const imports = extractImports(file);

        for (const imp of imports) {
          // Resolve the import specifier to an absolute path based on the importing file
          const resolvedImport = path.resolve(path.dirname(file), imp.specifier);

          for (const forbidden of resolvedForbidden) {
            const isMatch = forbidden.original.endsWith('/')
              ? resolvedImport.startsWith(forbidden.resolved) || resolvedImport + '/' === forbidden.resolved + '/'
              : resolvedImport === forbidden.resolved || resolvedImport.startsWith(forbidden.resolved + '/') || resolvedImport.startsWith(forbidden.resolved + '.');
            if (isMatch) {
              violations.push(
                `${file}:${imp.line} imports '${imp.specifier}' which violates boundary.\n` +
                `  Found: ${imp.text}\n` +
                `  Rule: Files in ${rule.module} must not import from ${forbidden.original}`,
              );
            }
          }
        }
      }
    }

    // Assert
    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} import boundary violation(s):\n\n` +
        violations.join('\n\n') +
        '\n\nFix: Move shared code to types.ts or restructure the dependency.',
      );
    }
  });

  it('should only export public API through src/index.ts', () => {
    // Arrange
    const indexContent = fs.readFileSync('src/index.ts', 'utf-8');
    const allFiles = getTypeScriptFiles('src');
    const violations: string[] = [];

    // Act — check that no src/ file other than index.ts re-exports from other modules
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
        if (/^export\s+(?:type\s+)?(\{[^}]+\}|\*(?:\s+as\s+\w+)?)\s+from\s+['"]/.test(line)) {
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

    // Assert
    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} export boundary violation(s):\n\n` +
        violations.join('\n\n'),
      );
    }

    // Assert — verify index.ts actually exports the expected public API
    expect(indexContent).toContain('compress');
    expect(indexContent).toContain('compressText');
    expect(indexContent).toContain('createDrain');
    expect(indexContent).toContain('CompressionResult');
    expect(indexContent).toContain('detectSeverity');
    expect(indexContent).toContain('isStackFrame');
    expect(indexContent).toContain('extractUrls');
  });
});
