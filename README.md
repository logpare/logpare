# logpare

[![npm version](https://img.shields.io/npm/v/logpare.svg)](https://www.npmjs.com/package/logpare)
[![CI](https://github.com/logpare/logpare/workflows/CI/badge.svg)](https://github.com/logpare/logpare/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Semantic log compression for LLM context windows. Reduces repetitive log output by 60-90% while preserving diagnostic information.

## The Problem

AI assistants processing logs waste tokens on repetitive patterns. A 10,000-line log dump might contain 50 unique message templates repeated thousands of times — but the LLM sees (and bills for) every repetition.

## The Solution

LogPare uses the [Drain algorithm](https://github.com/logpai/Drain3) to identify log templates, then outputs a compressed format showing each template once with occurrence counts.

```
Input (10,847 lines):
INFO Connection from 192.168.1.1 established
INFO Connection from 192.168.1.2 established
INFO Connection from 10.0.0.55 established
... (10,844 more similar lines)

Output (23 templates):
=== Log Compression Summary ===
Input: 10,847 lines → 23 templates (99.8% reduction)

Top templates by frequency:
1. [4,521x] INFO Connection from <*> established
2. [3,892x] DEBUG Request <*> processed in <*>
3. [1,203x] WARN Retry attempt <*> for <*>
...
```

## Installation

```bash
npm install logpare
# or
pnpm add logpare
```

## CLI Usage

LogPare includes a command-line interface for quick log compression:

```bash
# Compress a log file
logpare server.log

# Pipe from stdin
cat /var/log/syslog | logpare

# JSON output
logpare --format json app.log

# Custom algorithm parameters
logpare --depth 5 --threshold 0.5 access.log

# Write to file
logpare --output templates.txt error.log

# Multiple files
logpare access.log error.log server.log
```

### CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--format` | `-f` | Output format: `summary`, `detailed`, `json` | `summary` |
| `--output` | `-o` | Write output to file | stdout |
| `--depth` | `-d` | Parse tree depth | `4` |
| `--threshold` | `-t` | Similarity threshold (0.0-1.0) | `0.4` |
| `--max-children` | `-c` | Max children per node | `100` |
| `--max-clusters` | `-m` | Max total clusters | `1000` |
| `--max-templates` | `-n` | Max templates in output | `50` |
| `--help` | `-h` | Show help | |
| `--version` | `-v` | Show version | |

## Programmatic Usage

### Simple API

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
// ...
```

### Text Input

```typescript
import { compressText } from 'logpare';

const logFile = fs.readFileSync('app.log', 'utf-8');
const result = compressText(logFile, { format: 'json' });
```

### Advanced API

```typescript
import { createDrain, defineStrategy } from 'logpare';

// Custom preprocessing strategy
const customStrategy = defineStrategy({
  patterns: {
    requestId: /req-[a-z0-9]+/gi,
  },
  getSimThreshold: (depth) => depth < 2 ? 0.5 : 0.4,
});

const drain = createDrain({
  depth: 4,
  maxClusters: 500,
  preprocessing: customStrategy,
});

drain.addLogLines(logs);
const result = drain.getResult('detailed');
```

## Output Formats

### Summary (default)
Compact overview with top templates and rare events.

### Detailed
Full template list with sample variable values.

### JSON
Machine-readable format for programmatic use.

```typescript
compress(logs, { format: 'json' });
```

## API Reference

### `compress(lines, options?)`

Compress an array of log lines.

- `lines`: `string[]` - Log lines to compress
- `options.format`: `'summary' | 'detailed' | 'json'` - Output format (default: `'summary'`)
- `options.maxTemplates`: `number` - Max templates in output (default: `50`)
- `options.drain`: `DrainOptions` - Algorithm configuration

Returns `CompressionResult` with `templates`, `stats`, and `formatted` output.

### `compressText(text, options?)`

Compress a multi-line string (splits on newlines).

### `createDrain(options?)`

Create a Drain instance for incremental processing.

- `options.depth`: `number` - Parse tree depth (default: `4`)
- `options.simThreshold`: `number` - Similarity threshold 0-1 (default: `0.4`)
- `options.maxChildren`: `number` - Max children per node (default: `100`)
- `options.maxClusters`: `number` - Max total templates (default: `1000`)
- `options.preprocessing`: `ParsingStrategy` - Custom preprocessing

### `defineStrategy(overrides)`

Create a custom preprocessing strategy.

```typescript
const strategy = defineStrategy({
  patterns: { customId: /id-\d+/g },
  tokenize: (line) => line.split(','),
  getSimThreshold: (depth) => 0.5,
});
```

## Built-in Patterns

LogPare automatically masks common variable types:

- IPv4/IPv6 addresses
- Port numbers (e.g., `:443`, `:8080`)
- UUIDs
- Timestamps (ISO, Unix)
- File paths and URLs
- Hex IDs
- Block IDs (HDFS)
- Numbers with units (e.g., `250ms`, `1024KB`)

## Performance

- **Speed**: >10,000 lines/second
- **Memory**: O(templates), not O(lines)
- **V8 Optimized**: Uses `Map` for tree nodes, monomorphic constructors

## Parameter Tuning Guide

### When to Adjust Parameters

| Symptom | Cause | Solution |
|---------|-------|----------|
| Too many templates | Threshold too high | Lower `simThreshold` (e.g., 0.3) |
| Templates too generic | Threshold too low | Raise `simThreshold` (e.g., 0.5) |
| Similar logs not grouped | Depth too shallow | Increase `depth` (e.g., 5-6) |
| Too much memory usage | Too many clusters | Lower `maxClusters` |

### Recommended Settings by Log Type

**Structured logs (JSON, CSV):**
```typescript
{ depth: 3, simThreshold: 0.5 }
```

**Noisy application logs:**
```typescript
{ depth: 5, simThreshold: 0.3 }
```

**System logs (syslog, journald):**
```typescript
{ depth: 4, simThreshold: 0.4 } // defaults work well
```

**High-volume logs (>1M lines):**
```typescript
{ maxClusters: 500, maxChildren: 50 }
```

## Troubleshooting

### "Too many templates"

If you're getting more templates than expected:

1. **Lower the similarity threshold**: Templates that should group together may not meet the default 0.4 threshold
   ```typescript
   compress(logs, { drain: { simThreshold: 0.3 } })
   ```

2. **Check for unmaked variables**: Custom IDs or tokens may need masking
   ```typescript
   const strategy = defineStrategy({
     patterns: { customId: /your-pattern/g }
   });
   ```

### "Templates are too generic"

If templates are over-grouping different log types:

1. **Raise the similarity threshold**:
   ```typescript
   compress(logs, { drain: { simThreshold: 0.5 } })
   ```

2. **Increase tree depth**:
   ```typescript
   compress(logs, { drain: { depth: 5 } })
   ```

### "Memory usage too high"

For very large log files:

1. **Limit clusters**: Set `maxClusters` to cap memory usage
   ```typescript
   compress(logs, { drain: { maxClusters: 500 } })
   ```

2. **Process in batches**: Use `createDrain()` and process chunks

### "Some patterns not being masked"

Add custom patterns for domain-specific tokens:

```typescript
const strategy = defineStrategy({
  patterns: {
    sessionId: /sess-[a-f0-9]+/gi,
    orderId: /ORD-\d{10}/g,
  }
});
```

## Coming from Python Drain3?

See [MIGRATION.md](./MIGRATION.md) for a detailed comparison and migration guide.

## License

MIT
