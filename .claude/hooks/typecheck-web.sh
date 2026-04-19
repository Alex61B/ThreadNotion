#!/usr/bin/env bash
set -euo pipefail

source ".claude/hooks/_shared.sh"

paths="$(extract_paths)"
if ! echo "$paths" | rg -q '(^|/)web/.*\.(ts|tsx|mts|cts)$'; then
  exit 0
fi

if ! should_run_debounced "typecheck-web" 20; then
  exit 0
fi

cd web
npx tsc -p tsconfig.json --noEmit

