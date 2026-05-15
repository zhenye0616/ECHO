#!/usr/bin/env bash
# _run_reviewer.sh — generic headless reviewer tick wrapper (043 AC3).
#
# Reads REVIEWER_NAME env var; expects a matching reviewers.json entry with
# mode:headless. Fails fast with a clear diagnostic if REVIEWER_NAME is unset,
# unknown, or refers to an IDE-mode reviewer.
#
# Working repo is selected via ${ECHO_REVIEW_QUEUE_REPO_ROOT}; default is the
# founder's production repo. Single source of truth for the launchd-tick
# wrapper body — codex-specific scripts (run-codex-reviewer.sh) are 5-line
# drivers that `exec env REVIEWER_NAME=<slug> ${this_script}`.

set -euo pipefail

: "${REVIEWER_NAME:?REVIEWER_NAME env var required}"

REPO_ROOT="${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"

if ! cd "$REPO_ROOT" 2>/dev/null; then
  echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a directory: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a git repo: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi

TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
export PYTHONPATH="$TOOL_DIR:${PYTHONPATH:-}"

# PATH augmentation — launchd's environment is stripped down; codex (and
# common dependencies it shells out to, including the python3 with
# jsonschema installed) live in user-local bin directories under Homebrew
# or asdf/nodenv. Cover the common locations. MUST come BEFORE any
# python3 invocation — under bare launchd PATH=/usr/bin:/bin:..., python3
# resolves to /usr/bin/python3 (Xcode 3.9, no site-packages) and the gate
# fails with ModuleNotFoundError: jsonschema. Surfaced 2026-05-14 when
# 048 R1 codex review tick silently failed every 10min for ~2h.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.nodenv/shims:$HOME/.asdf/shims:$HOME/bin:$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# CODEX_BIN — deterministic injection point for tests (051 AC2). Mirrors
# tools/backlog/run-codex-builder.sh:94. Defaults to the unqualified
# `codex` resolved via the wrapper's prepended PATH; tests set this to a
# stub script path to assert the wrapper does (or does not) spawn codex.
CODEX_BIN="${CODEX_BIN:-codex}"

# Validate REVIEWER_NAME exists in reviewers.json with mode=headless. The
# gate is a dedicated Python script (`_reviewer_gate.py`) so its stderr
# survives all shell-wrapping permutations (e.g. node spawnSync without a
# tty was eating heredoc-via-`<<PY` stderr in some setups).
SLASH_COMMAND=$(python3 "$TOOL_DIR/_reviewer_gate.py") || exit $?

LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/echo-review-queue-${REVIEWER_NAME}.log"
mkdir -p "$LOG_DIR"

# Rotate at 10MB (10485760 bytes) — keep one .1 sidecar, drop older.
if [ -f "$LOG_FILE" ]; then
  size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "${size:-0}" -gt 10485760 ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.1"
  fi
fi

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick start REVIEWER=$REVIEWER_NAME ECHO_REVIEW_QUEUE_REPO_ROOT=$REPO_ROOT"

  # 051 AC2 — honor the merge-and-cleanup sentinel-file lock. If a Claude
  # merge-and-cleanup session is in progress on the live `.git/index`, any
  # reviewer-tick `git add`/`commit` would race the merge writer (see
  # 048-morning + 049-evening incidents). Skip cleanly so launchd's next
  # ~10-min cadence retries organically — no in-script polling (would
  # deadlock against the strategist's interactive conflict-resolution).
  # `--git-common-dir` (not `--git-path`) resolves to the shared `.git/`
  # from any worktree, so the lock written by the main checkout is visible
  # even when this wrapper is invoked from a linked worktree CWD.
  LOCK_PATH="$(git rev-parse --git-common-dir)/echo-merge-in-progress"
  if [ -f "$LOCK_PATH" ]; then
    HOLDER=$(cat "$LOCK_PATH" 2>/dev/null | head -1)
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick skipped: merge in progress (lock=$LOCK_PATH, holder=$HOLDER)"
    exit 0
  fi

  PROMPT="$REPO_ROOT/.claude/commands/${SLASH_COMMAND}.md"
  if [ ! -f "$PROMPT" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: prompt missing at $PROMPT" >&2
    exit 1
  fi

  set +e
  "$CODEX_BIN" exec -C "$REPO_ROOT" --sandbox danger-full-access - < "$PROMPT"
  rc=$?
  set -e
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick end rc=$rc"
  exit "$rc"
} >> "$LOG_FILE" 2>&1
