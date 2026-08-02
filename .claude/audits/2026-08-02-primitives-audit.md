# Primitive Verification & Update Audit

**Date**: 2026-08-02
**Author**: Claude (AI Research Assistant)
**Scope**: core library primitives, AI-agent primitives, toolchain
**Status**: Complete — fixes applied, deferred work listed in §5

---

## Executive summary

Three layers of logpare had drifted out of sync since the last sweep. Verification was
done by **executing** the primitives, not by reading them, which surfaced defects that
107 passing tests did not.

Headline findings:

1. **`simThreshold` did nothing.** It was accepted by `createDrain()` and `compress()`,
   range-validated by the CLI, and documented in CLAUDE.md, the docs site, and two
   skills — then silently discarded. `0.0` and `0.99` produced byte-identical output.
2. **The dependency-install hook never ran.** `.claude/hooks/session-start.sh` existed
   but was not registered in `.claude/settings.json`. Every fresh session started with
   no `node_modules`, so `pnpm gates` could not run until someone installed by hand.
3. **The published `logpare-mcp` binary could not start.** A duplicated shebang put
   `#!/usr/bin/env node` on line 2 of `dist/cli.js`, a syntax error. `packages/mcp` had
   zero tests and was not built or tested in CI, so nothing caught it.
4. **Parsing accuracy was structurally pinned at 0.0%** and never asserted — the
   ground-truth fixture used LogHub header-stripped labels while logpare is fed the
   full line. Two template-quality bugs shipped under cover of that blind spot.
5. **Node 20 reached end-of-life on 2026-04-30** and was still the declared baseline in
   `engines`, the CI matrix, and the MCP build target.

All five are fixed. Test count went from 107 to 162 (157 root + 5 MCP).

---

## 1. Library primitives

### Fixed

| ID | Finding | Evidence | Fix |
|----|---------|----------|-----|
| L1 | `simThreshold` accepted everywhere and never stored. `DEFAULTS.simThreshold` was dead; `findBestMatch` read only from the strategy, whose `getSimThreshold` is hardcoded to `0.4`. | Executed: `0.0` / `0.4` / `0.99` → 3 clusters each | Stored on the `Drain`; `findBestMatch` prefers it and falls back to the strategy. Left `undefined` when unset so custom strategies stay authoritative — **default output is unchanged**. Now: `0.99` → 7 clusters vs `0.4` → 5. |
| L2 | `maxChildren` unenforceable. `shouldUseWildcard` only collapsed when a wildcard child *already existed*, and one was only created for `looksLikeVariable` tokens — so alphabetic tokens grew without bound. | Executed: cap of 2, 300 distinct tokens → **300 children** | Collapse at capacity unconditionally. Now → 3 templates. |
| L3 | The `url` pattern was dead code for http(s). `filePath` ran first and ate `//host/path`, leaving a mangled fragment. | `GET https://api.example.com/x?y=1` → `GET https:/<*>?y=<*>` | Moved `url` ahead of `filePath` and the network patterns. Now → `GET <*>`. |
| L4 | `port` fragmented syslog clock times into three wildcards — the same bug class the ISO regression test at `test/preprocessing.test.ts` was written for, fixed only for ISO. | `Jun 14 15:16:01 combo sshd…` → `Jun <*> <*><*><*> combo…` | Added a `clockTime` pattern ahead of `port`. Now → `Jun <*> <*> combo…`. |
| L5 | `maxClusters` overflow silently discarded lines while `lineCount` kept incrementing, so `compressionRatio` **rose** as data was thrown away. Nothing signalled truncation. | 50 lines, cap 3 → "94.0% reduction", 47 lines gone | Added `stats.droppedLines` and a `WARNING` line in the summary and detailed formatters. |
| L6 | A trailing newline inflated `inputLines` and therefore the compression ratio, because `lineCount` incremented before the blank-line check. | `compressText(t)` vs `compressText(t+'\n')` differed | Count after the check. `test/drain.test.ts > should skip empty lines` asserted the *buggy* value (4 for 2 real lines) and was corrected. |
| L7 | Adjacent wildcards. `10.251.31.5:50010` was masked by `ipv4` then `port`, emitting `<*><*>`. | HDFS templates contained `src: /<*><*> dest: /<*><*>` | `collapseWildcards()` in `applyPatterns` — a contiguous run always denotes one variable. |
| L8 | `code=200` documented in CLAUDE.md as a supported status-code format; the pattern only accepted `:` or whitespace. | `extractStatusCodes('code=200')` → `[]` | Accept `=` in the `status` and `code` patterns. |
| L9 | `numericId`'s comment claimed HTTP 404 and `line:123` were preserved. `numbers`, one line later, masks every bare integer. | Code path | Comment corrected to describe real behaviour. Masking unchanged — this is by design, not a bug. |

### Performance (behaviour-neutral)

- `applyPatterns` built 12 fresh `RegExp` objects per line purely to reset `lastIndex`.
  `String.replace` with a `/g` regex already scans from 0, so the patterns are reused.
- `extractStatusCodes` / `extractCorrelationIds` rebuilt their patterns inside the
  per-line loop — hoisted to module constants with an explicit rewind.
- `defineStrategy` re-merged `DEFAULT_PATTERNS` on **every line**; now merged once at
  definition time.
- `LogCluster.update` ran all five extractors on every matching line even after the
  sample arrays were full; each is now skipped once its target is at capacity. On a hot
  template this was the dominant per-line cost after preprocessing.

### ReDoS assessment — clean

Every quantifier in `DEFAULT_PATTERNS` is bounded or unambiguous; no catastrophic
backtracking exists. Measured: `ipv6` against a non-matching hex run degrades linearly
(500→1ms, 2000→2ms, 8000→10ms); `filePath` over 20 000 path segments, the stack-frame
patterns over 20 000 chars, and `numbers` over 50 000 consecutive digits all ≤1ms.
`ipv6`'s 10-branch alternation does ~10× redundant scanning but is not exponential.

---

## 2. AI-agent primitives

| Primitive | Status | Note |
|-----------|--------|------|
| `.claude/skills/` (5 skills) | ✅ Working | All load with valid frontmatter and resolve their `references/` files. |
| `/gates` slash command | ✅ Working | |
| `.cursor/rules/*.mdc` | ✅ Working | `003-architecture.mdc` is genuinely enforced at CI time by `test/architecture.test.ts`. |
| `scripts/security-check.sh` | ✅ Working | Clean scan across 13 files. |
| `.claude/hooks/session-start.sh` | ❌ **Was orphaned** | Script existed; `.claude/settings.json` had no `hooks` block, so it never fired. Proven by this session starting with no `node_modules` anywhere. **Fixed** — registered as a `SessionStart` hook. |
| CLAUDE.md PR workflow | ❌ **Was unfollowable** | Mandated `gh pr create`; `gh` is not installed in Claude Code on the web. **Fixed** — now describes both `gh` and the GitHub MCP path. |
| `packages/mcp` binary | ❌ **Was broken** | Duplicate shebang; see §3. **Fixed.** |
| CLAUDE.md coverage | ⚠️ **Was stale** | Documented `src/` only — no mention of `packages/mcp`, `docs/`, the skills, the cursor rules, or the hook. **Fixed.** |

### Documentation drift corrected

- `Drain` (the class), `extractFullUrls`, `extractStatusCodes`, `extractCorrelationIds`,
  and `extractDurations` are exported but were undocumented.
- `OutputFormat` has four values; CLAUDE.md and `docs/content/docs/api/types.mdx` listed
  three, omitting `json-stable` — which the CLI has shipped and `accuracy.test.ts` tests.
- `docs/.../api/types.mdx` claimed `CompressOptions extends DrainOptions`. It does not;
  Drain options nest under `drain`.
- `mcp-server-development/SKILL.md` linked `github.com/anthropics/mcp-servers`, which
  does not exist (correct repo: `modelcontextprotocol/servers`).
- `.claude/SKILLS_GUIDE.md` (Jan 2026) and `.claude/logpare-ucp-analysis/` asserted the
  MCP server was "documented but not yet implemented". Marked historical and corrected.

