# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [Unreleased]

### Added

- add `stats.droppedLines` reporting lines discarded once `maxClusters` is reached,
  with a warning line in the summary and detailed output
- add `clockTime` preprocessing pattern for syslog-style `HH:MM:SS` timestamps
- add test coverage for `detectSeverity`, `isStackFrame`, and all five diagnostic
  extractors, the `Template` diagnostic fields, `onProgress`, `preprocessing`,
  and `simThreshold` (previously untested)
- add MCP server test suite and wire `packages/mcp` and `docs` into CI
- add AI-forward DX with Cursor rules and Claude Agent Skills
- add homepage with terminal-style design
- add blog with announcement post
- add logo SVG for branding in documentation
- add typography system with JetBrains Mono, Switzer, Nyght Serif
- migrate from Docusaurus to Fumadocs with Jeff Green design system
- upgrade to Tailwind v4 and Fumadocs v15
- add theme system with Fumadocs CSS variables
- update app pages for new design system
- add success stories submission form
- add @logpare/mcp package with UCP extension support
- add Prompts capability and comprehensive client docs
- add complete favicon set with teal background
- add missing CLI validation tests
- add cache-optimized output and XDrain-style token fallback
- automate changelog generation with git-cliff
- add Vercel analytics
- add AI-agent safety guardrails and developer tooling

### Changed

- **BREAKING (behavioral):** blank lines no longer count toward `stats.inputLines`, so a
  trailing newline no longer inflates the reported compression ratio
- **BREAKING (behavioral):** `url` is now applied before `filePath` and the network
  patterns, and adjacent wildcards collapse into one — templates containing URLs or
  `ip:port` pairs change shape (`src: /<*><*>` becomes `src: /<*>`)
- drop end-of-life Node 20 from `engines` and CI; baseline is now `^22 || >=24`
- simplify codebase and update package practices
- migrate MCP CLI to parseArgs, replace formatter switch with map

### Fixed

- fix `simThreshold` being silently ignored — it was accepted by `createDrain()`,
  `compress()`, and the CLI, validated, then discarded, leaving `0.0` and `0.99`
  indistinguishable. Default behavior is unchanged
- fix `maxChildren` not being enforced for non-variable-looking tokens, which let a
  parse-tree node grow without bound regardless of the configured cap
- fix the `logpare-mcp` binary failing to start with `SyntaxError` due to a duplicate
  shebang emitted by the tsup banner
- fix `port` fragmenting syslog clock times such as `15:16:01` into three wildcards
- fix `extractStatusCodes` not recognizing the documented `code=200` / `status=404` forms
- fix parsing accuracy being unmeasurable (pinned at 0%) because ground-truth templates
  omitted the log header that logpare masks; PA and F1-PA are now asserted
- fix compression-ratio checks that lived in `bench()` cases and asserted nothing
- address CodeRabbit PR review issues
- address additional CodeRabbit review comments
- address CodeQL incomplete string escaping vulnerabilities
- move playground to pages directory
- address CodeRabbit review feedback
- connect primary color CSS variables to Tailwind config
- clarify permission checkbox requirement
- add main entry point for Sandpack node template
- clarify MCP server implementation status
- address CodeRabbit review comments
- address second round of CodeRabbit review comments
- configure Vercel to use pnpm for monorepo build
- restore teal accent colors (replace lime/yellow-green)
- restore teal accent colors (replace lime/yellow-green)
- address CodeRabbit review comments
- improve error handling and fix Vercel deployment
- specify packageManager for Vercel pnpm compatibility
- use packageManager field for pnpm version
- prepare @logpare/mcp 0.1.0 for publishing
- address review comments from Copilot and CodeRabbit
- correct loop bound and remove unused variable
- compute true F1 in calculateF1ParsingAccuracy
- address CodeRabbit review comments on changelog automation
- validate CLI option ranges for depth, threshold, max-lines
- add search API route and enable structuredData indexing
- use staticGET for pre-rendered search index
- harden safety patterns and remove non-null assertions
- address review findings in security scanner, architecture tests, and session hook
- harden session hook, security scanner, and architecture tests
- require path separator in directory-match boundary check
## [0.0.5] - 2026-01-01

### Added

- export extractFullUrls, extractStatusCodes, extractCorrelationIds, extractDurations
- emit initial 0% progress event when starting batch processing
- add CLI integration tests for ESM and CJS builds
- add compression benchmarks for fixtures and scalability testing

### Changed

- inject CLI version at build time via tsup define

### Fixed

- improve IPv6 regex to handle loopback, empty, and compressed forms
## [0.0.4] - 2025-12-28

### Added

- add diagnostic metadata extraction and progress reporting
## [0.0.3] - 2025-12-23

### Fixed

- reorder timestamp patterns to prevent fragmentation in logs
- use NPM_TOKEN secret for publish authentication
## [0.0.2] - 2025-12-23
