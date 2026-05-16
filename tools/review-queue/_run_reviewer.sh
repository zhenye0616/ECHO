#!/usr/bin/env bash
# _run_reviewer.sh — generic headless reviewer tick wrapper (043 AC3 + 050 + 056 AC5).
#
# Reads REVIEWER_NAME env var; expects a matching reviewers.json entry with
# mode:headless. Fails fast with a clear diagnostic if REVIEWER_NAME is unset,
# unknown, or refers to an IDE-mode reviewer.
#
# Working repo is selected via ${ECHO_REVIEW_QUEUE_REPO_ROOT}; default is the
# founder's production repo. Single source of truth for the launchd-tick
# wrapper body — per-vendor scripts (run-codex-reviewer.sh,
# run-codex-ops-reviewer.sh, run-claude-reviewer.sh) are 5-line drivers
# that `exec env REVIEWER_NAME=<slug> ${this_script}`.
#
# 050 worktree-isolation (architectural invariant): the wrapper does NOT
# launch the child CLI inside the founder's live main checkout. Each tick
# creates an ephemeral, detached-HEAD worktree at
# $TMPDIR/echo-<reviewer>-<uuid>, routes the child via CWD + env +
# prompt-path + the vendor's own pinning flag, and discards the worktree
# on unified ERR/EXIT cleanup. The live main .git/index is never written
# to by an automated reviewer tick.
#
# 056 AC5 vendor-agnostic dispatch: the child invocation is no longer
# hardcoded to `codex exec`. Each headless reviewer's `invoke_command`
# template in reviewers.json names its own CLI, with {{WT}} / {{PROMPT}}
# substituted shell-safe via shlex.quote → bash -c.

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

  # ── 057b AC7 Phase 1 — scheduler health (bootstrap-scoped) ─────────────
  # Emit coord:scheduler_health at log-redirect-open. This opens a SHORT
  # bootstrap-window deadline (default 120s / max 300s per 057a's
  # coord-roles.json) that covers ONLY the worktree-creation, env-setup,
  # prompt-routing, codex-argv-assembly window. After that finishes (just
  # before INVOKE_CMD runs), Phase 1 emits scheduler_health_done to close
  # the deadline. Round-tier tick_start/tick_end takes over from there.
  # The split (r3 codex-ops F2 MED) prevents long real reviews from
  # firing false coord:deadline_missed alerts on the scheduler tier.
  TICK_RUN_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/coord-emit.sh" scheduler_health \
    --tick-run-id="$TICK_RUN_ID" || true

  # ── 050 AC1 step 0: pre-flight worktree hygiene (order matters) ────────
  # 1) Prune admin entries for worktrees whose dirs are already gone (e.g.
  #    cleanly-removed prior ticks). Admin-only — does not touch live dirs.
  git worktree prune || true
  # 2) Enumerate registered worktrees. Any path in this set is skipped no
  #    matter its age — registered worktrees include active merger
  #    conflict-pauses AND crashed registered survivors. 050 does not
  #    distinguish (followup-F is the operator script for crashed cleanup).
  REGISTERED_WT=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}')
  # 3) GC unregistered $TMPDIR/echo-* orphans older than 60 minutes.
  if [ -n "${TMPDIR:-}" ] && [ -d "$TMPDIR" ]; then
    while IFS= read -r -d '' orphan; do
      if printf '%s\n' "$REGISTERED_WT" | grep -Fxq "$orphan"; then
        continue   # registered → skip regardless of mtime
      fi
      rm -rf -- "$orphan" || true
    done < <(find "$TMPDIR" -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0 2>/dev/null)
  fi

  # ── 050 AC1 step 1: read-only fetch (does NOT check out, does NOT touch
  # live index). The reviewer will run in a fresh detached-HEAD worktree at
  # origin/main below.
  git fetch origin main

  # ── 050 AC1 step 2: compute worktree path. Hard-fail if $TMPDIR is unset
  # or empty (don't silently fall back to /tmp — surfacing the unset-env
  # case is more useful than silently writing somewhere unexpected).
  if [ -z "${TMPDIR:-}" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: TMPDIR unset; cannot place ephemeral worktree" >&2
    exit 1
  fi
  WT="$TMPDIR/echo-${REVIEWER_NAME}-$(uuidgen)"

  # ── 050 AC1 step 3: create the detached worktree pinned to origin/main.
  if ! git worktree add --detach "$WT" origin/main; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: git worktree add failed at $WT" >&2
    exit 1
  fi

  # ── 050 AC1 step 6: unified cleanup trap (success + failure paths).
  # No push-failure-specific preservation logic — any failure mode discards
  # the worktree and its uncommitted/unpushed work. Crashed-tick safety is
  # guaranteed by re-fireability (next tick re-reads r<N>/request.md).
  cleanup() {
    local rc=$?
    cd "$REPO_ROOT" 2>/dev/null || true
    if [ -n "${WT:-}" ] && [ -d "$WT" ]; then
      git worktree remove --force "$WT" 2>/dev/null || true
    fi
    git worktree prune 2>/dev/null || true
    return $rc
  }
  trap cleanup EXIT
  trap 'cleanup; exit 1' ERR INT TERM

  # ── 050 AC1 step 4: route the child Codex into $WT via ALL FOUR handoffs.
  # CWD, env (so the prompt body's `cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-...}"`
  # lands in the worktree), prompt-path (so the reviewer reads prompt bytes
  # from the worktree copy — picks up R3-disposition fixes that landed in
  # origin/main), and `-C` to codex itself.
  cd "$WT"
  export ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"

  PROMPT="$WT/.claude/commands/${SLASH_COMMAND}.md"
  if [ ! -f "$PROMPT" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: prompt missing at $PROMPT" >&2
    # Pre-spawn failure: log + push a queue-error row through the durable
    # helper BEFORE the cleanup trap removes $WT. See 056 AC5 part 4.
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "prompt_missing" "expected prompt at $PROMPT" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record prompt_missing" >&2
    exit 1
  fi

  # 056 AC5 part 1 + part 3 — resolve the per-vendor invoke_command from
  # reviewers.json. The gate script substitutes {{WT}} / {{PROMPT}} through
  # shlex.quote (Option A: shell-safe) and prints the final command string
  # to stdout. Failure (template missing required token, IDE-mode reviewer,
  # missing entry) → pre-spawn queue-error row + exit 1.
  #
  # NB: WT / PROMPT / REVIEWER_NAME must be passed through `env` (or
  # exported) because the right-hand side here is itself a $(…) assignment,
  # not an external command — bash treats inline `VAR=… INVOKE_CMD=$(…)` as
  # a sequence of variable assignments, and the prefix env vars are NOT
  # propagated to the subshell that runs python3.
  set +e
  INVOKE_CMD=$(env WT="$WT" PROMPT="$PROMPT" REVIEWER_NAME="$REVIEWER_NAME" \
    python3 "$TOOL_DIR/_reviewer_gate.py" --print invoke_command 2>/tmp/echo-rq-gate-err.$$)
  gate_rc=$?
  gate_err=$(cat /tmp/echo-rq-gate-err.$$ 2>/dev/null || true)
  rm -f /tmp/echo-rq-gate-err.$$
  set -e
  if [ "$gate_rc" -ne 0 ] || [ -z "$INVOKE_CMD" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: invoke_command resolution failed: $gate_err" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "invoke_command_unresolved" "${gate_err:-no diagnostic from gate}" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record invoke_command_unresolved" >&2
    exit 1
  fi

  # Verify the resolved CLI executable is on PATH before spawning. The first
  # word of the template (after substitution) is the executable name; if
  # `command -v` can't resolve it, we'd otherwise get an opaque
  # "command not found" inside the subshell + leave the founder hunting
  # through launchd logs.
  EXE_NAME=$(printf '%s\n' "$INVOKE_CMD" | awk '{print $1}')
  if ! command -v "$EXE_NAME" >/dev/null 2>&1; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: executable not on PATH: $EXE_NAME" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "executable_not_found" "$EXE_NAME not on PATH" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record executable_not_found" >&2
    exit 1
  fi

  # ── 057b AC7 Phase 1 — scheduler health DONE ───────────────────────────
  # Bootstrap is complete (worktree created, env routed, prompt resolved,
  # CLI argv built, executable verified). Close the scheduler_health
  # deadline BEFORE INVOKE_CMD runs so the long review window does NOT
  # fire a false scheduler-tier deadline_missed. Round-tier tick_start /
  # tick_end emitted inside the reviewer skill cover the review work.
  # Export TICK_RUN_ID so child reviewer-skill steps could (in principle)
  # emit additional scheduler-tier events under the same run identity,
  # though 057b's protocol only requires the pair above.
  export TICK_RUN_ID
  REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/coord-emit.sh" scheduler_health_done \
    --tick-run-id="$TICK_RUN_ID" || true

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] dispatching: $INVOKE_CMD"
  set +e
  bash -c "$INVOKE_CMD"
  rc=$?
  set -e
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick end rc=$rc"
  exit "$rc"
} >> "$LOG_FILE" 2>&1
