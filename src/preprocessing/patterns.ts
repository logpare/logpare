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
const STATUS_CODE_PATTERNS = [
  // `=` is accepted alongside `:` and whitespace — "status=404" and "code=200" are
  // both documented formats and both common in structured logs.
  /\bstatus[=:\s]+(\d{3})\b/gi,          // "status 404", "status: 500", "status=404"
  /\bHTTP[\/\s]\d\.\d\s+(\d{3})\b/gi,    // "HTTP/1.1 404", "HTTP 1.1 500"
  /\bcode[=:\s]+(\d{3})\b/gi,            // "code: 403", "code 500", "code=200"
  /\b(\d{3})\s+(?:OK|Not Found|Bad Request|Unauthorized|Forbidden|Internal Server Error|Service Unavailable)\b/gi,
];

export function extractStatusCodes(line: string): number[] {
  const codes: number[] = [];

  for (const regex of STATUS_CODE_PATTERNS) {
    // Reused across calls, so rewind before iterating.
    regex.lastIndex = 0;
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
const CORRELATION_ID_PATTERNS = [
  // Named correlation IDs: trace-id=xxx, request_id: xxx, x-request-id=xxx
  /\b(?:trace[-_]?id|request[-_]?id|correlation[-_]?id|x-request-id)[=:\s]+["']?([a-zA-Z0-9-_]+)["']?/gi,
  // Standalone UUIDs (common correlation ID format)
  /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi,
];

export function extractCorrelationIds(line: string): string[] {
  const ids: string[] = [];

  for (const regex of CORRELATION_ID_PATTERNS) {
    // Reused across calls, so rewind before iterating.
    regex.lastIndex = 0;
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
  // Timestamps (must run before port to avoid fragmentation)
  isoTimestamp: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g,

  // Bare clock times (syslog style, e.g. "Jun 14 15:16:01"). Like isoTimestamp this
  // must run before `port`, which would otherwise chop HH:MM:SS into three wildcards.
  clockTime: /\b\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?\b/g,

  // UUID must run before unixTimestamp to prevent partial matching of UUID segments
  uuid: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,

  unixTimestamp: /\b\d{10,13}\b/g,

  // URLs must run before filePath and the network patterns, all of which would
  // otherwise consume pieces of the URL and leave a mangled fragment behind.
  url: /https?:\/\/[^\s]+/g,

  // Network addresses
  ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // IPv6: matches full, compressed (::1, ::), and partial forms
  // Order matters: longer matches must come before shorter ones in alternation
  ipv6: /(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|(?:[0-9a-fA-F]{1,4}:){1,7}:|::)/g,
  port: /:\d{2,5}\b/g,

  // Identifiers
  hexId: /\b0x[0-9a-fA-F]+\b/g,
  blockId: /\bblk_-?\d+\b/g,

  // Paths
  // Note: Don't match version-like paths (e.g., /2.7, /v1.0)
  // Require at least 2 path segments or a segment with letters
  filePath: /(?:\/[a-zA-Z][\w.-]*)+/g,

  // Long numeric IDs (6+ digits). Note this is subsumed by `numbers` below, which
  // masks every bare integer including short ones — short numbers such as HTTP 404
  // and line:123 are NOT preserved by the default pattern set. Drop `numbers` via a
  // custom strategy if you need them kept.
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
    // String.replace with a /g regex always scans from index 0 and resets
    // lastIndex afterwards, so the pattern can be reused as-is. Reset defensively
    // in case a caller supplies a sticky pattern.
    pattern.lastIndex = 0;
    result = result.replace(pattern, wildcard);
  }

  return collapseWildcards(result, wildcard);
}

/**
 * Collapse runs of adjacent wildcards into a single wildcard.
 *
 * Several patterns legitimately match neighbouring spans of the same variable
 * region — `10.251.31.5:50010` is masked by `ipv4` and then `port`, yielding
 * `<*><*>`. A contiguous run always denotes one variable, so emit one wildcard.
 */
function collapseWildcards(line: string, wildcard: string): string {
  if (wildcard.length === 0) {
    return line;
  }

  const doubled = wildcard + wildcard;
  let result = line;
  while (result.includes(doubled)) {
    result = result.split(doubled).join(wildcard);
  }

  return result;
}
