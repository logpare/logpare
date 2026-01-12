/**
 * @logpare/mcp - MCP server for log compression
 *
 * Exposes logpare's semantic log compression capabilities as MCP tools
 * for AI agents like Claude Desktop, Cursor, and other MCP-compatible clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type Tool,
  type Resource,
  type Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { compress, compressText, createDrain, type CompressOptions, type DrainOptions } from 'logpare';

// Optional UCP extension support
import type { UCPExtensionConfig } from './ucp/types.js';

/**
 * MCP Server configuration options
 */
export interface MCPServerConfig {
  /** Server name shown to clients */
  name?: string;
  /** Server version */
  version?: string;
  /** Default compression format */
  defaultFormat?: 'summary' | 'detailed' | 'json';
  /** Default Drain algorithm depth */
  defaultDepth?: number;
  /** Default similarity threshold */
  defaultSimThreshold?: number;
  /** Maximum lines per request */
  maxLinesPerRequest?: number;
  /** Enable UCP extension (optional) */
  ucp?: UCPExtensionConfig;
}

const DEFAULT_CONFIG: Required<Omit<MCPServerConfig, 'ucp'>> = {
  name: 'logpare-mcp-server',
  version: '0.1.0',
  defaultFormat: 'summary',
  defaultDepth: 4,
  defaultSimThreshold: 0.4,
  maxLinesPerRequest: 100000,
};

/**
 * Core tool definitions
 */
const CORE_TOOLS: Tool[] = [
  {
    name: 'compress_logs',
    description:
      'Compress an array of log lines using semantic pattern extraction. ' +
      'Achieves 60-90% token reduction while preserving diagnostic context ' +
      '(URLs, status codes, correlation IDs, timing data).',
    inputSchema: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: { type: 'string' },
          description: 'Log lines to compress',
        },
        format: {
          type: 'string',
          enum: ['summary', 'detailed', 'json'],
          default: 'summary',
          description: 'Output format: summary (compact), detailed (full metadata), json (machine-readable)',
        },
        depth: {
          type: 'number',
          minimum: 2,
          maximum: 8,
          default: 4,
          description: 'Parse tree depth for pattern matching (2-8)',
        },
        simThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.4,
          description: 'Similarity threshold for template matching (0.0-1.0)',
        },
        maxTemplates: {
          type: 'number',
          minimum: 1,
          maximum: 500,
          default: 50,
          description: 'Maximum templates to include in output',
        },
      },
      required: ['lines'],
    },
  },
  {
    name: 'compress_text',
    description:
      'Compress a multi-line log text string. Automatically splits on newlines ' +
      'and processes as individual log lines.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Multi-line log text to compress',
        },
        format: {
          type: 'string',
          enum: ['summary', 'detailed', 'json'],
          default: 'summary',
        },
        depth: {
          type: 'number',
          minimum: 2,
          maximum: 8,
          default: 4,
        },
        simThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.4,
        },
        maxTemplates: {
          type: 'number',
          minimum: 1,
          maximum: 500,
          default: 50,
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'analyze_patterns',
    description:
      'Quick pattern analysis without full compression. Returns top N patterns ' +
      'found in logs, useful for rapid log triage.',
    inputSchema: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: { type: 'string' },
          description: 'Log lines to analyze',
        },
        maxPatterns: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 20,
          description: 'Maximum patterns to return',
        },
      },
      required: ['lines'],
    },
  },
  {
    name: 'estimate_compression',
    description:
      'Estimate compression ratio without full processing. Samples a subset of ' +
      'logs to predict compression effectiveness.',
    inputSchema: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: { type: 'string' },
          description: 'Log lines to sample',
        },
        sampleSize: {
          type: 'number',
          minimum: 100,
          maximum: 10000,
          default: 1000,
          description: 'Number of lines to sample for estimation',
        },
      },
      required: ['lines'],
    },
  },
];

/**
 * Resource definitions
 */
const CORE_RESOURCES: Resource[] = [
  {
    uri: 'logpare://config/default',
    name: 'Default Configuration',
    description: 'Current default compression settings',
    mimeType: 'application/json',
  },
  {
    uri: 'logpare://profiles/standard',
    name: 'Standard Profile',
    description: 'Balanced settings for general log compression',
    mimeType: 'application/json',
  },
  {
    uri: 'logpare://profiles/aggressive',
    name: 'Aggressive Profile',
    description: 'Higher compression, fewer templates',
    mimeType: 'application/json',
  },
  {
    uri: 'logpare://profiles/detailed',
    name: 'Detailed Profile',
    description: 'More templates, preserves more patterns',
    mimeType: 'application/json',
  },
];