---

## 3. The MCP server

`packages/mcp/src/cli.ts` starts with a shebang **and** `tsup.config.ts` injected one via
`banner`, so `dist/cli.js` carried two — the second on line 2, which is a syntax error:

```
SyntaxError: Invalid or unexpected token
```

Anyone running the published `logpare-mcp` binary hit this. The root package works only
because it has no `banner` and lets tsup preserve the source shebang.

Why nothing caught it: `packages/mcp` had **zero tests** despite declaring `test` and
`test:watch` scripts (`pnpm test` there exited 1 with "No test files found"), and CI
never built or tested the package at all — the root `typecheck`/`test`/`build` scripts
cover `src/` only, and no workflow used `-r` or `--filter`.

Fixed: removed the redundant banner, added `packages/mcp/test/cli.test.ts` (5 tests,
including an explicit single-shebang regression guard), and wired the package into CI.

---

## 4. Toolchain

| Item | Was | Now / Available | Action |
|------|-----|-----------------|--------|
| **Node 20** | `engines: ^20`, CI matrix `[20,22,24]`, MCP `target: node20` | **EOL 2026-04-30** | **Fixed** — `^22 \|\| >=24`, matrix `[22,24,26]`, target `node22` |
| CI workspace coverage | root `src/` only | — | **Fixed** — CI now typechecks `packages/mcp` + `docs`, builds and tests the MCP server |
| `docs` typecheck | failed from clean checkout (`.source/server` missing) | — | **Fixed** — `typecheck` now runs `fumadocs-mdx` codegen first |
| MCP devDeps | vitest `^1`, `@types/node` `^20`, ts `^5.3` | root: `^4`, `^22`, `^5.9` | **Fixed** — aligned |
| **MCP spec** | SDK `^1.25.2`, docs cite `2025-11-25` | **`2026-07-28`** | Deferred — §5 |
| **TypeScript** | 5.9.3 | **7.0 GA** (2026-07-08), Go-native, 8–12× faster | Deferred — §5 |
| Next.js | 15.5.10 | 16.2.12 | Deferred |
| Fumadocs | 15.8.5 / mdx 14.2.4 | 16.14.0 / 15.2.2 | Deferred |
| zod | 3.25.76 | 4.4.3 | Deferred |
| `@vercel/analytics` | 1.6.1 | 2.0.1 | Deferred |
| Dependabot | — | **PRs #21, #22 open since June** | Needs review — security group |

---

## 5. Deferred — recommended next

### 5.1 MCP spec `2026-07-28` migration (highest value)

The largest revision since MCP launched. `@logpare/mcp` targets `2025-11-25` and uses
the low-level `Server` + `setRequestHandler` API rather than `McpServer` +
`registerTool`, so it is behind on both spec and idiom. What changes:

- **Stateless core** — the `initialize`/`notifications/initialized` handshake is gone.
  Every request carries its protocol version and client capabilities in `_meta`.
- **`server/discover` is mandatory** — servers MUST advertise supported versions,
  capabilities, and identity. On stdio it doubles as the back-compat probe.
- **SDK v2 retires the monolith** for `@modelcontextprotocol/server` / `/client`.
- **Roots, Sampling, and Logging are deprecated** (12-month window). logpare's server
  uses none of them, so this costs nothing.
- Cacheable list results (`ttlMs`, `cacheScope`) and deterministic `tools/list` ordering
  are a natural fit for a compression tool — worth adopting deliberately.

Should be its own PR, gated on the now-existing `packages/mcp` test suite.

### 5.2 Drain algorithm design defects

Left untouched because each changes clustering for every user and needs before/after
accuracy numbers on a corpus larger than 29 lines:

- **Early break guarantees a cluster miss.** `treeSearchFromToken` breaks out of the
  descent when neither the exact token nor a wildcard child exists, then calls
  `findBestMatch` on that intermediate node — which almost always has no clusters,
  since clusters attach at the end of the insertion walk. Demonstrated:
  `"alpha beta gamma delta"` and `"alpha beta gamma epsilon"` have similarity 0.75,
  far above the 0.4 threshold, yet produce two clusters. In practice the first
  `min(len, depth)` tokens must match exactly; the threshold only arbitrates tokens at
  position ≥ `depth`.
