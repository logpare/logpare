# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**logpare** is a semantic log compression library for LLM context windows. It uses the Drain algorithm to extract templates from repetitive log data, achieving 60-90% token reduction while preserving diagnostic information.

## Build and Test Commands

```bash
pnpm install                        # Install dependencies
pnpm build                          # Build ESM/CJS bundles with type declarations
pnpm test                           # Run all tests
pnpm test:watch                     # Run tests in watch mode
pnpm test test/drain.test.ts        # Run a single test file
pnpm test -t "should discover"      # Run tests matching pattern
pnpm typecheck                      # Type check without emitting
pnpm bench                          # Run benchmarks
```

## Code Architecture

```
src/
├── index.ts              # Public API exports
├── api.ts                # compress() and compressText() functions
├── cli.ts                # CLI entry point (bin/logpare)
├── types.ts              # TypeScript interfaces
├── drain/
│   ├── drain.ts          # Main Drain algorithm
│   ├── node.ts           # DrainNode class (V8-optimized with Map)
│   ├── cluster.ts        # LogCluster for template storage
│   └── index.ts          # Module exports
├── preprocessing/
│   ├── patterns.ts       # Built-in regex patterns (IP, UUID, etc.)
│   ├── default.ts        # Default ParsingStrategy implementation
│   └── index.ts          # Module exports
└── output/
    ├── formatter.ts      # Summary, detailed, JSON formatters
    └── index.ts          # Module exports
```

## Public API

```typescript
// Simple compression
compress(lines: string[], options?: CompressOptions): CompressionResult;
compressText(text: string, options?: CompressOptions): CompressionResult;

// Advanced: direct Drain access for incremental processing
createDrain(options?: DrainOptions): Drain;

// Custom preprocessing strategies
defineStrategy(overrides: Partial<ParsingStrategy>): ParsingStrategy;
DEFAULT_PATTERNS      // Built-in regex patterns (IP, UUID, timestamps, etc.)
WILDCARD              // The "<*>" placeholder constant
SEVERITY_PATTERNS     // Regex patterns for severity detection
STACK_FRAME_PATTERNS  // Regex patterns for stack frame detection

// Utility functions for log analysis
detectSeverity(line: string): Severity;
isStackFrame(line: string): boolean;
extractUrls(line: string): string[];

// Progress reporting types
type Severity = 'error' | 'warning' | 'info';
type ProgressCallback = (event: ProgressEvent) => void;

interface ProgressEvent {
  processedLines: number;
  totalLines?: number;
  currentPhase: 'parsing' | 'clustering' | 'finalizing';
  percentComplete?: number;
}

interface DrainOptions {
  depth?: number;           // Parse tree depth (default: 4)
  simThreshold?: number;    // Similarity threshold 0-1 (default: 0.4)
  maxChildren?: number;     // Max children per node (default: 100)
  maxClusters?: number;     // Max total templates (default: 1000)
  maxSamples?: number;      // Max sample variables per template (default: 3)
  preprocessing?: ParsingStrategy;
  onProgress?: ProgressCallback;  // Progress reporting callback
}

// Key types
interface ParsingStrategy {
  preprocess(line: string): string;
  tokenize(line: string): string[];
  getSimThreshold(depth: number): number;
}

interface Template {
  id: string;
  pattern: string;
  occurrences: number;
  sampleVariables: string[][];
  firstSeen: number;
  lastSeen: number;
  severity: 'error' | 'warning' | 'info';
  urlSamples: string[];              // Hostnames extracted from logs
  fullUrlSamples: string[];          // Complete URLs for diagnostics
  statusCodeSamples: number[];       // HTTP status codes
  correlationIdSamples: string[];    // Trace/request IDs
  durationSamples: string[];         // Timing values (e.g., "80ms")
  isStackFrame: boolean;
}

interface CompressionResult {
  templates: Template[];
  stats: {
    inputLines: number;
    uniqueTemplates: number;
    compressionRatio: number;
    estimatedTokenReduction: number;
    processingTimeMs?: number;
  };
  formatted: string;
}
```

