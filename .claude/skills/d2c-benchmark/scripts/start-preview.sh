#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: $0 <benchmark-workspace-path>" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
skill_dir="$(cd "$script_dir/.." && pwd -P)"
repo_root="$(git -C "$skill_dir" rev-parse --show-toplevel)"
repo_root="$(cd "$repo_root" && pwd -P)"
repo_workspace_root="$repo_root/.d2c-benchmark"
temporary_root="$(cd "${TMPDIR:-/tmp}" && pwd -P)"

raw_workspace="$1"
if [[ "$raw_workspace" != /* ]]; then
  raw_workspace="$PWD/$raw_workspace"
fi
if [[ ! -d "$raw_workspace" || -L "$raw_workspace" ]]; then
  echo "Workspace must be an existing real directory: $raw_workspace" >&2
  exit 2
fi
workspace="$(cd "$raw_workspace" && pwd -P)"

if [[ "$workspace" == "/" || "$workspace" == "$repo_root" || "$workspace" == "$repo_workspace_root" || "$workspace" == "$temporary_root" ]]; then
  echo "Refusing unsafe workspace: $workspace" >&2
  exit 2
fi
case "$workspace" in
  "$repo_workspace_root"/*|"$temporary_root"/*) ;;
  *)
    echo "Workspace must be inside $repo_workspace_root or $temporary_root: $workspace" >&2
    exit 2
    ;;
esac

pc_dir=""
mobile_dir=""
review_dir=""
references_dir=""
for directory in pc mobile review references; do
  child="$workspace/$directory"
  if [[ ! -d "$child" || -L "$child" ]]; then
    echo "Unsafe workspace child; expected a real directory: $child" >&2
    exit 2
  fi
  canonical_child="$(cd "$child" && pwd -P)"
  if [[ "$canonical_child" != "$child" ]]; then
    echo "Unsafe workspace child; canonical path escaped or changed: $child" >&2
    exit 2
  fi
  case "$canonical_child" in
    "$workspace"/*) ;;
    *)
      echo "Unsafe workspace child outside workspace: $child" >&2
      exit 2
      ;;
  esac
  case "$directory" in
    pc) pc_dir="$canonical_child" ;;
    mobile) mobile_dir="$canonical_child" ;;
    review) review_dir="$canonical_child" ;;
    references) references_dir="$canonical_child" ;;
  esac
done

validate_vite() {
  local application_dir="$1"
  local application_vite="$application_dir/node_modules/vite/bin/vite.js"
  if [[ ! -f "$application_vite" || -L "$application_vite" ]]; then
    echo "Unsafe Vite executable; expected a real installed file: $application_vite" >&2
    return 2
  fi
  local vite_parent
  local canonical_vite
  vite_parent="$(cd "$(dirname "$application_vite")" && pwd -P)"
  canonical_vite="$vite_parent/$(basename "$application_vite")"
  case "$canonical_vite" in
    "$application_dir"/*) ;;
    *)
      echo "Unsafe Vite executable outside its application directory: $application_vite" >&2
      return 2
      ;;
  esac
  printf '%s\n' "$canonical_vite"
}

pc_vite="$(validate_vite "$pc_dir")"
mobile_vite="$(validate_vite "$mobile_dir")"

log_dir="$(mktemp -d "${TMPDIR:-/tmp}/d2c-preview-logs.XXXXXX")"
child_pids=()
review_reference_link="$review_dir/references"
review_reference_link_created=false

cleanup() {
  trap - EXIT INT TERM
  if [[ ${#child_pids[@]} -gt 0 ]]; then
    kill -TERM "${child_pids[@]}" 2>/dev/null || true
    wait "${child_pids[@]}" 2>/dev/null || true
  fi
  if [[ "$review_reference_link_created" == true && -L "$review_reference_link" && "$(readlink "$review_reference_link")" == "../references" ]]; then
    rm -f -- "$review_reference_link"
  fi
  rm -rf -- "$log_dir"
}

handle_signal() {
  local signal="$1"
  if [[ ${#child_pids[@]} -gt 0 ]]; then
    kill "-$signal" "${child_pids[@]}" 2>/dev/null || true
  fi
  exit 128
}

trap cleanup EXIT
trap 'handle_signal INT' INT
trap 'handle_signal TERM' TERM

if [[ -e "$review_reference_link" || -L "$review_reference_link" ]]; then
  echo "Review reference path must not already exist: $review_reference_link" >&2
  exit 2
fi
ln -s ../references "$review_reference_link"
review_reference_link_created=true

(cd "$pc_dir" && exec node "$pc_vite" --host 127.0.0.1 --port 4173 --strictPort) >"$log_dir/pc.log" 2>&1 &
child_pids+=("$!")
(cd "$mobile_dir" && exec node "$mobile_vite" --host 127.0.0.1 --port 4174 --strictPort) >"$log_dir/mobile.log" 2>&1 &
child_pids+=("$!")
python3 -m http.server 4172 --bind 127.0.0.1 --directory "$review_dir" >"$log_dir/review.log" 2>&1 &
child_pids+=("$!")

urls=(
  "http://127.0.0.1:4173/data-management"
  "http://127.0.0.1:4174/content-display"
  "http://127.0.0.1:4172"
)

for attempt in {1..100}; do
  for index in "${!child_pids[@]}"; do
    if ! kill -0 "${child_pids[$index]}" 2>/dev/null; then
      echo "Preview service failed to start. Logs:" >&2
      cat "$log_dir"/*.log >&2
      exit 1
    fi
  done

  ready=true
  for url in "${urls[@]}"; do
    if ! curl -sS --max-time 1 "$url" >/dev/null 2>&1; then
      ready=false
      break
    fi
  done
  if [[ "$ready" == true ]]; then
    break
  fi
  sleep 0.1
done

for url in "${urls[@]}"; do
  if ! curl -sS --max-time 1 "$url" >/dev/null 2>&1; then
    echo "Preview services did not become ready. Logs:" >&2
    cat "$log_dir"/*.log >&2
    exit 1
  fi
done

echo "Review: http://127.0.0.1:4172"
echo "PC: http://127.0.0.1:4173/data-management and http://127.0.0.1:4173/chart-analytics"
echo "Mobile: http://127.0.0.1:4174/content-display and http://127.0.0.1:4174/form-interaction"

while true; do
  for pid in "${child_pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "A preview service stopped unexpectedly. Logs:" >&2
      cat "$log_dir"/*.log >&2
      exit 1
    fi
  done
  sleep 1
done
