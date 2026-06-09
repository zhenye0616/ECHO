#!/usr/bin/env bash
# tools/install-echo-codex-skills.sh
#
# Canonical Codex installer for ECHO protocol skills. Renders every canonical
# ECHO skill from skills/*.md into Codex's user-level skill discovery directory
# under an explicit namespace:
#
#   ~/.codex/skills/ECHO:<skill-name>/SKILL.md
#
# This is the only supported Codex import path. `tools/sync-skills.sh` only
# maintains Claude command copies; Codex installs are rendered directly here.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
NAMESPACE="ECHO"
NAME_STYLE="hyphen"
DRY_RUN=0
CHECK=0
CHECK_TMP=""

usage() {
  cat <<EOF
Usage: tools/install-echo-codex-skills.sh [--dry-run] [--check] [--namespace NAME] [--underscore-names]

Installs all canonical ECHO skills from skills/*.md into:
  \$HOME/.codex/skills/<namespace>:<skill-name>/SKILL.md

Options:
  --dry-run            Print planned installs without writing files.
  --check              Verify managed installs are fresh; read-only.
  --namespace NAME     Namespace prefix to use. Default: ECHO.
  --underscore-names   Replace '-' with '_' after the namespace
                       (for example ECHO:process_backlog).
  -h, --help           Show this help.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --check)
      CHECK=1
      shift
      ;;
    --namespace)
      if [ $# -lt 2 ] || [ -z "$2" ]; then
        echo "ERROR: --namespace requires a non-empty value" >&2
        exit 2
      fi
      NAMESPACE="$2"
      shift 2
      ;;
    --underscore-names)
      NAME_STYLE="underscore"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ -z "${HOME:-}" ]; then
  echo "ERROR: HOME is not set" >&2
  exit 1
fi

if [ ! -d "$SKILLS_DIR" ]; then
  echo "ERROR: $SKILLS_DIR does not exist" >&2
  exit 1
fi

CODEX_HOME="$HOME/.codex"
CODEX_SKILLS="$CODEX_HOME/skills"
STAGING_ROOT="$CODEX_HOME/.echo-staging"
INSTALLER_ABS="$REPO_ROOT/tools/install-echo-codex-skills.sh"

skill_display_name() {
  local canonical="$1"
  local visible="$canonical"
  if [ "$NAME_STYLE" = "underscore" ]; then
    visible="${visible//-/_}"
  fi
  printf '%s:%s\n' "$NAMESPACE" "$visible"
}

render_skill() {
  local canonical_path="$1"
  local skill_name="$2"
  python3 - "$canonical_path" "$skill_name" <<'PYEOF'
import re
import sys

canonical_path, skill_name = sys.argv[1], sys.argv[2]
text = open(canonical_path, encoding="utf-8").read()
m = re.match(r"^---\n(.*?)\n---\n(.*)\Z", text, re.DOTALL)
if not m:
    sys.stderr.write(f"ERROR: {canonical_path} has no YAML frontmatter\n")
    sys.exit(1)

frontmatter, body = m.group(1), m.group(2)
fields = {}
for line in frontmatter.split("\n"):
    if not line or line.startswith((" ", "\t", "#")):
        continue
    key, sep, value = line.partition(":")
    if sep:
        fields[key.strip()] = value.strip()

description = fields.get("description", "")
if not description:
    description = f"ECHO skill generated from {canonical_path}"

short = description[:80]
if len(description) > 80 and " " in short:
    short = short[:short.rfind(" ")]

def yaml_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

sys.stdout.write("---\n")
sys.stdout.write(f"name: {yaml_quote(skill_name)}\n")
sys.stdout.write(f"description: {yaml_quote(description)}\n")
sys.stdout.write("metadata:\n")
sys.stdout.write(f"  short-description: {yaml_quote(short)}\n")
sys.stdout.write("---\n")
sys.stdout.write(body)
PYEOF
}

is_managed_target() {
  local target="$1"
  [ -d "$target" ] && [ -f "$target/.echo-managed" ]
}

shell_quote() {
  local value="$1"
  printf "'%s'" "${value//\'/\'\\\'\'}"
}

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

sentinel_value() {
  local sentinel="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; found=1; exit } END { if (!found) exit 1 }' "$sentinel"
}

source_basename() {
  local source_path="$1"
  local skill_name="$2"
  local base
  base="$(basename "$source_path" .md)"
  if [ -z "$base" ] || [ "$base" = "." ] || [ "$base" = "/" ]; then
    base="${skill_name#*:}"
    base="${base//_/-}"
  fi
  printf '%s\n' "$base"
}

resolve_recorded_source() {
  local source_path="$1"
  case "$source_path" in
    /*) printf '%s\n' "$source_path" ;;
    *) printf '%s\n' "$REPO_ROOT/$source_path" ;;
  esac
}

remediation_command_for() {
  local skill_name="$1"
  local source_path="$2"
  local namespace visible canonical underscore_visible command
  namespace="${skill_name%%:*}"
  visible="${skill_name#*:}"
  if [ "$namespace" = "$skill_name" ]; then
    namespace="ECHO"
    visible="$skill_name"
  fi
  canonical="$(source_basename "$source_path" "$skill_name")"
  underscore_visible="${canonical//-/_}"
  command="$(shell_quote "$INSTALLER_ABS")"
  if [ "$namespace" != "ECHO" ]; then
    command="$command --namespace $(shell_quote "$namespace")"
  fi
  if [ "$visible" = "$underscore_visible" ] && [ "$visible" != "$canonical" ]; then
    command="$command --underscore-names"
  fi
  printf '%s\n' "$command"
}

check_managed_codex_skills() {
  local sentinel managed_by managed_count drift_count target source skill_name
  local source_resolved source_current actual expected expected_sha actual_sha synced_sha
  local command canonical_safe reason

  if [ ! -e "$CODEX_SKILLS" ]; then
    echo "no managed Codex ECHO install; nothing to check"
    return 0
  fi
  if [ ! -d "$CODEX_SKILLS" ]; then
    echo "ERROR: $CODEX_SKILLS exists but is not a directory" >&2
    return 2
  fi
  if [ ! -r "$CODEX_SKILLS" ] || [ ! -x "$CODEX_SKILLS" ]; then
    echo "ERROR: $CODEX_SKILLS is not readable/traversable" >&2
    return 2
  fi

  if ! CHECK_TMP="$(mktemp -d "${TMPDIR:-/tmp}/echo-codex-skills-check.XXXXXX")"; then
    echo "ERROR: failed to create temporary check stage under ${TMPDIR:-/tmp}" >&2
    return 2
  fi
  trap 'if [ -n "${CHECK_TMP:-}" ]; then rm -rf "$CHECK_TMP"; fi' EXIT

  managed_count=0
  drift_count=0
  shopt -s nullglob
  for sentinel in "$CODEX_SKILLS"/*/.echo-managed; do
    if [ ! -r "$sentinel" ]; then
      echo "ERROR: unreadable managed-sentinel candidate: $sentinel" >&2
      return 2
    fi
    if ! managed_by="$(sentinel_value "$sentinel" managed_by)"; then
      continue
    fi
    [ "$managed_by" = "tools/install-echo-codex-skills.sh" ] || continue

    managed_count=$((managed_count + 1))
    target="$(dirname "$sentinel")"
    if ! source="$(sentinel_value "$sentinel" source)"; then
      echo "ERROR: $sentinel missing source" >&2
      return 2
    fi
    if ! skill_name="$(sentinel_value "$sentinel" skill_name)"; then
      echo "ERROR: $sentinel missing skill_name" >&2
      return 2
    fi
    synced_sha="$(sentinel_value "$sentinel" synced_content_sha256 2>/dev/null || true)"
    source_resolved="$(resolve_recorded_source "$source")"
    source_current="$REPO_ROOT/skills/$(source_basename "$source" "$skill_name").md"
    command="$(remediation_command_for "$skill_name" "$source")"

    if [ ! -f "$source_resolved" ]; then
      if [ -f "$source_current" ]; then
        echo "DRIFT: $skill_name: recorded source missing (stale sentinel; current repo source exists at $source_current); remediation: $command"
      else
        echo "DRIFT: $skill_name: recorded source missing and no current repo source exists (true orphan); remediation: rm -rf $(shell_quote "$target")"
      fi
      drift_count=$((drift_count + 1))
      continue
    fi

    actual="$target/SKILL.md"
    if [ ! -f "$actual" ]; then
      echo "DRIFT: $skill_name: installed SKILL.md missing; remediation: $command"
      drift_count=$((drift_count + 1))
      continue
    fi
    if [ ! -r "$actual" ]; then
      echo "ERROR: installed SKILL.md is not readable: $actual" >&2
      return 2
    fi

    canonical_safe="${skill_name//[^A-Za-z0-9_.-]/_}"
    expected="$CHECK_TMP/$canonical_safe.SKILL.md"
    if ! render_skill "$source_resolved" "$skill_name" > "$expected"; then
      echo "ERROR: failed to render expected Codex skill for $skill_name from $source_resolved" >&2
      return 2
    fi
    if ! expected_sha="$(sha256_file "$expected")"; then
      echo "ERROR: failed to hash expected Codex skill for $skill_name" >&2
      return 2
    fi
    if ! actual_sha="$(sha256_file "$actual")"; then
      echo "ERROR: failed to hash installed Codex skill for $skill_name" >&2
      return 2
    fi

    if [ "$actual_sha" != "$expected_sha" ]; then
      if [ -n "$synced_sha" ] && [ "$actual_sha" = "$synced_sha" ]; then
        reason="source drift"
      elif [ -n "$synced_sha" ] && [ "$expected_sha" = "$synced_sha" ]; then
        reason="installed SKILL.md drift"
      else
        reason="source/install drift"
      fi
      echo "DRIFT: $skill_name: $reason (actual=$actual_sha expected=$expected_sha); remediation: $command"
      drift_count=$((drift_count + 1))
    fi
  done
  shopt -u nullglob

  if [ "$managed_count" -eq 0 ]; then
    echo "no managed Codex ECHO install; nothing to check"
    return 0
  fi
  if [ "$drift_count" -gt 0 ]; then
    return 1
  fi
  echo "OK: all managed Codex ECHO skills match canonical sources"
  return 0
}

