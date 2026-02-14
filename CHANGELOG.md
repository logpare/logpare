# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [Unreleased]

### Added

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

### Changed

- simplify codebase and update package practices
- migrate MCP CLI to parseArgs, replace formatter switch with map

### Fixed

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
