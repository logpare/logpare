---
name: contributing-development
description: Use when making contributions to logpare, setting up the development environment, writing tests, adding new features, or preparing pull requests. Also use for understanding the codebase architecture and development workflow.
---

# Contributing & Development Workflow

Complete guide for developing, testing, and contributing to the logpare project.

## When to Use

Activate this skill when:
- Setting up local development environment
- Adding new features or fixing bugs
- Writing or updating tests
- Preparing pull requests
- Understanding codebase architecture
- Following contribution guidelines
- Running benchmarks or performance tests
- Publishing new versions

## Quick Start: Development Setup

### Clone and Install
```bash
git clone https://github.com/logpare/logpare.git
cd logpare
pnpm install
```

### Build and Test
```bash
pnpm build        # Build ESM/CJS bundles
pnpm test         # Run all tests
pnpm typecheck    # Type check without emitting
pnpm bench        # Run benchmarks
```

### Watch Mode Development
```bash
pnpm test:watch   # Run tests in watch mode
# Make changes → tests auto-run
```

## Project Architecture

### Directory Structure
```
logpare/
├── src/
│   ├── index.ts              # Public API exports
│   ├── api.ts                # compress() and compressText()
│   ├── cli.ts                # CLI entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── drain/
│   │   ├── drain.ts          # Main Drain algorithm
│   │   ├── node.ts           # DrainNode (V8-optimized)
│   │   ├── cluster.ts        # LogCluster template storage
│   │   └── index.ts
│   ├── preprocessing/
│   │   ├── patterns.ts       # Built-in regex patterns
│   │   ├── default.ts        # Default ParsingStrategy
│   │   └── index.ts
│   └── output/
│       ├── formatter.ts      # Output formatters
│       └── index.ts
├── test/
│   ├── drain.test.ts         # Core algorithm tests
│   ├── preprocessing.test.ts # Pattern tests
│   ├── api.test.ts           # Public API tests
│   └── fixtures/             # Test log files
├── dist/                     # Built outputs (generated)
├── CLAUDE.md                 # AI assistant instructions
├── CONTRIBUTING.md           # Contribution guidelines
└── package.json
```

### Key Components

**Drain Algorithm** (`src/drain/drain.ts`):
- Main entry point for log clustering
- Manages parse tree and cluster matching
- Handles incremental log processing

**DrainNode** (`src/drain/node.ts`):
- Tree node implementation
- V8-optimized with `Map<string, DrainNode>`
- Handles child node navigation

**LogCluster** (`src/drain/cluster.ts`):
- Stores template pattern
- Tracks occurrences and sample variables
- Extracts diagnostic metadata (URLs, status codes, etc.)

**Preprocessing** (`src/preprocessing/`):
- Pattern masking (IP, UUID, timestamps)
- Tokenization
- Similarity threshold calculation

**Output** (`src/output/formatter.ts`):
- Summary, detailed, JSON formatters
- Statistics calculation
- Template sorting

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/my-new-feature
```

### 2. Make Changes

#### Adding a New Pattern

**File**: `src/preprocessing/patterns.ts`

```typescript
export const DEFAULT_PATTERNS = {
  // Existing patterns...

  // Add new pattern
  myNewPattern: /my-pattern-\d+/gi,
};
```

**Test**: `test/preprocessing.test.ts`

```typescript
describe('Pattern Masking', () => {
  it('should mask myNewPattern', () => {
    const line = 'Processing my-pattern-12345';
    const strategy = createDefaultStrategy({});
    const processed = strategy.preprocess(line);

    expect(processed).toBe('Processing <*>');
  });
});
```

#### Adding a New API Function

**File**: `src/api.ts`

```typescript
export function myNewFunction(logs: string[]): ResultType {
  // Implementation
}
```

**Export**: `src/index.ts`

```typescript
export { myNewFunction } from './api.js';
```

**Test**: `test/api.test.ts`

```typescript
describe('myNewFunction', () => {
  it('should do X', () => {
    const result = myNewFunction(['log line']);
    expect(result).toBeDefined();
  });
});
```

#### Adding Diagnostic Metadata Field

**File**: `src/drain/cluster.ts`

```typescript
export class LogCluster {
  // Existing fields...
  public myNewMetadata: string[] = [];

