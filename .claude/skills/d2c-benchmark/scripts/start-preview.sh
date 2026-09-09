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
temporary_root="$(cd /tmp && pwd -P)"

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

resolve_vite() {
  local application_dir="$1"
  local application_vite="$application_dir/node_modules/vite/bin/vite.js"
  if [[ ! -e "$application_vite" ]]; then
    return 1
  fi
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

set +e
pc_vite="$(resolve_vite "$pc_dir")"
pc_vite_result=$?
mobile_vite="$(resolve_vite "$mobile_dir")"
mobile_vite_result=$?
set -e
if [[ $pc_vite_result -eq 2 || $mobile_vite_result -eq 2 ]]; then
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  echo "Python 3 and curl are required to start the review service." >&2
  exit 2
fi

log_dir="$(mktemp -d "$temporary_root/d2c-preview-logs.$$.XXXXXX")"
review_reference_link="$review_dir/references"
review_reference_link_created=false
availability_file="$review_dir/availability.json"
pc_pid=""
mobile_pid=""
review_pid=""
shutdown_signal="TERM"
pc_data_available=false
pc_chart_available=false
mobile_content_available=false
mobile_form_available=false
pc_data_reason="PC preview did not start."
pc_chart_reason="PC preview did not start."
mobile_content_reason="Mobile preview did not start."
mobile_form_reason="Mobile preview did not start."

write_availability() {
  local temporary_file
  temporary_file="$(mktemp "$review_dir/.availability.XXXXXX")"
  if ! printf '{\n  "pc-data": { "available": %s, "reason": "%s" },\n  "pc-chart": { "available": %s, "reason": "%s" },\n  "mobile-content": { "available": %s, "reason": "%s" },\n  "mobile-form": { "available": %s, "reason": "%s" }\n}\n' \
    "$pc_data_available" "$pc_data_reason" \
    "$pc_chart_available" "$pc_chart_reason" \
    "$mobile_content_available" "$mobile_content_reason" \
    "$mobile_form_available" "$mobile_form_reason" >"$temporary_file"; then
    rm -f -- "$temporary_file"
    return 1
  fi
  mv -f -- "$temporary_file" "$availability_file"
}

owned_child_running() {
  local pid="$1"
  local job_pid
  if [[ -z "$pid" ]]; then
    return 1
  fi
  for job_pid in $(jobs -pr 2>/dev/null || true); do
    if [[ "$job_pid" == "$pid" ]]; then
      return 0
    fi
  done
  return 1
}

wait_for_owned_child_exit() {
  local pid="$1"
  local attempt
  for attempt in {1..8}; do
    if ! owned_child_running "$pid"; then
      wait "$pid" 2>/dev/null || true
      return 0
    fi
    sleep 0.1
  done
  return 1
}

stop_owned_child() {
  local pid="$1"
  local requested_signal="$2"
  if [[ -z "$pid" ]]; then
    return 0
  fi
  if owned_child_running "$pid"; then
    kill "-$requested_signal" "$pid" 2>/dev/null || true
  fi
  if wait_for_owned_child_exit "$pid"; then
    return 0
  fi
  if owned_child_running "$pid"; then
    kill -TERM "$pid" 2>/dev/null || true
  fi
  if wait_for_owned_child_exit "$pid"; then
    return 0
  fi
  if owned_child_running "$pid"; then
    kill -KILL "$pid" 2>/dev/null || true
  fi
  wait "$pid" 2>/dev/null || true
}

signal_owned_children() {
  local signal="$1"
  local pid
  for pid in "$pc_pid" "$mobile_pid" "$review_pid"; do
    if owned_child_running "$pid"; then
      kill "-$signal" "$pid" 2>/dev/null || true
    fi
  done
}

reap_exited_children() {
  if [[ -n "$pc_pid" ]] && ! owned_child_running "$pc_pid"; then
    wait "$pc_pid" 2>/dev/null || true
    pc_pid=""
  fi
  if [[ -n "$mobile_pid" ]] && ! owned_child_running "$mobile_pid"; then
    wait "$mobile_pid" 2>/dev/null || true
    mobile_pid=""
  fi
  if [[ -n "$review_pid" ]] && ! owned_child_running "$review_pid"; then
    wait "$review_pid" 2>/dev/null || true
    review_pid=""
  fi
}

wait_for_owned_children_exit() {
  local attempt
  for attempt in {1..8}; do
    reap_exited_children
    if [[ -z "$pc_pid" && -z "$mobile_pid" && -z "$review_pid" ]]; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

reap_all_owned_children() {
  local pid
  for pid in "$pc_pid" "$mobile_pid" "$review_pid"; do
    if [[ -n "$pid" ]]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
  pc_pid=""
  mobile_pid=""
  review_pid=""
}

cleanup() {
  trap - EXIT INT TERM
  signal_owned_children "$shutdown_signal"
  if ! wait_for_owned_children_exit; then
    signal_owned_children TERM
    if ! wait_for_owned_children_exit; then
      signal_owned_children KILL
      reap_all_owned_children
    fi
  fi
  if [[ "$review_reference_link_created" == true && -L "$review_reference_link" && "$(readlink "$review_reference_link")" == "../references" ]]; then
    rm -f -- "$review_reference_link"
  fi
  rm -rf -- "$log_dir"
}

handle_signal() {
  local signal="$1"
  shutdown_signal="$signal"
  exit 128
}

wait_for_service() {
  local pid="$1"
  local url="$2"
  for attempt in {1..100}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      return 1
    fi
    if curl -sS --max-time 1 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

route_http_code() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 1 "$url" 2>/dev/null || true)"
  if [[ "$code" =~ ^[0-9]{3}$ ]]; then
    printf '%s\n' "$code"
  else
    printf '000\n'
  fi
}

stop_child() {
  local pid="$1"
  stop_owned_child "$pid" TERM
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
write_availability

python3 -m http.server 4172 --bind 127.0.0.1 --directory "$review_dir" >"$log_dir/review.log" 2>&1 &
review_pid="$!"
if ! wait_for_service "$review_pid" "http://127.0.0.1:4172"; then
  echo "Review service failed to start." >&2
  cat "$log_dir/review.log" >&2
  exit 1
fi

node_available=true
if ! command -v node >/dev/null 2>&1; then
  node_available=false
  pc_data_reason="PC preview did not start because Node is unavailable."
  pc_chart_reason="$pc_data_reason"
  mobile_content_reason="Mobile preview did not start because Node is unavailable."
  mobile_form_reason="$mobile_content_reason"
fi

if [[ "$node_available" == true && $pc_vite_result -eq 0 ]]; then
  (cd "$pc_dir" && exec node "$pc_vite" --host 127.0.0.1 --port 4173 --strictPort) >"$log_dir/pc.log" 2>&1 &
  pc_pid="$!"
  if wait_for_service "$pc_pid" "http://127.0.0.1:4173/data-management"; then
    pc_data_http_code="$(route_http_code "http://127.0.0.1:4173/data-management")"
    case "$pc_data_http_code" in
      2??|3??)
        pc_data_available=true
        pc_data_reason=""
        ;;
      *) pc_data_reason="PC data route returned HTTP $pc_data_http_code." ;;
    esac
    pc_chart_http_code="$(route_http_code "http://127.0.0.1:4173/chart-analytics")"
    case "$pc_chart_http_code" in
      2??|3??)
        pc_chart_available=true
        pc_chart_reason=""
        ;;
      *) pc_chart_reason="PC chart route returned HTTP $pc_chart_http_code." ;;
    esac
  else
    pc_data_reason="PC preview did not start on port 4173."
    pc_chart_reason="$pc_data_reason"
    stop_child "$pc_pid"
    pc_pid=""
  fi
