import { describe, it, expect } from 'vitest';

// Imported from the public barrel on purpose: every other test file imports deep
// paths, which left src/index.ts covered only by substring matching in
// architecture.test.ts. This exercises the real published surface.
import {
  detectSeverity,
  isStackFrame,
  extractUrls,
  extractFullUrls,
  extractStatusCodes,
  extractCorrelationIds,
  extractDurations,
  SEVERITY_PATTERNS,
  STACK_FRAME_PATTERNS,
  WILDCARD,
  compress,
  createDrain,
  Drain,
} from '../src/index.js';

describe('detectSeverity', () => {
  it('detects error-level lines', () => {
    expect(detectSeverity('ERROR Connection refused')).toBe('error');
    expect(detectSeverity('Uncaught TypeError: x is not a function')).toBe('error');
    expect(detectSeverity('FATAL disk failure')).toBe('error');
    expect(detectSeverity('Request Failed after 3 retries')).toBe('error');
  });

  it('detects warning-level lines', () => {
    expect(detectSeverity('WARN slow query')).toBe('warning');
    expect(detectSeverity('[Violation] handler took 200ms')).toBe('warning');
    expect(detectSeverity('DEPRECATED: use foo() instead')).toBe('warning');
  });

  it('falls back to info', () => {
    expect(detectSeverity('INFO server started')).toBe('info');
    expect(detectSeverity('just a plain message')).toBe('info');
  });

  it('prefers error over warning when both appear', () => {
    expect(detectSeverity('WARN followed by ERROR')).toBe('error');
  });

  it('matches unanchored, so severity words inside other words count', () => {
    // Documented known behaviour, not an endorsement: the patterns use \b
    // boundaries but are not anchored, so a hyphenated compound still matches.
    expect(detectSeverity('Handling user input for error-reporting page')).toBe('error');
  });

  it('exposes the underlying patterns', () => {
    expect(SEVERITY_PATTERNS.error.test('ERROR')).toBe(true);
    expect(SEVERITY_PATTERNS.warning.test('WARN')).toBe(true);
    expect(SEVERITY_PATTERNS.error.test('nothing here')).toBe(false);
  });
});

describe('isStackFrame', () => {
  it('detects V8/Node frames', () => {
    expect(isStackFrame('    at Object.<anonymous> (/app/index.js:10:15)')).toBe(true);
    expect(isStackFrame('at processTicksAndRejections')).toBe(true);
  });

  it('detects Firefox frames', () => {
    expect(isStackFrame('@file.js:123')).toBe(true);
    expect(isStackFrame('renderList@/app/bundle.js:42')).toBe(true);
  });

  it('detects Chrome DevTools frames', () => {
    expect(isStackFrame('(anonymous) @ bundle.js:1')).toBe(true);
    expect(isStackFrame('handleClick @ app.js:99')).toBe(true);
  });

  it('rejects ordinary log lines', () => {
    expect(isStackFrame('INFO server started')).toBe(false);
    expect(isStackFrame('ERROR Connection refused')).toBe(false);
    expect(isStackFrame('')).toBe(false);
  });

  it('false-positives on user@host:port (known limitation)', () => {
    // The Firefox "named frame" pattern cannot distinguish this from a real
    // frame. Recorded so a future fix has a test to flip.
    expect(isStackFrame('user@host:22')).toBe(true);
  });

  it('exposes the underlying patterns', () => {
    expect(STACK_FRAME_PATTERNS.length).toBeGreaterThan(0);
    expect(STACK_FRAME_PATTERNS.some((p) => p.test('    at foo'))).toBe(true);
  });
});

describe('extractUrls', () => {
  it('returns hostnames only, deduplicated', () => {
    const line = 'GET https://api.example.com/v1/users then https://api.example.com/v1/orders';
    expect(extractUrls(line)).toEqual(['api.example.com']);
  });

  it('returns multiple distinct hosts in order', () => {
    const line = 'proxy https://a.example.com/x to http://b.example.com/y';
    expect(extractUrls(line)).toEqual(['a.example.com', 'b.example.com']);
  });

  it('returns an empty array when there is no URL', () => {
    expect(extractUrls('INFO nothing to see here')).toEqual([]);
  });
});

