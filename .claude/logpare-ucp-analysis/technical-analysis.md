# Technical Analysis: Logpare + UCP Integration

## 1. Current Logpare Architecture

### Core Components

```
logpare/
├── src/
│   ├── api.ts          # compress(), compressText() - main entry points
│   ├── types.ts        # TypeScript interfaces (Template, CompressionResult)
│   ├── drain/          # Drain algorithm implementation
│   │   ├── drain.ts    # Main algorithm
│   │   ├── cluster.ts  # LogCluster for template storage
│   │   └── node.ts     # DrainNode (V8-optimized with Map)
│   ├── preprocessing/  # Pattern matching and tokenization
│   │   ├── patterns.ts # Built-in regex (IP, UUID, timestamps, etc.)
│   │   └── default.ts  # Default ParsingStrategy
│   └── output/
│       └── formatter.ts # summary, detailed, json formatters
```

### Public API

```typescript
// Core functions
compress(lines: string[], options?: CompressOptions): CompressionResult
compressText(text: string, options?: CompressOptions): CompressionResult
createDrain(options?: DrainOptions): Drain

// Output data structure
interface Template {
  id: string;
  pattern: string;
  occurrences: number;
  sampleVariables: string[][];
  severity: 'error' | 'warning' | 'info';
  urlSamples: string[];
  fullUrlSamples: string[];
  statusCodeSamples: number[];
  correlationIdSamples: string[];
  durationSamples: string[];
  isStackFrame: boolean;
  firstSeen: number;
  lastSeen: number;
}
```

### Existing MCP Server Status

**Current state**: Documentation and patterns exist, but no implementation yet.

| Asset | Location | Status |
|-------|----------|--------|
| User guide | `docs/content/docs/guides/mcp-integration.mdx` | Documentation only |
| Dev patterns | `.cursor/rules/030-mcp-server.mdc` | Cursor rules (stdio only) |
| Package | `@logpare/mcp` (npm) | **Not yet published** |
| Source code | `packages/mcp/` | **Does not exist** |

**Documented tools** (planned, not implemented):
- `compress_logs` - Compress log lines array
- `analyze_log_patterns` - Quick pattern extraction
- `estimate_compression` - Compression ratio estimate

**Transport**: Documentation shows **stdio only** (Claude Desktop pattern), no HTTP transport.

---

## 2. UCP MCP Binding Requirements

### Protocol Compliance

UCP MCP binding requires:
1. JSON-RPC 2.0 protocol
2. Specific tool names: `create_checkout`, `get_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout`
3. `_meta.ucp.profile` field in all requests
4. UCP error codes in JSON-RPC error `data` field
5. HTTP transport with streaming support

### Request/Response Format

```json
// UCP MCP Request
{
  "jsonrpc": "2.0",
  "method": "create_checkout",
  "params": {
    "_meta": { "ucp": { "profile": "https://..." } },
    "checkout": { /* UCP checkout object */ }
  },
  "id": 1
}

// UCP MCP Error Response
{
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "status": "error",
      "errors": [{ "code": "UCP_ERROR_CODE", "severity": "recoverable" }]
    }
  }
}
```

---

## 3. Compatibility Assessment

### Protocol-Level Compatibility

| Aspect | Logpare MCP | UCP MCP | Compatible? |
|--------|-------------|---------|-------------|
| Transport | stdio (standard) | HTTP + streaming | Partial - needs HTTP transport |
| Message format | JSON-RPC 2.0 | JSON-RPC 2.0 | Yes |
| Tool structure | `name`, `description`, `inputSchema` | Same + `_meta.ucp` | Yes - additive |
| Error format | Standard MCP | UCP codes in `data` | Can extend |
| Authentication | N/A | `UCP-Agent` header | Needs addition |

### Data Model Alignment

**Logpare extracts diagnostic metadata that aligns with UCP patterns**:

| Logpare Field | UCP Relevance |
|---------------|---------------|
| `statusCodeSamples` | HTTP status codes in checkout errors |
| `correlationIdSamples` | Checkout session IDs, trace IDs |
| `durationSamples` | Session TTL, processing times |
| `urlSamples` | API endpoints, continue_urls |
| `severity` | Maps to UCP error severity levels |

### Output Format Compatibility

Logpare JSON output (`version: "1.1"`) can be extended for UCP:

```json
{
  "version": "1.2",
  "ucp": {
    "context": "checkout_session_logs",
    "session_id": "cs_abc123",
    "merchant": "business.example.com"
  },
  "stats": { ... },
  "templates": [ ... ]
}
```

---

## 4. Implementation Gaps

### Gap 1: HTTP Transport

**Current**: Logpare MCP uses stdio transport
**Required**: UCP MCP requires HTTP transport with streaming

**Solution**: Add HTTP transport option using `@modelcontextprotocol/sdk` Streamable HTTP transport or custom Express/Hono server.

