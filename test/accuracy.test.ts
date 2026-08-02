import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDrain } from '../src/drain/index.js';
import { compress, compressText } from '../src/api.js';
import {
  evaluateParsing,
  formatEvalReport,
  type GroundTruthEntry,
  type PredictionEntry,
} from './utils/eval-metrics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface GroundTruthFixture {
  description: string;
  source: string;
  /** Leading whitespace-separated fields of `content` stripped from `template`. */
  headerTokens: number;
  headerNote: string;
  templates: Record<string, string>;
  entries: Array<{
    lineNumber: number;
    content: string;
    templateId: string;
    template: string;
  }>;
}

/**
 * Align a LogHub-convention ground-truth template with what logpare produces.
 *
 * The fixture strips the log header (date, time, pid) from its templates, as the
 * published LogHub corpora do. logpare is handed the full line and masks those
 * fields to wildcards, so without this the two can never agree and parsing
 * accuracy is pinned at 0% no matter how good the parser is.
 */
function withHeader(template: string, headerTokens: number): string {
  return `${'<*> '.repeat(headerTokens)}${template}`;
}

describe('Parsing Accuracy', () => {
  it('should achieve high grouping accuracy on HDFS logs', () => {
    // Load ground truth
    const fixturePath = join(__dirname, 'fixtures/hdfs-ground-truth.json');
    const fixture: GroundTruthFixture = JSON.parse(
      readFileSync(fixturePath, 'utf-8')
    );

    // Parse logs with Drain
    const drain = createDrain({ depth: 4, simThreshold: 0.4 });
    const lineToCluster = new Map<number, string>();

    for (const entry of fixture.entries) {
      const cluster = drain.addLogLine(entry.content);
      if (cluster) {
        lineToCluster.set(entry.lineNumber, cluster.id);
      }
    }

    // Build predictions
    const groundTruth: GroundTruthEntry[] = [];
    const predictions: PredictionEntry[] = [];

    // Precompute template map to avoid O(n²) lookups
    const templates = drain.getTemplates();
    const templateById = new Map(templates.map((t) => [t.id, t]));

    for (const entry of fixture.entries) {
      const clusterId = lineToCluster.get(entry.lineNumber);
      if (!clusterId) continue;

      const template = templateById.get(clusterId);
      if (!template) continue;

      groundTruth.push({
        content: entry.content,
        templateId: entry.templateId,
        template: withHeader(entry.template, fixture.headerTokens),
      });

      predictions.push({
        content: entry.content,
        templateId: clusterId,
        template: template.pattern,
      });
    }

    // Evaluate
    const result = evaluateParsing(groundTruth, predictions);

    // Log report for visibility
    console.log('\n' + formatEvalReport(result) + '\n');

    // Assert minimum accuracy thresholds
    // These thresholds are based on LogEval benchmarks for Drain
    expect(result.f1GroupingAccuracy).toBeGreaterThanOrEqual(0.85);
    expect(result.groupingAccuracy).toBeGreaterThanOrEqual(0.9);

    // Template-string quality. These were computed and printed but never asserted,
    // which is how the filePath/url ordering bug and the syslog clock-time
    // fragmentation both shipped unnoticed. The thresholds are deliberately set at
    // the current achievable level so a regression fails the build; raising them is
    // tracked with the remaining template-quality work (see the audit report).
    // Currently PA ~44.8%, F1-PA ~36.4% (3 of 6 templates reproduced exactly).
    expect(result.parsingAccuracy).toBeGreaterThanOrEqual(0.4);
    expect(result.f1ParsingAccuracy).toBeGreaterThanOrEqual(0.3);
  });

  it('should correctly count template statistics', () => {
    const fixturePath = join(__dirname, 'fixtures/hdfs-ground-truth.json');
    const fixture: GroundTruthFixture = JSON.parse(
      readFileSync(fixturePath, 'utf-8')
    );

    const drain = createDrain({ depth: 4, simThreshold: 0.4 });

    for (const entry of fixture.entries) {
      drain.addLogLine(entry.content);
    }

    const templates = drain.getTemplates();
    const uniqueGtTemplates = new Set(
      fixture.entries.map((e) => e.templateId)
    ).size;

    // Drain should produce a similar number of templates to ground truth
    // Allow some variance (±2) due to algorithm differences
    expect(Math.abs(templates.length - uniqueGtTemplates)).toBeLessThanOrEqual(2);
  });
});

