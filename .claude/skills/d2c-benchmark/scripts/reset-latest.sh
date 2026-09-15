#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: $0 <explicit-workspace-path>" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
skill_dir="$(cd "$script_dir/.." && pwd -P)"
repo_root="$(git -C "$skill_dir" rev-parse --show-toplevel)"
repo_root="$(cd "$repo_root" && pwd -P)"
repo_workspace_root="$repo_root/.d2c-benchmark"
temporary_root="$(cd /tmp && pwd -P)"

raw_target="$1"
if [[ "/$raw_target/" == *"/./"* || "/$raw_target/" == *"/../"* ]]; then
  echo "Target path must name an unambiguous leaf without dot components: $raw_target" >&2
  exit 2
fi
if [[ "$raw_target" != /* ]]; then
  raw_target="$PWD/$raw_target"
fi

target_parent="$(dirname "$raw_target")"
target_name="$(basename "$raw_target")"

if [[ ! -d "$target_parent" ]]; then
  if [[ "$target_parent" == "$repo_workspace_root" ]]; then
    mkdir -p "$repo_workspace_root"
  else
    echo "Target parent must already exist: $target_parent" >&2
    exit 2
  fi
fi

target_parent="$(cd "$target_parent" && pwd -P)"
target="$target_parent/$target_name"
if [[ -e "$target" ]]; then
  if [[ ! -d "$target" || -L "$target" ]]; then
    echo "Target must be a real directory or an absent path: $target" >&2
    exit 2
  fi
  canonical_target="$(cd "$target" && pwd -P)"
  if [[ "$canonical_target" != "$target" ]]; then
    echo "Canonical target does not match the explicit leaf: $target" >&2
    exit 2
  fi
  target="$canonical_target"
fi

if [[ "$target" == "/" || "$target" == "$repo_root" || "$target" == "$repo_workspace_root" || "$target" == "$temporary_root" ]]; then
  echo "Refusing unsafe target: $target" >&2
  exit 2
fi

case "$target" in
  "$repo_workspace_root"/*|"$temporary_root"/*) ;;
  *)
    echo "Target must be inside $repo_workspace_root or $temporary_root: $target" >&2
    exit 2
    ;;
esac

rm -rf -- "$target"
mkdir -p "$target/pc" "$target/mobile" "$target/review" "$target/references"
cp -R "$skill_dir/templates/pc-react-antd/." "$target/pc/"
cp -R "$skill_dir/templates/mobile-vue-vant/." "$target/mobile/"
cp -R "$skill_dir/templates/review/." "$target/review/"

echo "Reset D2C Benchmark workspace: $target"
