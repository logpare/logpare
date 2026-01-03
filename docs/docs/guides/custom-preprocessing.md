---
sidebar_position: 2
---

# Custom Preprocessing

Learn how to create custom preprocessing strategies for domain-specific log formats.

## Overview

Preprocessing transforms raw log lines before template extraction. It's crucial for:

- Masking variable data (IDs, tokens, values)
- Normalizing inconsistent formatting
- Handling domain-specific patterns
- Improving compression quality

## Default Preprocessing

logpare includes built-in patterns for common variables:

```typescript
import { DEFAULT_PATTERNS } from 'logpare';

console.log(DEFAULT_PATTERNS);
// {
//   ipv4: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
//   ipv6: /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g,
//   uuid: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi,
//   timestamp: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
//   hexId: /0x[0-9a-fA-F]+/g,
//   filepath: /\/[\w\-\.\/]+/g,
//   url: /https?:\/\/[^\s]+/g,
//   number: /\b\d+\b/g,
//   // ... and more
// }
```

These patterns automatically replace matching values with `<*>`.

## Creating Custom Strategies

Use `defineStrategy()` to create a custom preprocessing strategy:

```typescript
import { defineStrategy } from 'logpare';

const customStrategy = defineStrategy({
  preprocess(line: string): string {
    // Transform the line
    return line;
  },

  tokenize(line: string): string[] {
    // Split line into tokens
    return line.split(/\s+/).filter(Boolean);
  },

  getSimThreshold(depth: number): number {
    // Return similarity threshold for this depth
    return 0.4;
  }
});
```

All three methods are optional. Only override what you need.

## Common Patterns

### Adding Custom ID Patterns

Mask application-specific identifiers:

```typescript
import { defineStrategy, DEFAULT_PATTERNS, WILDCARD } from 'logpare';

const strategy = defineStrategy({
  preprocess(line: string): string {
    let result = line;

    // Apply default patterns first
    for (const [, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      result = result.replace(pattern, WILDCARD);
    }

    // Add custom patterns
    result = result.replace(/order-[A-Z0-9]{8}/g, WILDCARD);
    result = result.replace(/user_\d+/g, WILDCARD);
    result = result.replace(/session-[a-f0-9]{32}/gi, WILDCARD);
    result = result.replace(/REQ-\d{10}/g, WILDCARD);

    return result;
  }
});

compress(logs, { preprocessing: strategy });
```

### E-commerce Logs

```typescript
const ecommerceStrategy = defineStrategy({
  preprocess(line: string): string {
    return line
      // Order IDs
      .replace(/order-[A-Z0-9]{8}/g, '<*>')
      // Product SKUs
      .replace(/SKU-\d{6}/g, '<*>')
      // Prices
      .replace(/\$\d+\.\d{2}/g, '<*>')
      // Customer IDs
      .replace(/cust_[a-z0-9]{16}/g, '<*>')
      // Cart IDs
      .replace(/cart-[A-Z0-9]{12}/g, '<*>')
      // Apply defaults
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '<*>');
  }
});
```

### Multi-tenant SaaS Logs

```typescript
const saasStrategy = defineStrategy({
  preprocess(line: string): string {
    return line
      // Tenant IDs
      .replace(/tenant-[a-z0-9]{16}/g, '<*>')
      // Organization IDs
      .replace(/org_[A-Z0-9]{12}/g, '<*>')
      // Workspace IDs
      .replace(/workspace_\d+/g, '<*>')
      // API keys (partial)
      .replace(/sk_live_[A-Za-z0-9]{24}/g, '<*>')
      .replace(/pk_live_[A-Za-z0-9]{24}/g, '<*>')
      // User emails
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<*>');
  }
});
```

### Kubernetes/Container Logs

