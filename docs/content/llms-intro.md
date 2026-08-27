# logpare

> Semantic log compression for LLM context windows. Uses the Drain algorithm to collapse
> repetitive log lines into templates with occurrence counts, reducing tokens by 60-90%
> while preserving diagnostic information (severity, URLs, status codes, correlation IDs,
> durations).

## Install

```bash
npm install logpare
```

## Minimal example

```typescript
import { compress } from 'logpare';

const result = compress([
  'ERROR Connection to 192.168.1.100 failed',
  'ERROR Connection to 192.168.1.101 failed',
  'INFO Request processed in 45ms',
]);

console.log(result.formatted);
// === Log Compression Summary ===
// Input: 3 lines → 2 templates (33.3% reduction)
//
// Top templates by frequency:
// 1. [2x] ERROR Connection to <*> failed
// 2. [1x] INFO Request processed in <*>
```

## Which interface

- **CLI** — you have a file or a pipe and want compressed text now: `logpare app.log`,
  `cat /var/log/syslog | logpare`. No `compress` subcommand exists; pass options and paths
  directly.
- **Library** — you are writing code that reads `result.templates` / `result.stats`, needs
  custom masking, or feeds lines in incrementally via `createDrain()`.

Algorithm options are nested: `compress(logs, { drain: { depth: 5 } })`. `createDrain()`
takes them flat. Compression is a diagnostic representation, not an archive — keep the
original logs.
