# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
