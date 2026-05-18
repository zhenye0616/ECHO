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

usage() {
  cat <<EOF
Usage: tools/install-echo-codex-skills.sh [--dry-run] [--namespace NAME] [--underscore-names]

Installs all canonical ECHO skills from skills/*.md into:
  \$HOME/.codex/skills/<namespace>:<skill-name>/SKILL.md

Options:
  --dry-run            Print planned installs without writing files.
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
