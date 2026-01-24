import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDrain } from '../src/drain/index.js';
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
  templates: Record<string, string>;
  entries: Array<{
    lineNumber: number;
    content: string;
    templateId: string;
    template: string;
  }>;
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

    for (const entry of fixture.entries) {
      const clusterId = lineToCluster.get(entry.lineNumber);
      if (!clusterId) continue;

      // Find the template pattern for this cluster
      const templates = drain.getTemplates();
      const template = templates.find((t) => t.id === clusterId);
      if (!template) continue;

      groundTruth.push({
        content: entry.content,
        templateId: entry.templateId,
        template: entry.template,
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