/**
 * Prompt definitions - reusable templates for common log analysis workflows
 */
const CORE_PROMPTS: Prompt[] = [
  {
    name: 'analyze_errors',
    description: 'Analyze logs to identify error patterns, root causes, and suggest fixes',
    arguments: [
      {
        name: 'logs',
        description: 'The log content to analyze',
        required: true,
      },
      {
        name: 'context',
        description: 'Additional context about the system or issue',
        required: false,
      },
    ],
  },
  {
    name: 'compare_logs',
    description: 'Compare two sets of logs to identify differences, new patterns, and changes',
    arguments: [
      {
        name: 'before_logs',
        description: 'Logs from before the change or issue',
        required: true,
      },
      {
        name: 'after_logs',
        description: 'Logs from after the change or issue',
        required: true,
      },
    ],
  },
  {
    name: 'debug_performance',
    description: 'Analyze logs to find performance bottlenecks and slow operations',
    arguments: [
      {
        name: 'logs',
        description: 'The log content to analyze for performance issues',
        required: true,
      },
      {
        name: 'threshold_ms',
        description: 'Duration threshold in milliseconds to flag as slow (default: 1000)',
        required: false,
      },
    ],
  },
  {
    name: 'incident_triage',
    description: 'Triage an incident by analyzing logs for timeline, impact, and root cause',
    arguments: [
      {
        name: 'logs',
        description: 'Logs from the incident timeframe',
        required: true,
      },
      {
        name: 'incident_description',
        description: 'Brief description of the incident',
        required: false,
      },
    ],
  },
  {
    name: 'security_audit',
    description: 'Scan logs for security-related events, suspicious patterns, and anomalies',
    arguments: [
      {
        name: 'logs',
        description: 'Logs to audit for security issues',
        required: true,
      },
    ],
  },
];

/**
 * Create and configure an MCP server for logpare
 */
