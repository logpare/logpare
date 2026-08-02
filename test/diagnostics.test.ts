import { describe, it, expect } from 'vitest';
import { compress, createDrain } from '../src/index.js';
import type { ProgressEvent } from '../src/index.js';

/**
 * End-to-end coverage for the diagnostic metadata carried on Template, and for the
 * DrainOptions that had no test at all. These fields are documented in CLAUDE.md and
 * rendered by formatDetailed, but nothing asserted on them until now.
 */

const HTTP_LINES = [
  'INFO trace-id: req-abc1 GET https://api.example.com/v1/users status 200 took 45ms',
  'INFO trace-id: req-abc2 GET https://api.example.com/v1/users status 200 took 51ms',
  'INFO trace-id: req-abc3 GET https://api.example.com/v1/users status 500 took 1.5s',
];

describe('Template diagnostic fields', () => {
  it('populates every diagnostic sample array', () => {
    const { templates } = compress(HTTP_LINES);
    const template = templates[0];

    expect(template).toBeDefined();
    if (!template) return;

    expect(template.urlSamples).toContain('api.example.com');
    expect(template.fullUrlSamples[0]).toMatch(/^https:\/\/api\.example\.com/);
    expect(template.statusCodeSamples).toContain(200);
    expect(template.correlationIdSamples.length).toBeGreaterThan(0);
    expect(template.durationSamples.length).toBeGreaterThan(0);
  });

  it('respects the per-template sample caps', () => {
    const { templates } = compress(HTTP_LINES, { drain: { maxSamples: 2 } });
    const template = templates[0];

    expect(template).toBeDefined();
    if (!template) return;

    expect(template.sampleVariables.length).toBeLessThanOrEqual(2);
  });

  it('records severity and stack-frame status', () => {
    const { templates } = compress([
      'ERROR Connection refused by upstream alpha',
      'ERROR Connection refused by upstream beta',
    ]);
    const template = templates[0];

    expect(template).toBeDefined();
    if (!template) return;

    expect(template.severity).toBe('error');
    expect(template.isStackFrame).toBe(false);
  });

  it('flags stack frames', () => {
    const { templates } = compress([
      '    at Object.handler (/app/a.js:10:15)',
      '    at Object.handler (/app/b.js:11:16)',
    ]);
    const template = templates[0];

    expect(template).toBeDefined();
    if (!template) return;

    expect(template.isStackFrame).toBe(true);
  });

  it('tracks firstSeen and lastSeen line indices', () => {
    const { templates } = compress(HTTP_LINES);
    const template = templates[0];

    expect(template).toBeDefined();
    if (!template) return;

    expect(template.firstSeen).toBe(0);
    expect(template.lastSeen).toBeGreaterThanOrEqual(template.firstSeen);
  });
});

describe('detailed output renders diagnostics', () => {
  it('includes every diagnostic section', () => {
    const { formatted } = compress(HTTP_LINES, { format: 'detailed' });

    expect(formatted).toContain('Severity:');
    expect(formatted).toContain('Status codes:');
    expect(formatted).toContain('Correlation IDs:');
    expect(formatted).toContain('Durations:');
    expect(formatted).toContain('api.example.com');
  });
});

describe('DrainOptions.onProgress', () => {
  it('reports progress and reaches the final line count', () => {
    const events: ProgressEvent[] = [];
    const drain = createDrain({ onProgress: (event) => events.push(event) });

    drain.addLogLines(Array.from({ length: 50 }, (_, i) => `INFO request ${i} handled`));

    expect(events.length).toBeGreaterThan(0);

    const first = events[0];
    expect(first).toBeDefined();
    if (first) {
      expect(first.currentPhase).toBe('parsing');
      expect(first.totalLines).toBe(50);
    }

    const last = events[events.length - 1];
    expect(last).toBeDefined();
    if (last) {
      expect(last.processedLines).toBe(50);
      expect(last.percentComplete).toBe(100);
    }
  });

  it('is optional', () => {
    expect(() => createDrain().addLogLines(['INFO a'])).not.toThrow();
  });
});

describe('DrainOptions.preprocessing', () => {
  it('routes every line through a custom strategy', () => {
    let calls = 0;
    const drain = createDrain({
      preprocessing: {
        preprocess(line: string): string {
          calls++;
          return line.replace(/\d+/g, '<*>');
        },
        tokenize: (line: string) => line.split(/\s+/).filter(Boolean),
        getSimThreshold: () => 0.4,
      },
    });

    drain.addLogLines(['INFO id 1', 'INFO id 2', 'INFO id 3']);

    expect(calls).toBe(3);
    expect(drain.getTemplates()).toHaveLength(1);
  });
});

describe('DrainOptions.simThreshold', () => {
  it('changes clustering behaviour', () => {
    const lines = [
      'svc alpha beta gamma delta',
      'svc alpha beta gamma epsilon',
      'svc alpha beta gamma zeta',
    ];

    const permissive = createDrain({ simThreshold: 0.1 });
    permissive.addLogLines(lines);

    const strict = createDrain({ simThreshold: 1 });
    strict.addLogLines(lines);

    // A threshold of 1 demands an exact match, so nothing merges.
    expect(strict.getTemplates().length).toBeGreaterThan(permissive.getTemplates().length);
  });

  it('defers to the strategy when not supplied', () => {
    const lines = ['svc alpha beta gamma delta', 'svc alpha beta gamma epsilon'];

    const viaOption = createDrain({ simThreshold: 1 });
    viaOption.addLogLines(lines);

    const viaStrategy = createDrain({
      preprocessing: {
        preprocess: (line: string) => line,
        tokenize: (line: string) => line.split(/\s+/).filter(Boolean),
        getSimThreshold: () => 1,
      },
    });
    viaStrategy.addLogLines(lines);

    expect(viaOption.getTemplates().length).toBe(viaStrategy.getTemplates().length);
  });
});

describe('maxClusters truncation is reported', () => {
  it('counts dropped lines and warns in the formatted output', () => {
    const drain = createDrain({ maxClusters: 2 });
    for (let i = 0; i < 30; i++) {
      drain.addLogLine(`alpha${i} beta${i} gamma${i} unique${i}`);
    }

    const result = drain.getResult('summary');

    expect(result.stats.droppedLines).toBeGreaterThan(0);
    expect(result.formatted).toContain('WARNING');
    expect(result.formatted).toContain('maxClusters reached');
  });

  it('reports zero dropped lines when under the cap', () => {
    const result = compress(['INFO a 1', 'INFO a 2']);

    expect(result.stats.droppedLines).toBe(0);
    expect(result.formatted).not.toContain('WARNING');
  });
});
