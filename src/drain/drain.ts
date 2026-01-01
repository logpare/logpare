import type { DrainOptions, ParsingStrategy, Template, OutputFormat, CompressionResult, ProgressCallback } from '../types.js';
import { defaultStrategy } from '../preprocessing/default.js';
import { WILDCARD } from '../preprocessing/patterns.js';
import { DrainNode } from './node.js';
import { LogCluster } from './cluster.js';
import { formatSummary, formatDetailed, formatJson } from '../output/formatter.js';

/**
 * Default configuration values for Drain algorithm.
 */
const DEFAULTS = {
  depth: 4,
  simThreshold: 0.4,
  maxChildren: 100,
  maxClusters: 1000,
  maxSamples: 3,
} as const;

/**
 * Special key used for the wildcard child in the parse tree.
 */
const WILDCARD_KEY = '<WILDCARD>';

/**
 * Drain algorithm implementation for log template mining.
 *
 * The algorithm constructs a fixed-depth parse tree to efficiently
 * cluster log messages by their template structure.
 *
 * Tree Structure:
 * - Level 0 (root): Entry point
 * - Level 1: Token count (length of log message)
 * - Level 2: First token of the message
 * - Levels 3+: Subsequent tokens up to configured depth
 * - Leaf: LogCluster containing the template
 */
export class Drain {
  private readonly root: DrainNode;
  private readonly clusters: LogCluster[];
  private readonly strategy: ParsingStrategy;
  private readonly depth: number;
  private readonly maxChildren: number;
  private readonly maxClusters: number;
  private readonly maxSamples: number;
  private readonly onProgress: ProgressCallback | undefined;
  private lineCount: number;
  private nextClusterId: number;

  constructor(options: DrainOptions = {}) {
    this.root = new DrainNode(0);
    this.clusters = [];
    this.strategy = options.preprocessing ?? defaultStrategy;
    this.depth = options.depth ?? DEFAULTS.depth;
    this.maxChildren = options.maxChildren ?? DEFAULTS.maxChildren;
    this.maxClusters = options.maxClusters ?? DEFAULTS.maxClusters;
    this.maxSamples = options.maxSamples ?? DEFAULTS.maxSamples;
    this.onProgress = options.onProgress;
    this.lineCount = 0;
    this.nextClusterId = 1;
  }

  /**
   * Process a single log line.
   */
  addLogLine(line: string): LogCluster | null {
    const lineIndex = this.lineCount++;

    // Skip empty lines
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return null;
    }

    // Preprocess and tokenize
    const preprocessed = this.strategy.preprocess(trimmed);
    const tokens = this.strategy.tokenize(preprocessed);

    if (tokens.length === 0) {
      return null;
    }

    // Search for matching cluster
    const matchedCluster = this.treeSearch(tokens);

    if (matchedCluster !== null) {
      // Update existing cluster, passing original line for URL extraction
      matchedCluster.update(tokens, lineIndex, trimmed);
      matchedCluster.mergeTokens(tokens);
      return matchedCluster;
    }

    // Create new cluster if under limit
    if (this.clusters.length >= this.maxClusters) {
      return null;
    }

