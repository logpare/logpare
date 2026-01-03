---
name: mcp-server-development
description: Use when creating MCP (Model Context Protocol) servers for logpare, exposing logpare functionality as tools for Claude or other AI agents, or integrating logpare with MCP-compatible systems.
---

# MCP Server Development for logpare

Create Model Context Protocol servers that expose logpare's log compression capabilities as AI-accessible tools.

## When to Use

Activate this skill when:
- User wants to create an MCP server for logpare
- Building tools for Claude to compress logs automatically
- Integrating logpare with AI agent systems
- Exposing logpare functionality to MCP-compatible clients
- Creating custom log analysis workflows for AI assistants

## What is MCP?

Model Context Protocol (MCP) is Anthropic's open standard for connecting AI agents to external tools and data sources. MCP servers expose:

- **Tools**: Functions AI agents can call (e.g., "compress logs")
- **Resources**: Data AI agents can access (e.g., "read compression results")
- **Prompts**: Templates AI agents can use (e.g., "analyze these logs")

## Logpare MCP Server Architecture

### Core Tools to Expose

1. **compress_logs** - Compress log lines and return summary
2. **compress_file** - Compress a log file from filesystem
3. **analyze_compression** - Get detailed template analysis
4. **tune_parameters** - Suggest optimal parameters for log type
5. **create_custom_strategy** - Generate preprocessing strategy from examples

### Resource Endpoints

1. **compression-results/{id}** - Retrieve past compression results
2. **templates/{id}** - Get template details with metadata
3. **benchmarks** - Performance benchmarks for different log types

## Quick Start: Basic MCP Server

### Project Setup
```bash
# Create new MCP server project
mkdir logpare-mcp-server
cd logpare-mcp-server

# Initialize with TypeScript
npm init -y
npm install @modelcontextprotocol/sdk logpare
npm install -D typescript @types/node tsx

# Create tsconfig.json
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext
```

### Basic Server Implementation

```typescript
// src/index.ts
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { compress, compressText, createDrain } from 'logpare';

const server = new Server(
  {
    name: 'logpare-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'compress_logs',
      description: 'Compress log lines using the Drain algorithm. Returns compressed templates with occurrence counts.',
      inputSchema: {
        type: 'object',
        properties: {
          logs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of log lines to compress',
          },
          format: {
            type: 'string',
            enum: ['summary', 'detailed', 'json'],
            default: 'summary',
            description: 'Output format',
          },
          depth: {
            type: 'number',
            default: 4,
            description: 'Parse tree depth (3-6)',
          },
          simThreshold: {
            type: 'number',
            default: 0.4,
            description: 'Similarity threshold (0.0-1.0)',
          },
        },
        required: ['logs'],
      },
    },
    {
      name: 'compress_file',
      description: 'Compress a log file from the filesystem',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to log file',
          },
          format: {
            type: 'string',
            enum: ['summary', 'detailed', 'json'],
            default: 'summary',
          },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'analyze_templates',
      description: 'Analyze compression results and suggest optimizations',
      inputSchema: {
        type: 'object',
        properties: {
          logs: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['logs'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'compress_logs': {
      const result = compress(args.logs as string[], {
        format: args.format as any,
        drain: {
          depth: args.depth as number,
          simThreshold: args.simThreshold as number,
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: result.formatted,
          },
        ],
      };
    }

    case 'compress_file': {
      const fs = await import('fs/promises');
      const content = await fs.readFile(args.filePath as string, 'utf-8');
      const result = compressText(content, {
        format: args.format as any,
      });

      return {
        content: [
          {
            type: 'text',
            text: result.formatted,
          },
        ],
      };
    }

    case 'analyze_templates': {
      const result = compress(args.logs as string[]);

      // Generate analysis
      const analysis = `
## Compression Analysis

**Input**: ${result.stats.inputLines} lines
**Templates**: ${result.stats.uniqueTemplates}
**Compression**: ${(result.stats.compressionRatio * 100).toFixed(2)}%
**Token Reduction**: ${(result.stats.estimatedTokenReduction * 100).toFixed(1)}%

### Template Distribution
${result.templates.slice(0, 10).map((t, i) =>
  `${i+1}. [${t.occurrences}x] ${t.pattern}`
).join('\n')}

### Recommendations
${generateRecommendations(result)}
`;

      return {
        content: [{ type: 'text', text: analysis }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

function generateRecommendations(result: any): string {
  const { stats, templates } = result;
  const recommendations: string[] = [];

  if (stats.uniqueTemplates > 200) {
    recommendations.push('- Consider lowering simThreshold (try 0.3) to group more aggressively');
  }

  if (stats.uniqueTemplates < 10 && stats.inputLines > 100) {
    recommendations.push('- Templates may be too generic. Try raising simThreshold (0.5-0.6)');
  }

  const rare = templates.filter((t: any) => t.occurrences <= 3);
  if (rare.length > templates.length * 0.3) {
    recommendations.push('- Many rare templates. Check for unmasked variable patterns');
  }

  return recommendations.length > 0
    ? recommendations.join('\n')
    : '- Compression looks good! No adjustments needed.';
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Logpare MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

### Package Configuration

```json
// package.json
{
  "name": "logpare-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for logpare log compression",
  "type": "module",
  "bin": {
    "logpare-mcp-server": "./build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepare": "npm run build",
    "start": "node build/index.js"
  },
  "files": ["build"],
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "logpare": "^0.0.5"
  }
}
```

## Advanced Features

### Progress Reporting for Long Operations

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'compress_large_file') {
    const { filePath } = request.params.arguments as any;

    // Read file in chunks
    const fs = await import('fs/promises');
    const lines = (await fs.readFile(filePath, 'utf-8')).split('\n');

    const drain = createDrain({
      onProgress: (event) => {
        // Send progress notifications (if MCP supports it)
        console.error(`Progress: ${event.percentComplete?.toFixed(1)}% (${event.currentPhase})`);
      },
    });

    drain.addLogLines(lines);
    const result = drain.getResult('summary');

    return {
      content: [{ type: 'text', text: result.formatted }],
    };
  }
});
```

