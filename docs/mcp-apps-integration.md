# MCP Apps Integration Research for logpare

**Date**: January 26, 2026
**Status**: Research findings for new MCP Apps capability

## Executive Summary

MCP Apps is a new extension to the Model Context Protocol announced today that enables MCP servers to return **interactive UI components** that render directly within AI chat interfaces (Claude, ChatGPT, VS Code, Goose). This creates an opportunity for logpare to provide rich log visualization experiences directly in LLM conversations.

## What is MCP Apps?

MCP Apps extends MCP tools with interactive UIs through two primitives:

1. **Tools with UI metadata** - Tools declare a `_meta.ui.resourceUri` field pointing to a UI resource
2. **UI Resources** - Server-side HTML/JavaScript bundles served via the `ui://` scheme

The host fetches the resource, renders it in a sandboxed iframe, and enables bidirectional communication via JSON-RPC over `postMessage`.

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Host (Claude, etc.)                  │
├─────────────────────────────────────────────────────────────────┤
│  1. LLM invokes tool  ──►  2. Server returns result + UI ref    │
│                                                                  │
│  3. Host fetches ui://resource  ──►  4. Renders in sandbox      │
│                                                                  │
│  5. UI receives tool data  ◄──►  6. UI can call server tools    │
└─────────────────────────────────────────────────────────────────┘
```

## SDK & Installation

```bash
npm install -S @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk
```

The SDK provides:
- `@modelcontextprotocol/ext-apps` - Core App class for building UIs
- `@modelcontextprotocol/ext-apps/react` - React hooks
- `@modelcontextprotocol/ext-apps/app-bridge` - For host implementations

## Integration Opportunities for logpare

### 1. Interactive Log Dashboard (High Value)

Create a `visualize_logs` tool that returns an interactive dashboard showing:

- **Template frequency chart** - Bar/treemap of log patterns by occurrence
- **Severity breakdown** - Pie chart of error/warning/info distribution
- **Compression stats** - Visual gauge showing token reduction
- **Timeline view** - When templates appeared (firstSeen/lastSeen)

```typescript
// Tool definition
{
  name: "visualize_logs",
  description: "Analyze and visualize log patterns interactively",
  inputSchema: {
    type: "object",
    properties: {
      logs: { type: "string", description: "Raw log text to analyze" }
    },
    required: ["logs"]
  },
  _meta: {
    ui: {
      resourceUri: "ui://logpare/dashboard"
    }
  }
}
```

### 2. Template Explorer (High Value)

Interactive drill-down into discovered templates:

- Click a template to see all sample variables
- View diagnostic metadata (URLs, status codes, correlation IDs, durations)
- Filter by severity level
- Expand/collapse stack frames
- Copy patterns for use in log queries

### 3. Real-time Log Monitor (Medium Value)

Streaming log analysis with live template discovery:

- Connect to log stream via the UI
- Watch templates emerge in real-time
- Alert on new error patterns
- Show compression ratio as logs flow in

### 4. Log Query Builder (Medium Value)

Help users build log queries from templates:

- Select a template pattern
- Generate regex or structured query
- Export for use in logging systems (Splunk, ELK, CloudWatch)

## Implementation Example

### Server Side (`src/mcp-server.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { compress } from "./api.js";
import fs from "fs";
import path from "path";

const server = new Server({
  name: "logpare",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Register the visualization tool
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "analyze_logs",
    description: "Analyze log patterns and display interactive visualization",
    inputSchema: {
      type: "object",
      properties: {
        logs: {
          type: "string",
          description: "Raw log text or file path"
        },
        format: {
          type: "string",
          enum: ["dashboard", "templates", "timeline"],
          default: "dashboard"
        }
      },
      required: ["logs"]
    },
    _meta: {
      ui: {
        resourceUri: "ui://logpare/dashboard"
      }
    }
  }]
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "analyze_logs") {
    const { logs } = request.params.arguments;
    const result = compressText(logs, { format: "json" });

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result)
      }]
    };
  }
});

// Register UI resource
server.setRequestHandler("resources/list", async () => ({
  resources: [{
    uri: "ui://logpare/dashboard",
    name: "Log Analysis Dashboard",
    mimeType: "text/html"
  }]
}));