    return this.createCluster(tokens, lineIndex, trimmed);
  }

  /**
   * Process multiple log lines with optional progress reporting.
   */
  addLogLines(lines: string[]): void {
    const total = lines.length;

    // Calculate report interval (emit at most 100 progress events)
    const reportInterval = Math.max(1, Math.floor(total / 100));

    // Emit initial parsing phase
    if (this.onProgress && total > 0) {
      this.onProgress({
        processedLines: 0,
        totalLines: total,
        currentPhase: 'parsing',
        percentComplete: 0,
      });
    }

    for (let i = 0; i < total; i++) {
      this.addLogLine(lines[i] as string);

      // Emit progress at intervals
      if (this.onProgress && i % reportInterval === 0) {
        this.onProgress({
          processedLines: i + 1,
          totalLines: total,
          currentPhase: 'clustering',
          percentComplete: Math.round(((i + 1) / total) * 100),
        });
      }
    }

    // Emit final progress event
    if (this.onProgress && total > 0) {
      this.onProgress({
        processedLines: total,
        totalLines: total,
        currentPhase: 'finalizing',
        percentComplete: 100,
      });
    }
  }

  /**
   * Search the parse tree for a matching cluster.
   */
  private treeSearch(tokens: string[]): LogCluster | null {
    const tokenCount = tokens.length;
    const tokenCountKey = String(tokenCount);

    // Level 1: Navigate by token count
    const lengthNode = this.root.getChild(tokenCountKey);
    if (lengthNode === undefined) {
      return null;
    }

    // Level 2: Navigate by first token
    const firstToken = tokens[0];
    if (firstToken === undefined) {
      return null;
    }

    let currentNode = lengthNode.getChild(firstToken);

    // Try wildcard child if exact match not found
    if (currentNode === undefined) {
      currentNode = lengthNode.getChild(WILDCARD_KEY);
    }

    if (currentNode === undefined) {
      return null;
    }

    // Levels 3+: Navigate by subsequent tokens
    let searchNode: DrainNode = currentNode;
    for (let i = 1; i < Math.min(tokens.length, this.depth); i++) {
      const token = tokens[i];
      if (token === undefined) {
        break;
      }

      let nextNode = searchNode.getChild(token);

      // Try wildcard child if exact match not found
      if (nextNode === undefined) {
        nextNode = searchNode.getChild(WILDCARD_KEY);
      }

      if (nextNode === undefined) {
        break;
      }

      searchNode = nextNode;
    }

    // Search clusters at this node for best match
    return this.findBestMatch(searchNode, tokens);
  }

  /**
   * Find the best matching cluster at a node.
   */
  private findBestMatch(node: DrainNode, tokens: string[]): LogCluster | null {
    let bestCluster: LogCluster | null = null;
    let bestSimilarity = 0;

    const threshold = this.strategy.getSimThreshold(node.depth);

    for (const cluster of node.clusters) {
      const similarity = cluster.computeSimilarity(tokens);

      if (similarity >= threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    return bestCluster;
  }

  /**
   * Create a new cluster and add it to the tree.
   */
  private createCluster(tokens: string[], lineIndex: number, originalLine: string = ''): LogCluster {
    const clusterId = `t${String(this.nextClusterId++).padStart(3, '0')}`;
    const cluster = new LogCluster(clusterId, tokens, lineIndex, this.maxSamples, originalLine);

    // Navigate/create path in tree
    const tokenCount = tokens.length;
    const tokenCountKey = String(tokenCount);

    // Level 1: Token count
    const lengthNode = this.root.getOrCreateChild(tokenCountKey);

    // Level 2: First token
    const firstToken = tokens[0];
    if (firstToken === undefined) {
      this.clusters.push(cluster);
      return cluster;
    }

    // Decide whether to use actual token or wildcard key
    const firstKey = this.shouldUseWildcard(lengthNode, firstToken)
      ? WILDCARD_KEY
      : firstToken;

    let currentNode = lengthNode.getOrCreateChild(firstKey);

    // Levels 3+: Subsequent tokens
    for (let i = 1; i < Math.min(tokens.length, this.depth); i++) {
      const token = tokens[i];
      if (token === undefined) {
        break;
      }

      const key = this.shouldUseWildcard(currentNode, token)
        ? WILDCARD_KEY
        : token;

      currentNode = currentNode.getOrCreateChild(key);
    }

    // Add cluster to leaf node
    currentNode.addCluster(cluster);
    this.clusters.push(cluster);

    return cluster;
  }

  /**
   * Determine if we should use a wildcard key for a token.
   * Uses maxChildren limit to prevent tree explosion.
   */
  private shouldUseWildcard(node: DrainNode, token: string): boolean {
    // If token already exists as child, use it
    if (node.hasChild(token)) {
      return false;
    }

    // If we have wildcard child and are at capacity, use wildcard
    if (node.hasChild(WILDCARD_KEY) && node.childCount >= this.maxChildren) {
      return true;
    }

    // If token looks like a variable (starts with digit, etc.), use wildcard
    if (this.looksLikeVariable(token)) {
      return true;
    }

    // Otherwise use the actual token
    return false;
  }

  /**
   * Heuristic to detect if a token looks like a variable value.
   */
  private looksLikeVariable(token: string): boolean {
    // Already a wildcard
    if (token === WILDCARD) {
      return true;
    }

    // Starts with a digit
    const firstChar = token.charAt(0);
    if (firstChar >= '0' && firstChar <= '9') {
      return true;
    }

    // Contains only hex characters (likely an ID)
    if (/^[0-9a-fA-F]+$/.test(token) && token.length > 8) {
      return true;
    }

    return false;
  }

  /**
   * Get all discovered templates.
   */
  getTemplates(): Template[] {
    return this.clusters.map((cluster) => ({
      id: cluster.id,
      pattern: cluster.getPattern(),
      occurrences: cluster.count,
      sampleVariables: cluster.sampleVariables,
      firstSeen: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      severity: cluster.severity,
      urlSamples: cluster.urlSamples,
      fullUrlSamples: cluster.fullUrlSamples,
      statusCodeSamples: cluster.statusCodeSamples,
      correlationIdSamples: cluster.correlationIdSamples,
      durationSamples: cluster.durationSamples,
      isStackFrame: cluster.isStackFrame,
    }));
  }

  /**
   * Get compression result with formatted output.
   */
  getResult(format: OutputFormat = 'summary', maxTemplates: number = 50): CompressionResult {
    const templates = this.getTemplates();

    // Sort by occurrences (descending)
    templates.sort((a, b) => b.occurrences - a.occurrences);

    // Limit templates in output
    const limitedTemplates = templates.slice(0, maxTemplates);

    // Calculate stats
    const stats = this.calculateStats(templates);

    // Format output
    let formatted: string;
    switch (format) {
      case 'detailed':
        formatted = formatDetailed(limitedTemplates, stats);
        break;
      case 'json':
        formatted = formatJson(limitedTemplates, stats);
        break;
      case 'summary':
      default:
        formatted = formatSummary(limitedTemplates, stats);
        break;
    }

    return {
      templates: limitedTemplates,
      stats,
      formatted,
    };
  }

  /**
   * Calculate compression statistics.
   */
  private calculateStats(templates: Template[]): CompressionResult['stats'] {
    const inputLines = this.lineCount;
    const uniqueTemplates = templates.length;

    // Compression ratio: 1 - (templates / lines)
    const compressionRatio = inputLines > 0
      ? 1 - (uniqueTemplates / inputLines)
      : 0;

    // Estimate token reduction using character count proxy
    // Each template is shown once instead of repeated N times
    let originalChars = 0;
    let compressedChars = 0;

    for (const template of templates) {
      const patternLength = template.pattern.length;
      // Original: pattern repeated for each occurrence
      originalChars += patternLength * template.occurrences;
      // Compressed: pattern shown once + count indicator
      compressedChars += patternLength + 20; // ~20 chars for "[Nx] " prefix
    }

    const estimatedTokenReduction = originalChars > 0
      ? 1 - (compressedChars / originalChars)
      : 0;

    return {
      inputLines,
      uniqueTemplates,
      compressionRatio: Math.max(0, Math.min(1, compressionRatio)),
      estimatedTokenReduction: Math.max(0, Math.min(1, estimatedTokenReduction)),
    };
  }

  /**
   * Get the number of lines processed.
   */
  get totalLines(): number {
    return this.lineCount;
  }

  /**
   * Get the number of clusters (templates) discovered.
   */
  get totalClusters(): number {
    return this.clusters.length;
  }
}

/**
 * Create a new Drain instance with the given options.
 */
export function createDrain(options?: DrainOptions): Drain {
  return new Drain(options);
}
