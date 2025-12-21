# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-20

### Added

- Command-line interface (CLI) for terminal usage
  - Read from stdin or file(s)
  - Output format selection (`--format summary|detailed|json`)
  - Algorithm parameter tuning (`--depth`, `--threshold`, `--max-children`, `--max-clusters`)
  - Output to stdout or file (`--output`)
  - Help (`--help`) and version (`--version`) flags
- Examples directory with usage examples:
  - `basic-usage.ts` - Simple compression examples
  - `custom-strategy.ts` - Custom preprocessing patterns
  - `streaming.ts` - Incremental processing with `createDrain()`
  - `cli-usage.sh` - CLI command examples
- `MIGRATION.md` - Comprehensive guide for Python Drain3 users
  - Parameter mapping table
  - Side-by-side code examples
  - Feature comparison
- `CODE_OF_CONDUCT.md` - Contributor Covenant code of conduct
- `SECURITY.md` - Security policy and vulnerability reporting process
- Enhanced README with:
  - CLI usage documentation
  - Parameter tuning guide
  - Troubleshooting section
  - Comparison to Python Drain3

### Changed

- Updated `package.json`:
  - Added `bin` field for CLI registration
  - Added `prepublishOnly` script for safety checks
  - Version bumped to 0.2.0

## [0.1.0] - 2025-12-18

### Added

- Initial release of logpare
- Core Drain algorithm implementation for log template extraction
- `compress()` and `compressText()` functions for simple log compression
- `createDrain()` for advanced incremental processing
- `defineStrategy()` for custom preprocessing strategies
- Built-in patterns for common variable types:
  - IPv4/IPv6 addresses
  - UUIDs
  - Timestamps (ISO, Unix)
  - File paths and URLs
  - Hex IDs
  - Block IDs (HDFS format)
  - Numbers with units (e.g., `250ms`, `1024KB`)
- Three output formats: `summary`, `detailed`, and `json`
- V8-optimized implementation using `Map` for tree nodes
- Dual ESM/CJS build output
- Full TypeScript type definitions
