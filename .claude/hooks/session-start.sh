#!/bin/bash
# Session-start hook — ensures dependencies are installed before work begins
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

LOCKFILE="$PROJECT_DIR/pnpm-lock.yaml"
if [ ! -d "$PROJECT_DIR/node_modules" ] || \
   { [ -f "$LOCKFILE" ] && [ "$LOCKFILE" -nt "$PROJECT_DIR/node_modules" ]; }; then
  echo "Installing dependencies..."
  if (cd "$PROJECT_DIR" && pnpm install --frozen-lockfile); then
    : # frozen install succeeded
  else
    echo ""
    echo "WARNING: pnpm install --frozen-lockfile failed."
    echo "  Lockfile: $LOCKFILE"
    echo "  Project:  $PROJECT_DIR"
    echo "  This usually means pnpm-lock.yaml is out of sync with package.json."
    echo "  Retrying with pnpm install (non-frozen) as fallback..."
    echo ""
    if ! (cd "$PROJECT_DIR" && pnpm install); then
      echo "ERROR: pnpm install also failed."
      echo "  Please run 'pnpm install' manually in $PROJECT_DIR"
      exit 1
    fi
  fi
fi