elif [[ $pc_vite_result -eq 1 ]]; then
  pc_data_reason="PC preview did not start because its installed Vite entry is missing."
  pc_chart_reason="$pc_data_reason"
fi

if [[ "$node_available" == true && $mobile_vite_result -eq 0 ]]; then
  (cd "$mobile_dir" && exec node "$mobile_vite" --host 127.0.0.1 --port 4174 --strictPort) >"$log_dir/mobile.log" 2>&1 &
  mobile_pid="$!"
  if wait_for_service "$mobile_pid" "http://127.0.0.1:4174/content-display"; then
    mobile_content_http_code="$(route_http_code "http://127.0.0.1:4174/content-display")"
    case "$mobile_content_http_code" in
      2??|3??)
        mobile_content_available=true
        mobile_content_reason=""
        ;;
      *) mobile_content_reason="Mobile content route returned HTTP $mobile_content_http_code." ;;
    esac
    mobile_form_http_code="$(route_http_code "http://127.0.0.1:4174/form-interaction")"
    case "$mobile_form_http_code" in
      2??|3??)
        mobile_form_available=true
        mobile_form_reason=""
        ;;
      *) mobile_form_reason="Mobile form route returned HTTP $mobile_form_http_code." ;;
    esac
  else
    mobile_content_reason="Mobile preview did not start on port 4174."
    mobile_form_reason="$mobile_content_reason"
    stop_child "$mobile_pid"
    mobile_pid=""
  fi