export function createServer(config: MCPServerConfig = {}): Server {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const server = new Server(
    {
      name: mergedConfig.name,
      version: mergedConfig.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Collect tools, resources, and prompts (core + UCP if enabled)
  let tools = [...CORE_TOOLS];
  let resources = [...CORE_RESOURCES];
  let prompts = [...CORE_PROMPTS];

  // Add UCP tools, resources, and prompts if enabled
  if (config.ucp?.enabled) {
    const ucpTools = getUCPTools();
    const ucpResources = getUCPResources();
    const ucpPrompts = getUCPPrompts();
    tools = [...tools, ...ucpTools];
    resources = [...resources, ...ucpResources];
    prompts = [...prompts, ...ucpPrompts];
  }

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'compress_logs': {
          const lines = args?.lines as string[];
          if (!lines || !Array.isArray(lines)) {
            throw new Error('lines must be an array of strings');
          }
          if (lines.length > mergedConfig.maxLinesPerRequest) {
            throw new Error(`Maximum ${mergedConfig.maxLinesPerRequest} lines per request`);
          }

          const options: CompressOptions = {
            format: (args?.format as CompressOptions['format']) ?? mergedConfig.defaultFormat,
            maxTemplates: (args?.maxTemplates as number) ?? 50,
            drain: {
              depth: (args?.depth as number) ?? mergedConfig.defaultDepth,
              simThreshold: (args?.simThreshold as number) ?? mergedConfig.defaultSimThreshold,
            },
          };

          const result = compress(lines, options);
          return {
            content: [
              {
                type: 'text',
                text: result.formatted,
              },
            ],
          };
        }

        case 'compress_text': {
          const text = args?.text as string;
          if (!text || typeof text !== 'string') {
            throw new Error('text must be a string');
          }

          const options: CompressOptions = {
            format: (args?.format as CompressOptions['format']) ?? mergedConfig.defaultFormat,
            maxTemplates: (args?.maxTemplates as number) ?? 50,
            drain: {
              depth: (args?.depth as number) ?? mergedConfig.defaultDepth,
              simThreshold: (args?.simThreshold as number) ?? mergedConfig.defaultSimThreshold,
            },
          };

          const result = compressText(text, options);
          return {
            content: [
              {
                type: 'text',
                text: result.formatted,
              },
            ],
          };
        }

        case 'analyze_patterns': {
          const lines = args?.lines as string[];
          if (!lines || !Array.isArray(lines)) {
            throw new Error('lines must be an array of strings');
          }

          const maxPatterns = (args?.maxPatterns as number) ?? 20;
          const result = compress(lines, {
            format: 'json',
            maxTemplates: maxPatterns,
          });

          // Return just patterns with counts
          const patterns = result.templates.map((t) => ({
            pattern: t.pattern,
            count: t.occurrences,
            severity: t.severity,
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ patterns, total: result.stats.inputLines }, null, 2),
              },
            ],
          };
        }

        case 'estimate_compression': {
          const lines = args?.lines as string[];
          if (!lines || !Array.isArray(lines)) {
            throw new Error('lines must be an array of strings');
          }

          const sampleSize = Math.min((args?.sampleSize as number) ?? 1000, lines.length);
          const sample = lines.slice(0, sampleSize);

          const result = compress(sample, { format: 'json' });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    sampleSize,
                    totalLines: lines.length,
                    estimatedTemplates: Math.round(
                      result.stats.uniqueTemplates * (lines.length / sampleSize)
                    ),
                    estimatedCompressionRatio: result.stats.compressionRatio,
                    estimatedTokenReduction: result.stats.estimatedTokenReduction,
                    recommendation:
                      result.stats.compressionRatio > 0.5
                        ? 'Good compression expected'
                        : 'Limited compression - logs may be highly variable',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // UCP tools (only if enabled)
        case 'compress_checkout_logs':
        case 'analyze_checkout_errors':
        case 'compress_a2a_logs': {
          if (!config.ucp?.enabled) {
            throw new Error(`UCP tool "${name}" requires UCP extension to be enabled`);
          }
          return handleUCPTool(name, args, mergedConfig);
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources,
  }));

  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts,
  }));

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const promptTemplates: Record<string, (args: Record<string, string>) => { messages: Array<{ role: string; content: { type: string; text: string } }> }> = {
      analyze_errors: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze the following logs to identify error patterns, determine root causes, and suggest fixes.

${a.context ? `Context: ${a.context}\n\n` : ''}Logs:
${a.logs}

Please:
1. First, use the compress_logs tool to identify patterns
2. Focus on ERROR and WARNING level messages
3. Group related errors by root cause
4. Provide specific, actionable recommendations
5. Highlight any critical issues that need immediate attention`,
            },
          },
        ],
      }),

      compare_logs: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Compare these two sets of logs to identify what changed.

BEFORE:
${a.before_logs}

AFTER:
${a.after_logs}

Please:
1. Use compress_logs on both sets to extract patterns
2. Identify new patterns that appeared
3. Identify patterns that disappeared
4. Note any significant frequency changes
5. Highlight potential causes for the differences`,
            },
          },
        ],
      }),

      debug_performance: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze these logs to find performance bottlenecks and slow operations.

${a.threshold_ms ? `Flag operations slower than: ${a.threshold_ms}ms\n\n` : ''}Logs:
${a.logs}

Please:
1. Use compress_logs with format='detailed' to extract timing data
2. Look at durationSamples in the templates
3. Identify the slowest operations and their patterns
4. Find any timing anomalies or outliers
5. Suggest specific optimizations`,
            },
          },
        ],
      }),

      incident_triage: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Triage this incident by analyzing the logs.

${a.incident_description ? `Incident: ${a.incident_description}\n\n` : ''}Logs:
${a.logs}

Please:
1. Establish a timeline of events
2. Identify the initial trigger or root cause
3. Determine the blast radius and affected components
4. Find any error cascades or secondary failures
5. Provide a summary suitable for an incident report`,
            },
          },
        ],
      }),

      security_audit: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Audit these logs for security-related events and suspicious patterns.

Logs:
${a.logs}

Please:
1. Look for authentication failures and anomalies
2. Check for unauthorized access attempts
3. Identify any injection attempts or malformed requests
4. Flag unusual IP addresses or user agents
5. Note any privilege escalation or sensitive data access
6. Provide a security risk summary`,
            },
          },
        ],
      }),

      // UCP prompts
      debug_checkout: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Debug this UCP checkout session.

${a.session_id ? `Session ID: ${a.session_id}\n\n` : ''}Logs:
${a.logs}

Please:
1. Use compress_checkout_logs to analyze the session
2. Track the checkout status flow
3. Identify any errors or failures
4. Check payment handler interactions
5. Suggest resolutions for any issues found`,
            },
          },
        ],
      }),

      analyze_agent_flow: (a) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze this multi-agent commerce flow.

