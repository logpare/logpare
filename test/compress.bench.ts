import { bench, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compress, compressText } from '../src/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load test fixtures
const hdfsLog = readFileSync(resolve(__dirname, 'fixtures/hdfs.log'), 'utf-8');
const sparkLog = readFileSync(resolve(__dirname, 'fixtures/spark.log'), 'utf-8');
const linuxLog = readFileSync(resolve(__dirname, 'fixtures/linux.log'), 'utf-8');

// Generate synthetic logs for scalability testing
function generateRepetitiveLogs(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) =>
      `INFO Request ${i % 100} from 192.168.1.${i % 256} completed in ${50 + (i % 100)}ms`
  );
}

function generateVariedLogs(count: number): string[] {
  const types = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const actions = ['Request', 'Response', 'Connection', 'Transaction'];
  return Array.from(
    { length: count },
    (_, i) =>
      `${types[i % types.length]} ${actions[i % actions.length]} ${i} processed at ${new Date().toISOString()}`
  );
}

describe('Fixture Compression Performance', () => {
  bench('compress HDFS logs', () => {
    compressText(hdfsLog);
  });

  bench('compress Spark logs', () => {
    compressText(sparkLog);
  });

  bench('compress Linux logs', () => {
    compressText(linuxLog);
  });
});

describe('Scalability - Repetitive Logs', () => {
  const logs1k = generateRepetitiveLogs(1_000);
  const logs10k = generateRepetitiveLogs(10_000);
  const logs100k = generateRepetitiveLogs(100_000);

  bench('1,000 repetitive lines', () => {
    compress(logs1k);
  });

  bench('10,000 repetitive lines', () => {
    compress(logs10k);
  });

  bench('100,000 repetitive lines', () => {
    compress(logs100k);
  });
});

describe('Scalability - Varied Logs', () => {
  const varied1k = generateVariedLogs(1_000);
  const varied10k = generateVariedLogs(10_000);

  bench('1,000 varied lines', () => {
    compress(varied1k);
  });

  bench('10,000 varied lines', () => {
    compress(varied10k);
  });
});

describe('Output Formats', () => {
  const logs = generateRepetitiveLogs(1_000);

  bench('format: summary', () => {
    compress(logs, { format: 'summary' });
  });

  bench('format: detailed', () => {
    compress(logs, { format: 'detailed' });
  });

  bench('format: json', () => {
    compress(logs, { format: 'json' });
  });
});

describe('Compression Ratio Verification', () => {
  bench('HDFS compression ratio', () => {
    const result = compressText(hdfsLog);
    // The benchmark framework will report timing
    // Compression ratio should be > 0.5 for repetitive logs
    return result.stats.compressionRatio;
  });

  bench('highly repetitive logs (identical lines)', () => {
    const lines = Array.from({ length: 10_000 }, () => 'INFO Request processed successfully');
    const result = compress(lines);
    // Should achieve very high compression
    return result.stats.compressionRatio;
  });
});
