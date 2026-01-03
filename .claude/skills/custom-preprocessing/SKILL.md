---
name: custom-preprocessing
description: Use when creating custom preprocessing strategies, defining new masking patterns, customizing tokenization, or handling domain-specific log formats that aren't recognized by default patterns.
---

# Custom Preprocessing Strategies

Define custom preprocessing logic for domain-specific log formats and patterns.

## When to Use

Activate this skill when:
- User needs to mask custom IDs, tokens, or patterns
- Default patterns don't recognize domain-specific variables
- Custom tokenization required (CSV, tab-delimited, custom delimiters)
- Variable similarity thresholds needed by tree depth
- Working with proprietary log formats
- Combining multiple preprocessing strategies

## Quick Start

### Basic Custom Pattern
```typescript
import { defineStrategy } from 'logpare';

const customStrategy = defineStrategy({
  patterns: {
    sessionId: /sess-[a-f0-9]{16}/gi,
    orderId: /ORD-\d{10}/g,
  }
});

compress(logs, {
  drain: { preprocessing: customStrategy }
});
```

## ParsingStrategy Interface

```typescript
interface ParsingStrategy {
  preprocess(line: string): string;
  tokenize(line: string): string[];
  getSimThreshold(depth: number): number;
}
```

### Method Responsibilities

**preprocess(line)**: Masks variables with `<*>` placeholder
- Called before tokenization
- Should replace variable parts (IDs, timestamps, IPs) with `WILDCARD` constant
- Default: Uses built-in patterns (IP, UUID, timestamps, etc.)

**tokenize(line)**: Splits preprocessed line into tokens
- Called after preprocessing
- Returns array of tokens for tree navigation
- Default: Splits on whitespace

**getSimThreshold(depth)**: Returns similarity threshold for given tree depth
- Controls how strict matching is at each level
- Depth 0 = root, depth 1 = token count, depth 2+ = actual tokens
- Default: Returns `simThreshold` option value

## Built-in Patterns Reference

See what patterns are already masked by default:

```typescript
import { DEFAULT_PATTERNS } from 'logpare';

// Available patterns:
DEFAULT_PATTERNS.ip          // IPv4/IPv6
DEFAULT_PATTERNS.port        // :443, :8080
DEFAULT_PATTERNS.uuid        // UUIDs
DEFAULT_PATTERNS.timestamp   // ISO, Unix timestamps
DEFAULT_PATTERNS.url         // http://, https://
DEFAULT_PATTERNS.filepath    // /path/to/file.log
DEFAULT_PATTERNS.hexId       // 0x1a2b3c, etc.
DEFAULT_PATTERNS.number      // Standalone numbers
DEFAULT_PATTERNS.blockId     // HDFS block IDs
DEFAULT_PATTERNS.unitValue   // 250ms, 1024KB
```

## Custom Pattern Examples

### Web Application Logs
```typescript
const webStrategy = defineStrategy({
  patterns: {
    sessionId: /sess-[a-f0-9]{32}/gi,
    apiKey: /sk-[a-zA-Z0-9]{32}/gi,
    requestId: /req-[a-z0-9-]+/gi,
    queryString: /\?[^\s]+/gi,  // Mask entire query strings
  }
});
```

### Database Logs
```typescript
const dbStrategy = defineStrategy({
  patterns: {
    queryId: /qid-\d+/gi,
    transactionId: /txn_[a-z0-9]+/gi,
    tableId: /tbl_\d+/gi,
    duration: /\d+\.?\d*\s*(ms|sec|min)/gi,  // Already in DEFAULT_PATTERNS.unitValue
  }
});
```

### Kubernetes/Cloud Native
```typescript
const k8sStrategy = defineStrategy({
  patterns: {
    podName: /[a-z0-9-]+-[a-z0-9]{10}-[a-z0-9]{5}/gi,  // pod-name-abc1234567-xyz89
    namespace: /namespace\/[a-z0-9-]+/gi,
    containerId: /[a-f0-9]{64}/gi,
    traceId: /trace-[a-f0-9]{32}/gi,
  }
});
```

### Custom Business Domain
```typescript
const businessStrategy = defineStrategy({
  patterns: {
    customerId: /CUST-\d{8}/g,
    orderId: /ORD-\d{10}/g,
    productSku: /SKU-[A-Z0-9]{6}/g,
    invoiceId: /INV-\d{4}-\d{6}/g,
  }
});
```

## Custom Tokenization

### CSV Logs
```typescript
const csvStrategy = defineStrategy({
  tokenize: (line) => line.split(',').map(s => s.trim())
});

// Example: "timestamp,level,message,user"
// Tokens: ["timestamp", "level", "message", "user"]
```

### Tab-Delimited
```typescript
const tabStrategy = defineStrategy({
  tokenize: (line) => line.split('\t').filter(s => s.length > 0)
});
```

### JSON Logs (Key Fields Only)
```typescript
const jsonStrategy = defineStrategy({
  tokenize: (line) => {
    try {
      const obj = JSON.parse(line);
      return [obj.level, obj.logger, obj.message]; // Extract key fields
    } catch {
      return line.split(/\s+/); // Fallback to whitespace
    }
  }
});
```