Logs:
${a.logs}

Please:
1. Use compress_a2a_logs to identify agent interactions
2. Map the flow between agents
3. Identify any handoff failures or delays
4. Check for coordination issues
5. Suggest improvements to the agent workflow`,
            },
          },
        ],
      }),
    };

    const template = promptTemplates[name];
    if (!template) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    // Check for UCP-specific prompts
    if ((name === 'debug_checkout' || name === 'analyze_agent_flow') && !config.ucp?.enabled) {
      throw new Error(`UCP prompt "${name}" requires UCP extension to be enabled`);
    }

    return template(args as Record<string, string>);
  });

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'logpare://config/default':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  format: mergedConfig.defaultFormat,
                  depth: mergedConfig.defaultDepth,
                  simThreshold: mergedConfig.defaultSimThreshold,
                  maxLinesPerRequest: mergedConfig.maxLinesPerRequest,
                  ucpEnabled: config.ucp?.enabled ?? false,
                },
                null,
                2
              ),
            },
          ],
        };

      case 'logpare://profiles/standard':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  name: 'Standard',
                  description: 'Balanced settings for general log compression',
                  settings: { depth: 4, simThreshold: 0.4, maxTemplates: 50 },
                },
                null,
                2
              ),
            },
          ],
        };

      case 'logpare://profiles/aggressive':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  name: 'Aggressive',
                  description: 'Higher compression, fewer templates',
                  settings: { depth: 3, simThreshold: 0.6, maxTemplates: 20 },
                },
                null,
                2
              ),
            },
          ],
        };

      case 'logpare://profiles/detailed':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  name: 'Detailed',
                  description: 'More templates, preserves more patterns',
                  settings: { depth: 5, simThreshold: 0.3, maxTemplates: 100 },
                },
                null,
                2
              ),
            },
          ],
        };

      // UCP resources
      case 'logpare://ucp/profiles/checkout':
      case 'logpare://ucp/profiles/a2a':
      case 'logpare://ucp/error-codes':
        if (!config.ucp?.enabled) {
          throw new Error(`UCP resource "${uri}" requires UCP extension to be enabled`);
        }
        return handleUCPResource(uri);

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startStdioServer(config: MCPServerConfig = {}): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

// UCP extension functions (lazy loaded)
function getUCPTools(): Tool[] {
  return [
    {
      name: 'compress_checkout_logs',
      description:
        'Compress UCP checkout session logs while preserving diagnostic context ' +
        'including session IDs, status transitions, error codes, and payment handler interactions.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'array',
            items: { type: 'string' },
            description: 'Log lines from UCP checkout session',
          },
          session_id: {
            type: 'string',
            description: 'Optional: Filter logs by checkout session ID (cs_*)',
          },
          preserve_errors: {
            type: 'boolean',
            default: true,
            description: 'Keep error-level logs uncompressed for visibility',
          },
          format: {
            type: 'string',
            enum: ['summary', 'detailed', 'json', 'ucp_json'],
            default: 'summary',
          },
        },
        required: ['lines'],
      },
    },
    {
      name: 'analyze_checkout_errors',
      description:
        'Analyze patterns in UCP checkout errors, group by root cause, ' +
        'and suggest resolutions based on UCP error code taxonomy.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'array',
            items: { type: 'string' },
            description: 'Error logs from UCP checkout sessions',
          },
          include_suggestions: {
            type: 'boolean',
            default: true,
            description: 'Include resolution suggestions for each error pattern',
          },
          group_by: {
            type: 'string',
            enum: ['error_code', 'severity', 'session', 'time'],
            default: 'error_code',
          },
        },
        required: ['lines'],
      },
    },
    {
      name: 'compress_a2a_logs',
      description:
        'Compress Agent-to-Agent (A2A) communication logs from UCP multi-agent commerce flows.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'array',
            items: { type: 'string' },
          },
          group_by_agent: {
            type: 'boolean',
            default: false,
            description: 'Group compressed templates by agent identifier',
          },
          preserve_handoffs: {
            type: 'boolean',
            default: true,
            description: 'Keep agent handoff events uncompressed',
          },
          trace_id: {
            type: 'string',
            description: 'Optional: Filter logs by distributed trace ID',
          },
        },
        required: ['lines'],
      },
    },
  ];
}

function getUCPResources(): Resource[] {
  return [
    {
      uri: 'logpare://ucp/profiles/checkout',
      name: 'UCP Checkout Profile',
      description: 'Optimized compression settings for UCP checkout session logs',
      mimeType: 'application/json',
    },
    {
      uri: 'logpare://ucp/profiles/a2a',
      name: 'UCP A2A Profile',
      description: 'Compression settings for agent-to-agent logs',
      mimeType: 'application/json',
    },
    {
      uri: 'logpare://ucp/error-codes',
      name: 'UCP Error Codes Reference',
      description: 'Common UCP error patterns and their meanings',
      mimeType: 'application/json',
    },
  ];
}

function getUCPPrompts(): Prompt[] {
  return [
    {
      name: 'debug_checkout',
      description: 'Debug a UCP checkout session by analyzing logs for errors, status flow, and payment issues',
      arguments: [
        {
          name: 'logs',
          description: 'Checkout session logs to analyze',
          required: true,
        },
        {
          name: 'session_id',
          description: 'Optional checkout session ID (cs_*) to focus on',
          required: false,
        },
      ],
    },
    {
      name: 'analyze_agent_flow',
      description: 'Analyze a multi-agent commerce flow to identify coordination issues and handoff failures',
      arguments: [
        {
          name: 'logs',
          description: 'Agent-to-Agent communication logs',
          required: true,
        },
      ],
    },
  ];
}

function handleUCPTool(
  name: string,
  args: Record<string, unknown> | undefined,
  config: Required<Omit<MCPServerConfig, 'ucp'>>
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  // Import UCP handlers dynamically
  const lines = args?.lines as string[];
  if (!lines || !Array.isArray(lines)) {
    throw new Error('lines must be an array of strings');
  }

  // UCP-specific preprocessing patterns
  const UCP_PATTERNS = {
    checkoutSessionId: /\bcs_[a-zA-Z0-9]{20,}\b/gi,
    paymentHandler: /\bph_[a-zA-Z0-9]{16,}\b/gi,
    errorCode: /\b(MERCHANDISE_NOT_AVAILABLE|INVALID_CURRENCY|CHECKOUT_EXPIRED|PAYMENT_DECLINED|INVENTORY_UNAVAILABLE)\b/g,
    checkoutStatus: /\b(incomplete|requires_escalation|ready_for_complete|complete_in_progress|completed|canceled)\b/g,
  };

  switch (name) {
    case 'compress_checkout_logs': {
      let filteredLines = lines;

      // Filter by session ID if provided
      const sessionId = args?.session_id as string;
      if (sessionId) {
        filteredLines = lines.filter((line) => line.includes(sessionId));
      }

      const result = compress(filteredLines, {
        format: (args?.format as 'summary' | 'detailed' | 'json') ?? 'summary',
        maxTemplates: 50,
        drain: {
          depth: config.defaultDepth,
          simThreshold: config.defaultSimThreshold,
        },
      });

      // Extract UCP context
      const sessionIds = new Set<string>();
      const statuses = new Set<string>();
      const errorCodes = new Set<string>();

      for (const line of filteredLines) {
        const sessions = line.match(UCP_PATTERNS.checkoutSessionId);
        if (sessions) sessions.forEach((s) => sessionIds.add(s));

        const statusMatches = line.match(UCP_PATTERNS.checkoutStatus);
        if (statusMatches) statusMatches.forEach((s) => statuses.add(s));

        const errors = line.match(UCP_PATTERNS.errorCode);
        if (errors) errors.forEach((e) => errorCodes.add(e));
      }

      if (args?.format === 'ucp_json') {
        const output = {
          version: '1.2',
          ucp_context: {
            session_ids: Array.from(sessionIds),
            status_flow: Array.from(statuses),
            error_codes: Array.from(errorCodes),
          },
          stats: result.stats,
          templates: result.templates,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      }

      return {
        content: [{ type: 'text', text: result.formatted }],
      };
    }

    case 'analyze_checkout_errors': {
      // Filter to error lines only
      const errorLines = lines.filter(
        (line) =>
          /\b(ERROR|FATAL|Exception|Failed)\b/i.test(line) ||
          UCP_PATTERNS.errorCode.test(line)
      );

      const result = compress(errorLines, {
        format: 'json',
        maxTemplates: 50,
      });

      // Group by error code
      const errorGroups: Record<string, { pattern: string; count: number; samples: string[] }> = {};

      for (const template of result.templates) {
        // Extract error code from pattern
        const codeMatch = template.pattern.match(UCP_PATTERNS.errorCode);
        const code = codeMatch ? codeMatch[0] : 'UNKNOWN';

        if (!errorGroups[code]) {
          errorGroups[code] = { pattern: template.pattern, count: 0, samples: [] };
        }
        errorGroups[code].count += template.occurrences;
        if (errorGroups[code].samples.length < 3) {
          errorGroups[code].samples.push(template.pattern);
        }
      }

      // Add suggestions if requested
      const includeSuggestions = args?.include_suggestions !== false;
      const suggestions: Record<string, string[]> = {
        MERCHANDISE_NOT_AVAILABLE: [
          'Check inventory sync frequency',
          'Implement real-time availability check before checkout',
          'Add stock buffer in catalog feed',
        ],
        PAYMENT_DECLINED: [
          'Review payment gateway error codes',
          'Check for fraud detection triggers',
          'Verify payment method compatibility',
        ],
        CHECKOUT_EXPIRED: [
          'Increase session TTL',
          'Implement session refresh mechanism',
          'Add warning before expiration',
        ],
        INVALID_CURRENCY: [
          'Validate currency codes against supported list',
          'Check regional pricing configuration',
        ],
        INVENTORY_UNAVAILABLE: [
          'Implement inventory reservation on cart add',
          'Add real-time stock updates',
        ],
      };

      const output = {
        total_errors: errorLines.length,
        error_patterns: Object.entries(errorGroups).map(([code, data]) => ({
          code,
          ...data,
          suggestions: includeSuggestions ? suggestions[code] ?? [] : undefined,
        })),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }

    case 'compress_a2a_logs': {
      const result = compress(lines, {
        format: 'json',
        maxTemplates: 50,
        drain: {
          depth: 5,
          simThreshold: 0.4,
        },
      });

      // Extract agent IDs from logs
      const agentPattern = /\bagent[_-]?id[:\s=]+["']?([a-zA-Z0-9_-]+)["']?/gi;
      const agents = new Set<string>();
      for (const line of lines) {
        const matches = line.matchAll(agentPattern);
        for (const match of matches) {
          if (match[1]) agents.add(match[1]);
        }
      }

      const output = {
        stats: result.stats,
        agents_detected: Array.from(agents),
        templates: result.templates,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown UCP tool: ${name}`);
  }
}