// Serve UI resource
server.setRequestHandler("resources/read", async (request) => {
  if (request.params.uri === "ui://logpare/dashboard") {
    const html = fs.readFileSync(
      path.join(__dirname, "../dist/dashboard.html"),
      "utf-8"
    );
    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "text/html",
        text: html
      }]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### UI Side (`src/mcp-app/dashboard.ts`)

```typescript
import { App } from "@modelcontextprotocol/ext-apps";
import type { CompressionResult, Template } from "../types.js";

const app = new App();

// State
let result: CompressionResult | null = null;

// Receive analysis results from tool call
app.ontoolresult = (toolResult) => {
  result = JSON.parse(toolResult.content[0].text);
  renderDashboard(result);
};

function renderDashboard(data: CompressionResult) {
  const container = document.getElementById("app")!;

  // Render stats summary
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Input Lines</span>
        <span class="value">${data.stats.inputLines.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="label">Templates</span>
        <span class="value">${data.stats.uniqueTemplates}</span>
      </div>
      <div class="stat">
        <span class="label">Token Reduction</span>
        <span class="value">${data.stats.estimatedTokenReduction}%</span>
      </div>
    </div>

    <div class="templates-list">
      ${data.templates.map(renderTemplate).join("")}
    </div>
  `;

  // Attach click handlers for drill-down
  attachTemplateHandlers(data.templates);
}

function renderTemplate(template: Template): string {
  const severityClass = `severity-${template.severity}`;
  return `
    <div class="template ${severityClass}" data-id="${template.id}">
      <div class="pattern">${escapeHtml(template.pattern)}</div>
      <div class="meta">
        <span class="count">${template.occurrences}x</span>
        ${template.statusCodeSamples.length > 0
          ? `<span class="status">${template.statusCodeSamples.join(", ")}</span>`
          : ""}
        ${template.durationSamples.length > 0
          ? `<span class="duration">${template.durationSamples[0]}</span>`
          : ""}
      </div>
    </div>
  `;
}

async function attachTemplateHandlers(templates: Template[]) {
  document.querySelectorAll(".template").forEach((el) => {
    el.addEventListener("click", async () => {
      const id = el.getAttribute("data-id");
      const template = templates.find(t => t.id === id);

      if (template) {
        // Update model context with selection
        await app.updateModelContext({
          content: [{
            type: "text",
            text: `User selected template: ${template.pattern} (${template.occurrences} occurrences)`
          }]
        });

        showTemplateDetails(template);
      }
    });
  });
}

function showTemplateDetails(template: Template) {
  // Render detailed view with variables, URLs, correlation IDs, etc.
}

// Connect to host
await app.connect();
```

## Build Configuration

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "src/mcp-app/dashboard.html",
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
});
```

## Package.json Scripts

```json
{
  "scripts": {
    "build:mcp-app": "vite build",
    "dev:mcp-app": "vite build --watch",
    "mcp-server": "tsx src/mcp-server.ts"
  }
}
```

## Claude Desktop Configuration

Users would configure the MCP server in their Claude Desktop settings:

```json
{
  "mcpServers": {
    "logpare": {
      "command": "npx",
      "args": ["logpare-mcp"]
    }
  }
}
```

## Security Considerations

MCP Apps include multiple security layers:

1. **Iframe sandboxing** - UIs run in restricted iframes
2. **Pre-declared templates** - Hosts review UIs before rendering
3. **Auditable messages** - All JSON-RPC communication is loggable
4. **User consent** - UI-initiated tool calls require user approval

For logpare specifically:
- Log data stays local (processed in the MCP server)
- No external network requests from the UI
- Read-only analysis (no log modification)

## Client Support (as of Jan 26, 2026)

- ✅ Claude (web and desktop)
- ✅ Goose
- ✅ VS Code Insiders
- ✅ ChatGPT (launching this week)

## Recommended Implementation Phases

### Phase 1: Basic Dashboard
- Implement `analyze_logs` tool with compression stats
- Simple template list view
- Severity color coding

### Phase 2: Interactive Features
- Template drill-down with variable samples
- Filtering by severity/timeframe
- Copy-to-clipboard for patterns

### Phase 3: Advanced Visualizations
- Timeline view of template emergence
- Frequency charts
- Real-time streaming support

## References

- [MCP Apps Announcement](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [ext-apps GitHub Repository](https://github.com/modelcontextprotocol/ext-apps)
- [SDK API Documentation](https://modelcontextprotocol.github.io/ext-apps/api/documents/Quickstart.html)
- [npm Package](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps)
