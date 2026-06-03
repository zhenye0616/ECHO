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

# Global user-level ECHO command copies (~/.claude/commands). Claude Code's
# skill discovery loads these, and they historically drifted because nothing
# synced them: a stale review-queue-watch here ran one watcher tick that
# converged a spec WITHOUT the 086 claim-gate marker, so the builder couldn't
# claim it (see backlog/_followups.md 2026-06-02). Now a first-class sync
# target so it can't go stale, and --check fails on global drift too.
#   - Synced ONLY when the dir already exists, so this repo script never
#     creates user-home state on a fresh machine / CI.
#   - Files in the global dir with NO canonical counterpart (e.g.
#     using-echo-mcp.md, using-superpowers.md) are left untouched — we add/
#     update the canonical set, never delete.
GLOBAL_DIR="$HOME/.claude/commands"
sync_global=0
[ -d "$GLOBAL_DIR" ] && sync_global=1

MODE="${1:-sync}"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "ERROR: $SKILLS_DIR does not exist — nothing to sync" >&2
  exit 1
fi

mkdir -p "$CLAUDE_DIR"

drift=0
synced_claude=0
synced_global_count=0

# --- Claude Code adapter (project + global), byte-stable ---
for canonical in "$SKILLS_DIR"/*.md; do
  [ -e "$canonical" ] || continue
  name="$(basename "$canonical")"
  adapter="$CLAUDE_DIR/$name"
  global_adapter="$GLOBAL_DIR/$name"

  if [ "$MODE" = "--check" ]; then
    if [ ! -f "$adapter" ]; then
      echo "DRIFT: missing adapter at $adapter (canonical: $canonical)" >&2
      drift=1
    elif ! cmp -s "$canonical" "$adapter"; then
      echo "DRIFT: $adapter differs from canonical $canonical" >&2
      drift=1
    fi
    if [ "$sync_global" -eq 1 ]; then
      if [ ! -f "$global_adapter" ]; then
        echo "DRIFT: missing global copy at $global_adapter (canonical: $canonical)" >&2
        drift=1
      elif ! cmp -s "$canonical" "$global_adapter"; then
        echo "DRIFT: $global_adapter differs from canonical $canonical" >&2
        drift=1
      fi
    fi
  else
    cp "$canonical" "$adapter"
    synced_claude=$((synced_claude + 1))
    if [ "$sync_global" -eq 1 ]; then
      cp "$canonical" "$global_adapter"
      synced_global_count=$((synced_global_count + 1))
    fi
  fi
done

if [ "$MODE" = "--check" ]; then
  if [ "$drift" -eq 0 ]; then
    if [ "$sync_global" -eq 1 ]; then
      echo "OK: all Claude command adapters (project + global ~/.claude/commands) match canonical skills/"
    else
      echo "OK: all Claude command adapters match canonical skills/ (global ~/.claude/commands absent — skipped)"
    fi
    exit 0
  fi
  echo "" >&2
  echo "Fix: run tools/sync-skills.sh (without --check) and re-commit." >&2
  exit 1
fi

if [ "$sync_global" -eq 1 ]; then
  echo "Synced $synced_claude Claude Code adapter(s) + $synced_global_count global ~/.claude/commands copy(ies). Codex installs directly via tools/install-echo-codex-skills.sh."
else
  echo "Synced $synced_claude Claude Code adapter(s). (Global ~/.claude/commands absent — skipped.) Codex installs directly via tools/install-echo-codex-skills.sh."
fi
