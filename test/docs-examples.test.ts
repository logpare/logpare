/**
 * Executable Documentation Examples
 * ============================================================================
 * The snippets an agent is most likely to copy verbatim — from llms.txt, AGENTS.md,
 * and the README/quick-start — run here against the real API and are asserted to
 * produce the documented output.
 *
 * test/docs.test.ts catches docs that name an API that does not exist. This file
 * catches docs whose API exists but whose *output* is wrong.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import {
  compress,
  compressText,
  createDrain,
  defineStrategy,
  detectSeverity,
  isStackFrame,
  extractUrls,
} from '../src/index.js';

// ============================================================================
// llms.txt / docs/content/llms-intro.md minimal example
// ============================================================================

describe('Docs examples: llms.txt minimal example', () => {
  const LINES = [
    'ERROR Connection to 192.168.1.100 failed',
    'ERROR Connection to 192.168.1.101 failed',
    'INFO Request processed in 45ms',
  ];

  it('should produce the output printed in llms.txt', () => {
    // Arrange & Act
    const result = compress(LINES);

    // Assert — these exact lines appear in the llms.txt code block
    expect(result.formatted).toContain('=== Log Compression Summary ===');
    expect(result.formatted).toContain('Input: 3 lines → 2 templates (33.3% reduction)');
    expect(result.formatted).toContain('1. [2x] ERROR Connection to <*> failed');
    expect(result.formatted).toContain('2. [1x] INFO Request processed in <*>');
  });

  it('should keep the llms.txt example in sync with this test', () => {
    // Arrange
    const llms = fs.readFileSync('llms.txt', 'utf-8');

    // Act & Assert — if the example is edited, this test must be edited with it
    for (const line of LINES) {
      expect(llms, `llms.txt should contain the input line: ${line}`).toContain(line);
    }
    expect(llms).toContain('Input: 3 lines → 2 templates (33.3% reduction)');
  });
});

// ============================================================================
// Quick start / README
// ============================================================================

describe('Docs examples: quick start', () => {
  const LOGS = [
    'INFO Connection from 192.168.1.1 established',
    'INFO Connection from 192.168.1.2 established',
    'ERROR Connection timeout after 30s',
    'INFO Connection from 10.0.0.1 established',
  ];

  it('should produce the documented summary output', () => {
    // Arrange & Act
    const result = compress(LOGS);

    // Assert
    expect(result.formatted).toContain('Input: 4 lines → 2 templates (50.0% reduction)');
    expect(result.formatted).toContain('1. [3x] INFO Connection from <*> established');
    expect(result.formatted).toContain('2. [1x] ERROR Connection timeout after <*>');
  });

  it('should report stats as ratios, not percentages', () => {
    // Arrange & Act
    const { stats } = compress(LOGS);

    // Assert — documented in quick-start.mdx, compress.mdx, types.mdx, AGENTS.md
    expect(stats.inputLines).toBe(4);
    expect(stats.uniqueTemplates).toBe(2);
    expect(stats.compressionRatio).toBeCloseTo(0.5, 5);
    expect(stats.estimatedTokenReduction).toBeGreaterThan(0);
    expect(stats.estimatedTokenReduction).toBeLessThanOrEqual(1);
    expect(stats.droppedLines).toBe(0);
  });

  it('should use the documented detailed-format headings', () => {
    // Arrange & Act
    const formatted = compress(LOGS, { format: 'detailed' }).formatted;

    // Assert
    expect(formatted).toContain('=== Log Compression Details ===');
    expect(formatted).toContain('Estimated token reduction:');
    expect(formatted).toMatch(/=== Template t001 \(\d+ occurrences\) ===/);
    expect(formatted).toContain('Pattern: ');
    expect(formatted).toContain('Severity: ');
    expect(formatted).toContain('First seen: line ');
  });

  it('should use the documented JSON shape', () => {
    // Arrange & Act
    const json = JSON.parse(compress(LOGS, { format: 'json' }).formatted) as {
      version: string;
      stats: Record<string, unknown>;
      templates: Record<string, unknown>[];
    };
    const stats = json.stats;
    const template = json.templates[0];

    expect(template, 'json output should contain at least one template').toBeDefined();
    if (template === undefined) return;

    // Assert — documented in quick-start.mdx, README.md, types.mdx
    expect(json.version).toBe('1.1');
    expect(Object.keys(stats).sort()).toEqual([
      'compressionRatio',
      'estimatedTokenReduction',
      'inputLines',
      'uniqueTemplates',
    ]);
    expect(template).toHaveProperty('samples');
    expect(template).not.toHaveProperty('sampleVariables');
    expect(template.id).toBe('t001');
    expect(template.firstSeen).toBe(0); // zero-based, as documented
  });

  it('should emit deterministic json-stable output', () => {
    // Arrange & Act
    const a = compress(LOGS, { format: 'json-stable' }).formatted;
    const b = compress(LOGS, { format: 'json-stable' }).formatted;

    // Assert
    expect(a).toBe(b);
    expect(a).not.toContain('\n');
    expect(a.indexOf('"stats"')).toBeLessThan(a.indexOf('"templates"'));
  });

  it('should split compressText input on CRLF as well as LF', () => {
    // Arrange & Act
    const lf = compressText(LOGS.join('\n'));
    const crlf = compressText(LOGS.join('\r\n'));

    // Assert
    expect(crlf.stats.inputLines).toBe(lf.stats.inputLines);
    expect(crlf.stats.uniqueTemplates).toBe(lf.stats.uniqueTemplates);
  });
});

// ============================================================================
// AGENTS.md: the option shape
// ============================================================================

describe('Docs examples: option shape', () => {
  const LOGS = [
    'ERROR Connection to 192.168.1.1 failed',
    'ERROR Connection to 192.168.1.2 failed',
  ];

  it('should accept Drain options nested under `drain`', () => {
    // Arrange & Act
    const result = compress(LOGS, {
      format: 'detailed',
      maxTemplates: 20,
      drain: { depth: 5, simThreshold: 0.3 },
    });

    // Assert
    expect(result.templates.length).toBeGreaterThan(0);
    expect(result.formatted).toContain('=== Log Compression Details ===');
  });

  it('should take Drain options flat in createDrain()', () => {
    // Arrange
    const drain = createDrain({ depth: 5, simThreshold: 0.3 });

    // Act
    for (const line of LOGS) {
      drain.addLogLine(line);
    }

    // Assert — the exact members AGENTS.md tells agents to use
    expect(drain.totalLines).toBe(2);
    expect(drain.totalClusters).toBe(1);
    expect(drain.getTemplates()[0]?.pattern).toBe('ERROR Connection to <*> failed');
    expect(drain.getResult('summary').formatted).toContain('=== Log Compression Summary ===');
  });

  it('should report droppedLines once maxClusters is reached', () => {
    // Arrange — many distinct shapes, a cap of one template
    const varied = Array.from({ length: 20 }, (_, i) => `EVENT_${i} alpha beta gamma delta`);

    // Act
    const result = compress(varied, { drain: { maxClusters: 1 } });

    // Assert — the boundary AGENTS.md warns about
    expect(result.stats.droppedLines).toBeGreaterThan(0);
    expect(result.formatted).toContain('WARNING:');
    expect(result.formatted).toContain('maxClusters reached');
  });
});

// ============================================================================
// Custom preprocessing guide
// ============================================================================

describe('Docs examples: custom preprocessing', () => {
  it('should merge `patterns` over the defaults', () => {
    // Arrange — the shortcut shown in custom-preprocessing.mdx and types.mdx
    const strategy = defineStrategy({
      patterns: {
        orderId: /order-[A-Z0-9]{8}/g,
      },
    });

    // Act
    const masked = strategy.preprocess('Processing order-ABC12345 for tenant acme');

    // Assert
    expect(masked).toBe('Processing <*> for tenant acme');
  });

  it('should let an explicit preprocess override the defaults', () => {
    // Arrange
    const strategy = defineStrategy({
      preprocess: (line) => line.replace(/order-[A-Z0-9]{8}/g, '<*>'),
    });

    // Act — default patterns do not run, so "123" survives
    const masked = strategy.preprocess('Processing order-ABC12345 for user 123');

    // Assert
    expect(masked).toBe('Processing <*> for user 123');
  });

  it('should accept a strategy through drain.preprocessing', () => {
    // Arrange
    const strategy = defineStrategy({ patterns: { orderId: /order-[A-Z0-9]{8}/g } });

    // Act
    const result = compress(
      ['Processing order-ABC12345 for user 123', 'Processing order-XYZ98765 for user 456'],
      { drain: { preprocessing: strategy } }
    );

    // Assert
    expect(result.stats.uniqueTemplates).toBe(1);
    expect(result.templates[0]?.occurrences).toBe(2);
  });
});

// ============================================================================
// Utility functions quoted in types.mdx and llms-full.txt
// ============================================================================

describe('Docs examples: utility functions', () => {
  it('should detect severity as documented', () => {
    expect(detectSeverity('ERROR Connection failed')).toBe('error');
    expect(detectSeverity('WARN Deprecated API')).toBe('warning');
    expect(detectSeverity('INFO Request completed')).toBe('info');
  });

  it('should detect stack frames as documented', () => {
    expect(isStackFrame('    at Function.name (file.js:123:45)')).toBe(true);
    expect(isStackFrame('ERROR Connection failed')).toBe(false);
  });

  it('should extract hostnames as documented', () => {
    expect(extractUrls('GET https://api.example.com/users')).toEqual(['api.example.com']);
    expect(extractUrls('Fetched http://cdn.example.com/image.png')).toEqual([
      'cdn.example.com',
    ]);
  });
});
