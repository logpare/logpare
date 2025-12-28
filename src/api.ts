import type { CompressOptions, CompressionResult } from './types.js';
import { createDrain } from './drain/drain.js';

/**
 * Compress log lines by extracting templates.
 *
 * This is the main entry point for simple use cases.
 * For more control, use `createDrain()` directly.
 *
 * @param lines - Array of log lines to compress
 * @param options - Compression options
 * @returns Compression result with templates and statistics
 *
 * @example
 * ```typescript
 * import { compress } from 'logpare';
 *
 * const logs = [
 *   'Connection from 192.168.1.1 established',
 *   'Connection from 192.168.1.2 established',
 *   'Connection from 10.0.0.1 established',
 * ];
 *
 * const result = compress(logs);
 * console.log(result.formatted);
 * // Output: [3x] Connection from <*> established
 * ```
 */
export function compress(
  lines: string[],
  options: CompressOptions = {}
): CompressionResult {
  const { format = 'summary', maxTemplates = 50, drain: drainOptions } = options;

  const startTime = performance.now();

  const drain = createDrain(drainOptions);
  drain.addLogLines(lines);

  const result = drain.getResult(format, maxTemplates);
  const processingTimeMs = Math.round(performance.now() - startTime);

  // Add processing time to stats
  return {
    ...result,
    stats: {
      ...result.stats,
      processingTimeMs,
    },
  };
}

/**
 * Compress a single string containing multiple log lines.
 *
 * @param text - Raw log text (lines separated by newlines)
 * @param options - Compression options
 * @returns Compression result with templates and statistics
 */
export function compressText(
  text: string,
  options: CompressOptions = {}
): CompressionResult {
  const lines = text.split(/\r?\n/);
  return compress(lines, options);
}
