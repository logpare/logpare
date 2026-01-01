// Public API
export { compress, compressText } from './api.js';
export { Drain, createDrain } from './drain/index.js';
export {
  defineStrategy,
  DEFAULT_PATTERNS,
  WILDCARD,
  SEVERITY_PATTERNS,
  STACK_FRAME_PATTERNS,
  detectSeverity,
  isStackFrame,
  extractUrls,
  extractFullUrls,
  extractStatusCodes,
  extractCorrelationIds,
  extractDurations,
} from './preprocessing/index.js';

// Types
export type {
  CompressionResult,
  Template,
  ParsingStrategy,
  DrainOptions,
  OutputFormat,
  CompressOptions,
  Severity,
  ProgressEvent,
  ProgressCallback,
} from './types.js';
