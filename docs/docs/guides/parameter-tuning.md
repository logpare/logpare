---
sidebar_position: 1
---

# Parameter Tuning Guide

Learn how to optimize logpare's parameters for different log types and use cases.

## Core Parameters

logpare has four key parameters that control template generation:

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `depth` | 4 | 2-8 | Parse tree depth - higher = more specific templates |
| `simThreshold` | 0.4 | 0.0-1.0 | Similarity threshold - higher = more templates |
| `maxChildren` | 100 | 10-500 | Max children per node - affects tree width |
| `maxClusters` | 1000 | 100-10000 | Max total templates - limits memory |

## Tuning Strategy

### Problem: Too Many Templates

**Symptoms:**
- Hundreds or thousands of templates for a moderate log file
- Similar-looking templates that should be grouped together
- High compression ratio (e.g., 0.8 or 0.9)

**Solutions:**

#### 1. Lower the Similarity Threshold

Make template matching more lenient:

```typescript
compress(logs, {
  simThreshold: 0.3, // More aggressive grouping
});
```

**When to use:**
- Logs with high variability in non-critical tokens
- Similar messages with minor differences
- Noisy application logs

#### 2. Add Custom Preprocessing

Mask domain-specific variables that aren't caught by default patterns:

```typescript
import { defineStrategy, DEFAULT_PATTERNS, WILDCARD } from 'logpare';

const strategy = defineStrategy({
  preprocess(line: string): string {
    let result = line;

    // Apply default patterns
    for (const [, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      result = result.replace(pattern, WILDCARD);
    }

    // Add custom patterns
    result = result.replace(/order-[A-Z0-9]{8}/g, WILDCARD);
    result = result.replace(/user_\d+/g, WILDCARD);
    result = result.replace(/session-[a-f0-9]+/gi, WILDCARD);

    return result;
  }
});

compress(logs, { preprocessing: strategy });
```

### Problem: Templates Too Generic

**Symptoms:**
- Very few templates (e.g., 5-10 for thousands of lines)
- Templates grouping unrelated log types together
- Loss of important diagnostic information

**Solutions:**

#### 1. Raise the Similarity Threshold

Make template matching more strict:

```typescript
compress(logs, {
  simThreshold: 0.5, // More conservative grouping
});
```

#### 2. Increase Tree Depth

Allow the algorithm to consider more tokens:

```typescript
compress(logs, {
  depth: 5, // or 6
});
```

**When to use:**
- Structured logs with many informative tokens
- When you need fine-grained template separation
- Logs with consistent formatting

### Problem: High Memory Usage

**Symptoms:**
- Out of memory errors on large log files
- Slow processing times
- System becomes unresponsive

**Solutions:**

#### 1. Limit Maximum Clusters

Cap the total number of templates:

```typescript
compress(logs, {
  maxClusters: 500,
});
```

#### 2. Reduce Max Children

Prevent tree explosion:

```typescript
compress(logs, {
  maxChildren: 50,
});
```

#### 3. Process in Batches

Use incremental processing for very large files:

```typescript
import { createDrain } from 'logpare';

const drain = createDrain({
  maxClusters: 500,
  maxChildren: 50,
});

// Process in chunks
const chunkSize = 10000;
for (let i = 0; i < logs.length; i += chunkSize) {
  const chunk = logs.slice(i, i + chunkSize);
  drain.addLogLines(chunk);
}

const result = drain.getResult();
```

## Recommended Settings by Log Type

### Structured Logs (JSON, CSV)

These logs have consistent fields and formatting:

```typescript
compress(logs, {
  depth: 3,
  simThreshold: 0.5,
});
```

**Why:**
- Structured logs have predictable token positions
- Higher threshold prevents over-grouping
- Shallow depth is sufficient

**Example:**
```json
{"level":"INFO","timestamp":"2024-01-01T10:00:00Z","message":"Request processed","userId":123}
{"level":"INFO","timestamp":"2024-01-01T10:00:01Z","message":"Request processed","userId":456}
```

### Noisy Application Logs

Logs with variable formatting and many unique values:

```typescript
compress(logs, {
  depth: 5,
  simThreshold: 0.3,
});
```

**Why:**
- Higher depth captures more context
- Lower threshold groups similar messages
- Handles inconsistent formatting

**Example:**
```
[2024-01-01 10:00:00] INFO: User john@example.com logged in from 192.168.1.1
[2024-01-01 10:00:05] INFO - User jane@example.com logged in from IP 10.0.0.50
```

### System Logs (syslog, journald)

Well-formatted system logs with standard patterns:

```typescript
compress(logs, {
  depth: 4,        // Default
  simThreshold: 0.4, // Default
});
```

**Why:**
- Default settings work well for standard formats
- System logs have consistent structure
- Good balance between grouping and specificity