### Custom Strategy Generator

```typescript
{
  name: 'generate_custom_strategy',
  description: 'Generate a custom preprocessing strategy from example log lines',
  inputSchema: {
    type: 'object',
    properties: {
      exampleLogs: {
        type: 'array',
        items: { type: 'string' },
        description: 'Sample log lines showing variable patterns',
      },
      variables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            pattern: { type: 'string' },
          },
        },
        description: 'Variable patterns to mask (name and regex)',
      },
    },
    required: ['exampleLogs', 'variables'],
  },
}

// Handler
case 'generate_custom_strategy': {
  const { exampleLogs, variables } = args as any;

  const strategyCode = `
import { defineStrategy } from 'logpare';

const customStrategy = defineStrategy({
  patterns: {
${variables.map((v: any) => `    ${v.name}: /${v.pattern}/gi,`).join('\n')}
  }
});

// Test with your examples
const testLogs = ${JSON.stringify(exampleLogs, null, 2)};

const result = compress(testLogs, {
  drain: { preprocessing: customStrategy }
});

console.log(result.formatted);
`;

  return {
    content: [
      {
        type: 'text',
        text: `## Generated Custom Strategy\n\n\`\`\`typescript\n${strategyCode}\n\`\`\``,
      },
    ],
  };
}
```

### Resource Endpoints (Template Storage)

```typescript
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// In-memory storage (use DB in production)
const compressionResults = new Map<string, any>();

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: Array.from(compressionResults.entries()).map(([id, result]) => ({
    uri: `compression://results/${id}`,
    name: `Compression Result ${id}`,
    description: `${result.stats.inputLines} lines → ${result.stats.uniqueTemplates} templates`,
    mimeType: 'application/json',
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^compression:\/\/results\/(.+)$/);

  if (!match) {
    throw new Error('Invalid resource URI');
  }

  const id = match[1];
  const result = compressionResults.get(id);

  if (!result) {
    throw new Error('Result not found');
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});
```

## Claude Desktop Integration

### Configuration File

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "logpare": {
      "command": "node",
      "args": ["/path/to/logpare-mcp-server/build/index.js"]
    }
  }
}
```

### Using in Claude

Once configured, Claude can use the tools:

```
User: "Analyze these logs for me"
[pastes log lines]

Claude: Let me compress these logs to identify patterns.
[Calls compress_logs tool]

Result: Found 23 unique templates from 1,847 lines.
Most common: [234x] ERROR Connection timeout after <*>
```

## Testing the MCP Server

### Test with MCP Inspector

```bash
# Install MCP inspector
npm install -g @modelcontextprotocol/inspector

# Run server in inspector
npx @modelcontextprotocol/inspector node build/index.js
```

### Unit Tests

```typescript
// test/server.test.ts
import { describe, it, expect } from 'vitest';
import { compress } from 'logpare';

describe('MCP Server Tools', () => {
  it('compress_logs should return formatted output', async () => {
    const logs = [
      'INFO Connection from 192.168.1.1 established',
      'INFO Connection from 192.168.1.2 established',
    ];

    const result = compress(logs);

    expect(result.stats.uniqueTemplates).toBe(1);
    expect(result.templates[0].pattern).toContain('Connection from <*>');
  });

  it('should generate recommendations for too many templates', () => {
    const result = {
      stats: { inputLines: 1000, uniqueTemplates: 500 },
      templates: [],
    };

    const recommendations = generateRecommendations(result);
    expect(recommendations).toContain('lowering simThreshold');
  });
});
```

## Deployment Options

### NPM Package

```bash
npm publish
# Users install: npm install -g logpare-mcp-server
```

### Docker Container

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY build ./build
CMD ["node", "build/index.js"]
```

### Serverless (AWS Lambda)

Adapt for HTTP transport instead of stdio for API Gateway integration.

## Best Practices

1. **Error Handling**: Wrap tool calls in try-catch, return helpful error messages
2. **Validation**: Validate inputs before processing (file exists, logs array not empty)
3. **Performance**: For large files, process in chunks and report progress
4. **Security**: Sanitize file paths, prevent directory traversal
5. **Logging**: Use `console.error()` for server logs (stdout reserved for MCP)

## Example Use Cases

### Log Analysis Assistant
AI can automatically compress logs and suggest fixes:
```
User: "My app is slow, here are the logs"
AI: [compresses logs] → Identifies "Database query taking 2.5s" pattern
AI: Suggests "Add index on user_id column"
```

### CI/CD Integration
MCP server in CI pipeline compresses build logs for faster review.

### Observability Platform
Connect to Grafana/Datadog via MCP, compress logs before sending to LLM.

---

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Official MCP Servers](https://github.com/anthropics/mcp-servers)
