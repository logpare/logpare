---
name: debugging-templates
description: Use when troubleshooting logpare template generation issues, investigating why logs aren't grouping correctly, diagnosing unexpected compression results, or analyzing template quality problems.
---

# Debugging Template Generation

Systematic debugging guide for logpare compression issues.

## When to Use

Activate this skill when:
- Templates not grouping similar logs
- Too many or too few templates generated
- Templates missing expected patterns
- Compression ratio lower than expected
- Users report "weird" or unexpected templates
- Need to trace how a specific log line was processed
- Investigating algorithm behavior

## Four-Phase Debugging Process

### Phase 1: Gather Evidence
Collect compression results and identify the problem.

### Phase 2: Isolate the Issue
Narrow down to specific log lines or patterns.

### Phase 3: Root Cause Analysis
Trace through preprocessing → tokenization → tree navigation → clustering.

### Phase 4: Apply Fix
Adjust parameters or preprocessing strategy.

---

## Phase 1: Gather Evidence

### Check Compression Stats
```typescript
const result = compress(logs);

console.log('=== Compression Stats ===');
console.log(`Input lines: ${result.stats.inputLines}`);
console.log(`Unique templates: ${result.stats.uniqueTemplates}`);
console.log(`Compression ratio: ${(result.stats.compressionRatio * 100).toFixed(2)}%`);
console.log(`Token reduction: ${(result.stats.estimatedTokenReduction * 100).toFixed(1)}%`);
```

**Expected ranges**:
- Compression ratio: 90-99.9% for typical logs
- Templates: 10-100 for most applications
- Token reduction: 60-95%

**Red flags**:
- Templates > 500 → Likely over-splitting
- Templates < 5 → Likely over-grouping
- Compression < 80% → Not finding patterns

### Inspect Top Templates
```typescript
const top = result.templates
  .sort((a, b) => b.occurrences - a.occurrences)
  .slice(0, 20);

top.forEach((t, i) => {
  console.log(`\n${i+1}. [${t.occurrences}x] ${t.pattern}`);
  console.log(`   Samples: ${JSON.stringify(t.sampleVariables.slice(0, 3))}`);
  console.log(`   Severity: ${t.severity}, Stack: ${t.isStackFrame}`);
});
```

**Look for**:
- Templates that should be merged (slight variations)
- Overly generic patterns (`<*> <*> <*>`)
- Suspiciously similar patterns with different occurrences

### Find Rare Events
```typescript
const rare = result.templates.filter(t => t.occurrences <= 3);
console.log(`\n${rare.length} rare templates (≤3 occurrences):`);
rare.forEach(t => {
  console.log(`[${t.occurrences}x] ${t.pattern}`);
});
```

**Questions**:
- Should these be rare, or should they have grouped?
- Are they actually unique events or variations?

---

## Phase 2: Isolate the Issue

### Test with Minimal Example
Extract the problematic logs and create a minimal reproduction:

```typescript
// Find the logs that generated unexpected templates
const problematicLogs = [
  'Connection from 192.168.1.1 established',
  'Connection from 192.168.1.2 established',
  'Connection from 10.0.0.55 established',
];

const result = compress(problematicLogs);
console.log(result.formatted);
```

**Expected**: 1 template `Connection from <*> established`

**If you get 3 templates**, there's a preprocessing or similarity issue.

### Compare Line-by-Line
For logs that should group but don't:

```typescript
const line1 = 'ERROR Failed to connect to database';
const line2 = 'ERROR Failed to connect to server';

import { defineStrategy, WILDCARD } from 'logpare';
const strategy = defineStrategy({});

const processed1 = strategy.preprocess(line1);
const processed2 = strategy.preprocess(line2);
const tokens1 = strategy.tokenize(processed1);
const tokens2 = strategy.tokenize(processed2);

console.log('Line 1 preprocessed:', processed1);
console.log('Line 2 preprocessed:', processed2);
console.log('Line 1 tokens:', tokens1);
console.log('Line 2 tokens:', tokens2);

// Calculate similarity
const similarity = calculateSimilarity(tokens1, tokens2);
console.log('Similarity:', similarity);
```

Helper function:
```typescript
function calculateSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length !== tokens2.length) return 0;

  const matches = tokens1.filter((t, i) =>
    t === tokens2[i] || t === WILDCARD || tokens2[i] === WILDCARD
  ).length;

  return matches / tokens1.length;
}
```

---

