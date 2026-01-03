---
sidebar_position: 3
---

# MCP Integration

Learn how to integrate logpare with AI coding assistants via the Model Context Protocol (MCP).

## Overview

logpare provides an MCP server that exposes log compression capabilities as tools for AI assistants like Claude Desktop. This enables AI agents to:

- Compress large log files before analysis
- Extract patterns from application logs
- Estimate compression ratios
- Process logs incrementally

## Installation

### Global Installation

Install the MCP server globally:

```bash
npm install -g @logpare/mcp
```

### Local Installation

Or install in a project:

```bash
npm install @logpare/mcp
```

## Claude Desktop Configuration

Add the logpare MCP server to Claude Desktop's configuration.

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

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

### Linux

Edit `~/.config/Claude/claude_desktop_config.json`:

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

### Verify Installation

Restart Claude Desktop and check that the logpare tools are available:

1. Open Claude Desktop
2. Start a new conversation
3. Type `/tools` to see available tools
4. Look for `compress_logs`, `analyze_log_patterns`, etc.

## Available Tools

### compress_logs

Compress an array of log lines with full options.

**Parameters:**

```typescript
{
  lines: string[];           // Log lines to compress
  format?: 'summary' | 'detailed' | 'json';
  depth?: number;            // Default: 4
  simThreshold?: number;     // Default: 0.4
  maxTemplates?: number;     // Default: 50
}
```

**Example Usage:**

```
User: Can you compress these logs for me?
[paste logs here]

Claude: I'll use the logpare MCP tool to compress those logs.
[Claude calls compress_logs tool]

Here's the compressed output showing 15 unique templates...
```

### analyze_log_patterns

Extract patterns without full compression (faster for quick analysis).

**Parameters:**

```typescript
{
  lines: string[];
  maxPatterns?: number;      // Default: 20
}
```

**Example Usage:**

```
User: What are the main patterns in these logs?

Claude: Let me analyze the log patterns.
[Claude calls analyze_log_patterns]

I found 12 distinct patterns, with the most common being:
1. ERROR Connection to <*> failed (450 occurrences)
2. INFO Request <*> completed in <*> (320 occurrences)
...
```

### estimate_compression

Quick estimate of compression ratio without full processing.

**Parameters:**

```typescript
{
  lines: string[];
  sampleSize?: number;       // Default: 1000
}
```

**Example Usage:**

```
User: How much could we compress this 10MB log file?

Claude: Let me estimate the compression potential.
[Claude calls estimate_compression]

Based on a sample of 1000 lines, I estimate you could achieve:
- 85% token reduction
- Compression ratio: 0.15 (15% of original size)
```

## Usage Examples

### Basic Log Analysis

**User prompt:**
```
Here are my application logs from the last hour. Can you identify the main issues?

[paste logs]
```

**Claude's approach:**
1. Calls `compress_logs` with default settings
2. Analyzes the compressed templates
3. Identifies error patterns and frequencies
4. Provides actionable insights

### Comparing Log Files

**User prompt:**
```
Compare these two log files and tell me what changed:

File 1: [logs from yesterday]
File 2: [logs from today]
```

**Claude's approach:**
1. Calls `compress_logs` for each file
2. Compares template sets
3. Identifies new patterns, removed patterns, frequency changes

### Performance Investigation

**User prompt:**
```
These logs are from a slow API endpoint. What's causing the delays?

[paste logs]
```

**Claude's approach:**
1. Calls `compress_logs` with `format: 'detailed'`
2. Examines `durationSamples` in templates
3. Identifies patterns with high latency
4. Suggests optimizations

## Configuration Options

### Custom MCP Server Settings

You can configure the MCP server with environment variables or a config file.

Create `.logpare-mcp.json` in your home directory:

```json
{
  "defaultFormat": "detailed",
  "defaultDepth": 5,
  "defaultSimThreshold": 0.4,
  "maxLinesPerRequest": 100000,
  "enableProgressReporting": true
}
```

### Environment Variables

```bash
# Set default output format
export LOGPARE_MCP_FORMAT=detailed

# Set default depth
export LOGPARE_MCP_DEPTH=5

# Set max lines per request
export LOGPARE_MCP_MAX_LINES=100000
```

Update your Claude Desktop config:

```json
{
  "mcpServers": {
    "logpare": {
      "command": "npx",
      "args": ["@logpare/mcp"],
      "env": {
        "LOGPARE_MCP_FORMAT": "detailed",
        "LOGPARE_MCP_DEPTH": "5"
      }
    }
  }
}
```

## Advanced Usage

### Custom Preprocessing in MCP

Pass custom preprocessing patterns via tool parameters:

**User prompt:**
```
Compress these logs but also mask our custom order IDs (format: ORD-12345678)
```

