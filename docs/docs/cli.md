---
sidebar_position: 7
---

# CLI Reference

Complete reference for the logpare command-line interface.

## Installation

Install globally to use `logpare` from anywhere:

```bash
npm install -g logpare
```

Or use with `npx` for one-off usage:

```bash
npx logpare server.log
```

## Basic Usage

```bash
logpare [options] [files...]
```

### Compress a Single File

```bash
logpare server.log
```

### Compress Multiple Files

```bash
logpare access.log error.log debug.log
```

### Read from stdin

```bash
cat /var/log/syslog | logpare

tail -f app.log | logpare

journalctl -u myapp | logpare
```

## Options

### Output Format

#### `--format <format>` / `-f <format>`

Output format: `summary`, `detailed`, or `json`

**Default:** `summary`

**Examples:**

```bash
# Summary format (default)
logpare server.log

# Detailed format with all metadata
logpare --format detailed server.log

# JSON format for programmatic processing
logpare --format json server.log
```

### Output Destination

#### `--output <file>` / `-o <file>`

Write output to a file instead of stdout

**Examples:**

```bash
# Write to file
logpare --output compressed.txt server.log

# JSON to file
logpare -f json -o result.json server.log

# Use with pipes
cat access.log | logpare -o summary.txt
```

### Algorithm Parameters

#### `--depth <number>` / `-d <number>`

Parse tree depth (2-8)

**Default:** `4`

**Examples:**

```bash
# Shallow depth for simple logs
logpare --depth 3 system.log

# Deep depth for complex logs
logpare --depth 6 application.log
```

#### `--threshold <number>` / `-t <number>`

Similarity threshold (0.0-1.0)

**Default:** `0.4`

**Examples:**

```bash
# More aggressive grouping
logpare --threshold 0.3 noisy.log

# More conservative grouping
logpare --threshold 0.5 structured.log
```

#### `--max-children <number>` / `-c <number>`

Maximum children per tree node

**Default:** `100`

**Examples:**

```bash
# Limit for memory efficiency
logpare --max-children 50 huge.log
```

#### `--max-clusters <number>` / `-m <number>`

Maximum total templates

**Default:** `1000`

**Examples:**

```bash
# Cap templates for large files
logpare --max-clusters 500 large.log
```

#### `--max-templates <number>` / `-n <number>`

Maximum templates in output (summary/detailed only)

**Default:** `50`

**Examples:**

```bash
# Show only top 20 templates
logpare --max-templates 20 server.log

# Show all templates
logpare --max-templates 0 server.log
```

### Help & Version

#### `--help` / `-h`

Show help message

```bash
logpare --help
```

#### `--version` / `-v`

Show version number

```bash
logpare --version
```

## Examples

### Basic Compression

```bash
# Compress a log file
logpare server.log

# Output:
# === Log Compression Summary ===
# Input: 10,847 lines → 23 templates (99.8% reduction)
#
# Top templates by frequency:
# 1. [4,521x] INFO Connection from <*> established
# 2. [3,892x] DEBUG Request <*> processed in <*>
# ...
```

### Detailed Analysis

```bash
logpare --format detailed error.log

# Output:
# === Detailed Compression Results ===
#
# Template #1 (450 occurrences)
#   Pattern: ERROR Connection to <*> failed
#   Severity: error
#   First seen: line 1
#   Last seen: line 998
#   Sample values: [["192.168.1.100"], ["192.168.1.101"]]
#   URLs: api.example.com, cdn.example.com
#   Status codes: 500, 503
# ...
```

### JSON Output

```bash
logpare --format json server.log > result.json

# Process with jq
logpare -f json server.log | jq '.templates[] | select(.severity == "error")'

# Pretty print
logpare -f json server.log | jq .
```

### Piping from Other Commands

```bash
# Compress recent logs
tail -1000 /var/log/syslog | logpare

# Monitor live logs
tail -f app.log | logpare

# Compress journal logs
journalctl -u nginx | logpare -f detailed

# Kubernetes pod logs
kubectl logs my-pod | logpare

# Docker container logs
docker logs my-container | logpare
```

### Combining Multiple Files

```bash
# Compress all log files in directory
logpare logs/*.log

# Combine and compress
cat logs/*.log | logpare -o combined.txt
```

### Parameter Tuning

```bash
# High compression (fewer templates)
logpare --depth 3 --threshold 0.3 noisy.log

# High fidelity (more templates)
logpare --depth 6 --threshold 0.5 structured.log

# Memory-efficient
logpare --max-clusters 500 --max-children 50 huge.log
```

### Filtering Output

```bash
# Show only top 10 templates
logpare --max-templates 10 server.log

# Get JSON and filter with jq
logpare -f json server.log | jq '.templates[] | select(.occurrences > 100)'

# Extract error templates
logpare -f json server.log | jq '.templates[] | select(.severity == "error")'
```