describe('Evaluation Metrics', () => {
  it('should calculate perfect scores for identical groupings', () => {
    const entries: GroundTruthEntry[] = [
      { content: 'log1', templateId: 'A', template: 'template A' },
      { content: 'log2', templateId: 'A', template: 'template A' },
      { content: 'log3', templateId: 'B', template: 'template B' },
    ];

    const result = evaluateParsing(entries, entries);

    expect(result.groupingAccuracy).toBe(1);
    expect(result.parsingAccuracy).toBe(1);
    expect(result.f1GroupingAccuracy).toBe(1);
    expect(result.f1ParsingAccuracy).toBe(1);
  });

  it('should detect incorrect groupings', () => {
    const groundTruth: GroundTruthEntry[] = [
      { content: 'log1', templateId: 'A', template: 'template A' },
      { content: 'log2', templateId: 'A', template: 'template A' },
      { content: 'log3', templateId: 'B', template: 'template B' },
    ];

    // Predictions have log1 and log2 in different groups (incorrect)
    const predictions: PredictionEntry[] = [
      { content: 'log1', templateId: 'X', template: 'template A' },
      { content: 'log2', templateId: 'Y', template: 'template A' },
      { content: 'log3', templateId: 'Z', template: 'template B' },
    ];

    const result = evaluateParsing(groundTruth, predictions);

    // Grouping accuracy should be low because logs 1&2 should be together
    expect(result.groupingAccuracy).toBeLessThan(1);
  });

  it('should handle template pattern mismatches', () => {
    const groundTruth: GroundTruthEntry[] = [
      { content: 'log1', templateId: 'A', template: 'ERROR: connection <*> failed' },
    ];

    const predictions: PredictionEntry[] = [
      { content: 'log1', templateId: 'X', template: 'ERROR: connection timeout' },
    ];

    const result = evaluateParsing(groundTruth, predictions);

    // Grouping is fine (1 log), but parsing accuracy is 0
    expect(result.parsingAccuracy).toBe(0);
  });
});

describe('json-stable output format', () => {
  it('should produce deterministic output', () => {
    const drain1 = createDrain();
    const drain2 = createDrain();

    const logs = [
      '2024-01-01 INFO Starting server on port 8080',
      '2024-01-01 ERROR Connection failed to database',
      '2024-01-01 INFO Starting server on port 9090',
    ];

    for (const log of logs) {
      drain1.addLogLine(log);
      drain2.addLogLine(log);
    }

    const result1 = drain1.getResult('json-stable');
    const result2 = drain2.getResult('json-stable');

    // Same input should produce identical output
    expect(result1.formatted).toBe(result2.formatted);

    // Verify it's valid JSON
    const parsed = JSON.parse(result1.formatted);
    expect(parsed.version).toBe('1.1');
    expect(parsed.stats).toBeDefined();
    expect(parsed.templates).toBeInstanceOf(Array);
  });

  it('should have sorted keys for cache optimization', () => {
    const drain = createDrain();
    drain.addLogLine('INFO Starting application');

    const result = drain.getResult('json-stable');
    const parsed = JSON.parse(result.formatted);

    // Check that keys are sorted at the top level
    const topKeys = Object.keys(parsed);
    expect(topKeys).toEqual(['stats', 'templates', 'version']);

    // Check that stats keys are sorted
    const statsKeys = Object.keys(parsed.stats);
    expect(statsKeys).toEqual([
      'compressionRatio',
      'estimatedTokenReduction',
      'inputLines',
      'uniqueTemplates',
    ]);
  });

  it('should produce compact output without whitespace', () => {
    const drain = createDrain();
    drain.addLogLine('INFO Test message');

    const result = drain.getResult('json-stable');

    // No newlines or extra spaces in compact output
    expect(result.formatted).not.toContain('\n');
    expect(result.formatted).not.toMatch(/:\s{2,}/);
  });
});

/**
 * Compression-ratio thresholds. These previously lived in test/compress.bench.ts as
 * `bench()` cases whose comments claimed thresholds the framework never checked —
 * `bench()` reports timing and discards the returned value.
 */
describe('Compression Ratio', () => {
  it('compresses the HDFS fixture substantially', () => {
    const fixturePath = join(__dirname, 'fixtures/hdfs.log');
    const result = compressText(readFileSync(fixturePath, 'utf-8'));

    expect(result.stats.compressionRatio).toBeGreaterThan(0.5);
    expect(result.stats.droppedLines).toBe(0);
  });

  it('achieves near-total compression on identical lines', () => {
    const lines = Array.from({ length: 10_000 }, () => 'INFO Request processed successfully');
    const result = compress(lines);

    expect(result.stats.uniqueTemplates).toBe(1);
    expect(result.stats.compressionRatio).toBeGreaterThan(0.99);
  });

  it('reports a ratio bounded to [0, 1]', () => {
    const result = compress(['INFO only one line']);

    expect(result.stats.compressionRatio).toBeGreaterThanOrEqual(0);
    expect(result.stats.compressionRatio).toBeLessThanOrEqual(1);
  });
});
