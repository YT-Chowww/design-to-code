#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/.." &>/dev/null && pwd)

SOURCE_SKILLS="${PROJECT_ROOT}/.claude/skills"
TARGET_SKILLS="${CODEX_HOME:-${HOME}/.codex}/skills"

echo "============================================="
echo "        Claude skills -> Codex sync tool      "
echo "============================================="
echo "source skills: ${SOURCE_SKILLS}"
echo "target skills: ${TARGET_SKILLS}"
echo "============================================="

if [ ! -d "${SOURCE_SKILLS}" ]; then
  echo "Source skills directory not found: ${SOURCE_SKILLS}" >&2
  exit 1
fi

mkdir -p "${TARGET_SKILLS}"

sync_link() {
  local source_path="$1"
  local target_path="$2"
  local name="$3"

  if [ -L "${target_path}" ]; then
    local linked_path
    linked_path=$(readlink "${target_path}")
    if [ "${linked_path}" = "${source_path}" ]; then
      ln -sfn "${source_path}" "${target_path}"
      echo "synced ${name}"
    else
      echo "skipped ${name}: target is a symlink to another source (${linked_path})" >&2
    fi
    return
  fi

  if [ -e "${target_path}" ]; then
    echo "skipped ${name}: target already exists and is not managed by this project" >&2
    return
  fi

  ln -s "${source_path}" "${target_path}"
  echo "linked ${name}"
}

for skill in "${SOURCE_SKILLS}"/*/; do
  [ -d "${skill}" ] || continue
  name=$(basename "${skill%/}")
  sync_link "${skill%/}" "${TARGET_SKILLS}/${name}" "${name}"
done

echo ""
echo "Done. Restart Codex to refresh the available skills."
