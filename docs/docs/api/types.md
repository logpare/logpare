---
sidebar_position: 4
---

# Types Reference

Complete TypeScript type definitions for logpare.

## Core Types

### CompressionResult

Result object returned by `compress()` and `compressText()`.

```typescript
interface CompressionResult {
  templates: Template[];
  stats: CompressionStats;
  formatted: string;
}
```

**Fields:**

- `templates` - Array of discovered templates, sorted by occurrence count (descending)
- `stats` - Compression statistics
- `formatted` - String representation in the requested format

### Template

Represents a discovered log template with metadata.

```typescript
interface Template {
  id: string;
  pattern: string;
  occurrences: number;
  sampleVariables: string[][];
  firstSeen: number;
  lastSeen: number;
  severity: Severity;
  urlSamples: string[];
  fullUrlSamples: string[];
  statusCodeSamples: number[];
  correlationIdSamples: string[];
  durationSamples: string[];
  isStackFrame: boolean;
}
```

**Fields:**

- `id` - Unique template identifier
- `pattern` - Template pattern with `<*>` wildcards for variables
- `occurrences` - Number of log lines matching this template
- `sampleVariables` - Sample values captured from variables (limited by `maxSamples`)
- `firstSeen` - Line number where template was first seen
- `lastSeen` - Line number where template was last seen
- `severity` - Severity level: `'error'`, `'warning'`, or `'info'`
- `urlSamples` - Extracted hostnames from URLs
- `fullUrlSamples` - Complete URLs found in matching logs
- `statusCodeSamples` - HTTP status codes (e.g., `[200, 404, 500]`)
- `correlationIdSamples` - Trace/request IDs for distributed tracing
- `durationSamples` - Timing values (e.g., `["45ms", "1.5s"]`)
- `isStackFrame` - Whether this template represents a stack frame

### CompressionStats

Statistics about the compression operation.

```typescript
interface CompressionStats {
  inputLines: number;
  uniqueTemplates: number;
  compressionRatio: number;
  estimatedTokenReduction: number;
  processingTimeMs?: number;
}
```

**Fields:**

- `inputLines` - Number of input log lines processed
- `uniqueTemplates` - Number of unique templates discovered
- `compressionRatio` - Ratio of templates to input lines (0.0 to 1.0)
- `estimatedTokenReduction` - Estimated token savings as percentage (0-100)
- `processingTimeMs` - Time taken to process (milliseconds)

## Options Types

### CompressOptions

Options for `compress()` and `compressText()`.

```typescript
interface CompressOptions extends DrainOptions {
  format?: OutputFormat;
  maxTemplates?: number;
}
```

**Fields:**

- `format` - Output format: `'summary'`, `'detailed'`, or `'json'` (default: `'summary'`)
- `maxTemplates` - Maximum templates in formatted output (default: `50`)
- Plus all fields from `DrainOptions`

### DrainOptions

Configuration for the Drain algorithm.

```typescript
interface DrainOptions {
  depth?: number;
  simThreshold?: number;
  maxChildren?: number;
  maxClusters?: number;
  maxSamples?: number;
  preprocessing?: ParsingStrategy;
  onProgress?: ProgressCallback;
}
```

**Fields:**

- `depth` - Parse tree depth (default: `4`)
- `simThreshold` - Similarity threshold 0-1 (default: `0.4`)
- `maxChildren` - Max children per tree node (default: `100`)
- `maxClusters` - Max total templates (default: `1000`)
- `maxSamples` - Sample variables per template (default: `3`)
- `preprocessing` - Custom preprocessing strategy
- `onProgress` - Progress reporting callback

## Preprocessing Types

### ParsingStrategy

Strategy for preprocessing and tokenizing log lines.

```typescript
interface ParsingStrategy {
  preprocess(line: string): string;
  tokenize(line: string): string[];
  getSimThreshold(depth: number): number;
}
```

**Methods:**

- `preprocess(line)` - Preprocess a log line (mask variables, normalize, etc.)
- `tokenize(line)` - Split preprocessed line into tokens
- `getSimThreshold(depth)` - Get similarity threshold for a given tree depth

**Example:**

```typescript
import { defineStrategy, DEFAULT_PATTERNS, WILDCARD } from 'logpare';

const customStrategy: ParsingStrategy = defineStrategy({
  preprocess(line: string): string {
    let result = line;
    for (const [, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      result = result.replace(pattern, WILDCARD);
    }
    return result;
  },

  tokenize(line: string): string[] {
    return line.split(/\s+/).filter(Boolean);
  },

  getSimThreshold(depth: number): number {
    return depth <= 2 ? 0.3 : 0.4;
  }
});
```

