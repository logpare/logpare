/**
 * Built-in regex patterns for common variable types.
 * These are applied in order during preprocessing to mask variables.
 */
export const DEFAULT_PATTERNS: Record<string, RegExp> = {
  // Network addresses
  ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  ipv6: /\b[0-9a-fA-F:]{7,39}\b/g,
  port: /:\d{2,5}\b/g,

  // Identifiers
  uuid: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  hexId: /\b0x[0-9a-fA-F]+\b/g,
  blockId: /\bblk_-?\d+\b/g,

  // Timestamps
  isoTimestamp: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g,
  unixTimestamp: /\b\d{10,13}\b/g,

  // Paths and URLs
  filePath: /(?:\/[\w.-]+)+/g,
  url: /https?:\/\/[^\s]+/g,

  // Numbers (applied last - most aggressive)
  // Matches standalone numbers and numbers with units (e.g., 250ms, 1024KB)
  numbers: /\b\d+(?:\.\d+)?[a-zA-Z]*\b/g,
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