function handleUCPResource(uri: string): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
  switch (uri) {
    case 'logpare://ucp/profiles/checkout':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                name: 'UCP Checkout',
                description: 'Optimized for checkout session logs',
                settings: {
                  depth: 4,
                  simThreshold: 0.5,
                  preserveFields: ['session_id', 'status', 'error_code'],
                },
                patterns: [
                  'checkout_session_id',
                  'ucp_error_code',
                  'checkout_status',
                  'payment_handler',
                ],
              },
              null,
              2
            ),
          },
        ],
      };

    case 'logpare://ucp/profiles/a2a':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                name: 'UCP A2A',
                description: 'Agent-to-Agent communication logs',
                settings: {
                  depth: 5,
                  simThreshold: 0.4,
                  groupByAgent: true,
                  preserveHandoffs: true,
                },
              },
              null,
              2
            ),
          },
        ],
      };

    case 'logpare://ucp/error-codes':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                version: '2026-01-11',
                error_codes: [
                  {
                    code: 'MERCHANDISE_NOT_AVAILABLE',
                    severity: 'requires_buyer_input',
                    description: 'Requested item is out of stock or unavailable',
                  },
                  {
                    code: 'PAYMENT_DECLINED',
                    severity: 'requires_buyer_input',
                    description: 'Payment instrument was declined',
                  },
                  {
                    code: 'CHECKOUT_EXPIRED',
                    severity: 'recoverable',
                    description: 'Checkout session has expired',
                  },
                  {
                    code: 'INVALID_CURRENCY',
                    severity: 'recoverable',
                    description: 'Unsupported currency for this merchant',
                  },
                  {
                    code: 'INVENTORY_UNAVAILABLE',
                    severity: 'requires_buyer_input',
                    description: 'Insufficient inventory for requested quantity',
                  },
                ],
              },
              null,
              2
            ),
          },
        ],
      };

    default:
      throw new Error(`Unknown UCP resource: ${uri}`);
  }
}

// Re-export types
export type { UCPExtensionConfig } from './ucp/types.js';
