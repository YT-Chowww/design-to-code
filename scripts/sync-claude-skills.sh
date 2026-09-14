#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/.." &>/dev/null && pwd)

SOURCE_SKILLS="${PROJECT_ROOT}/.claude/skills"
SOURCE_RULES="${PROJECT_ROOT}/.claude/rules"

TARGET_ROOT="${HOME}/.claude"
TARGET_SKILLS="${TARGET_ROOT}/skills"
TARGET_RULES="${TARGET_ROOT}/rules"
RETIRED_SKILLS=(d2c-init d2c-extract d2c-generate d2c-merge d2c-validate d2c-verify)
RETIRED_RULES=(coding-conventions.md d2c-workflow.md)

echo "============================================="
echo "        Claude project -> user sync tool      "
echo "============================================="
echo "source skills: ${SOURCE_SKILLS}"
echo "target root  : ${TARGET_ROOT}"
echo "============================================="

if [ ! -d "${SOURCE_SKILLS}" ]; then
  echo "Source skills directory not found: ${SOURCE_SKILLS}" >&2
  exit 1
fi

mkdir -p "${TARGET_SKILLS}"

resolved_link_target() {
  local target_path="$1"
  local linked_path="$2"
  local candidate_path
  local candidate_directory

  if [[ "${linked_path}" = /* ]]; then
    candidate_path="${linked_path}"
  else
    candidate_path="$(dirname "${target_path}")/${linked_path}"
  fi
  candidate_directory=$(dirname "${candidate_path}")
  if [ -d "${candidate_directory}" ]; then
    printf '%s/%s\n' "$(cd "${candidate_directory}" && pwd -P)" "$(basename "${candidate_path}")"
  elif [ -d "$(dirname "${candidate_directory}")" ] && [ "$(basename "${candidate_directory}")" = "rules" ]; then
    printf '%s/rules/%s\n' "$(cd "$(dirname "${candidate_directory}")" && pwd -P)" "$(basename "${candidate_path}")"
  else
    printf '%s\n' "${candidate_path}"
  fi
}

cleanup_retired_links() {
  local name source_path target_path linked_path resolved_target

  for name in "${RETIRED_SKILLS[@]}"; do
    source_path="${SOURCE_SKILLS}/${name}"
    target_path="${TARGET_SKILLS}/${name}"
    [ -L "${target_path}" ] || continue
    linked_path=$(readlink "${target_path}")
    resolved_target=$(resolved_link_target "${target_path}" "${linked_path}")
    if [ "${linked_path}" = "${source_path}" ] || [ "${resolved_target}" = "${source_path}" ]; then
      rm "${target_path}"
      echo "removed retired skill ${name}"
    else
      echo "kept retired skill ${name}: target is a symlink to another source (${linked_path})" >&2
    fi
  done
}

cleanup_retired_links

# Retire only this checkout's old global rules; project rules now live in D2C.md.
for name in "${RETIRED_RULES[@]}"; do
  target_path="${TARGET_RULES}/${name}"
  source_path="${SOURCE_RULES}/${name}"
  [ -L "${target_path}" ] || continue
  linked_path=$(readlink "${target_path}")
  resolved_target=$(resolved_link_target "${target_path}" "${linked_path}")
  if [ "${linked_path}" = "${source_path}" ] || [ "${resolved_target}" = "${source_path}" ]; then
    rm "${target_path}"
    echo "removed retired rule ${name}"
  else
    echo "kept retired rule ${name}: link belongs to another source" >&2
  fi
done

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
echo "Done. Restart Claude to refresh the available skills."
