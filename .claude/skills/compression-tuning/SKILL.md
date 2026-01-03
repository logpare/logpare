---
name: compression-tuning
description: Use when tuning logpare compression parameters (depth, simThreshold, maxChildren, maxClusters), analyzing compression results, diagnosing too many/too few templates, or optimizing performance for specific log types.
---

# Compression Tuning

Optimize logpare's Drain algorithm parameters for specific log patterns and compression goals.

## When to Use

Activate this skill when:
- User asks about parameter tuning or optimization
- Compression results show too many templates (>100 for typical logs)
- Templates are too generic (over-grouping different log types)
- Memory usage is high
- User wants recommendations for specific log types
- Analyzing why templates aren't grouping correctly

## Core Parameters

| Parameter | Default | Effect | Typical Range |
|-----------|---------|--------|---------------|
| `depth` | 4 | Parse tree depth; higher = more context | 3-6 |
| `simThreshold` | 0.4 | Token similarity required to match cluster | 0.2-0.7 |
| `maxChildren` | 100 | Max children per tree node | 50-200 |
| `maxClusters` | 1000 | Max total templates in memory | 100-5000 |

## Diagnostic Decision Tree

```
Too many templates?
├─ Are similar logs not grouping?
│  ├─ YES → Lower simThreshold (0.3 or 0.2)
│  └─ NO → Check for unmasked variables
└─ Are templates too short/shallow?
   └─ YES → Increase depth (5 or 6)

Templates too generic?
├─ Different log types merging?
│  ├─ YES → Raise simThreshold (0.5-0.7)
│  └─ NO → Increase depth for more context
└─ Same pattern with different meanings?
   └─ YES → Increase depth + raise threshold

Memory too high?
└─ Reduce maxClusters (500 or lower)
```

## Recommended Settings by Log Type

### Structured Logs (JSON, CSV, key=value)
```typescript
compress(logs, {
  drain: {
    depth: 3,        // Shorter depth for structured data
    simThreshold: 0.5  // Higher threshold (less variation)
  }
});
```
**Why**: Structured logs have predictable positions; don't need deep trees.

### Noisy Application Logs (verbose, varied)
```typescript
compress(logs, {
  drain: {
    depth: 5,         // More context for grouping
    simThreshold: 0.3  // Lower threshold (more variation tolerated)
  }
});
```
**Why**: Application logs have more natural language variation.

### System Logs (syslog, journald, systemd)
```typescript
compress(logs, {
  drain: {
    depth: 4,        // Defaults work well
    simThreshold: 0.4
  }
});
```
**Why**: System logs have moderate structure and variation.

### High-Volume Logs (>1M lines)
```typescript
compress(logs, {
  drain: {
    maxClusters: 500,  // Cap memory usage
    maxChildren: 50    // Reduce tree width
  }
});
```
**Why**: Memory optimization for large datasets.

## Tuning Workflow

1. **Start with defaults** — Run compression and examine results
2. **Count templates** — Check `stats.uniqueTemplates` in output
3. **Review top templates** — Are they meaningful? Too generic?
4. **Apply decision tree** — Use diagnostic tree above
5. **Iterate** — Adjust one parameter at a time
6. **Measure** — Compare compression ratio and template quality

## Common Scenarios

### Scenario: User complains "too many templates"

**Investigation steps**:
```typescript
// First, get baseline stats
const result = compress(logs);
console.log(result.stats);
// Check: inputLines, uniqueTemplates, compressionRatio

// Look at template samples
const topTemplates = result.templates.slice(0, 10);
// Are they actually different? Or slight variations?
```

**If similar logs not grouping**:
```typescript
// Try lower threshold
const result = compress(logs, {
  drain: { simThreshold: 0.3 }
});
```

**If unmasked custom IDs/tokens**:
```typescript
import { defineStrategy } from 'logpare';

const strategy = defineStrategy({
  patterns: {
    sessionId: /sess-[a-f0-9]+/gi,
    orderId: /ORD-\d{10}/g,
    // Add domain-specific patterns
  }
});

const result = compress(logs, {
  drain: { preprocessing: strategy }
});
```

### Scenario: Templates too generic

**Investigation**:
```typescript
// Check if different log types are merging
const templates = result.templates;
templates.forEach(t => {
  console.log(`${t.pattern} (${t.occurrences}x)`);
  console.log(`  Samples: ${t.sampleVariables.slice(0, 3)}`);
});
```

**Fix with higher threshold**:
```typescript
const result = compress(logs, {
  drain: { simThreshold: 0.5 }
});
```

**Or increase depth for more context**:
```typescript
const result = compress(logs, {
  drain: { depth: 5 }
});
```

## Advanced: Custom Similarity Thresholds by Depth

For fine-grained control, use dynamic thresholds:

```typescript
import { defineStrategy } from 'logpare';

const strategy = defineStrategy({
  getSimThreshold: (depth) => {
    if (depth < 2) return 0.5;  // Strict matching for early tokens
    if (depth < 4) return 0.4;  // Default for middle
    return 0.3;                 // Looser for deeper tokens
  }
});

const result = compress(logs, {
  drain: { preprocessing: strategy }
});
```

**When to use**: Logs with consistent prefixes but variable suffixes.

## Performance Considerations

- **depth** = O(n) tree height, minimal memory impact
- **simThreshold** = affects cluster count, not tree size
- **maxChildren** = limits tree width per node, reduces memory
- **maxClusters** = hard cap on templates, caps memory usage

**For 10M+ line logs**: Start with `maxClusters: 500` and `maxChildren: 50`.

## Examples Directory

See `references/tuning-examples.md` for real-world case studies with before/after results.