### Fixed-Width Fields
```typescript
const fixedWidthStrategy = defineStrategy({
  tokenize: (line) => [
    line.substring(0, 10).trim(),   // Timestamp (cols 0-10)
    line.substring(10, 15).trim(),  // Level (cols 10-15)
    line.substring(15).trim(),      // Message (cols 15+)
  ].filter(s => s.length > 0)
});
```

## Dynamic Similarity Thresholds

### Strict Prefixes, Loose Suffixes
```typescript
const dynamicStrategy = defineStrategy({
  getSimThreshold: (depth) => {
    if (depth === 1) return 1.0;   // Exact token count match
    if (depth === 2) return 0.7;   // Strict first token (severity/level)
    if (depth === 3) return 0.5;   // Medium second token (logger/module)
    return 0.3;                     // Loose for message tokens
  }
});
```

**Use case**: Logs with consistent `[LEVEL] [MODULE] variable message` format.

### Increasing Strictness
```typescript
const stricterStrategy = defineStrategy({
  getSimThreshold: (depth) => {
    return Math.min(0.3 + (depth * 0.1), 0.7); // 0.3 → 0.7 as depth increases
  }
});
```

**Use case**: Deeper tokens are more semantically important.

## Combining Strategies

### Merge Default Patterns with Custom
```typescript
import { DEFAULT_PATTERNS, WILDCARD } from 'logpare';

const mergedStrategy = defineStrategy({
  preprocess: (line) => {
    // Apply default patterns first
    let processed = line;
    for (const [name, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      processed = processed.replace(pattern, WILDCARD);
    }

    // Then apply custom patterns
    processed = processed.replace(/CUST-\d+/g, WILDCARD);
    processed = processed.replace(/ORD-\d+/g, WILDCARD);

    return processed;
  }
});
```

### Multi-Pass Preprocessing
```typescript
const multiPassStrategy = defineStrategy({
  preprocess: (line) => {
    // Pass 1: Normalize timestamps
    let processed = line.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '<*>');

    // Pass 2: Mask IDs
    processed = processed.replace(/id[:=]\s*\d+/gi, 'id=<*>');

    // Pass 3: Mask quoted strings
    processed = processed.replace(/"[^"]+"/g, '"<*>"');

    return processed;
  }
});
```

## Advanced: Conditional Preprocessing

### Different Strategies by Log Level
```typescript
const levelAwareStrategy = defineStrategy({
  preprocess: (line) => {
    if (line.includes('ERROR') || line.includes('FATAL')) {
      // Preserve more detail for errors
      return line.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '<*>'); // IPs only
    } else {
      // Aggressive masking for info/debug
      return line.replace(/[a-f0-9]{8,}/gi, '<*>'); // All hex strings
    }
  }
});
```

### Domain-Specific Multiline Handling
```typescript
const stackTraceStrategy = defineStrategy({
  preprocess: (line) => {
    // Preserve stack frame structure but mask file paths
    if (line.trim().startsWith('at ')) {
      return line.replace(/\(.*:\d+:\d+\)/, '(<*>)'); // Mask (file:line:col)
    }
    return line; // Default preprocessing for other lines
  }
});
```

## Testing Custom Strategies

### Verify Pattern Masking
```typescript
const strategy = defineStrategy({
  patterns: { orderId: /ORD-\d+/g }
});

// Test preprocessing
const testLine = "Processing order ORD-1234567890 for customer";
const processed = strategy.preprocess(testLine);
console.log(processed);
// Expected: "Processing order <*> for customer"
```

### Verify Tokenization
```typescript
const testLine = "2024-01-15 10:30:45 INFO Processing request";
const tokens = strategy.tokenize(testLine);
console.log(tokens);
// Expected: ["2024-01-15", "10:30:45", "INFO", "Processing", "request"]
```

### End-to-End Test
```typescript
const logs = [
  "Order ORD-1234567890 shipped",
  "Order ORD-9876543210 shipped",
  "Order ORD-5555555555 cancelled",
];

const result = compress(logs, {
  drain: { preprocessing: strategy }
});

console.log(result.templates);
// Expected: 2 templates (shipped vs cancelled)
```

## Common Patterns Library

See `references/pattern-library.md` for a comprehensive collection of regex patterns for:
- Cloud provider IDs (AWS, Azure, GCP)
- Payment processor transaction IDs
- Auth tokens and API keys
- Microservice trace IDs
- Database-specific identifiers
- Industry-specific codes (healthcare, finance, etc.)

## Performance Tips

1. **Compile regex once**: Define patterns at module level, not in functions
2. **Avoid catastrophic backtracking**: Test regex with long strings
3. **Order matters**: Apply most common patterns first
4. **Use non-capturing groups**: `(?:...)` instead of `(...)` when you don't need captures
5. **Benchmark**: Test preprocessing overhead with large datasets

```typescript
// Good: Compiled once
const SESSION_PATTERN = /sess-[a-f0-9]{16}/gi;

const strategy = defineStrategy({
  preprocess: (line) => line.replace(SESSION_PATTERN, '<*>')
});

// Bad: Recompiles every call
const strategy = defineStrategy({
  preprocess: (line) => line.replace(/sess-[a-f0-9]{16}/gi, '<*>')
});
```
