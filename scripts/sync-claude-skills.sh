#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/.." &>/dev/null && pwd)

SOURCE_SKILLS="${PROJECT_ROOT}/.claude/skills"
SOURCE_RULES="${PROJECT_ROOT}/.claude/rules"

TARGET_ROOT="${HOME}/.claude"
TARGET_SKILLS="${TARGET_ROOT}/skills"
TARGET_RULES="${TARGET_ROOT}/rules"

echo "============================================="
echo "        Claude project -> user sync tool      "
echo "============================================="
echo "source skills: ${SOURCE_SKILLS}"
echo "source rules : ${SOURCE_RULES}"
echo "target root  : ${TARGET_ROOT}"
echo "============================================="

if [ ! -d "${SOURCE_SKILLS}" ]; then
  echo "Source skills directory not found: ${SOURCE_SKILLS}" >&2
  exit 1
fi

mkdir -p "${TARGET_SKILLS}" "${TARGET_RULES}"

sync_link() {
  local source_path="$1"
  local target_path="$2"
  local label="$3"

  if [ -L "${target_path}" ]; then
    local linked_path
    linked_path=$(readlink "${target_path}")
    if [ "${linked_path}" = "${source_path}" ]; then
      ln -sfn "${source_path}" "${target_path}"
      echo "synced ${label}"
    else
      echo "skipped ${label}: target is a symlink to another source (${linked_path})" >&2
    fi
    return
  fi

  if [ -e "${target_path}" ]; then
    echo "skipped ${label}: target already exists and is not managed by this project" >&2
    return
  fi

  ln -s "${source_path}" "${target_path}"
  echo "linked ${label}"
}

echo ""
echo "Linking skills..."
for skill in "${SOURCE_SKILLS}"/*/; do
  [ -d "${skill}" ] || continue
  name=$(basename "${skill%/}")
  sync_link "${skill%/}" "${TARGET_SKILLS}/${name}" "skill ${name}"
done

echo ""
echo "Linking rules..."
if [ -d "${SOURCE_RULES}" ]; then
  for rule in "${SOURCE_RULES}"/*; do
    [ -e "${rule}" ] || continue
    name=$(basename "${rule}")
    sync_link "${rule}" "${TARGET_RULES}/${name}" "rule ${name}"
  done
fi

echo ""
echo "Done. Restart Claude to refresh the available skills and rules."
