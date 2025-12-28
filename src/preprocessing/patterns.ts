import type { Severity } from '../types.js';

/**
 * Patterns for detecting log severity levels.
 */
export const SEVERITY_PATTERNS = {
  error: /\b(Error|ERROR|error|Uncaught|UNCAUGHT|Failed|FAILED|Exception|EXCEPTION|FATAL|fatal|TypeError|ReferenceError|SyntaxError|RangeError)\b/,
  warning: /\b(Warning|WARNING|warn|WARN|\[Violation\]|Violation|DEPRECATED|deprecated|Deprecation)\b/,
} as const;

/**
 * Patterns for detecting stack trace frames.
 */
export const STACK_FRAME_PATTERNS = [
  /^\s*at\s+/,                    // "    at Function.x" (V8/Node)
  /^\s*@\s*\S+:\d+/,              // "@ file.js:123" (Firefox)
  /^\s*\w+@\S+:\d+/,              // "fn@file.js:123" (Firefox named)
  /^\s*\(anonymous\)\s*@/,        // "(anonymous) @ file.js:123" (Chrome DevTools)
  /^\s*[A-Za-z_$][\w$]*\s+@\s+\S+:\d+/, // "functionName @ file.js:123"
] as const;

/**
 * Detect the severity level of a log line.
 * Returns 'error', 'warning', or 'info'.
 */
export function detectSeverity(line: string): Severity {
  if (SEVERITY_PATTERNS.error.test(line)) {
    return 'error';
  }
  if (SEVERITY_PATTERNS.warning.test(line)) {
    return 'warning';
  }
  return 'info';
}

/**
 * Detect if a line is a stack trace frame.
 */
export function isStackFrame(line: string): boolean {
  return STACK_FRAME_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Extract URLs from a line (before masking).
 * Returns hostnames only for brevity in urlSamples.
 */
export function extractUrls(line: string): string[] {
  const urlPattern = /https?:\/\/[^\s"'<>]+/g;
  const matches = line.match(urlPattern);
  if (!matches) return [];

  // Extract just the host from each URL for brevity
  return matches.map(url => {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }).filter((v, i, a) => a.indexOf(v) === i); // dedupe
}

/**
 * Extract full URLs from a line (before masking).
 * Returns complete URLs with paths for better diagnostics.
 */
export function extractFullUrls(line: string): string[] {
  const urlPattern = /https?:\/\/[^\s"'<>]+/g;
  const matches = line.match(urlPattern);
  if (!matches) return [];

  // Return full URLs, deduplicated
  return [...new Set(matches)];
}

/**
 * Extract HTTP status codes from a line.
 * Matches common patterns like "status 404", "HTTP 500", "status: 403".
 */
export function extractStatusCodes(line: string): number[] {
  // Match status codes in context to avoid false positives
  const patterns = [
    /\bstatus[:\s]+(\d{3})\b/gi,           // "status 404", "status: 500"
    /\bHTTP[\/\s]\d\.\d\s+(\d{3})\b/gi,    // "HTTP/1.1 404", "HTTP 1.1 500"
    /\bcode[:\s]+(\d{3})\b/gi,             // "code: 403", "code 500"
    /\b(\d{3})\s+(?:OK|Not Found|Bad Request|Unauthorized|Forbidden|Internal Server Error|Service Unavailable)\b/gi,
  ];

  const codes: number[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(line)) !== null) {
      const codeStr = match[1];
      if (codeStr) {
        const code = parseInt(codeStr, 10);
        // Only include valid HTTP status codes (100-599)
        if (code >= 100 && code <= 599 && !codes.includes(code)) {
          codes.push(code);
        }
      }
    }
  }

  return codes;
}

/**
 * Extract correlation/trace IDs from a line.
 * Matches common patterns like trace-id, request-id, correlation-id, and UUIDs.
 */
export function extractCorrelationIds(line: string): string[] {
  const patterns = [
    // Named correlation IDs: trace-id=xxx, request_id: xxx, x-request-id=xxx
    /\b(?:trace[-_]?id|request[-_]?id|correlation[-_]?id|x-request-id)[=:\s]+["']?([a-zA-Z0-9-_]+)["']?/gi,
    // Standalone UUIDs (common correlation ID format)
    /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi,
  ];

  const ids: string[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(line)) !== null) {
      const id = match[1] || match[0];
      if (id && !ids.includes(id)) {
        ids.push(id);
      }
    }
  }

  // Limit to 3 IDs per line
  return ids.slice(0, 3);
}