## Use Cases

### Quick Log Summary

```bash
# Get overview of a log file
logpare server.log
```

### Error Investigation

```bash
# Detailed view of errors only
logpare -f detailed error.log | grep -A 10 "ERROR"

# JSON + jq for programmatic analysis
logpare -f json app.log | jq '.templates[] | select(.severity == "error") | {pattern, count: .occurrences}'
```

### Performance Analysis

```bash
# Look for slow operations
logpare -f detailed access.log | grep -i "duration"

# Extract timing data with jq
logpare -f json access.log | jq '.templates[].durationSamples[]'
```

### Feeding to LLMs

```bash
# Compress and copy to clipboard (macOS)
logpare server.log | pbcopy

# Compress and save for AI analysis
logpare -f detailed app.log -o compressed.txt
echo "Analysis complete. Share compressed.txt with your AI assistant."
```

### Batch Processing

```bash
# Process multiple log files
for file in logs/*.log; do
  echo "Processing $file..."
  logpare -f json "$file" -o "${file%.log}.json"
done

# Combine results
cat logs/*.json | jq -s 'map(.templates) | add'
```

### Monitoring

```bash
# Continuous monitoring with live feed
tail -f /var/log/app.log | logpare

# Periodic compression (every hour)
watch -n 3600 'cat /var/log/app.log | logpare -o /tmp/log-summary.txt'
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (invalid arguments, file not found, etc.) |
| 2 | Input/output error (can't read file, can't write output) |

## Environment Variables

### `LOGPARE_DEPTH`

Default depth value

```bash
export LOGPARE_DEPTH=5
logpare server.log  # Uses depth=5
```

### `LOGPARE_THRESHOLD`

Default similarity threshold

```bash
export LOGPARE_THRESHOLD=0.3
logpare server.log  # Uses threshold=0.3
```

### `LOGPARE_FORMAT`

Default output format

```bash
export LOGPARE_FORMAT=detailed
logpare server.log  # Uses detailed format
```

## Tips & Tricks

### Colorize Output (macOS/Linux)

```bash
# Install grc (generic colouriser)
brew install grc  # macOS
apt-get install grc  # Linux

# Colorize logpare output
logpare server.log | grc cat
```

### Save Both Original and Compressed

```bash
# Keep original and create compressed version
cat server.log | tee original.log | logpare -o compressed.txt
```

### Process Large Files Efficiently

```bash
# Process in chunks
split -l 100000 huge.log chunk_
for chunk in chunk_*; do
  logpare "$chunk" -o "${chunk}.compressed"
done

# Combine compressed results
cat chunk_*.compressed > final.txt
```

### Integration with Git

```bash
# Compress logs before committing
git diff --name-only | grep '\.log$' | while read log; do
  logpare "$log" -o "${log%.log}.compressed.txt"
done
```

### Quick Statistics

```bash
# Get just the stats
logpare -f json server.log | jq '.stats'

# Output:
# {
#   "inputLines": 10847,
#   "uniqueTemplates": 23,
#   "compressionRatio": 0.998,
#   "estimatedTokenReduction": 0.95
# }
```

## Comparison with Other Tools

### vs. grep

```bash
# grep: Shows matching lines
grep ERROR server.log  # Could be thousands of lines

# logpare: Shows patterns
logpare server.log | grep ERROR  # Shows unique error patterns
```

### vs. awk/sed

```bash
# awk: Manual pattern extraction
awk '{print $1, $2, $3}' server.log | sort | uniq -c

# logpare: Automatic pattern extraction
logpare server.log  # Automatically discovers patterns
```

### vs. log analysis tools

```bash
# Traditional tools: Index and query
splunk index logs/*.log
splunk search "error"

# logpare: Quick compression for AI analysis
logpare logs/*.log -o summary.txt
# Feed summary.txt to LLM for analysis
```

## Troubleshooting

### "Command not found"

If you get `logpare: command not found`:

```bash
# Option 1: Use npx
npx logpare server.log

# Option 2: Install globally
npm install -g logpare

# Option 3: Use npm exec
npm exec logpare server.log
```

### Large File Memory Issues

If processing fails with large files:

```bash
# Reduce memory usage
logpare --max-clusters 500 --max-children 50 huge.log

# Or process in chunks
head -100000 huge.log | logpare
```

### No Output

If you see no output:

```bash
# Check if file exists
ls -lh server.log

# Check if file is readable
cat server.log | head

# Try with verbose errors
logpare server.log 2>&1

# Verify stdin works
echo "test log line" | logpare
```

## See Also

- [Quick Start Guide](/docs/quick-start) - Basic usage examples
- [API Reference](/docs/api/compress) - Programmatic usage
- [Parameter Tuning](/docs/guides/parameter-tuning) - Optimize settings
