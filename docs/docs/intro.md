---
sidebar_position: 1
---

# Getting Started

**logpare** is a semantic log compression library for LLM context windows. It uses the Drain algorithm to extract templates from repetitive log data, achieving **60-90% token reduction** while preserving diagnostic information.

## The Problem

AI assistants processing logs waste tokens on repetitive patterns. A 10,000-line log dump might contain 50 unique message templates repeated thousands of times — but the LLM sees (and bills for) every repetition.

## The Solution

logpare identifies log templates and outputs a compressed format showing each template once with occurrence counts.

### Before logpare

```
INFO Connection from 192.168.1.1 established
INFO Connection from 192.168.1.2 established
INFO Connection from 10.0.0.55 established
... (10,844 more similar lines)
```

### After logpare

```
=== Log Compression Summary ===
Input: 10,847 lines → 23 templates (99.8% reduction)

Top templates by frequency:
1. [4,521x] INFO Connection from <*> established
2. [3,892x] DEBUG Request <*> processed in <*>
3. [1,203x] WARN Retry attempt <*> for <*>
```

## Key Features

- **High compression rates**: 60-90% token reduction
- **Semantic understanding**: Preserves diagnostic information
- **Automatic extraction**: URLs, HTTP status codes, correlation IDs, durations
- **Severity detection**: Automatic tagging as error, warning, or info
- **Multiple output formats**: Summary, detailed, and JSON
- **Fast & efficient**: Processes 10,000+ lines/second
- **V8-optimized**: Uses monomorphic classes and Map-based children
- **TypeScript-first**: Full type safety with strict checking

## How It Works

logpare uses the [Drain algorithm](https://github.com/logpai/Drain3) to parse logs:

1. **Preprocessing**: Mask known variables (IPs, UUIDs, timestamps)
2. **Tokenization**: Split log line into tokens
3. **Tree Navigation**: Navigate parse tree by token count → first token → subsequent tokens
4. **Cluster Matching**: Find cluster with highest similarity above threshold
5. **Template Update**: Update pattern, replacing differing tokens with `<*>`

## Next Steps

- [Install logpare](/docs/installation)
- [Follow the Quick Start guide](/docs/quick-start)
- [Explore the API Reference](/docs/api/compress)