describe('extractFullUrls', () => {
  it('returns complete URLs', () => {
    const line = 'GET https://api.example.com/v1/users?page=2';
    expect(extractFullUrls(line)).toEqual(['https://api.example.com/v1/users?page=2']);
  });

  it('returns an empty array when there is no URL', () => {
    expect(extractFullUrls('no urls here')).toEqual([]);
  });
});

describe('extractStatusCodes', () => {
  it('extracts codes from the supported context forms', () => {
    expect(extractStatusCodes('status 404')).toEqual([404]);
    expect(extractStatusCodes('status: 500')).toEqual([500]);
    expect(extractStatusCodes('HTTP/1.1 503 backend down')).toEqual([503]);
    expect(extractStatusCodes('code=200')).toEqual([200]);
    expect(extractStatusCodes('200 OK')).toEqual([200]);
  });

  it('deduplicates repeated codes', () => {
    expect(extractStatusCodes('status 404 then status: 404')).toEqual([404]);
  });

  it('ignores out-of-range numbers and bare integers', () => {
    expect(extractStatusCodes('status 999')).toEqual([]);
    expect(extractStatusCodes('processed 404 records')).toEqual([]);
  });

  it('is repeatable across calls (shared regex state is rewound)', () => {
    const line = 'status 404';
    expect(extractStatusCodes(line)).toEqual([404]);
    expect(extractStatusCodes(line)).toEqual([404]);
    expect(extractStatusCodes(line)).toEqual([404]);
  });
});

describe('extractCorrelationIds', () => {
  it('extracts named correlation IDs', () => {
    expect(extractCorrelationIds('trace-id: abc123')).toEqual(['abc123']);
    expect(extractCorrelationIds('request_id=req-99')).toEqual(['req-99']);
    expect(extractCorrelationIds('x-request-id: xyz-1')).toEqual(['xyz-1']);
  });

  it('extracts standalone UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(extractCorrelationIds(`req ${uuid} done`)).toEqual([uuid]);
  });

  it('caps at 3 IDs per line', () => {
    const line = 'trace-id: a1 request-id: b2 correlation-id: c3 x-request-id: d4';
    expect(extractCorrelationIds(line)).toHaveLength(3);
  });

  it('returns an empty array when there is nothing to extract', () => {
    expect(extractCorrelationIds('INFO plain message')).toEqual([]);
  });

  it('is repeatable across calls (shared regex state is rewound)', () => {
    const line = 'trace-id: abc123';
    expect(extractCorrelationIds(line)).toEqual(['abc123']);
    expect(extractCorrelationIds(line)).toEqual(['abc123']);
  });
});

describe('extractDurations', () => {
  it('extracts durations with a range of units', () => {
    expect(extractDurations('took 80ms')).toEqual(['80ms']);
    expect(extractDurations('took 1.5s')).toEqual(['1.5s']);
    expect(extractDurations('took 250µs')).toEqual(['250µs']);
    expect(extractDurations('took 3 min')).toEqual(['3min']);
  });

  it('normalises whitespace between value and unit', () => {
    expect(extractDurations('elapsed 45 ms')).toEqual(['45ms']);
  });

  it('deduplicates and caps at 5 per line', () => {
    expect(extractDurations('1ms 2ms 3ms 4ms 5ms 6ms 7ms')).toHaveLength(5);
    expect(extractDurations('80ms and 80ms')).toEqual(['80ms']);
  });

  it('returns an empty array when there is no duration', () => {
    expect(extractDurations('INFO no timings')).toEqual([]);
  });
});

describe('public barrel', () => {
  it('exports WILDCARD as the documented placeholder', () => {
    expect(WILDCARD).toBe('<*>');
  });

  it('exports Drain as a constructible class, not just a type', () => {
    expect(typeof Drain).toBe('function');
    expect(createDrain()).toBeInstanceOf(Drain);
  });

  it('exports a working compress()', () => {
    const result = compress(['INFO a 1', 'INFO a 2']);
    expect(result.stats.inputLines).toBe(2);
    expect(result.templates.length).toBeGreaterThan(0);
  });
});
