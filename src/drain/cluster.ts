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
 * Append unique items to an array up to a maximum count.
 */
function addUniqueSamples<T>(array: T[], max: number, items: T[]): void {
  for (const item of items) {
    if (array.length >= max) break;
    if (!array.includes(item)) {
      array.push(item);
    }
  }
}

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

  /** Per-type sample limits for diagnostic metadata */
  private readonly sampleLimits = {
    url: 5,
    statusCode: 5,
    correlationId: 3,
    duration: 5,
  } as const;

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

    // Initialize and populate diagnostic sample arrays from original line
    this.urlSamples = extractUrls(originalLine).slice(0, this.sampleLimits.url);
    this.fullUrlSamples = extractFullUrls(originalLine).slice(0, this.sampleLimits.url);
    this.statusCodeSamples = extractStatusCodes(originalLine).slice(0, this.sampleLimits.statusCode);
    this.correlationIdSamples = extractCorrelationIds(originalLine).slice(0, this.sampleLimits.correlationId);
    this.durationSamples = extractDurations(originalLine).slice(0, this.sampleLimits.duration);
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

    // Extract and store diagnostic samples from original line
    if (originalLine) {
      addUniqueSamples(this.urlSamples, this.sampleLimits.url, extractUrls(originalLine));
      addUniqueSamples(this.fullUrlSamples, this.sampleLimits.url, extractFullUrls(originalLine));
      addUniqueSamples(this.statusCodeSamples, this.sampleLimits.statusCode, extractStatusCodes(originalLine));
      addUniqueSamples(this.correlationIdSamples, this.sampleLimits.correlationId, extractCorrelationIds(originalLine));
      addUniqueSamples(this.durationSamples, this.sampleLimits.duration, extractDurations(originalLine));
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
