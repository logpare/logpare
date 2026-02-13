#!/usr/bin/env node
/**
 * @logpare/mcp CLI
 *
 * Start the logpare MCP server with stdio transport for AI agents.
 *
 * Usage:
 *   npx @logpare/mcp              # Start server with defaults
 *   npx @logpare/mcp --ucp        # Enable UCP extension
 *   npx @logpare/mcp --test       # Run self-test
 */

import { parseArgs } from 'node:util';
import { startStdioServer, type MCPServerConfig } from './index.js';

const VALID_FORMATS = ['summary', 'detailed', 'json'] as const;

function parseCliArgs(): MCPServerConfig & { test: boolean } {
  const { values } = parseArgs({
    options: {
      ucp: { type: 'boolean', short: 'u', default: false },
      format: { type: 'string', short: 'f' },
      depth: { type: 'string', short: 'd' },
      threshold: { type: 'string', short: 't' },
      'max-lines': { type: 'string', short: 'm' },
      test: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.version) {
    printVersion();
    process.exit(0);
  }

  const config: MCPServerConfig & { test: boolean } = {
    test: values.test as boolean,
  };

  if (values.ucp) {
    config.ucp = { enabled: true };
  }

  if (values.format !== undefined) {
    if (!(VALID_FORMATS as readonly string[]).includes(values.format)) {
      console.error(`Invalid format: ${values.format}. Must be one of: ${VALID_FORMATS.join(', ')}`);
      process.exit(1);
    }
    config.defaultFormat = values.format as (typeof VALID_FORMATS)[number];
  }

  if (values.depth !== undefined) {
    const depth = parseInt(values.depth, 10);
    if (Number.isNaN(depth)) {
      console.error('Option --depth requires a numeric value');
      process.exit(1);
    }
    config.defaultDepth = depth;
  }

  if (values.threshold !== undefined) {
    const threshold = parseFloat(values.threshold);
    if (Number.isNaN(threshold)) {
      console.error('Option --threshold requires a numeric value');
      process.exit(1);
    }
    config.defaultSimThreshold = threshold;
  }

  if (values['max-lines'] !== undefined) {
    const maxLines = parseInt(values['max-lines'], 10);
    if (Number.isNaN(maxLines)) {
      console.error('Option --max-lines requires a numeric value');
      process.exit(1);
    }
    config.maxLinesPerRequest = maxLines;
  }

  return config;
}

function printHelp(): void {
  console.log(`
@logpare/mcp - MCP server for log compression

USAGE:
  npx @logpare/mcp [options]

OPTIONS:
  --ucp, -u           Enable UCP (Universal Commerce Protocol) extension
  --format, -f        Default output format (summary|detailed|json)
  --depth, -d         Drain algorithm depth (2-8, default: 4)
  --threshold, -t     Similarity threshold (0.0-1.0, default: 0.4)
  --max-lines, -m     Maximum lines per request (default: 100000)
  --test              Run self-test and exit
  --version, -v       Show version
  --help, -h          Show this help

EXAMPLES:
  npx @logpare/mcp                    # Start with defaults
  npx @logpare/mcp --ucp              # Enable UCP tools
  npx @logpare/mcp -f detailed -d 5   # Custom settings

TOOLS:
  compress_logs        Compress log lines array
  compress_text        Compress multi-line text
  analyze_patterns     Quick pattern extraction
  estimate_compression Estimate compression ratio

UCP TOOLS (--ucp flag required):
  compress_checkout_logs   Compress UCP checkout session logs
  analyze_checkout_errors  Analyze UCP checkout errors
  compress_a2a_logs        Compress Agent-to-Agent logs

For more information, visit: https://logpare.com/docs/guides/mcp-integration
`);
}

declare const __VERSION__: string;

function printVersion(): void {
  console.log(`@logpare/mcp v${__VERSION__}`);
}

async function runTest(): Promise<void> {
  console.log('Running @logpare/mcp self-test...\n');

  // Test basic imports
  console.log('✓ Module imports successful');

  // Test compression
  const { compress } = await import('logpare');
  const testLogs = [
    'INFO User login successful user_id=123',
    'INFO User login successful user_id=456',
    'INFO User login successful user_id=789',
    'ERROR Database connection failed host=db.example.com',
    'ERROR Database connection failed host=db.example.com',
  ];

  const result = compress(testLogs, { format: 'json' });
  console.log(`✓ Compression working (${result.stats.uniqueTemplates} templates from ${result.stats.inputLines} lines)`);

  // Test MCP server creation
  const { createServer } = await import('./index.js');
  void createServer();
  console.log('✓ MCP server created successfully');

  // Test UCP extension
  void createServer({ ucp: { enabled: true } });
  console.log('✓ UCP extension loaded successfully');

  console.log('\n✓ All tests passed!');
  console.log('\nThe MCP server is ready to use. Add it to your AI assistant config:');
  console.log(`
{
  "mcpServers": {
    "logpare": {
      "command": "npx",
      "args": ["@logpare/mcp"]
    }
  }
}
`);
}

async function main(): Promise<void> {
  const config = parseCliArgs();

  if (config.test) {
    await runTest();
    return;
  }

  // Start stdio server
  await startStdioServer(config);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