/**
 * Extract duration/timing values from a line.
 * Matches common duration patterns like "80ms", "1.5s", "250µs", "2sec", etc.
 * Called before preprocessing masks these values.
 */
export function extractDurations(line: string): string[] {
  // Pattern matches:
  // - Integer or decimal numbers
  // - Followed by duration units (case-insensitive)
  // - Common units: ms, s, sec, second(s), millisecond(s), µs, us, μs, ns, min, hour(s), hr
  const durationPattern = /\b(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec(?:onds?)?|µs|μs|us|microseconds?|ns|nanoseconds?|min(?:utes?)?|h(?:ours?)?|hr)\b/gi;

  const durations: string[] = [];
  let match;

  while ((match = durationPattern.exec(line)) !== null) {
    // Reconstruct the full duration string (number + unit, no whitespace)
    const duration = `${match[1]}${match[2]}`;
    if (!durations.includes(duration)) {
      durations.push(duration);
    }
  }

  // Limit to 5 durations per line to prevent memory issues
  return durations.slice(0, 5);
}

/**
 * Built-in regex patterns for common variable types.
 * These are applied in order during preprocessing to mask variables.
 * Order matters: more specific patterns (like timestamps) must run before
 * patterns that could match substrings (like port numbers).
 */
export const DEFAULT_PATTERNS: Record<string, RegExp> = {
  // Timestamps (most specific - must run before port to avoid fragmentation)
  isoTimestamp: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g,
  unixTimestamp: /\b\d{10,13}\b/g,

  // Network addresses
  ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  ipv6: /\b[0-9a-fA-F:]{7,39}\b/g,
  port: /:\d{2,5}\b/g,

  // Identifiers
  uuid: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  hexId: /\b0x[0-9a-fA-F]+\b/g,
  blockId: /\bblk_-?\d+\b/g,

  // Paths and URLs
  // Note: Don't match version-like paths (e.g., /2.7, /v1.0)
  // Require at least 2 path segments or a segment with letters
  filePath: /(?:\/[a-zA-Z][\w.-]*)+/g,
  url: /https?:\/\/[^\s]+/g,

  // Long numeric IDs only (6+ digits) - preserves status codes, line numbers
  // Examples masked: request IDs (12345678), order numbers (1234567890)
  // Examples preserved: HTTP 404, line:123, /v2.7
  numericId: /\b\d{6,}\b/g,

  // Numbers with optional duration/size suffixes
  // Matches: 1500, 250ms, 1.5s, 100KB, etc.
  numbers: /\b\d+(?:\.\d+)?(?:ms|s|µs|us|ns|min|h|hr|sec|[KkMmGgTt][Bb]?)?\b/g,
};

/**
 * Placeholder used when masking variables.
 */
export const WILDCARD = '<*>';

/**
 * Apply a set of patterns to mask variables in a line.
 * Patterns are applied in the order provided.
 */
export function applyPatterns(
  line: string,
  patterns: Record<string, RegExp>,
  wildcard: string = WILDCARD
): string {
  let result = line;

  for (const pattern of Object.values(patterns)) {
    // Create a new RegExp instance to reset lastIndex for global patterns
    const regex = new RegExp(pattern.source, pattern.flags);
    result = result.replace(regex, wildcard);
  }

  return result;
}