## Phase 3: Root Cause Analysis

### Trace Preprocessing
Check if variables are being masked correctly:

```typescript
import { DEFAULT_PATTERNS, WILDCARD } from 'logpare';

const testLine = 'Request 192.168.1.1:8080 processed in 45ms';

// Test each default pattern
for (const [name, pattern] of Object.entries(DEFAULT_PATTERNS)) {
  const masked = testLine.replace(pattern, WILDCARD);
  if (masked !== testLine) {
    console.log(`${name}: ${testLine} → ${masked}`);
  }
}
```

**Expected output**:
```
ip: Request <*>:8080 processed in 45ms
port: Request <*> processed in 45ms
unitValue: Request <*> processed in <*>
```

**Problem**: If expected variables aren't masked, they'll create separate templates.

### Trace Tokenization
Verify tokens are split correctly:

```typescript
const testLine = 'INFO Connection from 192.168.1.1 established';
const strategy = defineStrategy({});

const processed = strategy.preprocess(testLine);
const tokens = strategy.tokenize(processed);

console.log('Original:', testLine);
console.log('Preprocessed:', processed);
console.log('Tokens:', tokens);
console.log('Token count:', tokens.length);
```

**Expected**:
```
Original: INFO Connection from 192.168.1.1 established
Preprocessed: INFO Connection from <*> established
Tokens: ['INFO', 'Connection', 'from', '<*>', 'established']
Token count: 5
```

**Problem**: If tokenization is wrong (e.g., `['INFO Connection', 'from', ...]`), tree navigation fails.

### Trace Tree Navigation
Manually walk through how Drain processes a log:

```typescript
import { createDrain } from 'logpare';

const drain = createDrain({
  depth: 4,
  simThreshold: 0.4,
  // Enable debug logging if available
});

const testLogs = [
  'INFO Connection from 192.168.1.1 established',
  'INFO Connection from 192.168.1.2 established',
];

testLogs.forEach((line, i) => {
  console.log(`\n=== Processing line ${i+1}: ${line} ===`);

  // Get tokens
  const strategy = drain['preprocessing'];  // Access internal strategy
  const processed = strategy.preprocess(line);
  const tokens = strategy.tokenize(processed);

  console.log('Preprocessed:', processed);
  console.log('Tokens:', tokens);
  console.log('Token count:', tokens.length);

  // Add to drain
  drain.addLogLine(line);

  // Check current clusters
  const result = drain.getResult();
  console.log(`Current templates: ${result.templates.length}`);
});
```

**Expected flow**:
```
Line 1: Creates new cluster
  Root → TokenCount(5) → "INFO" → "Connection" → ... → New Cluster

Line 2: Matches existing cluster
  Root → TokenCount(5) → "INFO" → "Connection" → ... → Existing Cluster (similarity > 0.4)
```

### Check Similarity Threshold
Calculate what threshold would be needed:

```typescript
const tokens1 = ['INFO', 'Connection', 'from', '<*>', 'established'];
const tokens2 = ['INFO', 'Connection', 'to', '<*>', 'closed'];

const matches = tokens1.filter((t, i) => t === tokens2[i]).length;
const similarity = matches / tokens1.length;

console.log(`Matching tokens: ${matches}/${tokens1.length}`);
console.log(`Similarity: ${similarity.toFixed(2)}`);
console.log(`Default threshold (0.4): ${similarity >= 0.4 ? 'MATCH' : 'NO MATCH'}`);
```

**Example**:
- Matching: `['INFO', 'Connection']` = 2/5 = 0.4 → **exact threshold**
- With `simThreshold: 0.4`, this is **borderline** (may or may not match)

---

## Phase 4: Apply Fix

### Fix: Unmasked Variables

**Problem**: Custom IDs not being masked, creating duplicate templates.

**Evidence**:
```
[234x] Processing order ORD-1234567890 completed
[189x] Processing order ORD-9876543210 completed
[156x] Processing order ORD-5555555555 completed
```

**Fix**: Add custom pattern:
```typescript
const strategy = defineStrategy({
  patterns: {
    orderId: /ORD-\d{10}/g,
  }
});

const result = compress(logs, {
  drain: { preprocessing: strategy }
});
```

**Expected result**:
```
[579x] Processing order <*> completed
```

### Fix: Similarity Too High

**Problem**: Different log types grouping together.

**Evidence**:
```
[1,234x] <*> error <*>
  Samples: [["Connection", "timeout"], ["Database", "unavailable"], ["File", "not found"]]
```

