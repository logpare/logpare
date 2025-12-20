import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compress, compressText } from '../src/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('compress', () => {
  it('should compress simple log lines', () => {
    const lines = [
      'INFO Request started',
      'INFO Request started',
      'INFO Request started',
    ];

    const result = compress(lines);

    expect(result.stats.inputLines).toBe(3);
    expect(result.stats.uniqueTemplates).toBe(1);
    expect(result.templates).toHaveLength(1);
    expect(result.formatted).toContain('3');
  });

  it('should handle empty input', () => {
    const result = compress([]);

    expect(result.stats.inputLines).toBe(0);
    expect(result.stats.uniqueTemplates).toBe(0);
    expect(result.templates).toHaveLength(0);
  });

  it('should respect format option', () => {
    const lines = ['Test line'];

    const summary = compress(lines, { format: 'summary' });
    expect(summary.formatted).toContain('Summary');

    const detailed = compress(lines, { format: 'detailed' });
    expect(detailed.formatted).toContain('Details');

    const json = compress(lines, { format: 'json' });
    expect(() => JSON.parse(json.formatted)).not.toThrow();
  });

  it('should respect maxTemplates option', () => {
    // Create lines that will produce multiple templates
    const lines = Array.from({ length: 100 }, (_, i) => `Unique message number ${i}`);

    const result = compress(lines, { maxTemplates: 5 });

    expect(result.templates.length).toBeLessThanOrEqual(5);
  });

  it('should sort templates by occurrence count', () => {
    const lines = [
      'Common message',
      'Common message',
      'Common message',
      'Common message',
      'Common message',
      'Rare message once',
    ];

    const result = compress(lines);

    expect(result.templates[0]?.occurrences).toBeGreaterThan(result.templates[1]?.occurrences ?? 0);
  });
});

describe('compressText', () => {
  it('should split text by newlines', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const result = compressText(text);

    expect(result.stats.inputLines).toBe(3);
  });

  it('should handle Windows line endings', () => {
    const text = 'Line 1\r\nLine 2\r\nLine 3';
    const result = compressText(text);

    expect(result.stats.inputLines).toBe(3);
  });

  it('should handle mixed line endings', () => {
    const text = 'Line 1\nLine 2\r\nLine 3';
    const result = compressText(text);

    expect(result.stats.inputLines).toBe(3);
  });
});

describe('HDFS log fixture', () => {
  it('should compress HDFS logs effectively', () => {
    const hdfsLog = readFileSync(resolve(__dirname, 'fixtures/hdfs.log'), 'utf-8');
    const result = compressText(hdfsLog);

    // HDFS logs are highly repetitive
    expect(result.stats.compressionRatio).toBeGreaterThan(0.5);
    expect(result.stats.uniqueTemplates).toBeLessThan(result.stats.inputLines);

    // Should identify common patterns
    const patterns = result.templates.map((t) => t.pattern);
    const hasBlockPattern = patterns.some((p) => p.includes('block') || p.includes('blk'));
    expect(hasBlockPattern).toBe(true);
  });
});

describe('Spark log fixture', () => {
  it('should compress Spark logs effectively', () => {
    const sparkLog = readFileSync(resolve(__dirname, 'fixtures/spark.log'), 'utf-8');
    const result = compressText(sparkLog);

    expect(result.stats.compressionRatio).toBeGreaterThan(0.3);
    expect(result.stats.uniqueTemplates).toBeLessThan(result.stats.inputLines);

    // Should identify Spark components
    const patterns = result.templates.map((t) => t.pattern);
    const hasSparkPattern = patterns.some(
      (p) => p.includes('INFO') || p.includes('Executor') || p.includes('Task')
    );
    expect(hasSparkPattern).toBe(true);
  });
});

describe('Linux log fixture', () => {
  it('should compress Linux logs effectively', () => {
    const linuxLog = readFileSync(resolve(__dirname, 'fixtures/linux.log'), 'utf-8');
    const result = compressText(linuxLog);

    expect(result.stats.compressionRatio).toBeGreaterThan(0.5);

    // Should identify session patterns
    const patterns = result.templates.map((t) => t.pattern);
    const hasSessionPattern = patterns.some((p) => p.includes('session'));
    expect(hasSessionPattern).toBe(true);
  });
});

describe('compression performance', () => {
  it('should process 1000 lines quickly', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `INFO Processing request ${i} from 192.168.1.1 in 50ms`);

    const start = performance.now();
    const result = compress(lines);
    const elapsed = performance.now() - start;

    // Should complete in under 1 second (conservative)
    expect(elapsed).toBeLessThan(1000);
    expect(result.stats.inputLines).toBe(1000);
  });

  it('should handle highly repetitive logs efficiently', () => {
    // Same line repeated 10000 times
    const lines = Array.from({ length: 10000 }, () => 'INFO Request processed successfully');

    const start = performance.now();
    const result = compress(lines);
    const elapsed = performance.now() - start;

    // Should be very fast for identical lines
    expect(elapsed).toBeLessThan(500);
    expect(result.stats.uniqueTemplates).toBe(1);
    expect(result.templates[0]?.occurrences).toBe(10000);
  });
});

describe('edge cases', () => {
  it('should handle very long lines', () => {
    const longLine = 'A'.repeat(10000);
    const result = compress([longLine, longLine]);

    expect(result.stats.inputLines).toBe(2);
  });

  it('should handle special characters', () => {
    const lines = [
      'Error: "unexpected token" at line 5',
      'Error: "unexpected token" at line 10',
      'Warning: <deprecated> method called',
    ];

    const result = compress(lines);
    expect(result.stats.inputLines).toBe(3);
  });

  it('should handle unicode', () => {
    const lines = [
      'User 田中 logged in',
      'User 佐藤 logged in',
      'User Smith logged in',
    ];

    const result = compress(lines);
    expect(result.stats.inputLines).toBe(3);
  });

  it('should handle mixed content', () => {
    const lines = [
      '{"level":"info","message":"test"}',
      '{"level":"info","message":"test"}',
      'Plain text log',
      '<xml><log>entry</log></xml>',
    ];

    const result = compress(lines);
    expect(result.stats.inputLines).toBe(4);
  });
});