- **All-wildcard black hole.** `computeSimilarity` counts a wildcard as a match, so a
  fully-degraded template scores 1.0 against any same-length input. Visible on HDFS:
  two distinct ground-truth templates collapse into `<*> <*> <*> INFO <*> <*> <*> <*> <*>`.
- **Dead XDrain fallback.** It searches level 2 keyed on `tokens[1]`, but insertion only
  ever keys level 2 on `tokens[0]`, so it either finds nothing or walks an unrelated
  subtree with misaligned indices.
- **Stale tree keys.** A cluster is filed under its literal tokens, then `mergeTokens`
  rewrites those positions to `<*>`; the keys are never updated, so a cluster can become
  unreachable by the path that now describes it.
- **`depth` is one level deeper than canonical Drain**, which counts the root and length
  levels. A `depth` ported from the Drain literature or a LogPai config over-fragments
  here. CLAUDE.md and the `compression-tuning` skill both present `4` as the standard.
- **Severity and `isStackFrame` freeze on first sight.** Both are computed from the line
  that created the cluster and are `readonly`. A template first seen as INFO reports
  `info` forever, even after 10 000 subsequent ERRORs — actively misleading in triage,
  which is the tool's main use case. Worth fixing early; it is a small change.

### 5.3 A real accuracy corpus

Ground truth is 29 lines and 6 templates. GA over 406 pairs makes the ≥0.9 gate close to
trivial, and one misgrouped template swings it wildly. Only HDFS has labels at all, so
Spark and Linux can only be checked against loose ratio floors. Adopt LogHub-scale
fixtures and run accuracy in CI to track it over time.

Current measured: **GA 97.0%, F1-GA 92.9%, PA 44.8%, F1-PA 36.4%** (3 of 6 templates
reproduced exactly). PA and F1-PA are now asserted with regression floors of 0.4 / 0.3.
The three misses are the `src: /<*>` leading-slash artefact and the two collapses
described in §5.2.

### 5.4 TypeScript 7.0

8–12× faster builds. Verify tsup/esbuild and vitest 4 compatibility first; the absent
public compiler API (due in 7.1) is the main blocker for anything introspecting the
compiler. Low risk here — nothing in this repo uses the compiler API.

### 5.5 Skill modernization

SKILL.md is now a cross-agent standard (Claude Code, Codex CLI, Cursor, Gemini CLI,
Copilot) and has gained `allowed-tools`, `disable-model-invocation`, `user-invocable`,
and `context: fork`. The five skills use only `name` and `description`. Adding
`allowed-tools` to the read-only ones would be a cheap safety win.

---

## 6. Verification performed

```
pnpm gates                              # typecheck + 157 tests + build — green
pnpm --filter @logpare/mcp test         # 5 tests — green
pnpm --filter logpare-docs typecheck    # green (from clean .source)
pnpm bench                              # 4 suites — green
bash scripts/security-check.sh          # no issues across 13 files
node packages/mcp/dist/cli.js --test    # self-check passes
```

Targeted before/after checks:

| Check | Before | After |
|-------|--------|-------|
| `createDrain({simThreshold})` 0.0 vs 0.99 | 3 / 3 clusters | 5 / 7 clusters |
| `preprocess('GET https://api.example.com/x?y=1')` | `GET https:/<*>?y=<*>` | `GET <*>` |
| `preprocess('Jun 14 15:16:01 combo sshd…')` | `Jun <*> <*><*><*> combo…` | `Jun <*> <*> combo…` |
| `maxChildren: 2`, 300 distinct tokens | 300 children | 3 templates |
| `compressText(t)` vs `compressText(t+'\n')` | different `inputLines` | identical |
| 50 lines with `maxClusters: 3` | "94.0% reduction", silent | `droppedLines: 47` + `WARNING` |
| `node packages/mcp/dist/cli.js --test` | `SyntaxError` | passes |
| Parsing accuracy | 0.0%, unasserted | 44.8%, asserted |
