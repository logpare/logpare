# Migrating from Python Drain3

This guide helps users familiar with [Python Drain3](https://github.com/logpai/Drain3) transition to logpare.

## Quick Comparison

| Aspect | Drain3 (Python) | logpare (TypeScript) |
|--------|-----------------|----------------------|
| Algorithm | Drain | Drain |
| Runtime | Python 3.7+ | Node.js 18+ |
| Package Manager | pip | npm/pnpm |
| Default Output | Cluster object | Formatted string + JSON |
| Persistence | Kafka, Redis, file, memory | In-memory only |

## Parameter Mapping

Core algorithm parameters map directly with the same defaults:

| Drain3 | logpare | Default | Notes |
|--------|---------|---------|-------|
| `sim_th` | `simThreshold` | `0.4` | Same |
| `depth` | `depth` | `4` | Same |
| `max_children` | `maxChildren` | `100` | Same |
| `max_clusters` | `maxClusters` | `∞` / `1000` | logpare has default limit |
| `extra_delimiters` | `ParsingStrategy.tokenize()` | - | Custom function |
| `masking` | `ParsingStrategy.preprocess()` | - | Regex-based |
| `mask_prefix`/`suffix` | Fixed `<*>` | - | Not configurable |

## Code Comparison

### Basic Usage

**Drain3 (Python):**
```python
from drain3 import TemplateMiner

template_miner = TemplateMiner()

for line in log_lines:
    result = template_miner.add_log_message(line)
    print(f"Template: {result['template_mined']}")
```

**logpare (TypeScript):**
```typescript
import { compress } from 'logpare';

const result = compress(logLines);
console.log(result.formatted);

// Or for individual line processing:
import { createDrain } from 'logpare';
const drain = createDrain();
for (const line of logLines) {
  const cluster = drain.add(line);
  console.log(`Template: ${cluster.template}`);
}
```

### Configuration

**Drain3 (Python):**
```python
from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig

config = TemplateMinerConfig()
config.drain_sim_th = 0.5
config.drain_depth = 5
config.drain_max_children = 50

template_miner = TemplateMiner(config=config)
```

**logpare (TypeScript):**
```typescript
import { createDrain, compress } from 'logpare';

// With createDrain
const drain = createDrain({
  simThreshold: 0.5,
  depth: 5,
  maxChildren: 50,
});

// With compress
const result = compress(lines, {
  drain: {
    simThreshold: 0.5,
    depth: 5,
    maxChildren: 50,
  },
});
```

### Custom Masking

**Drain3 (Python):**
```python
# In drain3.ini or config
[MASKING]
masking = [
    {"regex_pattern": "\\d{4}-\\d{2}-\\d{2}", "mask_with": "<DATE>"},
    {"regex_pattern": "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}", "mask_with": "<IP>"}
]
```

**logpare (TypeScript):**
```typescript
import { defineStrategy, compress } from 'logpare';

const strategy = defineStrategy({
  patterns: {
    date: /\d{4}-\d{2}-\d{2}/g,
    ip: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
  },
});

const result = compress(lines, {
  drain: { preprocessing: strategy },
});
```

### Extracting Parameters

**Drain3 (Python):**
```python
result = template_miner.add_log_message(log_line)
params = template_miner.extract_parameters(
    result["template_mined"], log_line, exact_matching=True
)
```

**logpare (TypeScript):**
```typescript
// Parameters are captured automatically in sampleVariables
const result = compress(lines);
for (const template of result.templates) {
  console.log('Template:', template.pattern);
  console.log('Sample values:', template.sampleVariables);
}
```

## Features Not in logpare

logpare intentionally omits some Drain3 features to stay lightweight:

### Persistence
Drain3 supports Kafka, Redis, and file-based persistence. logpare is stateless by design - process logs and discard. If you need persistence:

```typescript
// Save templates to JSON
const result = compress(lines);
fs.writeFileSync('templates.json', JSON.stringify(result.templates));
```

### Training/Inference Mode Separation
Drain3 has `add_log_message()` for training and `match()` for inference-only. logpare always learns:

```typescript
// logpare always updates clusters when adding lines
const cluster = drain.add(line); // Always learns

// For inference-only behavior, save and reuse templates
const knownTemplates = result.templates.map(t => t.pattern);
```

### Profiling/Metrics
Drain3 has built-in profiling. Use standard Node.js profiling with logpare:

```typescript
console.time('compression');
const result = compress(lines);
console.timeEnd('compression');
```

## Performance Comparison

Both implementations use the same algorithm with similar performance characteristics:

| Metric | Drain3 | logpare |
|--------|--------|---------|
| Speed | ~10k lines/sec | >10k lines/sec |
| Memory | O(templates) | O(templates) |
| Startup | Python import overhead | Node.js module load |

logpare may be faster in V8 due to:
- Monomorphic class constructors
- `Map` instead of dict for tree nodes
- No persistence overhead

## Getting Help

- logpare issues: https://github.com/logpare/logpare/issues
- Drain3 issues: https://github.com/logpai/Drain3/issues
