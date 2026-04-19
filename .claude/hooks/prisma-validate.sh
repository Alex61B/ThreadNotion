#!/usr/bin/env bash
set -euo pipefail

source ".claude/hooks/_shared.sh"

paths="$(extract_paths)"
if ! echo "$paths" | rg -q '(^|/)prisma/schema\.prisma$'; then
  exit 0
fi

if ! should_run_debounced "prisma-validate" 20; then
  exit 0
fi

npx prisma validate --schema=prisma/schema.prisma

