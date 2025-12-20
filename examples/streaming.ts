/**
 * Streaming/incremental processing example for logpare
 *
 * Run with: npx tsx examples/streaming.ts
 */
import { createDrain } from 'logpare';

// Use createDrain() for incremental processing where logs arrive over time
const drain = createDrain({
  depth: 4,
  simThreshold: 0.4,
  maxClusters: 100,
});

// Simulate logs arriving in batches
const batch1 = [
  'INFO Server started on port 8080',
  'INFO Connection from 192.168.1.1 established',
  'DEBUG Processing request req-001',
];

const batch2 = [
  'INFO Connection from 192.168.1.2 established',
  'DEBUG Processing request req-002',
  'WARN High memory usage: 85%',
];

const batch3 = [
  'INFO Connection from 10.0.0.1 established',
  'DEBUG Processing request req-003',
  'ERROR Connection timeout after 30s',
  'WARN High memory usage: 92%',
];

console.log('=== Streaming Example ===\n');

// Process batch 1
console.log('Processing batch 1...');
drain.addLogLines(batch1);
let result = drain.getResult('summary', 10);
console.log(`Templates so far: ${result.stats.uniqueTemplates}\n`);

// Process batch 2
console.log('Processing batch 2...');
drain.addLogLines(batch2);
result = drain.getResult('summary', 10);
console.log(`Templates so far: ${result.stats.uniqueTemplates}\n`);

// Process batch 3
console.log('Processing batch 3...');
drain.addLogLines(batch3);
result = drain.getResult('summary', 10);
console.log(`Templates so far: ${result.stats.uniqueTemplates}\n`);

// Final summary
console.log('=== Final Results ===\n');
console.log(result.formatted);

// Example: Process single lines (useful for real-time log processing)
console.log('\n=== Single Line Processing ===\n');
const realtimeDrain = createDrain();

const incomingLogs = [
  'Request from client-1 took 150ms',
  'Request from client-2 took 230ms',
  'Request from client-3 took 180ms',
];

for (const line of incomingLogs) {
  const cluster = realtimeDrain.add(line);
  console.log(`Line: "${line}"`);
  console.log(`  → Template: "${cluster.template}"`);
  console.log(`  → Occurrences: ${cluster.occurrences}\n`);
}
