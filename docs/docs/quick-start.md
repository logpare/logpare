---
sidebar_position: 3
---

# Quick Start

This guide will get you up and running with logpare in minutes.

## Basic CLI Usage

Compress a log file:

```bash
logpare server.log
```

Use stdin:

```bash
cat /var/log/syslog | logpare
tail -f app.log | logpare
```

Get detailed output:

```bash
logpare --format detailed error.log
```

Output as JSON:

```bash
logpare --format json --output compressed.json access.log
```

## Basic Programmatic Usage

### Compressing an Array of Lines

```typescript
import { compress } from 'logpare';

const logs = [
  'INFO Connection from 192.168.1.1 established',
  'INFO Connection from 192.168.1.2 established',
  'ERROR Connection timeout after 30s',
  'INFO Connection from 10.0.0.1 established',
];

const result = compress(logs);

console.log(result.formatted);
// === Log Compression Summary ===
// Input: 4 lines → 2 templates (50.0% reduction)
//
// Top templates by frequency:
// 1. [3x] INFO Connection from <*> established
// 2. [1x] ERROR Connection timeout after <*>

console.log(result.stats);
// {
//   inputLines: 4,
//   uniqueTemplates: 2,
//   compressionRatio: 0.5,
//   estimatedTokenReduction: 60
// }
```

### Compressing Text

```typescript
import { compressText } from 'logpare';
import fs from 'fs';

const logFile = fs.readFileSync('app.log', 'utf-8');
const result = compressText(logFile);

console.log(result.formatted);
```

### Getting Structured Data

Use JSON format for programmatic processing:

```typescript
const result = compress(logs, { format: 'json' });

// Access templates
result.templates.forEach(template => {
  console.log(`Pattern: ${template.pattern}`);
  console.log(`Occurrences: ${template.occurrences}`);
  console.log(`Severity: ${template.severity}`);
  console.log(`URLs: ${template.urlSamples.join(', ')}`);
  console.log('---');
});
```

## Output Formats

### Summary (Default)

Compact overview with top templates and rare events:

```typescript
const result = compress(logs, { format: 'summary' });
```

Output:
```
=== Log Compression Summary ===
Input: 10,847 lines → 23 templates (99.8% reduction)

Top templates by frequency:
1. [4,521x] INFO Connection from <*> established
2. [3,892x] DEBUG Request <*> processed in <*>

Rare events (≤5 occurrences):
- [1x] FATAL Database connection lost
```

### Detailed

Full information with all diagnostic metadata:

```typescript
const result = compress(logs, { format: 'detailed' });
```

Output:
```
Template #1: INFO Connection from <*> established
  Occurrences: 4,521
  Severity: info
  First seen: line 1
  Last seen: line 10,234
  Sample values: [["192.168.1.1"], ["10.0.0.55"], ["172.16.0.1"]]
  URLs: api.example.com, cdn.example.com
```

### JSON

Machine-readable format:

```typescript
const result = compress(logs, { format: 'json' });
```

Output:
```json
{
  "version": "1.1",
  "stats": {
    "inputLines": 10847,
    "uniqueTemplates": 23,
    "compressionRatio": 0.998,
    "estimatedTokenReduction": 0.95
  },
  "templates": [
    {
      "id": "abc123",
      "pattern": "INFO Connection from <*> established",
      "occurrences": 4521,
      "severity": "info",
      "sampleVariables": [["192.168.1.1"], ["10.0.0.55"]]
    }
  ]
}
```

## Advanced: Incremental Processing

For streaming or very large log files, use the Drain API directly:

```typescript
import { createDrain } from 'logpare';

const drain = createDrain({
  depth: 4,
  simThreshold: 0.4,
});

// Process logs one at a time
drain.process('ERROR Connection failed');
drain.process('ERROR Connection timeout');
drain.process('INFO Request completed');

// Get clusters (templates)
const clusters = drain.getClusters();
clusters.forEach(cluster => {
  console.log(`Pattern: ${cluster.getPattern()}`);
  console.log(`Count: ${cluster.size()}`);
});
```

## What's Next?

Now that you've learned the basics:

- **Tune parameters** - See [Parameter Tuning Guide](/docs/guides/parameter-tuning)
- **Custom preprocessing** - Learn about [Custom Preprocessing](/docs/guides/custom-preprocessing)
- **API deep dive** - Explore the full [API Reference](/docs/api/compress)
- **CLI options** - Check out all [CLI options](/docs/cli)
