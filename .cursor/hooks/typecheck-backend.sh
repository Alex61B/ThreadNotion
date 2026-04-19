#!/usr/bin/env bash
set -euo pipefail

source ".cursor/hooks/_shared.sh"

paths="$(extract_paths)"
if ! echo "$paths" | rg -q '^(src/.*\.(ts|mts|cts)|prisma/seed\.ts|.*/src/.*\.(ts|mts|cts)|.*/prisma/seed\.ts)$'; then
  exit 0
fi

if ! should_run_debounced "typecheck-backend" 20; then
  exit 0
fi

npx tsc -p tsconfig.json --noEmit