**Example:**
```
Jan 01 10:00:00 hostname sshd[1234]: Accepted publickey for user from 192.168.1.1
Jan 01 10:00:05 hostname sshd[5678]: Accepted publickey for admin from 10.0.0.50
```

### High-Volume Logs (>1M lines)

Optimize for memory efficiency:

```typescript
compress(logs, {
  depth: 4,
  simThreshold: 0.4,
  maxClusters: 500,
  maxChildren: 50,
});
```

**Why:**
- Limits memory usage
- Prevents template explosion
- Maintains reasonable processing speed

### Web Server Access Logs

HTTP request logs with standard formats:

```typescript
compress(logs, {
  depth: 6,
  simThreshold: 0.5,
});
```

**Why:**
- Access logs have many tokens (method, path, status, etc.)
- Higher depth captures full request patterns
- Higher threshold prevents grouping different endpoints

**Example:**
```
192.168.1.1 - - [01/Jan/2024:10:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234
10.0.0.50 - - [01/Jan/2024:10:00:05 +0000] "POST /api/orders HTTP/1.1" 201 567
```

### Error Logs Only

When processing filtered error logs:

```typescript
compress(logs, {
  depth: 5,
  simThreshold: 0.3,
  maxTemplates: 20,
});
```

**Why:**
- Errors often have similar patterns
- Lower threshold groups related errors
- Limit output to top issues

## Advanced Tuning

### Depth-Dependent Similarity Threshold

Adjust threshold based on tree depth:

```typescript
const strategy = defineStrategy({
  getSimThreshold(depth: number): number {
    if (depth <= 2) return 0.3; // More lenient for early tokens
    if (depth <= 4) return 0.4; // Default for middle
    return 0.5; // Stricter for deeper levels
  }
});

compress(logs, { preprocessing: strategy });
```

**Use case:** When early tokens are highly variable but later tokens are consistent.

### Custom Pattern Recognition

Add patterns specific to your application:

```typescript
const strategy = defineStrategy({
  preprocess(line: string): string {
    return line
      // E-commerce patterns
      .replace(/order-[A-Z0-9]{8}/g, '<*>')
      .replace(/SKU-\d{6}/g, '<*>')
      .replace(/\$\d+\.\d{2}/g, '<*>')

      // Service-specific IDs
      .replace(/tenant-[a-z0-9]{16}/g, '<*>')
      .replace(/workspace_\d+/g, '<*>')

      // Apply defaults
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '<*>');
  }
});
```

## Diagnostic Tools

### Check Compression Ratio

Monitor how well compression is working:

```typescript
const result = compress(logs);

console.log(`Compression ratio: ${result.stats.compressionRatio}`);
console.log(`Token reduction: ${result.stats.estimatedTokenReduction}%`);

if (result.stats.compressionRatio > 0.5) {
  console.log('⚠️  Low compression - consider lowering simThreshold');
} else if (result.stats.compressionRatio < 0.05) {
  console.log('⚠️  Very high compression - templates may be too generic');
}
```

### Analyze Template Distribution

Check if templates are well-distributed:

```typescript
const result = compress(logs, { format: 'json' });

const occurrences = result.templates.map(t => t.occurrences);
const avg = occurrences.reduce((a, b) => a + b, 0) / occurrences.length;
const max = Math.max(...occurrences);

console.log(`Average occurrences: ${avg}`);
console.log(`Max occurrences: ${max}`);

if (max > avg * 10) {
  console.log('⚠️  Skewed distribution - one template dominates');
}
```

### Inspect Sample Variables

Check what's being captured as variables:

```typescript
const result = compress(logs, { format: 'json' });

result.templates.forEach(template => {
  console.log(`Pattern: ${template.pattern}`);
  console.log('Sample variables:');
  template.sampleVariables.forEach(vars => {
    console.log(`  ${vars.join(', ')}`);
  });
  console.log('---');
});
```

## Troubleshooting Checklist

1. **Start with defaults** - Test with default settings first
2. **Check preprocessing** - Ensure variables are being masked
3. **Adjust threshold** - Lower for grouping, higher for separation
4. **Tune depth** - Increase for complex logs, decrease for simple ones
5. **Monitor memory** - Set limits for large files
6. **Review samples** - Inspect captured variables to verify correctness

## Summary

| Problem | Solution | Parameter Change |
|---------|----------|------------------|
| Too many templates | Lower threshold | `simThreshold: 0.3` |
| Templates too generic | Raise threshold | `simThreshold: 0.5` |
| Missing grouping | Increase depth | `depth: 5` |
| Memory issues | Limit clusters | `maxClusters: 500` |
| Unmasked variables | Custom preprocessing | Add patterns |

Remember: The best settings depend on your specific log format and use case. Start with defaults and adjust based on results.