```typescript
// Example: HTTP Transport Addition
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

const transport = new StreamableHTTPServerTransport({
  path: '/mcp',
  port: 3000,
});
await server.connect(transport);
```

### Gap 2: UCP Metadata Handling

**Current**: Standard MCP requests without `_meta`
**Required**: Parse `_meta.ucp.profile` from requests

**Solution**: Add middleware to extract and validate UCP profile:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const ucpProfile = request.params._meta?.ucp?.profile;
  if (ucpProfile) {
    // Validate profile, extract version info
    const profileData = await fetchProfile(ucpProfile);
  }
  // Process tool call...
});
```

### Gap 3: UCP Error Formatting

**Current**: Standard MCP errors
**Required**: UCP error codes in `data` field

**Solution**: Map logpare errors to UCP format:

```typescript
function formatUCPError(error: Error): JsonRpcError {
  return {
    code: -32603,
    message: error.message,
    data: {
      status: 'error',
      errors: [{
        code: mapToUCPCode(error),
        severity: 'recoverable',
      }],
    },
  };
}
```

### Gap 4: UCP-Specific Tools

**Current**: Generic log compression tools
**Required**: UCP-aware tools for checkout log processing

**New Tools Needed**:

```typescript
// compress_checkout_logs - UCP-specific compression
{
  name: 'compress_checkout_logs',
  description: 'Compress UCP checkout session logs with context preservation',
  inputSchema: {
    type: 'object',
    properties: {
      logs: { type: 'array', items: { type: 'string' } },
      session_id: { type: 'string', description: 'UCP checkout session ID' },
      include_ucp_context: { type: 'boolean', default: true },
    },
  },
}

// analyze_checkout_errors - Group checkout failures
{
  name: 'analyze_checkout_errors',
  description: 'Analyze UCP checkout error patterns and suggest resolutions',
  inputSchema: {
    type: 'object',
    properties: {
      logs: { type: 'array', items: { type: 'string' } },
      error_codes: { type: 'array', items: { type: 'string' } },
    },
  },
}
```

---

## 5. Architecture Recommendations

### Option A: Standalone UCP Log Processor

Create a separate `@logpare/ucp` package:

```
@logpare/ucp/
├── src/
│   ├── index.ts              # UCP-specific exports
│   ├── preprocessing/
│   │   └── ucp-patterns.ts   # UCP log patterns (session IDs, error codes)
│   ├── tools/
│   │   ├── compress-checkout.ts
│   │   └── analyze-errors.ts
│   └── mcp/
│       ├── server.ts         # HTTP transport MCP server
│       └── ucp-adapter.ts    # UCP metadata handling
```

**Pros**: Clean separation, UCP-specific optimizations
**Cons**: Separate maintenance, potential code duplication

### Option B: Extend Core Logpare

Add UCP support to main logpare package:

```typescript
// src/ucp/index.ts
export { UCPPreprocessingStrategy } from './preprocessing.js';
export { compressCheckoutLogs, analyzeCheckoutErrors } from './tools.js';
export { createUCPMCPServer } from './mcp-server.js';
```

**Pros**: Single package, shared improvements
**Cons**: Larger bundle, UCP dependencies for all users

### Option C: Plugin Architecture (Recommended)

Create logpare plugin system with UCP as first plugin:

```typescript
// Core logpare
import { compress, createPlugin } from 'logpare';

// UCP plugin
import { ucpPlugin } from '@logpare/plugin-ucp';

const logpare = createPlugin(ucpPlugin);
const result = logpare.compress(checkoutLogs, { ucp: { sessionId: 'cs_abc' } });
```

**Pros**: Extensible, tree-shakeable, clean separation
**Cons**: More complex implementation

---

## 6. UCP-Specific Preprocessing Patterns

### New Patterns to Add

```typescript
// src/ucp/patterns.ts

export const UCP_PATTERNS = {
  // Checkout session IDs
  checkout_session_id: /\bcs_[a-zA-Z0-9]{20,}\b/gi,

  // UCP error codes
  ucp_error_code: /\b(MERCHANDISE_NOT_AVAILABLE|INVALID_CURRENCY|CHECKOUT_EXPIRED|PAYMENT_DECLINED|INVENTORY_UNAVAILABLE)\b/g,

  // UCP discount codes
  discount_code_error: /\b(discount_code_expired|discount_code_invalid|discount_code_already_applied)\b/g,

  // UCP status values
  checkout_status: /\b(incomplete|requires_escalation|ready_for_complete|complete_in_progress|completed|canceled)\b/g,

  // Payment handler IDs
  payment_handler: /\bph_[a-zA-Z0-9]{16,}\b/gi,

  // UCP namespace patterns
  ucp_capability: /dev\.ucp\.[a-z_]+\.[a-z_]+/g,
};

