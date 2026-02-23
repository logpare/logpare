#!/bin/bash
# Session-start hook — ensures dependencies are installed before work begins
set -euo pipefail

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi
