# AGENTS.md — logpare

Guidance for coding agents working *with* logpare (found inside `node_modules/logpare`) or
*on* it (found in the source repository).

## What logpare does

Semantic log compression for LLM context windows. It runs the Drain algorithm over
repetitive log lines, collapsing them into templates like
`[4,521x] INFO Connection from <*> established`, and preserves diagnostic metadata
(severity, URLs, HTTP status codes, correlation IDs, durations) on each template.

Use it when you are about to put a large, repetitive log dump into a prompt.

## Library or CLI?

| Use the **CLI** when | Use the **library** when |
|---|---|
| You have a file or a pipe and want the compressed text now | You are writing code that consumes `templates`/`stats` |
| Shell-composing with `tail`, `kubectl logs`, `journalctl`, `jq` | You need custom masking, incremental/streaming input, or progress events |

```bash
logpare server.log                 # a file
cat /var/log/syslog | logpare      # stdin
logpare --format json app.log      # machine-readable
```

There is **no `compress` subcommand** — `logpare compress app.log` is read as two file
paths and fails. Options and paths go directly on the command line. Run `logpare --help`
for the full flag list.

## Canonical imports

Everything public comes from the package root. Never import `logpare/dist/...`,
`logpare/src/...`, or any internal module path — they are not part of the public API and
are not covered by semver.

```typescript
import {
  compress, compressText,             // one-shot compression
  createDrain, Drain,                 // incremental / streaming
  defineStrategy,                     // custom preprocessing
  DEFAULT_PATTERNS, WILDCARD,
  SEVERITY_PATTERNS, STACK_FRAME_PATTERNS,
  detectSeverity, isStackFrame,
  extractUrls, extractFullUrls, extractStatusCodes,
  extractCorrelationIds, extractDurations,
} from 'logpare';
```

`LogCluster` and `DrainNode` are internal and are **not** exported. Read templates through
`getTemplates()` or `getResult()`.

## The one thing agents get wrong

`compress()` takes only `format`, `maxTemplates`, and `drain`. Every algorithm parameter is
nested inside `drain`:

```typescript
// correct
compress(logs, { format: 'detailed', drain: { depth: 5, simThreshold: 0.3 } });

// wrong — does not typecheck, and the values are ignored
compress(logs, { depth: 5, simThreshold: 0.3 });
```

`createDrain()` is the exception: it receives `DrainOptions` directly, so its options are
flat.

```typescript
const drain = createDrain({ depth: 5 });
drain.addLogLine('ERROR Connection to 10.0.0.1 failed');
drain.addLogLines(moreLines);
drain.getTemplates();          // Template[], discovery order
drain.getResult('summary');    // CompressionResult, sorted by frequency
```

## Behavioural boundaries

- **Compression is a diagnostic representation, not an archive.** Templates keep a pattern,
  counts, and a few sampled values. The original lines cannot be reconstructed from the
  output. Always retain the raw logs; send only the compressed view to a model.
- **Check `stats.droppedLines`.** Once `drain.maxClusters` (default 1000) is reached,
  unmatched lines are discarded rather than compressed. A non-zero value means the output
  is incomplete and `compressionRatio` overstates the real result.
- **`compressionRatio` and `estimatedTokenReduction` are ratios in `0..1`, not percents.**
  `compressionRatio` is `1 - uniqueTemplates / inputLines`, so higher means more compression.
- **Default masking eats short numbers.** `DEFAULT_PATTERNS.numbers` masks every bare
  integer, so an HTTP `404` or `line:123` becomes `<*>`. Supply a custom strategy if you
  need them preserved. Status codes are still captured separately in
  `template.statusCodeSamples`.
- **Compression is lossy by design.** Do not use it as an input to anything that needs
  exact log text — audit trails, incident evidence, or replay.

## Which bundled file answers what

| Question | File |
|---|---|
| Quick start, CLI flags, output formats | `README.md` |
| Curated map of the online docs | `llms.txt` |
| Full API reference, tuning, troubleshooting | `llms-full.txt` |
| Anything else | https://logpare.com/docs |

Every documentation page also has a Markdown twin at `https://logpare.com/docs/<page>.md`.

## For contributors

Working on logpare itself rather than with it:

- `CONTRIBUTING.md` — how to propose changes
- `CLAUDE.md` — architecture, V8 constraints, module boundaries, version-bump checklist
- `.claude/skills/` — task-specific guides (tuning, preprocessing, debugging templates)

Verify every change with:

```bash
pnpm gates        # docs drift check + typecheck + tests + build, stops at first failure
```

`llms.txt` and `llms-full.txt` are **generated** from `docs/content/docs/**` — edit the MDX
pages, then run `pnpm docs:llms`. `pnpm gates` fails if they are stale.
