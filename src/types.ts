/**
 * Strategy for preprocessing and parsing log lines.
 * Decouples policy from mechanism for extensibility.
 */
export interface ParsingStrategy {
  /** Transform line before parsing (masking, normalization) */
  preprocess(line: string): string;

  /** Split line into tokens */
  tokenize(line: string): string[];

  /** Dynamic similarity threshold (can vary by tree depth) */
  getSimThreshold(depth: number): number;
}

/**
 * Severity level of a log message.
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * A discovered log template.
 */
export interface Template {
  /** Unique identifier for this template */
  id: string;

  /** Pattern string with variables replaced by <*> */
  pattern: string;

  /** Number of log lines matching this template */
  occurrences: number;

  /** Sample variable values from first N matches */
  sampleVariables: string[][];

  /** Line index of first occurrence */
  firstSeen: number;

  /** Line index of most recent occurrence */
  lastSeen: number;

  /** Detected severity level (error, warning, info) */
  severity: Severity;

  /** Sample URLs extracted from matching lines (hostnames only for brevity) */
  urlSamples: string[];

  /** Full URLs extracted from matching lines (complete paths for diagnostics) */
  fullUrlSamples: string[];

  /** HTTP status codes extracted from matching lines */
  statusCodeSamples: number[];

  /** Correlation/trace IDs extracted from matching lines */
  correlationIdSamples: string[];

  /** Duration/timing values extracted from matching lines (e.g., "80ms", "1.5s") */
  durationSamples: string[];

  /** Whether this template represents a stack trace frame */
  isStackFrame: boolean;
}

/**
 * Result of log compression.
 */
export interface CompressionResult {
  /** All discovered templates */
  templates: Template[];

  /** Compression statistics */
  stats: {
    /** Total input lines processed */
    inputLines: number;

    /** Number of unique templates discovered */
    uniqueTemplates: number;

    /** Compression ratio (0.0 - 1.0, higher = more compression) */
    compressionRatio: number;

    /** Estimated token reduction percentage */
    estimatedTokenReduction: number;

    /** Processing time in milliseconds (optional) */
    processingTimeMs?: number;
  };

  /** Formatted output string */
  formatted: string;
}

/**
 * Progress event emitted during log processing.
 */
export interface ProgressEvent {
  /** Number of lines processed so far */
  processedLines: number;

  /** Total lines to process (if known upfront) */
  totalLines?: number;

  /** Current processing phase */
  currentPhase: 'parsing' | 'clustering' | 'finalizing';

  /** Percentage complete (0-100, only if totalLines known) */
  percentComplete?: number;
}

/**
 * Callback function for progress reporting.
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Configuration options for Drain algorithm.
 */
export interface DrainOptions {
  /** Parse tree depth (excluding length/first-token levels). Default: 4 */
  depth?: number;

  /** Minimum similarity to match existing cluster (0.0-1.0). Default: 0.4 */
  simThreshold?: number;

  /** Maximum children per node (prevents explosion). Default: 100 */
  maxChildren?: number;

  /** Maximum total clusters (memory bound). Default: 1000 */
  maxClusters?: number;

  /** Maximum sample variables to store per template. Default: 3 */
  maxSamples?: number;

  /** Custom preprocessing strategy */
  preprocessing?: ParsingStrategy;

  /** Progress callback for long-running operations */
  onProgress?: ProgressCallback;
}

/**
 * Output format for compression results.
 */
export type OutputFormat = 'summary' | 'detailed' | 'json';

/**
 * Options for the compress() function.
 */
export interface CompressOptions {
  /** Output format. Default: 'summary' */
  format?: OutputFormat;

  /** Maximum templates to include in output. Default: 50 */
  maxTemplates?: number;

  /** Drain algorithm options */
  drain?: DrainOptions;
}
