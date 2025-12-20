/**
 * Custom preprocessing strategy example for logpare
 *
 * Run with: npx tsx examples/custom-strategy.ts
 */
import { compress, defineStrategy, DEFAULT_PATTERNS } from 'logpare';

// Example 1: Add custom patterns to mask domain-specific IDs
const customStrategy = defineStrategy({
  patterns: {
    // Match custom request IDs like "REQ-12345-ABC"
    customRequestId: /REQ-\d+-[A-Z]+/gi,
    // Match session tokens
    sessionToken: /sess_[a-f0-9]{32}/gi,
    // Match order IDs
    orderId: /order-[0-9]{10}/gi,
  },
});

const logs = [
  'Processing REQ-12345-ABC from user 42',
  'Processing REQ-67890-DEF from user 108',
  'Session sess_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4 started',
  'Session sess_ffffffffffffffffffffffffffffffff started',
  'Order order-1234567890 created',
  'Order order-9876543210 created',
];

console.log('=== Custom Patterns Example ===\n');
const result = compress(logs, {
  drain: { preprocessing: customStrategy },
});
console.log(result.formatted);

// Example 2: Custom tokenization (e.g., for CSV logs)
const csvStrategy = defineStrategy({
  tokenize: (line) => line.split(',').map((t) => t.trim()),
});

const csvLogs = [
  '2024-01-15, INFO, user1, Login successful',
  '2024-01-15, INFO, user2, Login successful',
  '2024-01-16, ERROR, user1, Connection failed',
  '2024-01-16, ERROR, user3, Connection failed',
];

console.log('\n=== CSV Tokenization Example ===\n');
const csvResult = compress(csvLogs, {
  drain: { preprocessing: csvStrategy },
});
console.log(csvResult.formatted);

// Example 3: Dynamic similarity threshold
const adaptiveStrategy = defineStrategy({
  // Higher threshold at shallow depths (stricter matching),
  // lower threshold at deeper depths (more flexible)
  getSimThreshold: (depth) => {
    if (depth <= 2) return 0.6; // Strict at top levels
    if (depth <= 4) return 0.4; // Default at mid levels
    return 0.3; // Lenient at deep levels
  },
});

console.log('\n=== Adaptive Threshold Example ===\n');
const adaptiveResult = compress(logs, {
  drain: { preprocessing: adaptiveStrategy },
});
console.log(adaptiveResult.formatted);