**Claude will:**
```typescript
// Call compress_logs with custom pattern
{
  lines: [...],
  customPatterns: {
    orderId: /ORD-\d{8}/g
  }
}
```

### Incremental Processing

For very large log sets, Claude can process incrementally:

**User prompt:**
```
I have a 100MB log file. Can you analyze it in chunks?
```

**Claude's approach:**
1. Splits file into manageable chunks
2. Calls `compress_logs` for each chunk
3. Aggregates results
4. Reports overall findings

### Integration with Other Tools

Combine logpare MCP with other MCP servers:

**Example workflow:**
```
User: Check my application logs and open GitHub issues for any new errors

Claude will:
1. Use logpare MCP to compress logs
2. Identify error templates
3. Use GitHub MCP to check if issues exist
4. Create new issues for novel errors
```

## Best Practices

### 1. Start with Compression Estimates

For very large files, estimate first:

```
User: I have 500,000 log lines. Should I compress them all?

Claude: Let me estimate first...
[calls estimate_compression with sample]

Based on the sample, compression will be effective. I'll proceed with full compression.
```

### 2. Use Appropriate Formats

- **summary**: Quick overview of main patterns
- **detailed**: Deep analysis with metadata
- **json**: When you need programmatic access

### 3. Tune Parameters for Log Type

Ask Claude to adjust based on your logs:

```
User: These are Kubernetes pod logs, very noisy

Claude: I'll use depth=5 and simThreshold=0.3 for better grouping
[adjusts parameters accordingly]
```

### 4. Leverage Metadata

Extract specific information from templates:

```
User: What URLs are appearing in these error logs?

Claude: [uses compress_logs with format='json']
Looking at the urlSamples in error templates:
- api.example.com (450 errors)
- cdn.example.com (23 errors)
```

## Troubleshooting

### MCP Server Not Appearing

1. Check Claude Desktop config syntax (valid JSON)
2. Restart Claude Desktop completely
3. Check MCP server logs:

**macOS/Linux:**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Windows:**
```powershell
Get-Content "$env:APPDATA\Claude\Logs\mcp*.log" -Wait
```

### Tools Not Working

1. Verify `@logpare/mcp` is installed:

```bash
npm list -g @logpare/mcp
```

2. Test the server directly:

```bash
npx @logpare/mcp --test
```

3. Check for error messages in Claude Desktop

### Performance Issues

If compression is slow:

1. Reduce `maxTemplates` in requests
2. Use `estimate_compression` first for large files
3. Process in smaller batches
4. Increase `simThreshold` to create fewer templates

## Security Considerations

### Sensitive Data

Be cautious when sharing logs with AI assistants:

1. **PII Masking**: Ensure sensitive data is masked
2. **Custom Patterns**: Add patterns for proprietary IDs
3. **Local Processing**: MCP runs locally - logs stay on your machine
4. **Review Output**: Check compressed output before sharing

### Example: Masking Sensitive Data

```typescript
// In your preprocessing strategy
const sensitiveStrategy = defineStrategy({
  preprocess(line: string): string {
    return line
      // Mask emails
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<EMAIL>')
      // Mask phone numbers
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '<PHONE>')
      // Mask SSN
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '<SSN>')
      // Mask credit cards
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '<CARD>');
  }
});
```

## Example Conversations

### Example 1: Error Investigation

```
User: My app is throwing errors. Here are the logs from the last hour.
[paste 5000 lines of logs]

Claude: I'll compress these logs to identify the main error patterns.
[calls compress_logs with format='detailed']

I found 3 main error patterns:

1. ERROR Connection to database failed (234 occurrences)
   - First seen: line 45
   - Status codes: 500
   - This is your most frequent error

2. ERROR Timeout reading from cache (89 occurrences)
   - Durations: 30s, 30s, 30s
   - This appears to be a consistent timeout

3. ERROR Invalid user token (12 occurrences)
   - Correlation IDs show these are from specific users

Would you like me to investigate any of these patterns further?
```

### Example 2: Performance Analysis

```
User: API response times seem slow. Can you analyze these access logs?
[paste access logs]

Claude: I'll look for patterns in the access logs.
[calls compress_logs with depth=6]

I found the slow endpoints:

1. GET /api/users/<*> - 450 requests, avg 1.2s
2. POST /api/orders - 120 requests, avg 2.5s
3. GET /api/reports/<*> - 45 requests, avg 5.8s

The reports endpoint is your slowest, taking 5.8s on average.
Looking at the sample URLs, these are large date range queries.

Recommendation: Add pagination or caching for the reports endpoint.
```

## See Also

- [MCP Specification](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/desktop)
- [Parameter Tuning Guide](/docs/guides/parameter-tuning)
- [Custom Preprocessing](/docs/guides/custom-preprocessing)