## Drain Algorithm Tree Structure

The parse tree navigates logs to clusters efficiently:

```
Level 0 (root)
└── Level 1: Token count (e.g., "5" for 5-token lines)
    └── Level 2: First token (e.g., "ERROR", "INFO")
        └── Levels 3-N: Subsequent tokens up to configured depth
            └── Leaf: LogCluster[] containing matched templates
```

When a token would exceed `maxChildren`, it's replaced with `<WILDCARD>` key to prevent tree explosion.

## V8 Optimization Requirements

1. **Use `Map` for dynamic children** - `DrainNode.children` is `Map<string, DrainNode>`, not a plain object
2. **Monomorphic constructors** - All class properties initialized in constructors
3. **No `delete` operator** - Never use `delete` on objects
4. **Consistent property access order** - Access properties in consistent order in hot paths

## TypeScript Strictness

The codebase uses strict TypeScript settings including:
- `noUncheckedIndexedAccess` - Array/object index access returns `T | undefined`
- `exactOptionalPropertyTypes` - Optional properties can't be assigned `undefined` explicitly
- `noUnusedLocals` / `noUnusedParameters` - No unused code allowed

## Development Workflow

1. Make changes to source files in `src/`
2. Run `pnpm typecheck` to verify types
3. Run `pnpm test` to run all tests
4. Run `pnpm build` to generate dist/ output

## Test Structure

```
test/
├── drain.test.ts         # Core algorithm tests
├── preprocessing.test.ts # Pattern matching tests
├── api.test.ts           # Public API and fixture tests
├── cli.test.ts           # CLI integration tests (ESM/CJS)
├── compress.bench.ts     # Compression benchmarks
└── fixtures/
    ├── hdfs.log          # Hadoop filesystem logs
    ├── spark.log         # Spark processing logs
    └── linux.log         # System logs
```

For tests, internal classes can be imported directly:
```typescript
import { LogCluster } from '../src/drain/cluster.js';
import { DrainNode } from '../src/drain/node.js';
```

## Diagnostic Data Extraction

Templates automatically extract diagnostic metadata from matching log lines:

| Field | Description | Example Values |
|-------|-------------|----------------|
| `urlSamples` | Hostnames from URLs | `["api.example.com", "cdn.example.com"]` |
| `fullUrlSamples` | Complete URLs | `["https://api.example.com/v1/users"]` |
| `statusCodeSamples` | HTTP status codes | `[200, 404, 500]` |
| `correlationIdSamples` | Trace/request IDs | `["req-abc123", "trace-xyz"]` |
| `durationSamples` | Timing values | `["45ms", "1.5s", "200µs"]` |

Extraction patterns support common formats:
- **Status codes**: `status 404`, `HTTP/1.1 500`, `code=200`
- **Correlation IDs**: `trace-id: xxx`, `request-id: xxx`, UUIDs
- **Durations**: ms, s, sec, µs, us, ns, min, h, hr units

## Severity & Stack Frame Detection

**Severity detection** (`detectSeverity()`):
- `error`: ERROR, FATAL, Exception, Failed, TypeError, ReferenceError
- `warning`: WARN, Warning, Deprecated, [Violation]
- `info`: Default for other logs

**Stack frame detection** (`isStackFrame()`):
- V8/Node.js: `at Function.name (file.js:123:45)`
- Firefox: `name@file.js:123` or `@file.js:123`
- Chrome DevTools: `(anonymous) @ file.js:123`

## Output Formats

- `summary` - Compact template list with frequencies, plus rare events section (≤5 occurrences)
- `detailed` - Full templates with sample variables, severity, line numbers, and all diagnostic metadata
- `json` - Machine-readable JSON with version field (`"version": "1.1"`)

## Version Bump Checklist

When bumping the version, update these files:

1. **package.json** - Update `"version"` field (source of truth)
2. **CHANGELOG.md** - Add new version section with date and changes

The CLI version is automatically injected at build time from package.json via tsup's `define` option - no manual update needed.