## Progress Types

### ProgressCallback

Callback function for progress updates.

```typescript
type ProgressCallback = (event: ProgressEvent) => void;
```

### ProgressEvent

Progress event data.

```typescript
interface ProgressEvent {
  processedLines: number;
  totalLines?: number;
  currentPhase: ProcessingPhase;
  percentComplete?: number;
}
```

**Fields:**

- `processedLines` - Number of lines processed so far
- `totalLines` - Total lines to process (if known)
- `currentPhase` - Current processing phase
- `percentComplete` - Completion percentage 0-100 (only if `totalLines` known)

### ProcessingPhase

Current phase of the compression operation.

```typescript
type ProcessingPhase = 'parsing' | 'clustering' | 'finalizing';
```

## Enum Types

### Severity

Log severity level.

```typescript
type Severity = 'error' | 'warning' | 'info';
```

Automatically detected from log content:

- `'error'` - ERROR, FATAL, Exception, Failed, TypeError, etc.
- `'warning'` - WARN, Warning, Deprecated, [Violation]
- `'info'` - Default for other logs

### OutputFormat

Output format for compression results.

```typescript
type OutputFormat = 'summary' | 'detailed' | 'json';
```

- `'summary'` - Compact template list with frequencies
- `'detailed'` - Full templates with all metadata
- `'json'` - Machine-readable JSON

## Constants

### WILDCARD

The wildcard placeholder used in templates.

```typescript
const WILDCARD: '<*>';
```

**Example:**

```typescript
import { WILDCARD } from 'logpare';

const pattern = `ERROR Connection to ${WILDCARD} failed`;
```

### DEFAULT_PATTERNS

Built-in regex patterns for common log variables.

```typescript
const DEFAULT_PATTERNS: {
  ipv4: RegExp;
  ipv6: RegExp;
  uuid: RegExp;
  timestamp: RegExp;
  hexId: RegExp;
  filepath: RegExp;
  url: RegExp;
  number: RegExp;
  // ... more patterns
};
```

**Example:**

```typescript
import { DEFAULT_PATTERNS } from 'logpare';

// Use in custom preprocessing
const masked = line.replace(DEFAULT_PATTERNS.ipv4, '<*>');
```

### SEVERITY_PATTERNS

Regex patterns for severity detection.

```typescript
const SEVERITY_PATTERNS: {
  error: RegExp;
  warning: RegExp;
};
```

### STACK_FRAME_PATTERNS

Regex patterns for stack frame detection.

```typescript
const STACK_FRAME_PATTERNS: {
  v8: RegExp;
  firefox: RegExp;
  chrome: RegExp;
};
```

## Utility Functions

### detectSeverity()

Detect severity level from a log line.

```typescript
function detectSeverity(line: string): Severity;
```

**Example:**

```typescript
import { detectSeverity } from 'logpare';

detectSeverity('ERROR Connection failed');  // 'error'
detectSeverity('WARN Deprecated API');      // 'warning'
detectSeverity('INFO Request completed');   // 'info'
```

### isStackFrame()

Check if a line is a stack frame.

```typescript
function isStackFrame(line: string): boolean;
```

**Example:**

```typescript
import { isStackFrame } from 'logpare';

isStackFrame('    at Function.name (file.js:123:45)');  // true
isStackFrame('ERROR Connection failed');                 // false
```

### extractUrls()

Extract URLs/hostnames from a log line.

```typescript
function extractUrls(line: string): string[];
```

**Example:**

```typescript
import { extractUrls } from 'logpare';

extractUrls('GET https://api.example.com/users');
// ['api.example.com']

extractUrls('Fetched http://cdn.example.com/image.png');
// ['cdn.example.com']
```

### defineStrategy()

Create a custom preprocessing strategy.

```typescript
function defineStrategy(
  overrides: Partial<ParsingStrategy>
): ParsingStrategy;
```

**Example:**

```typescript
import { defineStrategy } from 'logpare';

const strategy = defineStrategy({
  tokenize: (line) => line.split(','),
  getSimThreshold: (depth) => 0.5,
});
```

## See Also

- [compress() API](/docs/api/compress)
- [compressText() API](/docs/api/compress-text)
- [createDrain() API](/docs/api/create-drain)
- [Custom Preprocessing Guide](/docs/guides/custom-preprocessing)
