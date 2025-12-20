// Public API
export { compress, compressText } from './api.js';
export { Drain, createDrain } from './drain/index.js';
export { defineStrategy, DEFAULT_PATTERNS, WILDCARD } from './preprocessing/index.js';

// Types
export type {
  CompressionResult,
  Template,
  ParsingStrategy,
  DrainOptions,
  OutputFormat,
  CompressOptions,
} from './types.js';