export const createUCPStrategy = (baseStrategy: ParsingStrategy): ParsingStrategy => ({
  preprocess(line: string): string {
    let processed = baseStrategy.preprocess(line);
    // Mask UCP-specific identifiers
    processed = processed.replace(UCP_PATTERNS.checkout_session_id, '<SESSION_ID>');
    processed = processed.replace(UCP_PATTERNS.payment_handler, '<PAYMENT_HANDLER>');
    return processed;
  },
  tokenize: baseStrategy.tokenize,
  getSimThreshold: baseStrategy.getSimThreshold,
});
```

---

## 7. MCP Server Integration Architecture

### Proposed UCP MCP Server

```typescript
// @logpare/mcp-ucp/src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import { compress, createDrain, defineStrategy } from 'logpare';

const server = new Server({
  name: 'logpare-ucp-mcp-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {}, resources: {} },
});

// UCP-aware tools
const tools = [
  {
    name: 'compress_checkout_logs',
    description: 'Compress UCP checkout session logs while preserving diagnostic context',
    inputSchema: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: { type: 'string' } },
        session_id: { type: 'string' },
        format: { type: 'string', enum: ['summary', 'detailed', 'json', 'ucp_json'] },
      },
      required: ['logs'],
    },
  },
  {
    name: 'analyze_checkout_errors',
    description: 'Analyze patterns in UCP checkout errors and suggest resolutions',
    inputSchema: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: { type: 'string' } },
      },
      required: ['logs'],
    },
  },
  {
    name: 'compress_a2a_logs',
    description: 'Compress Agent-to-Agent communication logs from UCP transactions',
    inputSchema: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: { type: 'string' } },
        include_trace_ids: { type: 'boolean', default: true },
      },
      required: ['logs'],
    },
  },
];

// Resources
const resources = [
  {
    uri: 'ucp://compression-profiles/checkout',
    name: 'Checkout Log Compression Profile',
    description: 'Optimized settings for UCP checkout session logs',
    mimeType: 'application/json',
  },
  {
    uri: 'ucp://error-patterns/reference',
    name: 'UCP Error Pattern Reference',
    description: 'Common UCP error patterns and their meanings',
    mimeType: 'application/json',
  },
];
```

---

## 8. Testing Strategy

### Conformance Testing

1. **UCP Sample Logs**: Generate test logs from UCP sample implementations
2. **Pattern Coverage**: Verify all UCP patterns are properly masked
3. **Error Code Extraction**: Validate UCP error codes are captured in templates
4. **Session Correlation**: Ensure session IDs are preserved for correlation

### Test Cases

```typescript
describe('UCP Log Compression', () => {
  it('should extract checkout session IDs', () => {
    const logs = [
      'INFO Creating checkout session cs_abc123def456ghi789',
      'INFO Creating checkout session cs_xyz789abc123def456',
    ];
    const result = compress(logs, { drain: { preprocessing: ucpStrategy } });
    expect(result.templates[0].pattern).toBe('INFO Creating checkout session <SESSION_ID>');
    expect(result.templates[0].correlationIdSamples).toContain('cs_abc123def456ghi789');
  });

  it('should group UCP error patterns', () => {
    const logs = [
      'ERROR MERCHANDISE_NOT_AVAILABLE for item SKU123',
      'ERROR MERCHANDISE_NOT_AVAILABLE for item SKU456',
      'ERROR PAYMENT_DECLINED for session cs_abc',
    ];
    const result = compress(logs);
    expect(result.templates.length).toBe(2);
  });
});
```

---

## 9. Performance Considerations

### Log Volume Estimates

| Scenario | Logs/Transaction | Daily Volume (10K txns) |
|----------|------------------|------------------------|
| Simple checkout | 20-50 lines | 200K-500K lines |
| Complex checkout (errors) | 100-200 lines | 1M-2M lines |
| A2A multi-agent | 500-1000 lines | 5M-10M lines |

### Optimization Needs

1. **Streaming**: Process logs incrementally for large sessions
2. **Caching**: Cache UCP pattern compilation
3. **Parallelization**: Process multiple sessions concurrently
4. **Memory**: Implement template pruning for high-volume scenarios

---

## 10. Summary

### Technical Feasibility: HIGH

Logpare's architecture is well-suited for UCP integration:
- Existing MCP server patterns need minimal adaptation
- Template/diagnostic metadata extraction aligns with UCP data model
- Preprocessing strategy system allows UCP-specific patterns
- Output formatters can be extended for UCP context

### Recommended Implementation Path

1. **Phase 1**: Add UCP preprocessing patterns to core logpare
2. **Phase 2**: Create `@logpare/mcp` package with HTTP transport
3. **Phase 3**: Add UCP-specific tools (`compress_checkout_logs`, etc.)
4. **Phase 4**: Create UCP-specific output format (`ucp_json`)
5. **Phase 5**: Integrate with UCP conformance test suite
