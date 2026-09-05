# TODO

Known gaps found by the September 2026 surface audit (npm package, CLI, MCP server,
docs site). Each item is scoped small enough to be one pull request. Items are ordered
by user impact.

## Library (`src/`)

- [ ] **`sampleVariables` never holds real values.** Masking runs before Drain, so the
  wildcard positions `LogCluster.update()` reads from are already `<*>`. Every
  `sampleVariables` entry is `["<*>", ...]`, which makes the `maxSamples` option, the
  `samples` field in JSON output, and the "Sample variables" block in `detailed` output
  useless. README, quick-start, cli.mdx and types.mdx all show real IPs there. Fix:
  capture the raw tokens alongside the preprocessed ones (tokenize the original line with
  the same strategy) and read variables from the raw token at each wildcard index. Then
  add a test asserting `sampleVariables` contains the masked source values.
- [ ] **User patterns in `defineStrategy({ patterns })` run after the built-ins.** The
  merge is `{ ...DEFAULT_PATTERNS, ...patterns }`, so `numericId` / `numbers` mask the
  digits first and a user pattern such as `orderId: /ORD-\d{10}/g` (the README example)
  produces `ORD-<*>` instead of `<*>`. types.mdx promises "more specific patterns run
  first". Fix: apply user patterns before the defaults (`{ ...patterns, ...DEFAULT_PATTERNS }`
  is not enough because object spread keeps the first key's position; build the merged
  record with user keys first), and add a test with the README example.
- [ ] **Empty input reports one line.** `compressText('')` yields
  `inputLines: 1, uniqueTemplates: 0, compressionRatio: 1`. `inputLines` is documented as
  non-blank lines only. Return zero lines and a `0` ratio.

## CLI (`src/cli.ts`)

- [ ] **Unknown flags and missing values print a raw Node stack trace.** `--bogus`,
  `-x`, a bare `--format`, and `--threshold -1` all surface `ERR_PARSE_ARGS_*` with a
  ten-line stack. Wrap the `parseArgs` call, print the message plus a usage hint, exit 1.
- [ ] **`--output` to a missing directory prints a raw `ENOENT` stack.** Catch the
  `writeFileSync` error and print `Cannot write <path>: <reason>`.

## MCP server (`packages/mcp/`)

- [ ] **Tool inputs are not validated against the advertised schema.** `format: "xml"`,
  `depth: 99`, and `sampleSize: 3` (schema minimum 100) are accepted silently; only
  `lines` is checked. Parse `arguments` with the zod schema that already generates the
  JSON schema, and return `isError: true` with the validation message.
- [ ] **The five prompts are undocumented.** `analyze_errors`, `compare_logs`,
  `debug_performance`, `incident_triage`, `security_audit` (plus two UCP prompts) are not
  listed in `packages/mcp/README.md` or `docs/content/docs/guides/mcp-integration.mdx`.
- [ ] **Publish `@logpare/mcp` to npm**, or stop printing an `npx -y @logpare/mcp`
  config from `--test` until it exists. The `bin` name is `logpare-mcp`; say so in the
  install docs for global installs.

## Docs site (`docs/`)

- [ ] **Migrate to fumadocs 16 / fumadocs-mdx 15.** `fumadocs-mdx@14.3.x` already
  requires a newer `fumadocs-core` than 15.8.5 ships against, so the 14.x line is
  frozen. Three high advisories (`path-to-regexp`, `image-size`, `js-yaml`) are only
  fixed on the 16 line. Read the fumadocs 16 migration guide first; `loader()`,
  `createFromSource`, and the `RootProvider` search options changed.
- [ ] **Move to Next 16** once fumadocs is on 16. Next 15.5.x is still patched but is a
  maintenance line.
- [ ] **Serve the playground against the workspace build, not the registry.**
  `docs/package.json` depends on `logpare@^0.1.0` from npm, so the playground and the
  executed doc examples can lag behind `src/` on `main`. Use `workspace:^` and make the
  docs build depend on the root build.
- [ ] **Add an Open Graph image.** `openGraph`/`twitter` metadata declare
  `summary_large_image` with no image.

## Dependency hygiene

After the September 2026 bumps (`next` 15.5.25, `vitest` 4.1.11,
`@modelcontextprotocol/sdk` 1.30.0, `postcss` 8.5.26, `sharp` 0.35.4) `pnpm audit`
reports no critical advisories. The remaining high ones are all transitive:

- [ ] **`next` pins its own `postcss` 8.4.x and `nanoid` 3.3.x internally.** Five high
  advisories, all in build-time source-map handling and ID generation, not in the served
  site. Clears with Next 16; a `pnpm.overrides` entry is the interim option if a scanner
  blocks on it.
- [ ] **`@modelcontextprotocol/sdk` ships `hono`, `express-rate-limit`, `fast-uri`, and
  `ip-address` with ten high advisories.** Every one is in the SDK's HTTP transport;
  `@logpare/mcp` only uses stdio, so none is reachable. Re-check on each SDK release.
- [ ] **`vitest` 4.1 pulls `vite` 7.3.x with three dev-server advisories.** Dev-only.
- [ ] **`tsup@8.5.1` (latest) still pulls a vulnerable `rollup`.** Two high advisories
  with no upstream fix yet. Dev-only; re-check on each tsup release.
- [ ] **Add `pnpm audit --audit-level high` to CI** as a non-blocking report step so
  new advisories on shipped surfaces (`next`, `@modelcontextprotocol/sdk`) are visible
  in the PR checks instead of only in the Dependabot tab.

## WebMCP

- [ ] **Expose the playground and docs to in-browser agents through WebMCP.** WebMCP
  is the W3C Web Machine Learning Community Group's browser API for pages to register
  callable tools for AI agents; the spec is a Draft Community Group Report dated
  26 August 2026 (https://webmachinelearning.github.io/webmcp/), and Chrome ships it
  behind an origin trial. The entry point is `document.modelContext` (early
  articles say `navigator.modelContext`; the current draft moved it to `document`).
  Proposed scope:
  - Playground (`docs/app/playground/page.tsx`): on mount, feature-detect
    `'modelContext' in document` and register a `compress_logs` tool
    (`{ name, description, inputSchema, execute }`) whose `execute` runs
    `compressText()` in-page and returns `result.formatted`; also register
    `set_playground_options` so an agent can drive the depth / similarity / format
    controls the user sees. Unregister on unmount.
  - Docs pages: register a `search_docs` tool backed by the existing `/api/search`
    route so an agent on the page can query the docs without scraping.
  - Homepage: a `get_install_command` tool that returns the npm / npx / MCP config
    snippets.
  - Types: add `webmcp-types` (npm) as a docs devDependency for the `ModelContext`
    ambient types instead of hand-written declarations.
  - Keep MCP (server-side, `packages/mcp`) and WebMCP (in-page) tool names and
    descriptions aligned so an agent that knows one recognises the other.
  - Add an e2e test that stubs `document.modelContext` and asserts the tools register
    with the expected names and that `execute` returns compressed output.
  - Document the surface in a new `docs/content/docs/guides/webmcp.mdx` and regenerate
    the llms files.
