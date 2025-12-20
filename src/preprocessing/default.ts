import type { ParsingStrategy } from '../types.js';
import { DEFAULT_PATTERNS, applyPatterns, WILDCARD } from './patterns.js';

/**
 * Default parsing strategy for log preprocessing.
 */
export const defaultStrategy: ParsingStrategy = {
  /**
   * Preprocess a log line by masking common variable patterns.
   */
  preprocess(line: string): string {
    return applyPatterns(line, DEFAULT_PATTERNS, WILDCARD);
  },

  /**
   * Tokenize a line by splitting on whitespace.
   */
  tokenize(line: string): string[] {
    return line.split(/\s+/).filter((token) => token.length > 0);
  },

  /**
   * Get similarity threshold for a given tree depth.
   * Uses a constant threshold of 0.4.
   */
  getSimThreshold(_depth: number): number {
    return 0.4;
  },
};

/**
 * Create a custom parsing strategy by extending the default.
 */
export function defineStrategy(
  overrides: Partial<ParsingStrategy> & {
    patterns?: Record<string, RegExp>;
  }
): ParsingStrategy {
  const { patterns, ...strategyOverrides } = overrides;

  return {
    preprocess: strategyOverrides.preprocess ?? ((line: string) => {
      const mergedPatterns = patterns
        ? { ...DEFAULT_PATTERNS, ...patterns }
        : DEFAULT_PATTERNS;
      return applyPatterns(line, mergedPatterns, WILDCARD);
    }),

    tokenize: strategyOverrides.tokenize ?? defaultStrategy.tokenize,

    getSimThreshold: strategyOverrides.getSimThreshold ?? defaultStrategy.getSimThreshold,
  };
}