**Fix**: Raise threshold or increase depth:
```typescript
const result = compress(logs, {
  drain: {
    simThreshold: 0.6,  // More strict
    depth: 5            // More context
  }
});
```

### Fix: Similarity Too Low

**Problem**: Similar logs not grouping.

**Evidence**:
```
[345x] Request processed successfully
[289x] Request processed OK
[123x] Request processed fine
```

**Fix**: Lower threshold:
```typescript
const result = compress(logs, {
  drain: { simThreshold: 0.3 }
});
```

### Fix: Wrong Tokenization

**Problem**: Custom delimiter not recognized.

**Evidence** (CSV logs):
```
timestamp,level,message,user
```

**Default tokenization**: `['timestamp,level,message,user']` (one token!)

**Fix**: Custom tokenizer:
```typescript
const strategy = defineStrategy({
  tokenize: (line) => line.split(',').map(s => s.trim())
});
```

---

## Common Issues Checklist

### Issue: Too Many Templates

- [ ] Check for unmasked custom IDs/tokens
- [ ] Verify preprocessing is masking variables
- [ ] Try lowering `simThreshold` (0.3 or 0.2)
- [ ] Check if logs have consistent structure
- [ ] Look for rare events that should be rare

### Issue: Templates Too Generic

- [ ] Try raising `simThreshold` (0.5-0.7)
- [ ] Increase `depth` for more context (5-6)
- [ ] Check if different log types are merging
- [ ] Verify tokenization preserves important fields

### Issue: Similar Logs Not Grouping

- [ ] Calculate actual similarity between tokens
- [ ] Check if threshold is too high for natural variation
- [ ] Verify preprocessing is consistent
- [ ] Check token count matches (different counts never group)

### Issue: Performance Problems

- [ ] Check `maxClusters` isn't unlimited
- [ ] Reduce `maxChildren` if tree is very wide
- [ ] Profile preprocessing regex (catastrophic backtracking?)
- [ ] Process logs in batches if dataset is huge

---

## Debugging Tools

### Custom Debug Wrapper
```typescript
function debugCompress(logs: string[], options?: any) {
  console.log(`\n=== Debug Compression ===`);
  console.log(`Input: ${logs.length} lines`);

  const start = performance.now();
  const result = compress(logs, options);
  const elapsed = performance.now() - start;

  console.log(`\nStats:`);
  console.log(`  Templates: ${result.stats.uniqueTemplates}`);
  console.log(`  Compression: ${(result.stats.compressionRatio * 100).toFixed(2)}%`);
  console.log(`  Time: ${elapsed.toFixed(2)}ms`);

  console.log(`\nTop 5 templates:`);
  result.templates.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i+1}. [${t.occurrences}x] ${t.pattern}`);
  });

  return result;
}
```

### Similarity Calculator
```typescript
function debugSimilarity(line1: string, line2: string, options?: any) {
  const drain = createDrain(options);
  const strategy = drain['preprocessing'];

  const p1 = strategy.preprocess(line1);
  const p2 = strategy.preprocess(line2);
  const t1 = strategy.tokenize(p1);
  const t2 = strategy.tokenize(p2);

  console.log('Line 1:', line1);
  console.log('  → Preprocessed:', p1);
  console.log('  → Tokens:', t1);

  console.log('\nLine 2:', line2);
  console.log('  → Preprocessed:', p2);
  console.log('  → Tokens:', t2);

  if (t1.length !== t2.length) {
    console.log('\n❌ Token count mismatch → WILL NOT GROUP');
    return;
  }

  const matches = t1.filter((tok, i) => tok === t2[i]).length;
  const similarity = matches / t1.length;

  console.log(`\nMatching tokens: ${matches}/${t1.length}`);
  console.log(`Similarity: ${similarity.toFixed(3)}`);
  console.log(`Threshold: ${options?.drain?.simThreshold ?? 0.4}`);
  console.log(similarity >= (options?.drain?.simThreshold ?? 0.4) ? '✅ WILL GROUP' : '❌ WILL NOT GROUP');
}
```

---

## Real-World Debugging Examples

See `references/debugging-examples.md` for step-by-step walkthroughs of:
- Diagnosing AWS CloudWatch logs with varying instance IDs
- Fixing over-splitting in Kubernetes pod logs
- Resolving custom application log patterns
- Performance optimization for 10M+ line datasets
