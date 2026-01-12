# @logpare/mcp

MCP (Model Context Protocol) server for logpare, enabling AI agents to compress and analyze logs.

<a href="https://ucp.dev" target="_blank" rel="noopener noreferrer" title="Universal Commerce Protocol Compatible">
  <img src="https://img.shields.io/badge/UCP-Ready-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkwyIDdsOTAgNSAxMC01LTEwLTV6IiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+" alt="UCP Ready">
</a>

## Installation

```bash
npm install -g @logpare/mcp
# or
pnpm add -g @logpare/mcp
```

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "logpare": {
      "command": "npx",
      "args": ["@logpare/mcp"]
    }
  }
}
```

### With UCP Extension

Enable UCP tools for Universal Commerce Protocol log processing:

```json
{
  "mcpServers": {
    "logpare": {
      "command": "npx",
      "args": ["@logpare/mcp", "--ucp"]
    }
  }
}
```

## Available Tools

### Core Tools

| Tool | Description |
|------|-------------|
| `compress_logs` | Compress log lines array with full options |
| `compress_text` | Compress multi-line log text |
| `analyze_patterns` | Quick pattern extraction (faster) |
| `estimate_compression` | Estimate compression ratio from sample |

### UCP Tools (--ucp flag)

| Tool | Description |
|------|-------------|
| `compress_checkout_logs` | Compress UCP checkout session logs |
| `analyze_checkout_errors` | Analyze UCP error patterns |
| `compress_a2a_logs` | Compress Agent-to-Agent logs |

## CLI Options

```bash
npx @logpare/mcp [options]

Options:
  --ucp, -u           Enable UCP extension
  --format, -f        Default format (summary|detailed|json)
  --depth, -d         Parse tree depth (2-8, default: 4)
  --threshold, -t     Similarity threshold (0.0-1.0, default: 0.4)
  --max-lines, -m     Max lines per request (default: 100000)
  --test              Run self-test
  --help, -h          Show help
```

## Resources

The server exposes configuration profiles as MCP resources:

| URI | Description |
|-----|-------------|
| `logpare://config/default` | Current default settings |
| `logpare://profiles/standard` | Balanced compression |
| `logpare://profiles/aggressive` | Maximum compression |
| `logpare://profiles/detailed` | Maximum pattern preservation |

### UCP Resources (--ucp flag)

| URI | Description |
|-----|-------------|
| `logpare://ucp/profiles/checkout` | UCP checkout log settings |
| `logpare://ucp/profiles/a2a` | UCP A2A log settings |
| `logpare://ucp/error-codes` | UCP error code reference |

## Programmatic Usage

```typescript
import { createServer, startStdioServer } from '@logpare/mcp';

// Create server with custom config
const server = createServer({
  defaultFormat: 'detailed',
  defaultDepth: 5,
  ucp: { enabled: true },
});

// Or start with stdio transport
await startStdioServer({
  ucp: { enabled: true },
});
```

## UCP Compatibility

This package is **UCP-Ready**, supporting the Universal Commerce Protocol for agentic commerce. When UCP mode is enabled:

- Recognizes UCP checkout session IDs (`cs_*`)
- Extracts UCP error codes and status transitions
- Provides UCP-specific compression profiles
- Outputs UCP-enhanced JSON format (`ucp_json`)

Learn more at [ucp.dev](https://ucp.dev).

## License

MIT
