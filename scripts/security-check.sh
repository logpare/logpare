#!/bin/bash
# ============================================================================
# Security Check — Pre-commit Security Scanner
# ============================================================================
# Scans staged files (or all src/ files) for common security issues.
# Non-blocking by default (exits 0 with warnings). Use --strict to fail.
#
# What it catches:
# - Hardcoded secrets: API keys, tokens, passwords in source
# - eval() usage: code injection risk
# - console.log in library source: use structured output instead
#
# Usage:
#   ./scripts/security-check.sh           # Warn only (exit 0)
#   ./scripts/security-check.sh --strict  # Fail on findings (exit 1)
# ============================================================================
set -euo pipefail

STRICT=false
if [ "${1:-}" = "--strict" ]; then
  STRICT=true
fi

WARNINGS=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

warn() {
  echo -e "${YELLOW}⚠ WARNING:${NC} $1"
  echo "  File: $2"
  echo "  Line: $3"
  echo ""
  WARNINGS=$((WARNINGS + 1))
}

# Get files to check (staged files, or all source files if not in a git context)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  RAW_FILES=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
  if [ -n "$RAW_FILES" ]; then
    # Canonicalize repo-relative paths to absolute so output matches the find fallback
    FILES=""
    while IFS= read -r f; do
      FILES="${FILES:+$FILES
}$PROJECT_DIR/$f"
    done <<< "$RAW_FILES"
  else
    FILES=$(find "$PROJECT_DIR/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null || true)
  fi
else
  FILES=$(find "$PROJECT_DIR/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null || true)
fi

if [ -z "$FILES" ]; then
  echo -e "${GREEN}✓ No files to check.${NC}"
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Security scan: checking $FILE_COUNT files..."
echo ""

while IFS= read -r file; do
  [ -f "$file" ] || continue
  LINE_NUM=0

  # Determine if this is a test file
  IS_TEST=false
  case "$file" in
    *.test.* | *.spec.* | *__tests__* | test_*) IS_TEST=true ;;
  esac

  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))

    # Skip comment lines; strip inline comments so commented-out code is not flagged
    TRIMMED=$(echo "$line" | sed 's/^[[:space:]]*//')
    case "$TRIMMED" in
      "//"*|"#"*|"*"*|"/*"*) continue ;;
    esac
    TRIMMED=$(echo "$TRIMMED" | sed -e 's|//.*$||' -e 's|/\*.*\*/||g')

    # --- Hardcoded Secrets ---
    if echo "$TRIMMED" | grep -qiE "(api_key|apikey|secret|password|token|private_key)\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{8,}" 2>/dev/null; then
      case "$file" in
        *.example | *.example.* | *.template | *.template.*) ;;
        *) warn "Possible hardcoded secret" "$file" "$LINE_NUM" ;;
      esac
    fi

    # --- eval() Usage ---
    if echo "$TRIMMED" | grep -qE "\beval\s*\(" 2>/dev/null; then
      warn "eval() usage — code injection risk" "$file" "$LINE_NUM"
    fi

    # --- console.log in library source (not tests, not CLI) ---
    if [ "$IS_TEST" = false ]; then
      case "$file" in
        *cli.ts | *cli.js) ;; # CLI is allowed to log
        *)
          if echo "$TRIMMED" | grep -qE "console\.(log|debug)\(" 2>/dev/null; then
            warn "console.log() in library source (use structured output)" "$file" "$LINE_NUM"
          fi
          ;;
      esac
    fi

  done < "$file"
done <<< "$FILES"

# Summary
echo "──────────────────────────────────────"
if [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✓ No security issues found.${NC}"
  exit 0
fi

echo -e "${YELLOW}Found $WARNINGS warning(s).${NC}"

if [ "$STRICT" = true ]; then
  echo -e "${RED}Strict mode: failing due to warnings.${NC}"
  exit 1
fi

echo "Run with --strict to treat warnings as errors."
exit 0
