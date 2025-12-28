import {
  WILDCARD,
  detectSeverity,
  isStackFrame,
  extractUrls,
  extractFullUrls,
  extractStatusCodes,
  extractCorrelationIds,
  extractDurations,
} from '../preprocessing/patterns.js';
import type { Severity } from '../types.js';

/**
 * Represents a log cluster (template) discovered by the Drain algorithm.
 *
 * V8 Optimization: All properties are initialized in the constructor
 * to ensure monomorphic object shapes for optimal property access.
 */
export class LogCluster {
  /** Unique identifier for this cluster */
  readonly id: string;

  /** Template tokens (with wildcards for variable positions) */
  readonly tokens: string[];

  /** Number of log lines matching this template */
  count: number;

  /** Sample variable values from first N matches */
  readonly sampleVariables: string[][];

  /** Line index of first occurrence */
  firstSeen: number;

  /** Line index of most recent occurrence */
  lastSeen: number;

  /** Detected severity level */
  readonly severity: Severity;

  /** Sample URLs extracted from matching lines (hostnames only) */
  readonly urlSamples: string[];

  /** Full URLs extracted from matching lines (complete paths) */
  readonly fullUrlSamples: string[];

  /** HTTP status codes extracted from matching lines */
  readonly statusCodeSamples: number[];

  /** Correlation/trace IDs extracted from matching lines */
  readonly correlationIdSamples: string[];

  /** Duration/timing values extracted from matching lines */
  readonly durationSamples: string[];

  /** Whether this template represents a stack trace frame */
  readonly isStackFrame: boolean;

  /** Maximum number of sample variables to store */
  private readonly maxSamples: number;

  /** Maximum number of URL samples to store */
  private readonly maxUrlSamples: number = 5;

  /** Maximum number of status code samples to store */
  private readonly maxStatusCodeSamples: number = 5;

  /** Maximum number of correlation ID samples to store */
  private readonly maxCorrelationIdSamples: number = 3;

  /** Maximum number of duration samples to store */
  private readonly maxDurationSamples: number = 5;

  constructor(
    id: string,
    tokens: string[],
    lineIndex: number,
    maxSamples: number = 3,
    originalLine: string = ''
  ) {
    this.id = id;
    this.tokens = tokens.slice(); // Defensive copy
    this.count = 1;
    this.sampleVariables = [];
    this.firstSeen = lineIndex;
    this.lastSeen = lineIndex;
    this.maxSamples = maxSamples;

    // Detect severity, stack frame from original line
    this.severity = detectSeverity(originalLine);
    this.isStackFrame = isStackFrame(originalLine);

    // Initialize sample arrays
    this.urlSamples = [];
    this.fullUrlSamples = [];
    this.statusCodeSamples = [];
    this.correlationIdSamples = [];
    this.durationSamples = [];

    // Extract and store samples from original line
    const urls = extractUrls(originalLine);
    if (urls.length > 0) {
      this.urlSamples.push(...urls.slice(0, this.maxUrlSamples));
    }

    const fullUrls = extractFullUrls(originalLine);
    if (fullUrls.length > 0) {
      this.fullUrlSamples.push(...fullUrls.slice(0, this.maxUrlSamples));
    }

    const statusCodes = extractStatusCodes(originalLine);
    if (statusCodes.length > 0) {
      this.statusCodeSamples.push(...statusCodes.slice(0, this.maxStatusCodeSamples));
    }

    const correlationIds = extractCorrelationIds(originalLine);
    if (correlationIds.length > 0) {
      this.correlationIdSamples.push(...correlationIds.slice(0, this.maxCorrelationIdSamples));
    }

    const durations = extractDurations(originalLine);
    if (durations.length > 0) {
      this.durationSamples.push(...durations.slice(0, this.maxDurationSamples));
    }
  }

  /**
   * Update the cluster with a new matching log line.
   * Returns the variables extracted from this match.
   */
  update(tokens: string[], lineIndex: number, originalLine: string = ''): string[] {
    this.count++;
    this.lastSeen = lineIndex;

    // Extract variables (positions where template has wildcard)
    const variables: string[] = [];
    for (let i = 0; i < this.tokens.length && i < tokens.length; i++) {
      if (this.tokens[i] === WILDCARD) {
        variables.push(tokens[i] ?? '');
      }
    }

    // Store sample if we haven't reached the limit
    if (this.sampleVariables.length < this.maxSamples) {
      this.sampleVariables.push(variables);
    }

    // Extract and store samples from original line if present
    if (originalLine) {
      // URLs (hostnames)
      if (this.urlSamples.length < this.maxUrlSamples) {
        const urls = extractUrls(originalLine);
        for (const url of urls) {
          if (!this.urlSamples.includes(url) && this.urlSamples.length < this.maxUrlSamples) {
            this.urlSamples.push(url);
          }
        }
      }

      // Full URLs
      if (this.fullUrlSamples.length < this.maxUrlSamples) {
        const fullUrls = extractFullUrls(originalLine);
        for (const url of fullUrls) {
          if (!this.fullUrlSamples.includes(url) && this.fullUrlSamples.length < this.maxUrlSamples) {
            this.fullUrlSamples.push(url);
          }
        }
      }

      // Status codes
      if (this.statusCodeSamples.length < this.maxStatusCodeSamples) {
        const statusCodes = extractStatusCodes(originalLine);
        for (const code of statusCodes) {
          if (!this.statusCodeSamples.includes(code) && this.statusCodeSamples.length < this.maxStatusCodeSamples) {
            this.statusCodeSamples.push(code);
          }
        }
      }

      // Correlation IDs
      if (this.correlationIdSamples.length < this.maxCorrelationIdSamples) {
        const correlationIds = extractCorrelationIds(originalLine);
        for (const id of correlationIds) {
          if (!this.correlationIdSamples.includes(id) && this.correlationIdSamples.length < this.maxCorrelationIdSamples) {
            this.correlationIdSamples.push(id);
          }
        }
      }

      // Durations
      if (this.durationSamples.length < this.maxDurationSamples) {
        const durations = extractDurations(originalLine);
        for (const duration of durations) {
          if (!this.durationSamples.includes(duration) && this.durationSamples.length < this.maxDurationSamples) {
            this.durationSamples.push(duration);
          }
        }
      }
    }

    return variables;
  }

  /**
   * Get the template pattern as a string.
   */
  getPattern(): string {
    return this.tokens.join(' ');
  }

  /**
   * Compute similarity between this cluster's template and a set of tokens.
   * Returns a value between 0.0 and 1.0.
   */
  computeSimilarity(tokens: string[]): number {
    // Guard against division by zero
    if (this.tokens.length === 0) {
      return 0;
    }

    if (tokens.length !== this.tokens.length) {
      return 0;
    }

    let matchCount = 0;
    for (let i = 0; i < this.tokens.length; i++) {
      const templateToken = this.tokens[i];
      const inputToken = tokens[i];

      // Wildcards always match
      if (templateToken === WILDCARD) {
        matchCount++;
      } else if (templateToken === inputToken) {
        matchCount++;
      }
    }

    return matchCount / this.tokens.length;
  }

  /**
   * Merge tokens into the template, converting differing positions to wildcards.
   * Mutates the template tokens in place.
   */
  mergeTokens(tokens: string[]): void {
    for (let i = 0; i < this.tokens.length && i < tokens.length; i++) {
      if (this.tokens[i] !== WILDCARD && this.tokens[i] !== tokens[i]) {
        (this.tokens as string[])[i] = WILDCARD;
      }
    }
  }
}
