# Context7 Setup for logpare

This document explains Context7, how it works, and how to register logpare with it to provide AI-friendly documentation for Cursor, Windsurf, and other AI code editors.

## What is Context7?

[Context7](https://context7.com) is a free service by Upstash that makes your library documentation AI-friendly. It automatically extracts, parses, and optimizes documentation from open-source projects so that AI assistants (Claude, ChatGPT, etc.) and AI code editors (Cursor, Windsurf) can access accurate, up-to-date information without hallucinating outdated APIs.

### The Problem Context7 Solves

When AI models process library documentation, they often:
- Hallucinate APIs that don't exist
- Reference outdated methods or parameters
- Waste tokens on repetitive or irrelevant documentation
- Provide wrong answers due to knowledge cutoff limitations

Context7 addresses this by:
- Pulling live documentation from GitHub repositories
- Creating searchable, AI-optimized summaries (`llms.txt` files)
- Providing version-specific information
- Enabling instant lookups without leaving your editor

## How Context7 Works

Context7 uses a **5-stage documentation processing pipeline**:

### 1. **Parse**
Context7 crawls your GitHub repository and extracts documentation from:
- Markdown files (`.md`, `.mdx`)
- Text files (`.txt`)
- ReStructuredText files (`.rst`)
- Jupyter notebooks (`.ipynb`)

### 2. **Enrich**
LLMs generate metadata and short explanations for each code snippet and documentation section, making it better suited for AI consumption.

### 3. **Vectorize**
Documentation is embedded using multiple embedding models, enabling semantic search where users can ask questions rather than guess keywords.

### 4. **Rerank**
A custom 5-metric ranking algorithm scores results for relevance, ensuring the most useful information appears first.

### 5. **Cache**
Results are cached in Redis for instant retrieval, making the experience feel instantaneous even for large libraries.

### Automatic Sync Cycle

Context7 has an **automatic 10-15 day sync cycle** that rolls through all 33,000+ indexed libraries. Your library is checked every 10-15 days for updates, keeping documentation fresh without overwhelming source servers.

## Registration Process

### Option 1: Quick Web Submission (Recommended)

The fastest way to add logpare to Context7:

1. Go to [https://context7.com/add-package](https://context7.com/add-package)
2. Paste the logpare GitHub repository URL: `https://github.com/logpare/logpare`
3. (Optional) Configure folder exclusions and other settings
4. Submit for parsing and indexing

**Timeline**: Initial indexing takes 1-10 minutes depending on repository size.

### Option 2: Advanced Configuration with context7.json

For more control over what gets indexed, add a `context7.json` file to the root of the logpare repository:

```json
{
  "$schema": "https://context7.com/schema/context7.json",
  "projectTitle": "logpare",
  "description": "Semantic log compression library for LLM context windows. Reduces repetitive log output by 60-90% while preserving diagnostic information.",
  "folders": [],
  "excludeFolders": [
    "node_modules",
    ".git",
    "dist",
    "build",
    "*test*"
  ],
  "excludeFiles": [
    "CHANGELOG.md",
    "LICENSE.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md"
  ],
  "rules": [
    "Use the Drain algorithm for semantic log compression",
    "Always specify drain configuration for custom behavior",
    "Use compress() or compressText() for simple compression tasks",
    "Use createDrain() for incremental processing of large log files",
    "Remember to define custom patterns when dealing with domain-specific tokens",
    "Use defineStrategy() to customize preprocessing behavior"
  ],
  "previousVersions": [
    { "tag": "v0.0.5" },
    { "tag": "v0.0.4" }
  ]
}
```

#### Configuration Fields Explained

| Field | Purpose |
|-------|---------|
| `$schema` | Enables autocomplete and validation in JSON editors |
| `projectTitle` | Display name in Context7 (used if auto-detection fails) |
| `description` | One-sentence summary optimized for AI understanding |
| `folders` | Specific directories to include. Empty = scan entire repo |
| `excludeFolders` | Patterns to exclude (supports glob/globstar: `*test*`, `./dist`, `src/internal`) |
| `excludeFiles` | Filenames to skip (e.g., `CHANGELOG.md`, `LICENSE.md`) |
| `rules` | Best practices/guidelines that coding agents should follow |
| `previousVersions` | Git tags for older versions to index separately |

#### Exclusion Patterns Supported

- **Simple names**: `node_modules` excludes any folder named `node_modules` anywhere
- **Root-specific**: `./dist` excludes only at repository root
- **Paths**: `src/internal` excludes specific paths and everything under them
- **Glob patterns**: `*test*`, `*.spec.ts` for pattern-based exclusion
- **Globstar**: `**/__tests__` for nested patterns

#### Default Exclusions

If not specified, Context7 automatically excludes:
- `CHANGELOG.md`, `LICENSE.md`, `CODE_OF_CONDUCT.md`
- Folders: `*archive*`, `*deprecated*`, `*legacy*`, `*test*`
- Internationalization: `i18n/zh*`, `i18n/es*`, etc.

## What Gets Indexed

### Supported File Formats

Context7 parses:
- **Markdown** (`.md`, `.mdx`) - Primary format, fully supported
- **Text** (`.txt`) - Plain text documentation
- **ReStructuredText** (`.rst`) - For Sphinx docs
- **Jupyter** (`.ipynb`) - Code examples and notebooks

### Code Examples

Context7 automatically extracts and prioritizes:
- TypeScript/JavaScript code blocks
- API usage examples
- CLI command examples
- Configuration examples

### For logpare Specifically

The following files would be indexed:
- `README.md` - Overview, installation, basic examples
- `MIGRATION.md` - Python Drain3 users migration guide
- `docs/guides/*.md` - Usage guides and tutorials
- `docs/api/*.md` - API reference documentation
- CLAUDE.md - Architecture and development information

The following would be excluded:
- `CHANGELOG.md` - Historical change logs
- `dist/`, `build/`, `node_modules/` - Generated/dependency code
- Test files and fixtures
- License and contributing guidelines

## Verification After Registration

After submitting logpare, verify successful indexing:

### Using Context7 Tools Directly

1. Get a free API key at [https://context7.com/dashboard](https://context7.com/dashboard)
2. Use the MCP server to verify:
   ```typescript
   // Install Context7 MCP in your editor
   // Then in your prompt:
   // "resolve-library-id" tool to search for logpare
   // "get-library-docs" tool to fetch documentation
   ```

### Using the Web Interface

Go to `https://context7.com/logpare` to see:
- Generated `llms.txt` file
- Indexed documentation
- Search results
- Version information

## How Cursor/Windsurf Users Access logpare Documentation

### Method 1: Using Context7 MCP (Recommended)

Once logpare is indexed in Context7, Cursor and Windsurf users can access documentation by:

1. **Installing Context7 MCP** in their editor config
2. **Using the `@docs` command** in their prompt:
   ```
   @docs:logpare how do I compress logs?
   ```
3. **Or just mentioning Context7** in their prompt:
   ```
   "use context7 to find logpare documentation on compression"
   ```

The editor automatically:
- Resolves "logpare" to the correct Context7 library ID
- Fetches the most relevant documentation sections
- Injects them into the AI's context window
- Provides version-specific information

### Method 2: Direct llms.txt Access

Cursor/Windsurf users can also access logpare's generated `llms.txt` file:

```
https://context7.com/logpare/llms.txt
```

They can:
- Embed this URL in their editor rules for automatic inclusion
- Manually reference it when asking the AI about logpare
- Use token limit parameters to control size:
  ```
  https://context7.com/logpare/llms.txt?tokenLimit=2000
  ```

### Method 3: Editor Configuration

Users can configure their editor to always include logpare documentation:

**Cursor** (`~/.cursor/rules.md` or project `.cursor/rules.md`):
```markdown
When answering questions about logpare:
- Use the Context7 MCP server to fetch latest documentation
- Call "resolve-library-id" with "logpare"
- Use "get-library-docs" with the returned library ID
- Prioritize examples from the README and API guides
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

## Setting Up Context7 in Your Own Editor

### For Cursor Users

1. Get a free API key: [https://context7.com/dashboard](https://context7.com/dashboard)
2. Edit `~/.cursor/mcp.json` or `.cursor/mcp.json` (project-level):
   ```json
   {
     "mcpServers": {
       "context7": {
         "command": "npx",
         "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
       }
     }
   }
   ```
3. Restart Cursor
4. Now you can use `@docs:logpare` in your prompts

### For Windsurf Users

1. Get API key: [https://context7.com/dashboard](https://context7.com/dashboard)
2. Open Cascade with `Cmd+L` (Mac) or `Ctrl+L` (Windows/Linux)
3. Click "Configure MCP" to open `~/.codeium/windsurf/mcp_config.json`
4. Add the same configuration as above
5. Restart Windsurf

### For Claude Code Users

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp --api-key YOUR_API_KEY
```

Or with HTTP:
```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp \
  --header "CONTEXT7_API_KEY: YOUR_API_KEY"
```

## Next Steps for logpare

### To Enable Context7 Support

1. **Create `context7.json`** at repository root with the configuration above
2. **Submit logpare** via [https://context7.com/add-package](https://context7.com/add-package)
3. **Verify indexing** by checking [https://context7.com/logpare](https://context7.com/logpare)
4. **Update documentation** to mention Context7:
   - Add to README: "Cursor/Windsurf users: logpare is indexed in [Context7](https://context7.com/logpare)"
   - Add to CLAUDE.md: "Use Context7 MCP to fetch up-to-date documentation"

### Best Practices

1. **Keep context7.json updated** whenever you restructure documentation
2. **Update the `rules` array** with new best practices as the library evolves
3. **Add new `previousVersions`** when releasing major versions
4. **Monitor Context7 dashboard** for indexing status and rate limits

## Pricing

**Context7 is free for open-source projects** with a generous free tier:
- Unlimited libraries
- Daily indexing updates
- Standard rate limits (perfect for development)

**Pro/Enterprise plans** available for:
- Private repositories
- Higher API rate limits
- Dedicated support
- Custom refresh schedules

## Useful Links

- **Context7 Main Site**: [https://context7.com](https://context7.com)
- **Add Package**: [https://context7.com/add-package](https://context7.com/add-package)
- **Dashboard**: [https://context7.com/dashboard](https://context7.com/dashboard)
- **Documentation**: [https://context7.com/docs](https://context7.com/docs)
- **GitHub Repository**: [https://github.com/upstash/context7](https://github.com/upstash/context7)
- **MCP Specification**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

## FAQ

### How is Context7 different from providing llms.txt manually?

Context7 **automatically generates** an optimized `llms.txt` for you based on your actual repository. It:
- Updates every 10-15 days automatically
- Handles multiple versions and branches
- Ranks documentation for relevance
- Provides version-specific information

Manual `llms.txt` files are static and require maintenance.

### Will Context7 index private repositories?

Only with a Pro or Enterprise plan. Free tier supports public repositories only.

### How often does Context7 update logpare's documentation?

Once indexed, logpare is checked every 10-15 days as part of Context7's rolling sync cycle. You can trigger manual refreshes via the dashboard.

### Can I customize what gets indexed?

Yes, through the `context7.json` file. You can exclude folders, files, and add best practice rules for AI agents.

### Do AI models need Context7 installed?

No. Context7 is a **tool that helps fetch documentation**. Once documentation is embedded in the prompt, the AI can use it. You need Context7 MCP installed in your editor to use the `@docs` command, but you can also manually copy documentation.

### Is Context7 affiliated with Anthropic/Claude?

No, Context7 is developed by Upstash. However, it works with all major LLMs including Claude, ChatGPT, and others via the Model Context Protocol (MCP).

## See Also

- [llms.txt Standard](https://llms-txt.com) - The emerging standard for AI-friendly documentation
- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol that powers Context7 and other integrations
- logpare [CLAUDE.md](../CLAUDE.md) - Development guide for logpare maintainers
