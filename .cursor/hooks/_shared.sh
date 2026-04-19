#!/usr/bin/env bash
set -euo pipefail

HOOK_INPUT="$(cat || true)"

extract_paths() {
  # Best-effort: Cursor hook payloads vary by event/tool. We scan all JSON strings
  # and keep those that look like paths.
  echo "$HOOK_INPUT" | jq -r '
    [
      .. | strings
      | select(
          test("(^/|^[A-Za-z]:\\\\\\\\|\\./|\\.\\./)") or
          test("^[^\\s]+\\.(ts|tsx|mts|cts|prisma)$") or
          test("(^web/|^src/|^prisma/)")
        )
    ] | unique | .[]
  ' 2>/dev/null || true
}

should_run_debounced() {
  local key="$1"
  local min_seconds="${2:-15}"

  local cache_dir=".cursor/hooks/.cache"
  mkdir -p "$cache_dir"

  local stamp="$cache_dir/$key.stamp"
  local now
  now="$(date +%s)"

  if [[ -f "$stamp" ]]; then
    local last
    last="$(cat "$stamp" 2>/dev/null || echo 0)"
    if [[ "$last" =~ ^[0-9]+$ ]]; then
      if (( now - last < min_seconds )); then
        return 1
      fi
    fi
  fi

  echo "$now" > "$stamp"
  return 0
}

