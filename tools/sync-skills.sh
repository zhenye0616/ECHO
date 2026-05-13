#!/usr/bin/env bash
# tools/sync-skills.sh — sync ECHO skills from canonical `skills/` to per-client adapter directories.
#
# ECHO is the substrate that hosts the cross-tool collaboration protocol. The
# protocol — the slash-command skills (process-backlog, review-pending,
# merge-and-cleanup, review-queue-*) — is the shared grammar that EVERY AI
# client speaks. The canonical content lives under `skills/` (vendor-neutral,
# ECHO-namespaced). Each AI client has its own discovery directory:
#
#   - Claude Code:  .claude/commands/<name>.md  (this script handles)
#   - Cursor's Claude:  TBD (future: .cursor/commands/ or .cursor/rules/ or MCP-served)
#   - Codex / web ChatGPT:  TBD (future: MCP `echo_skill(name)` tool, served from skills/)
#
# Adapters are real-file copies (not symlinks) because Claude Code's skill
# discovery does NOT follow file-level symlinks — the ECHO skills disappear
# from the available-skills list when symlinked. The sync script + a
# pre-commit verification step are the durable substitute.
#
# Usage:
#   tools/sync-skills.sh            # sync (copies canonical → all adapters)
#   tools/sync-skills.sh --check    # verify identity, exit non-zero on drift

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
CLAUDE_DIR="$REPO_ROOT/.claude/commands"

MODE="${1:-sync}"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "ERROR: $SKILLS_DIR does not exist — nothing to sync" >&2
  exit 1
fi

mkdir -p "$CLAUDE_DIR"

drift=0
synced=0

for canonical in "$SKILLS_DIR"/*.md; do
  [ -e "$canonical" ] || continue
  name="$(basename "$canonical")"
  adapter="$CLAUDE_DIR/$name"

  if [ "$MODE" = "--check" ]; then
    if [ ! -f "$adapter" ]; then
      echo "DRIFT: missing adapter at $adapter (canonical: $canonical)" >&2
      drift=1
    elif ! cmp -s "$canonical" "$adapter"; then
      echo "DRIFT: $adapter differs from canonical $canonical" >&2
      drift=1
    fi
  else
    cp "$canonical" "$adapter"
    synced=$((synced + 1))
  fi
done

if [ "$MODE" = "--check" ]; then
  if [ "$drift" -eq 0 ]; then
    echo "OK: all adapters match canonical skills/"
    exit 0
  fi
  echo "" >&2
  echo "Fix: run tools/sync-skills.sh (without --check) and re-commit." >&2
  exit 1
fi

echo "Synced $synced skill(s) from skills/ → .claude/commands/"