  public addLogLine(line: string, lineNumber: number): void {
    // Existing extraction...

    // Add new extraction
    const myData = this.extractMyData(line);
    if (myData && !this.myNewMetadata.includes(myData)) {
      this.myNewMetadata.push(myData);
    }
  }

  private extractMyData(line: string): string | null {
    const match = line.match(/my-data-(\w+)/);
    return match ? match[1] : null;
  }

  public toTemplate(): Template {
    return {
      // Existing fields...
      myNewMetadata: this.myNewMetadata.slice(0, 5),
    };
  }
}
```

**Update Type**: `src/types.ts`

```typescript
export interface Template {
  // Existing fields...
  myNewMetadata: string[];
}
```

### 3. Run Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/preprocessing.test.ts

# Run tests matching pattern
pnpm test -t "should mask"

# Watch mode
pnpm test:watch
```

### 4. Type Check

```bash
pnpm typecheck
```

**Important**: Fix all type errors. The project uses strict TypeScript:
- `noUncheckedIndexedAccess` - Array access returns `T | undefined`
- `exactOptionalPropertyTypes` - No explicit `undefined` assignments
- `noUnusedLocals` / `noUnusedParameters` - No unused code

### 5. Build

```bash
pnpm build
```

Generates:
- `dist/index.js` - ESM build
- `dist/index.cjs` - CJS build
- `dist/index.d.ts` - Type declarations
- `bin/logpare` - CLI executable

### 6. Test CLI Locally

```bash
# Link for local testing
npm link

# Test CLI
logpare test/fixtures/hdfs.log

# Unlink when done
npm unlink -g logpare
```

## Writing Tests

### Test Structure

Follow existing patterns in `test/`:

```typescript
import { describe, it, expect } from 'vitest';
import { compress } from '../src/index.js';

describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('should do X when Y', () => {
      // Arrange
      const input = ['log line 1', 'log line 2'];

      // Act
      const result = compress(input);

      // Assert
      expect(result.stats.uniqueTemplates).toBe(1);
      expect(result.templates[0].pattern).toBe('expected pattern');
    });
  });
});
```

### Testing Best Practices

1. **Test behavior, not implementation** - Don't test private methods
2. **Use descriptive test names** - "should X when Y" format
3. **One assertion per test** - Makes failures clear
4. **Test edge cases** - Empty arrays, undefined, null
5. **Use fixtures** - For larger test data

### Fixture-Based Tests

```typescript
describe('Real-world logs', () => {
  it('should compress HDFS logs effectively', async () => {
    const fs = await import('fs/promises');
    const logs = (await fs.readFile('test/fixtures/hdfs.log', 'utf-8'))
      .split('\n')
      .filter(line => line.length > 0);

    const result = compress(logs);

    expect(result.stats.compressionRatio).toBeGreaterThan(0.95);
    expect(result.stats.uniqueTemplates).toBeLessThan(50);
  });
});
```

## Performance Testing

### Run Benchmarks

```bash
pnpm bench
```

### Add New Benchmark

**File**: `test/benchmarks.test.ts`

```typescript
import { bench, describe } from 'vitest';
import { compress } from '../src/index.js';

describe('Benchmarks', () => {
  bench('compress 10k lines', async () => {
    const logs = generateLogs(10000);
    compress(logs);
  });
});
```

### Profile Memory Usage

```bash
node --expose-gc --max-old-space-size=4096 dist/index.js large-file.log
```

## V8 Optimization Guidelines

**Critical for performance:**

1. **Use `Map` for dynamic children** - Never plain objects for DrainNode children
   ```typescript
   // Good
   public children = new Map<string, DrainNode>();

   // Bad
   public children: Record<string, DrainNode> = {};
   ```

2. **Monomorphic constructors** - Initialize all properties in constructor
   ```typescript
   // Good
   constructor() {
     this.children = new Map();
     this.clusters = [];
   }

   // Bad - properties added later
   constructor() {}
   ```

3. **Never use `delete`** - Causes deoptimization
   ```typescript
   // Good
   map.clear();
   array.length = 0;

   // Bad
   delete obj.prop;
   ```

