---
slug: introducing-logpare
title: Introducing logpare
authors: [logpare]
tags: [announcement, release]
---

We're excited to announce **logpare**, a semantic log compression library designed specifically for LLM context windows.

<!-- truncate -->

## The Problem

When you paste logs into an AI assistant, you're often wasting a significant portion of your context window on repetitive patterns. A 10,000-line log file might contain just 50 unique message templates repeated thousands of times, but the LLM sees (and bills for) every single repetition.

```text
INFO Connection from 192.168.1.1 established
INFO Connection from 192.168.1.2 established
INFO Connection from 10.0.0.55 established
... (10,844 more lines)
```

This wastes tokens, increases costs, and can push important context out of the window entirely.

## The Solution

logpare uses the [Drain algorithm](https://github.com/logpai/Drain3) to identify log templates and produce a compressed summary. Instead of thousands of repetitive lines, you get a concise list of templates with occurrence counts:

```text
=== Log Compression Summary ===
Input: 10,847 lines → 23 templates (99.8% reduction)

Top templates by frequency:
1. [4,521x] INFO Connection from <*> established
2. [3,892x] DEBUG Request <*> processed in <*>
3. [1,203x] WARN Retry attempt <*> for <*>
```

Typical compression ratios are **60-90%** token reduction while preserving all the diagnostic information you need.

## Key Features

- **High compression rates**: 60-90% token reduction on typical log files
- **Semantic preservation**: Automatically extracts URLs, HTTP status codes, correlation IDs, and timing data
- **Severity detection**: Tags templates as error, warning, or info
- **Multiple output formats**: Summary, detailed, and JSON for different use cases
- **Fast processing**: 10,000+ lines/second with V8-optimized internals
- **TypeScript-first**: Full type safety with strict checking

## Get Started

Install and run in seconds:

```bash
# CLI usage
npx logpare ./app.log

# Or pipe logs
cat app.log | npx logpare

# As a library
npm install logpare
```

```typescript
import { compress } from 'logpare';

const result = compress(logLines);
console.log(result.formatted);
```

## Try It Now

- Check out the [interactive playground](/playground) to see logpare in action
- Read the [documentation](/docs/intro) for detailed guides
- View the source on [GitHub](https://github.com/logpare/logpare)

We'd love to hear your feedback. Open an issue on GitHub or try it on your own logs!