if [ "$CHECK" = "1" ]; then
  check_managed_codex_skills
  exit $?
fi

if [ "$DRY_RUN" = "0" ]; then
  mkdir -p "$CODEX_SKILLS" "$STAGING_ROOT"
else
  echo "DRY-RUN: mkdir -p $CODEX_SKILLS $STAGING_ROOT"
fi

count=0
for canonical in "$SKILLS_DIR"/*.md; do
  [ -e "$canonical" ] || continue
  basename_no_ext="$(basename "$canonical" .md)"
  skill_name="$(skill_display_name "$basename_no_ext")"
  target="$CODEX_SKILLS/$skill_name"

  if [ "$DRY_RUN" = "1" ]; then
    if [ -e "$target" ] || [ -L "$target" ]; then
      if is_managed_target "$target"; then
        echo "DRY-RUN: replace managed skill $target"
      else
        echo "DRY-RUN: would refuse non-managed existing target $target"
      fi
    else
      echo "DRY-RUN: install $skill_name from $canonical"
    fi
    count=$((count + 1))
    continue
  fi

  if [ -e "$target" ] || [ -L "$target" ]; then
    if ! is_managed_target "$target"; then
      echo "ERROR: $target already exists and is not ECHO-managed; refusing to overwrite" >&2
      exit 1
    fi
    rm -rf "$target"
  fi

  stage="$(mktemp -d "$STAGING_ROOT/${skill_name}.XXXXXX")"
  render_skill "$canonical" "$skill_name" > "$stage/SKILL.md"
  content_sha="$(shasum -a 256 "$stage/SKILL.md" | awk '{print $1}')"
  head_sha="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
  {
    echo "managed_by=tools/install-echo-codex-skills.sh"
    echo "source=$canonical"
    echo "skill_name=$skill_name"
    echo "synced_from_commit=$head_sha"
    echo "synced_content_sha256=$content_sha"
    echo "synced_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$stage/.echo-managed"

  mv "$stage" "$target"
  echo "OK: installed $skill_name"
  count=$((count + 1))
done

echo "OK: processed $count ECHO skills for Codex"
