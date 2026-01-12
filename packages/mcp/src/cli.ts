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

import { startStdioServer, type MCPServerConfig } from './index.js';

function parseArgs(): MCPServerConfig & { test?: boolean } {
  const args = process.argv.slice(2);
  const config: MCPServerConfig & { test?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--ucp':
      case '-u':
        config.ucp = { enabled: true };
        break;

      case '--format':
      case '-f': {
        const nextArg = args[++i];
        if (nextArg === undefined || nextArg.startsWith('-')) {
          console.error(`Option ${arg} requires a value`);
          process.exit(1);
        }
        const validFormats = ['summary', 'detailed', 'json'];
        if (!validFormats.includes(nextArg)) {
          console.error(`Invalid format: ${nextArg}. Must be one of: ${validFormats.join(', ')}`);
          process.exit(1);
        }
        config.defaultFormat = nextArg as 'summary' | 'detailed' | 'json';
        break;
      }

      case '--depth':
      case '-d': {
        const nextArg = args[++i];
        if (nextArg === undefined || nextArg.startsWith('-')) {
          console.error(`Option ${arg} requires a value`);
          process.exit(1);
        }
        const depth = parseInt(nextArg, 10);
        if (Number.isNaN(depth)) {
          console.error(`Option ${arg} requires a numeric value`);
          process.exit(1);
        }
        config.defaultDepth = depth;
        break;
      }

      case '--threshold':
      case '-t': {
        const nextArg = args[++i];
        if (nextArg === undefined || nextArg.startsWith('-')) {
          console.error(`Option ${arg} requires a value`);
          process.exit(1);
        }
        const threshold = parseFloat(nextArg);
        if (Number.isNaN(threshold)) {
          console.error(`Option ${arg} requires a numeric value`);
          process.exit(1);
        }
        config.defaultSimThreshold = threshold;
        break;
      }

      case '--max-lines':
      case '-m': {
        const nextArg = args[++i];
        if (nextArg === undefined || nextArg.startsWith('-')) {
          console.error(`Option ${arg} requires a value`);
          process.exit(1);
        }
        const maxLines = parseInt(nextArg, 10);
        if (Number.isNaN(maxLines)) {
          console.error(`Option ${arg} requires a numeric value`);
          process.exit(1);
        }
        config.maxLinesPerRequest = maxLines;
        break;
      }

      case '--test':
        config.test = true;
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;

      case '--version':
      case '-v':
        printVersion();
        process.exit(0);
        break;

      default:
        if (arg?.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          console.error('Use --help for usage information');
          process.exit(1);
        }
    }
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
  const config = parseArgs();

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