4. **Consistent property access order** - In hot paths
   ```typescript
   // Good - same order everywhere
   const { depth, simThreshold, maxChildren } = options;

   // Bad - different orders in different places
   ```

## Pull Request Process

### 1. Commit Changes

```bash
git add .
git commit -m "feat: add new pattern for X"
```

**Commit message format**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests only
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `chore:` - Build/tooling changes

### 2. Push Branch

```bash
git push origin feature/my-new-feature
```

### 3. Create Pull Request

Include in PR description:
- **What**: What does this change do?
- **Why**: Why is this change needed?
- **How**: How does it work?
- **Testing**: What tests were added/updated?
- **Breaking**: Any breaking changes?

**Example**:
```markdown
## What
Adds support for masking custom business domain patterns (customer IDs, order IDs).

## Why
Users with custom log formats can't mask domain-specific identifiers.

## How
- Added `customerId` and `orderId` patterns to DEFAULT_PATTERNS
- Updated preprocessing to recognize these patterns
- Added tests with sample business logs

## Testing
- Added unit tests for new patterns
- Tested with real e-commerce logs (99.2% compression)
- All existing tests pass

## Breaking Changes
None
```

### 4. Address Review Feedback

```bash
# Make requested changes
git add .
git commit -m "fix: address review feedback"
git push origin feature/my-new-feature
```

## Code Style

### TypeScript Guidelines

- Use strict types, avoid `any`
- Export types from `src/types.ts`
- Use `interface` for public APIs
- Use `type` for unions and helpers
- Document complex types with JSDoc

### Naming Conventions

- Classes: `PascalCase` (e.g., `DrainNode`)
- Functions: `camelCase` (e.g., `addLogLine`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `WILDCARD`)
- Files: `kebab-case` (e.g., `drain-node.ts`)

### Comments

```typescript
/**
 * Adds a log line to the cluster and extracts diagnostic metadata.
 *
 * @param line - Raw log line
 * @param lineNumber - Line number in original file (1-indexed)
 */
public addLogLine(line: string, lineNumber: number): void {
  // Implementation
}
```

## Common Issues

### TypeScript Errors

**Error**: `Element implicitly has an 'any' type`
```typescript
// Bad
const value = myMap.get(key);

// Good
const value = myMap.get(key);
if (value === undefined) {
  throw new Error('Key not found');
}
```

**Error**: `Property 'x' does not exist on type 'never'`
```typescript
// Bad
if (typeof value === 'string' || typeof value === 'number') {
  // value is never here
}

// Good
if (typeof value === 'string') {
  // value is string
} else if (typeof value === 'number') {
  // value is number
}
```

### Test Failures

**Issue**: Tests pass locally but fail in CI
- Check Node version matches CI (see `.github/workflows/`)
- Ensure all dependencies installed with `pnpm install`
- Check for test pollution (tests affecting each other)

**Issue**: Snapshot tests failing
```bash
# Update snapshots
pnpm test -- -u
```

## Versioning & Publishing

**For maintainers only**

### Version Bump

```bash
# Update version in package.json
npm version patch  # 0.0.5 → 0.0.6
npm version minor  # 0.0.5 → 0.1.0
npm version major  # 0.0.5 → 1.0.0
```

### Update CHANGELOG.md

Add new version section:
```markdown
## [0.0.6] - 2024-01-15

### Added
- New feature X

### Fixed
- Bug Y
```

### Publish

```bash
pnpm build
pnpm test
npm publish
```

## Resources

- **CLAUDE.md** - AI assistant guidance (read this first!)
- **CONTRIBUTING.md** - Contribution guidelines
- **SECURITY.md** - Security policies
- **CODE_OF_CONDUCT.md** - Community guidelines
- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Questions and community support

## Getting Help

1. Check existing issues on GitHub
2. Read CLAUDE.md and documentation
3. Ask in GitHub Discussions
4. For security issues, see SECURITY.md

## Next Steps

After your first contribution:
- Add yourself to contributors in package.json (if desired)
- Help review other PRs
- Contribute to documentation
- Suggest new features
