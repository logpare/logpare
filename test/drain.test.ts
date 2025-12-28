import { describe, it, expect } from 'vitest';
import { createDrain, Drain } from '../src/drain/index.js';
import { LogCluster } from '../src/drain/cluster.js';
import { DrainNode } from '../src/drain/node.js';

describe('DrainNode', () => {
  it('should initialize with correct depth', () => {
    const node = new DrainNode(3);
    expect(node.depth).toBe(3);
    expect(node.childCount).toBe(0);
    expect(node.clusterCount).toBe(0);
  });

  it('should use Map for children (V8 optimization)', () => {
    const node = new DrainNode(0);
    expect(node.children).toBeInstanceOf(Map);
  });

  it('should create and retrieve children', () => {
    const node = new DrainNode(0);
    const child = node.getOrCreateChild('test');

    expect(child).toBeInstanceOf(DrainNode);
    expect(child.depth).toBe(1);
    expect(node.hasChild('test')).toBe(true);
    expect(node.getChild('test')).toBe(child);
  });

  it('should return same child on repeated getOrCreateChild', () => {
    const node = new DrainNode(0);
    const child1 = node.getOrCreateChild('key');
    const child2 = node.getOrCreateChild('key');

    expect(child1).toBe(child2);
  });
});

describe('LogCluster', () => {
  it('should initialize with correct values', () => {
    const cluster = new LogCluster('t001', ['ERROR', 'Connection', 'failed'], 5);

    expect(cluster.id).toBe('t001');
    expect(cluster.tokens).toEqual(['ERROR', 'Connection', 'failed']);
    expect(cluster.count).toBe(1);
    expect(cluster.firstSeen).toBe(5);
    expect(cluster.lastSeen).toBe(5);
    expect(cluster.sampleVariables).toEqual([]);
  });

  it('should update count and lastSeen on update', () => {
    const cluster = new LogCluster('t001', ['ERROR', '<*>', 'failed'], 0);

    cluster.update(['ERROR', '192.168.1.1', 'failed'], 10);
    expect(cluster.count).toBe(2);
    expect(cluster.lastSeen).toBe(10);
    expect(cluster.firstSeen).toBe(0);
  });

  it('should extract variables on update', () => {
    const cluster = new LogCluster('t001', ['Connection', 'from', '<*>', 'established'], 0);

    const vars = cluster.update(['Connection', 'from', '10.0.0.1', 'established'], 1);
    expect(vars).toEqual(['10.0.0.1']);
    expect(cluster.sampleVariables).toHaveLength(1);
    expect(cluster.sampleVariables[0]).toEqual(['10.0.0.1']);
  });

  it('should limit sample variables', () => {
    const cluster = new LogCluster('t001', ['IP:', '<*>'], 0, 2);

    cluster.update(['IP:', '1.1.1.1'], 1);
    cluster.update(['IP:', '2.2.2.2'], 2);
    cluster.update(['IP:', '3.3.3.3'], 3);

    expect(cluster.sampleVariables).toHaveLength(2);
  });

  it('should compute similarity correctly', () => {
    const cluster = new LogCluster('t001', ['ERROR', '<*>', 'failed'], 0);

    // Exact match (with wildcard)
    expect(cluster.computeSimilarity(['ERROR', 'timeout', 'failed'])).toBe(1);

    // Different length
    expect(cluster.computeSimilarity(['ERROR', 'failed'])).toBe(0);

    // Partial match
    const cluster2 = new LogCluster('t002', ['A', 'B', 'C', 'D'], 0);
    expect(cluster2.computeSimilarity(['A', 'B', 'X', 'Y'])).toBe(0.5);
  });

  it('should merge tokens into wildcards', () => {
    const cluster = new LogCluster('t001', ['ERROR', 'timeout', 'on', 'port', '8080'], 0);

    cluster.mergeTokens(['ERROR', 'connection', 'on', 'port', '9090']);

    expect(cluster.tokens).toEqual(['ERROR', '<*>', 'on', 'port', '<*>']);
  });

  it('should generate pattern string', () => {
    const cluster = new LogCluster('t001', ['Connection', 'from', '<*>', 'established'], 0);
    expect(cluster.getPattern()).toBe('Connection from <*> established');
  });
});

