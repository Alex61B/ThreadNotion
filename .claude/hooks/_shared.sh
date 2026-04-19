#!/usr/bin/env bash
set -euo pipefail

HOOK_INPUT="$(cat || true)"

extract_paths() {
  # Claude Code tool hooks reliably include tool_input.file_path for Write/Edit,
  # but we keep this flexible and scan all JSON strings too.
  echo "$HOOK_INPUT" | jq -r '
    [
      (.tool_input.file_path? // empty),
      (.. | strings | select(test("(^/|\\./|\\.\\./|^web/|^src/|^prisma/)")))
    ]
    | map(select(type == "string" and length > 0))
    | unique
    | .[]
  ' 2>/dev/null || true
}

should_run_debounced() {
  local key="$1"
  local min_seconds="${2:-15}"

  local cache_dir=".claude/hooks/.cache"
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

