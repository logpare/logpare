#!/bin/bash
# Session-start hook — ensures dependencies are installed before work begins
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

LOCKFILE="$PROJECT_DIR/pnpm-lock.yaml"
if [ ! -d "$PROJECT_DIR/node_modules" ] || \
   { [ -f "$LOCKFILE" ] && [ "$LOCKFILE" -nt "$PROJECT_DIR/node_modules" ]; }; then
  echo "Installing dependencies..."
  (cd "$PROJECT_DIR" && pnpm install --frozen-lockfile)
fi