```typescript
const k8sStrategy = defineStrategy({
  preprocess(line: string): string {
    return line
      // Pod names
      .replace(/\b[a-z0-9-]+-[a-z0-9]{8,10}-[a-z0-9]{5}\b/g, '<*>')
      // Container IDs
      .replace(/[0-9a-f]{64}/g, '<*>')
      // Deployment revision
      .replace(/revision=\d+/g, 'revision=<*>')
      // Resource versions
      .replace(/resourceVersion:\s*"\d+"/g, 'resourceVersion:"<*>"')
      // Image tags
      .replace(/(:\s*v?\d+\.\d+\.\d+(-[\w\.]+)?)/g, ':<*>');
  }
});
```

### Financial/Banking Logs

```typescript
const financeStrategy = defineStrategy({
  preprocess(line: string): string {
    return line
      // Account numbers (last 4 digits visible)
      .replace(/\*{4,}\d{4}/g, '<*>')
      // Transaction IDs
      .replace(/TXN-[A-Z0-9]{16}/g, '<*>')
      // Amounts with currency
      .replace(/\$[\d,]+\.\d{2}/g, '<*>')
      .replace(/€[\d,]+\.\d{2}/g, '<*>')
      // Card numbers (masked)
      .replace(/\d{4}\s\d{4}\s\d{4}\s\d{4}/g, '<*>')
      // Routing numbers
      .replace(/routing:\s*\d{9}/gi, 'routing:<*>');
  }
});
```

## Custom Tokenization

### CSV Logs

Split on commas instead of whitespace:

```typescript
const csvStrategy = defineStrategy({
  tokenize(line: string): string[] {
    return line.split(',').map(token => token.trim());
  }
});
```

### Tab-Separated Logs

```typescript
const tsvStrategy = defineStrategy({
  tokenize(line: string): string[] {
    return line.split('\t').filter(Boolean);
  }
});
```

### JSON Logs

Extract specific fields for tokenization:

```typescript
const jsonStrategy = defineStrategy({
  preprocess(line: string): string {
    try {
      const parsed = JSON.parse(line);
      // Create a normalized format
      return `${parsed.level} ${parsed.message || ''} ${parsed.context || ''}`;
    } catch {
      // Fallback for non-JSON lines
      return line;
    }
  },

  tokenize(line: string): string[] {
    return line.split(/\s+/).filter(Boolean);
  }
});
```

## Depth-Based Similarity Thresholds

Adjust matching strictness by tree depth:

```typescript
const adaptiveStrategy = defineStrategy({
  getSimThreshold(depth: number): number {
    // More lenient for shallow depths (first few tokens)
    if (depth <= 2) return 0.3;

    // Default for middle depths
    if (depth <= 4) return 0.4;

    // Stricter for deeper levels
    return 0.5;
  }
});
```

**Use case:** When initial tokens are highly variable but later tokens are consistent.

## Advanced Examples

### Combining Multiple Strategies

```typescript
const combinedStrategy = defineStrategy({
  preprocess(line: string): string {
    let result = line;

    // First, apply defaults
    for (const [, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      result = result.replace(pattern, WILDCARD);
    }

    // Then normalize timestamps
    result = result.replace(
      /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g,
      WILDCARD
    );

    // Mask application-specific IDs
    result = result.replace(/\b[A-Z]{3}-\d{6}\b/g, WILDCARD);

    // Normalize error codes
    result = result.replace(/error\s+code\s+\d+/gi, 'error code <*>');

    return result;
  },

  tokenize(line: string): string[] {
    // Custom tokenization: preserve quoted strings
    const tokens: string[] = [];
    const regex = /"([^"]*)"|(\S+)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      tokens.push(match[1] || match[2]);
    }

    return tokens;
  },

  getSimThreshold(depth: number): number {
    return depth <= 2 ? 0.3 : 0.4;
  }
});
```

### Normalizing Inconsistent Formats

Handle logs with varying formats:

```typescript
const normalizeStrategy = defineStrategy({
  preprocess(line: string): string {
    let result = line;

    // Normalize date formats
    result = result.replace(/\d{2}\/\d{2}\/\d{4}/g, '<DATE>');
    result = result.replace(/\d{4}-\d{2}-\d{2}/g, '<DATE>');

    // Normalize severity levels
    result = result.replace(/\b(ERROR|ERR|error)\b/gi, 'ERROR');
    result = result.replace(/\b(WARN|WARNING|warn)\b/gi, 'WARN');
    result = result.replace(/\b(INFO|info)\b/gi, 'INFO');

    // Normalize separators
    result = result.replace(/\s*[-:]\s*/g, ' ');

    // Remove leading timestamps
    result = result.replace(/^\[.*?\]\s*/, '');

    return result;
  }
});
```

### Performance Optimization

Cache regex patterns for better performance:

```typescript
class OptimizedStrategy implements ParsingStrategy {
  private patterns: Map<string, RegExp>;

  constructor() {
    this.patterns = new Map([
      ['orderId', /order-[A-Z0-9]{8}/g],
      ['userId', /user_\d+/g],
      ['sessionId', /session-[a-f0-9]{32}/gi],
    ]);
  }

  preprocess(line: string): string {
    let result = line;

    // Apply cached patterns
    for (const [, pattern] of this.patterns) {
      result = result.replace(pattern, '<*>');
    }

    return result;
  }

  tokenize(line: string): string[] {
    return line.split(/\s+/).filter(Boolean);
  }

  getSimThreshold(depth: number): number {
    return 0.4;
  }
}

const strategy = new OptimizedStrategy();
compress(logs, { preprocessing: strategy });
```

## Testing Custom Strategies

Verify your strategy works as expected:

```typescript
import { defineStrategy, WILDCARD } from 'logpare';

const strategy = defineStrategy({
  preprocess(line: string): string {
    return line.replace(/order-[A-Z0-9]{8}/g, WILDCARD);
  }
});

// Test preprocessing
const input = 'Processing order-ABC12345 for user 123';
const output = strategy.preprocess(input);

console.log(output);
// Expected: "Processing <*> for user 123"

// Test with compress
const result = compress([
  'Processing order-ABC12345 for user 123',
  'Processing order-XYZ98765 for user 456',
], { preprocessing: strategy });

console.log(result.templates[0].pattern);
// Expected: "Processing <*> for user <*>"
```

## Best Practices

1. **Apply defaults first** - Start with `DEFAULT_PATTERNS` then add custom patterns
2. **Test incrementally** - Add patterns one at a time and verify results
3. **Be specific** - Use precise regex to avoid over-matching
4. **Cache patterns** - Compile regex once, reuse many times
5. **Document patterns** - Comment what each pattern matches
6. **Validate input** - Handle malformed logs gracefully
7. **Monitor performance** - Complex regex can slow processing

## Debugging Tips

### Inspect Preprocessing Output

```typescript
const strategy = defineStrategy({
  preprocess(line: string): string {
    const result = line.replace(/custom-pattern/g, '<*>');
    console.log(`Before: ${line}`);
    console.log(`After: ${result}`);
    return result;
  }
});
```

### Check Pattern Matches

```typescript
const testPattern = /order-[A-Z0-9]{8}/g;
const testLine = 'Processing order-ABC12345';

const matches = testLine.match(testPattern);
console.log('Matches:', matches);
// Output: ["order-ABC12345"]
```

### Compare Results

```typescript
// Without custom preprocessing
const result1 = compress(logs);
console.log(`Templates: ${result1.stats.uniqueTemplates}`);

// With custom preprocessing
const result2 = compress(logs, { preprocessing: customStrategy });
console.log(`Templates: ${result2.stats.uniqueTemplates}`);
console.log(`Improvement: ${result1.stats.uniqueTemplates - result2.stats.uniqueTemplates}`);
```

## See Also

- [Parameter Tuning Guide](/docs/guides/parameter-tuning) - Optimize algorithm parameters
- [Types Reference](/docs/api/types) - ParsingStrategy interface
- [compress() API](/docs/api/compress) - Using custom strategies
