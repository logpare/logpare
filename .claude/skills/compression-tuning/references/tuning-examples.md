# Compression Tuning Examples

Real-world case studies demonstrating parameter optimization for different log types.

## Case Study 1: Apache Access Logs

### Problem
Default settings produced 847 templates from 50,000 log lines. Expected ~20-30 templates.

### Initial Results (defaults)
```typescript
const result = compress(apacheLogs);
// stats: { inputLines: 50000, uniqueTemplates: 847, compressionRatio: 0.983 }
```

### Investigation
Top templates revealed unmasked query parameters:
```
[1,234x] GET /api/users?id=<*>
[1,156x] GET /api/users?id=<*>&format=<*>
[1,089x] GET /api/users?id=<*>&format=<*>&limit=<*>
```

### Solution: Custom Pattern Masking
```typescript
import { defineStrategy } from 'logpare';

const webStrategy = defineStrategy({
  patterns: {
    queryParam: /[?&][a-z_]+=[^&\s]+/gi,
  }
});

const result = compress(apacheLogs, {
  drain: { preprocessing: webStrategy }
});
// stats: { uniqueTemplates: 23, compressionRatio: 0.9995 }
```

### Result
- Before: 847 templates (98.3% reduction)
- After: 23 templates (99.95% reduction)
- **63% more compression** by masking query parameters

---

## Case Study 2: Kubernetes Pod Logs

### Problem
Templates too generic—different error types grouped together.

### Initial Results
```
[15,234x] <*> <*> <*> error <*>
```

This merged CrashLoopBackOff, ImagePullBackOff, and OOMKilled errors.

### Solution: Higher Threshold + More Depth
```typescript
const result = compress(k8sLogs, {
  drain: {
    depth: 6,         // Increased from 4
    simThreshold: 0.6  // Raised from 0.4
  }
});
```

### Result
```
[8,234x] Pod nginx-7d8b <*> error CrashLoopBackOff <*>
[4,123x] Pod postgres-5f9 <*> error OOMKilled <*>
[2,877x] Pod redis-3a1b <*> error ImagePullBackOff <*>
```

Better semantic separation while maintaining high compression.

---

## Case Study 3: Elasticsearch Bulk Insert Logs

### Problem
15M lines consuming 8GB memory during compression.

### Initial Results (defaults)
```typescript
const drain = createDrain();
drain.addLogLines(esLogs); // 15M lines
// Memory usage: 8.2 GB
```

### Solution: Memory Caps
```typescript
const drain = createDrain({
  maxClusters: 300,  // Hard cap on templates
  maxChildren: 30    // Limit tree width
});

drain.addLogLines(esLogs);
// Memory usage: 1.1 GB
// Processing time: 142s (vs 156s with defaults)
```

### Result
- **87% memory reduction** (8.2GB → 1.1GB)
- Minimal template quality loss (458 → 300 templates)
- 9% faster processing

---

## Case Study 4: JSON Application Logs

### Problem
Structured JSON logs had excessive tree depth.

### Initial Log Format
```json
{"level":"info","timestamp":"2024-01-15T10:30:45Z","message":"Request processed","userId":123,"duration":45}
```

### Solution: Shallow Depth + High Threshold
```typescript
// Custom tokenization for JSON logs
const jsonStrategy = defineStrategy({
  tokenize: (line) => {
    // Treat entire JSON as structured data
    const parsed = JSON.parse(line);
    return [parsed.level, parsed.message]; // Key fields only
  },
  getSimThreshold: () => 0.7
});

const result = compress(jsonLogs, {
  drain: {
    depth: 2,  // Only level + message
    preprocessing: jsonStrategy
  }
});
```

### Result
- Processing speed: **3.2x faster** (structured parsing)
- Templates: 34 (vs 127 with default tokenization)
- Better semantic grouping by log message, not variable data

---

## Case Study 5: Noisy CI/CD Build Logs

### Problem
Build logs with npm warnings, lint output, test results—highly varied.

### Example Variation
```
npm WARN deprecated package@1.0.0: Use package@2.0.0 instead
npm WARN deprecated another-pkg@3.2.1: This package is no longer maintained
eslint: 12 problems (8 errors, 4 warnings)
jest: 145 tests passed, 2 failed
```

### Solution: Low Threshold for Variation
```typescript
const result = compress(buildLogs, {
  drain: {
    depth: 5,         // More context
    simThreshold: 0.25 // Very permissive (allow variation)
  }
});
```

### Result
Successfully grouped:
```
[234x] npm WARN deprecated <*> <*>
[89x] eslint: <*> problems (<*> errors, <*> warnings)
[145x] jest: <*> tests passed, <*> failed
```

Low threshold (0.25) allowed natural language variation while preserving patterns.

---

## Quick Reference Table

| Log Type | depth | simThreshold | maxClusters | Reason |
|----------|-------|--------------|-------------|--------|
| Apache/Nginx access | 4 | 0.4 | 1000 | Defaults + query param masking |
| Kubernetes events | 6 | 0.6 | 1000 | Deep context, strict matching |
| Elasticsearch bulk | 4 | 0.4 | 300 | Memory optimization |
| JSON structured | 2 | 0.7 | 500 | Shallow depth, strict matching |
| CI/CD builds | 5 | 0.25 | 2000 | High variation tolerance |
| Database query logs | 5 | 0.5 | 1000 | Medium context + strictness |
| System logs (syslog) | 4 | 0.4 | 1000 | Defaults work well |

---

## Diagnostic Commands

### Check current compression effectiveness
```typescript
const result = compress(logs);
console.log(`${result.stats.uniqueTemplates} templates from ${result.stats.inputLines} lines`);
console.log(`Compression: ${(result.stats.compressionRatio * 100).toFixed(2)}%`);
console.log(`Token reduction: ${(result.stats.estimatedTokenReduction * 100).toFixed(1)}%`);
```

### Inspect top templates for grouping issues
```typescript
result.templates
  .sort((a, b) => b.occurrences - a.occurrences)
  .slice(0, 10)
  .forEach(t => {
    console.log(`[${t.occurrences}x] ${t.pattern}`);
    console.log(`  Samples: ${JSON.stringify(t.sampleVariables.slice(0, 3))}`);
  });
```

### Find rare events (potential over-splitting)
```typescript
const rare = result.templates.filter(t => t.occurrences <= 3);
console.log(`${rare.length} templates with ≤3 occurrences`);
rare.forEach(t => console.log(`  [${t.occurrences}x] ${t.pattern}`));
```

### Memory usage estimation
```javascript
const estimatedMemory = result.stats.uniqueTemplates * 2; // ~2KB per template
console.log(`Estimated memory: ${estimatedMemory}KB`);
```