elif [[ $mobile_vite_result -eq 1 ]]; then
  mobile_content_reason="Mobile preview did not start because its installed Vite entry is missing."
  mobile_form_reason="$mobile_content_reason"
fi

write_availability

echo "Review: http://127.0.0.1:4172"
echo "PC: http://127.0.0.1:4173/data-management and http://127.0.0.1:4173/chart-analytics"
echo "Mobile: http://127.0.0.1:4174/content-display and http://127.0.0.1:4174/form-interaction"
if [[ "$pc_data_available" != true ]]; then
  echo "PC data unavailable: $pc_data_reason" >&2
fi
if [[ "$pc_chart_available" != true ]]; then
  echo "PC chart unavailable: $pc_chart_reason" >&2
fi
if [[ "$mobile_content_available" != true ]]; then
  echo "Mobile content unavailable: $mobile_content_reason" >&2
fi
if [[ "$mobile_form_available" != true ]]; then
  echo "Mobile form unavailable: $mobile_form_reason" >&2
fi

while true; do
  if ! kill -0 "$review_pid" 2>/dev/null; then
    echo "Review service stopped unexpectedly." >&2
    exit 1
  fi
  availability_changed=false
  if [[ -n "$pc_pid" ]] && ! kill -0 "$pc_pid" 2>/dev/null; then
    wait "$pc_pid" 2>/dev/null || true
    pc_pid=""
    if [[ "$pc_data_available" == true ]]; then
      pc_data_available=false
      pc_data_reason="PC preview process exited."
      availability_changed=true
    fi
    if [[ "$pc_chart_available" == true ]]; then
      pc_chart_available=false
      pc_chart_reason="PC preview process exited."
      availability_changed=true
    fi
    if [[ "$availability_changed" == true ]]; then
      echo "PC preview process exited." >&2
    fi
  fi
  if [[ -n "$mobile_pid" ]] && ! kill -0 "$mobile_pid" 2>/dev/null; then
    wait "$mobile_pid" 2>/dev/null || true
    mobile_pid=""
    if [[ "$mobile_content_available" == true ]]; then
      mobile_content_available=false
      mobile_content_reason="Mobile preview process exited."
      availability_changed=true
    fi
    if [[ "$mobile_form_available" == true ]]; then
      mobile_form_available=false
      mobile_form_reason="Mobile preview process exited."
      availability_changed=true
    fi
    if [[ "$availability_changed" == true ]]; then
      echo "Mobile preview process exited." >&2
    fi
  fi
  if [[ "$availability_changed" == true ]]; then
    write_availability
  fi
  sleep 0.1
done
