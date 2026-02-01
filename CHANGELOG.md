# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@logpare/mcp` package — MCP server with `compress_logs`, `compress_text`, `analyze_patterns`, and `estimate_compression` tools
- UCP extension for `@logpare/mcp` (`--ucp` flag) with checkout and agent-to-agent log analysis tools
- MCP Prompts capability: `analyze_errors`, `compare_logs`, `debug_performance`, `incident_triage`, `security_audit`
- UCP-specific prompts: `debug_checkout`, `analyze_agent_flow`
- `json-stable` output format with sorted keys for LLM KV-cache optimization
- XDrain-style token-position fallback in `treeSearch()` for logs starting with variable tokens
- LogEval-style evaluation metrics (GA, PA, F1-GA, F1-PA) for parsing accuracy measurement
- HDFS ground-truth fixture and accuracy tests
- AI-forward DX with Cursor rules and Claude Agent Skills
- `llms.txt` for AI-readable documentation
- Documentation site (Fumadocs) with interactive playground, blog, and success stories form
- Logo SVG for branding
- CLI validation tests for error handling and edge cases

### Fixed

- Compute true F1 score in `calculateF1ParsingAccuracy` (previously only computed weighted recall)
- Add undefined guards in `evaluateParsing` and `calculateF1ParsingAccuracy` loops
- Correct loop bound and remove unused variable in eval metrics
- CodeQL incomplete string escaping vulnerabilities in playground components
- `@logpare/mcp` prepared for publishing with correct dependencies and peer deps

### Changed

- Documentation migrated from Docusaurus to Fumadocs with Tailwind v4 and Fumadocs v15
- MCP client documentation updated for all major clients (Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, ChatGPT, Gemini)

## [0.0.5] - 2026-01-01

### Added

- Export extraction utility functions: `extractFullUrls`, `extractStatusCodes`, `extractCorrelationIds`, `extractDurations`
- Initial 0% progress event emission when starting batch processing
- CLI integration tests for ESM and CJS builds
- Compression benchmarks for fixtures and scalability testing

### Fixed

- IPv6 regex now handles loopback (::1), empty (::), and compressed address forms

### Changed

- CLI version is now injected at build time via tsup define (no runtime package.json read)

## [0.0.4] - 2025-12-21

### Added

- Diagnostic metadata extraction (URLs, status codes, correlation IDs, durations)
- Progress reporting callback for batch processing
- `detectSeverity`, `isStackFrame`, `extractUrls` utility functions

## [0.0.3] - 2025-12-20

### Added

- Command-line interface (CLI) for terminal usage
- Examples directory with usage examples
- `MIGRATION.md` guide for Python Drain3 users

## [0.0.2] - 2025-12-19

### Added

- Initial release of logpare
- Core Drain algorithm implementation for log template extraction
- `compress()` and `compressText()` functions
- `createDrain()` for advanced incremental processing
- `defineStrategy()` for custom preprocessing strategies
- Built-in patterns for common variable types (IPv4/IPv6, UUIDs, timestamps, etc.)
- Three output formats: `summary`, `detailed`, and `json`
- V8-optimized implementation using `Map` for tree nodes
- Dual ESM/CJS build output
- Full TypeScript type definitions
