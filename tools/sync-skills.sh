#!/usr/bin/env bash
# tools/sync-skills.sh — sync ECHO skills from canonical `skills/` to Claude command adapters.
#
# ECHO is the substrate that hosts the cross-tool collaboration protocol. The
# protocol — the slash-command skills (process-backlog, review-pending,
# merge-and-cleanup, review-queue-*) — is the shared grammar that EVERY AI
# client speaks. The canonical content lives under `skills/` (vendor-neutral,
# ECHO-namespaced).
#
#   - Claude Code:    .claude/commands/<name>.md             (flat real-file copy)
#   - Cursor's Claude: reuses .claude/commands/ via compat
#   - Codex CLI:      tools/install-echo-codex-skills.sh renders all canonical
#                     skills directly into ~/.codex/skills/ECHO:<name>/SKILL.md
#   - Web ChatGPT / future clients: TBD (future: MCP `echo_skill(name)` tool)
#
# Claude Code adapters are real-file copies (not symlinks) because Claude Code's
# skill discovery does NOT follow file-level symlinks — the ECHO skills disappear
# from the available-skills list when symlinked. The sync script + a pre-commit
# verification step are the durable substitute.
#
# Usage:
#   tools/sync-skills.sh            # sync (copies canonical → Claude commands)
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
synced_claude=0

# --- Claude Code adapter (existing behavior, byte-stable) ---
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
    synced_claude=$((synced_claude + 1))
  fi
done

if [ "$MODE" = "--check" ]; then
  if [ "$drift" -eq 0 ]; then
    echo "OK: all Claude command adapters match canonical skills/"
    exit 0
  fi
  echo "" >&2
  echo "Fix: run tools/sync-skills.sh (without --check) and re-commit." >&2
  exit 1
fi

echo "Synced $synced_claude Claude Code adapter(s). Codex installs directly via tools/install-echo-codex-skills.sh."
