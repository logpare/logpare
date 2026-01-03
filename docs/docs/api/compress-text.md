---
sidebar_position: 2
---

# compressText()

Compress a multiline string of log data. This is a convenience wrapper around `compress()` that splits the text on newlines.

## Signature

```typescript
function compressText(
  text: string,
  options?: CompressOptions
): CompressionResult
```

## Parameters

### `text`

- Type: `string`
- Required: Yes

Multiline string containing log data. Will be split on `\n` characters.

Empty lines are automatically filtered out.

### `options`

- Type: `CompressOptions`
- Required: No

Same options as [`compress()`](/docs/api/compress#parameters).

## Return Value

Returns a `CompressionResult` object, same as [`compress()`](/docs/api/compress#return-value).

## Examples

### Basic Usage

```typescript
import { compressText } from 'logpare';

const logs = `
ERROR Connection failed
ERROR Connection timeout
INFO Request completed
INFO Request completed
`;

const result = compressText(logs);

console.log(result.formatted);
// === Log Compression Summary ===
// Input: 4 lines → 3 templates (75.0% reduction)
```

### Reading from File

```typescript
import fs from 'fs';
import { compressText } from 'logpare';

const logFile = fs.readFileSync('app.log', 'utf-8');
const result = compressText(logFile, {
  format: 'detailed',
  maxTemplates: 20,
});

console.log(result.formatted);

// Write compressed output
fs.writeFileSync('compressed.txt', result.formatted);
```

### Piping from Stream

```typescript
import { compressText } from 'logpare';
import { readFileSync } from 'fs';

// Read entire file
const content = readFileSync('/var/log/syslog', 'utf-8');

// Compress
const result = compressText(content, {
  format: 'json',
  depth: 5,
  simThreshold: 0.4,
});

// Output as JSON
console.log(JSON.stringify(result, null, 2));
```

### With Progress Tracking

```typescript
const result = compressText(largeLogFile, {
  onProgress: (event) => {
    const percent = event.percentComplete ?? 0;
    process.stdout.write(`\rProcessing: ${percent.toFixed(1)}%`);
  }
});

console.log('\nDone!');
```

### Processing Template Results

```typescript
const result = compressText(logs, { format: 'json' });

// Group by severity
const bySeverity = {
  error: result.templates.filter(t => t.severity === 'error'),
  warning: result.templates.filter(t => t.severity === 'warning'),
  info: result.templates.filter(t => t.severity === 'info'),
};

console.log(`Errors: ${bySeverity.error.length} templates`);
console.log(`Warnings: ${bySeverity.warning.length} templates`);
console.log(`Info: ${bySeverity.info.length} templates`);
```

## Implementation Details

`compressText()` is equivalent to:

```typescript
function compressText(text: string, options?: CompressOptions) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return compress(lines, options);
}
```

## When to Use

Use `compressText()` when:

- Reading log files directly as strings
- Processing multiline log data from APIs or databases
- Working with concatenated log output

Use `compress()` when:

- You already have an array of lines
- You need fine-grained control over line filtering
- Processing streaming data incrementally

## See Also

- [compress()](/docs/api/compress) - Compress an array of lines
- [createDrain()](/docs/api/create-drain) - Incremental processing
- [Types Reference](/docs/api/types) - TypeScript interfaces
