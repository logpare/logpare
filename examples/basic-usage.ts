/**
 * Basic usage example for logpare
 *
 * Run with: npx tsx examples/basic-usage.ts
 */
import { compress, compressText } from 'logpare';

// Example 1: Compress an array of log lines
const logs = [
  'INFO Connection from 192.168.1.1 established',
  'INFO Connection from 192.168.1.2 established',
  'DEBUG Processing request req-abc123',
  'DEBUG Processing request req-def456',
  'ERROR Connection timeout after 30s',
  'INFO Connection from 10.0.0.1 established',
  'DEBUG Processing request req-ghi789',
  'WARN Retry attempt 1 for service-auth',
  'WARN Retry attempt 2 for service-auth',
];

console.log('=== Example 1: compress() with array ===\n');
const result1 = compress(logs);
console.log(result1.formatted);

console.log('\n=== Example 2: Stats ===\n');
console.log('Input lines:', result1.stats.inputLines);
console.log('Unique templates:', result1.stats.uniqueTemplates);
console.log('Compression ratio:', (result1.stats.compressionRatio * 100).toFixed(1) + '%');
console.log('Token reduction:', (result1.stats.estimatedTokenReduction * 100).toFixed(1) + '%');

// Example 3: Different output formats
console.log('\n=== Example 3: JSON output ===\n');
const result2 = compress(logs, { format: 'json' });
console.log(JSON.stringify(result2.templates.slice(0, 2), null, 2));

// Example 4: compressText for string input
console.log('\n=== Example 4: compressText() ===\n');
const logText = logs.join('\n');
const result3 = compressText(logText, { format: 'detailed' });
console.log(result3.formatted);