describe('Drain', () => {
  it('should create with default options', () => {
    const drain = createDrain();
    expect(drain.totalLines).toBe(0);
    expect(drain.totalClusters).toBe(0);
  });

  it('should process simple log lines', () => {
    const drain = createDrain();

    drain.addLogLine('ERROR connection failed');
    drain.addLogLine('ERROR connection failed');
    drain.addLogLine('ERROR connection failed');

    expect(drain.totalLines).toBe(3);
    expect(drain.totalClusters).toBe(1);
  });

  it('should discover templates from similar logs', () => {
    const drain = createDrain();

    drain.addLogLines([
      'Connection from 192.168.1.1 established',
      'Connection from 192.168.1.2 established',
      'Connection from 10.0.0.1 established',
    ]);

    const templates = drain.getTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.occurrences).toBe(3);
    expect(templates[0]?.pattern).toContain('<*>');
  });

  it('should separate distinct templates', () => {
    const drain = createDrain();

    drain.addLogLines([
      'INFO Starting server',
      'INFO Starting server',
      'ERROR Connection failed',
      'ERROR Connection failed',
    ]);

    const templates = drain.getTemplates();
    expect(templates).toHaveLength(2);
  });

  it('should skip empty lines', () => {
    const drain = createDrain();

    // Use different message types to ensure different templates
    drain.addLogLines(['INFO Starting server', '', '  ', 'ERROR Connection failed']);

    expect(drain.totalLines).toBe(4);
    expect(drain.totalClusters).toBe(2);
  });

  it('should respect maxClusters limit', () => {
    const drain = createDrain({ maxClusters: 3 });

    // Create unique lines to force new clusters
    drain.addLogLines([
      'unique pattern one alpha',
      'unique pattern two beta',
      'unique pattern three gamma',
      'unique pattern four delta',
      'unique pattern five epsilon',
    ]);

    expect(drain.totalClusters).toBeLessThanOrEqual(3);
  });

  it('should handle batch processing', () => {
    const drain = createDrain();

    const lines = Array.from({ length: 100 }, (_, i) => `Request ${i} processed in 50ms`);
    drain.addLogLines(lines);

    expect(drain.totalLines).toBe(100);
    // Should merge into few templates due to similar structure
    expect(drain.totalClusters).toBeLessThan(10);
  });
});

describe('Drain output formats', () => {
  it('should produce summary format', () => {
    const drain = createDrain();

    drain.addLogLines([
      'INFO Server started on port 8080',
      'INFO Server started on port 9090',
      'ERROR Connection timeout',
    ]);

    const result = drain.getResult('summary');

    expect(result.formatted).toContain('Log Compression Summary');
    expect(result.formatted).toContain('templates');
    expect(result.stats.inputLines).toBe(3);
    expect(result.stats.uniqueTemplates).toBe(2);
  });

  it('should produce detailed format', () => {
    const drain = createDrain();

    drain.addLogLines([
      'Request from 1.1.1.1 completed',
      'Request from 2.2.2.2 completed',
    ]);

    const result = drain.getResult('detailed');

    expect(result.formatted).toContain('Log Compression Details');
    expect(result.formatted).toContain('Pattern:');
    expect(result.formatted).toContain('First seen:');
  });

  it('should produce JSON format', () => {
    const drain = createDrain();

    drain.addLogLines(['Test log message', 'Test log message']);

    const result = drain.getResult('json');
    const parsed = JSON.parse(result.formatted);

    expect(parsed.version).toBe('1.1');
    expect(parsed.stats).toBeDefined();
    expect(parsed.templates).toBeInstanceOf(Array);
    expect(parsed.templates[0].occurrences).toBe(2);
  });

  it('should calculate compression stats', () => {
    const drain = createDrain();

    // 100 similar lines should compress well
    const lines = Array.from({ length: 100 }, () => 'INFO Request processed successfully');
    drain.addLogLines(lines);

    const result = drain.getResult();

    expect(result.stats.inputLines).toBe(100);
    expect(result.stats.uniqueTemplates).toBe(1);
    expect(result.stats.compressionRatio).toBeGreaterThan(0.9);
    expect(result.stats.estimatedTokenReduction).toBeGreaterThan(0.5);
  });
});
