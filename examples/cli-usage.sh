#!/bin/bash
# CLI usage examples for logpare
#
# Install globally: npm install -g logpare
# Or run locally: npx logpare

# Basic usage - compress a log file
logpare server.log

# Pipe from stdin
cat /var/log/syslog | logpare

# Use with grep to filter first
grep "ERROR" app.log | logpare

# JSON output for programmatic processing
logpare --format json app.log > templates.json

# Detailed output with sample values
logpare --format detailed access.log

# Custom algorithm parameters for noisy logs
# - Higher depth: more specific templates
# - Lower threshold: more aggressive grouping
logpare --depth 5 --threshold 0.3 noisy.log

# Custom parameters for structured logs
# - Lower depth: broader grouping
# - Higher threshold: stricter matching
logpare --depth 3 --threshold 0.6 structured.log

# Limit memory usage with max-clusters
logpare --max-clusters 500 huge.log

# Limit output size
logpare --max-templates 20 app.log

# Write output to file
logpare --output templates.txt server.log

# Combine multiple log files
logpare access.log error.log server.log

# Process logs and pipe to other tools
logpare --format json app.log | jq '.templates[].pattern'

# Use in scripts
if logpare --format json server.log | jq -e '.stats.uniqueTemplates > 100' > /dev/null; then
  echo "Warning: More than 100 unique log patterns detected"
fi

# Real-world example: Compress Docker logs
docker logs my-container 2>&1 | logpare --format detailed

# Real-world example: Process systemd journal
journalctl -u nginx --since "1 hour ago" | logpare
