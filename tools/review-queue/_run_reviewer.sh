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
# 087 reviewer-invocation argv contract: each headless reviewer resolves an
# argv vector from reviewer-bindings.json, and the prompt path is redirected
# onto stdin via the binding's stdin_from field. No bash -c shell-string path
# is used for child dispatch.

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
source "$TOOL_DIR/_effect-runner.sh"

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
# invocation binding itself is resolved after the isolated worktree exists so
# binding failures can be recorded through queue_error.sh before cleanup.
python3 "$TOOL_DIR/_reviewer_gate.py" >/dev/null || exit $?

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

  # ── 050 AC1: enter a clean detached-HEAD snapshot. The shared helper
  # preserves the observable invariants from the former inline block:
  # pre-flight hygiene, origin/main fetch, $TMPDIR/echo-<reviewer>-<uuid>
  # worktree, WT + ECHO_REVIEW_QUEUE_REPO_ROOT exports, and unified cleanup.
  source "$TOOL_DIR/_clean-snapshot.sh"
  echo_enter_clean_snapshot "$REVIEWER_NAME"

  # Route the child CLI into $WT via the binding-owned argv + stdin model.
  # CWD/env still land the prompt body's repository operations in the
  # worktree; the binding supplies both argv (including any vendor-specific
  # worktree flag such as `-C`) and the prompt path redirected onto stdin.
  set +e
  STDIN_FROM=$(env WT="$WT" REVIEWER_NAME="$REVIEWER_NAME" \
    python3 "$TOOL_DIR/_reviewer_gate.py" --print stdin_from 2>/tmp/echo-rq-stdin-gate-err.$$)
  stdin_gate_rc=$?
  stdin_gate_err=$(cat /tmp/echo-rq-stdin-gate-err.$$ 2>/dev/null || true)
  rm -f /tmp/echo-rq-stdin-gate-err.$$
  set -e
  if [ "$stdin_gate_rc" -ne 0 ] || [ -z "$STDIN_FROM" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: stdin_from resolution failed: $stdin_gate_err" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "stdin_from_unresolved" "${stdin_gate_err:-no diagnostic from gate}" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record stdin_from_unresolved" >&2
    exit 1
  fi

  if [ ! -f "$STDIN_FROM" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: prompt missing at $STDIN_FROM" >&2
    # Pre-spawn failure: log + push a queue-error row through the durable
    # helper BEFORE the cleanup trap removes $WT. See 056 AC5 part 4.
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "prompt_missing" "expected prompt at $STDIN_FROM" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record prompt_missing" >&2
    exit 1
  fi

  # Resolve argv through a temp file so the Python gate's exit status is
  # observed before Bash reads the NUL-delimited vector. Do not use process
  # substitution here: a failed producer can leave `read` with an empty argv
  # and a zero wrapper status under set -e.
  argv_file="$(mktemp "${TMPDIR:-/tmp}/echo-rq-argv.XXXXXX")"
  argv_err_file="$(mktemp "${TMPDIR:-/tmp}/echo-rq-argv-err.XXXXXX")"
  set +e
  env WT="$WT" REVIEWER_NAME="$REVIEWER_NAME" \
    python3 "$TOOL_DIR/_reviewer_gate.py" --print argv_nul > "$argv_file" 2>"$argv_err_file"
  gate_rc=$?
  gate_err=$(cat "$argv_err_file" 2>/dev/null || true)
  set -e
  if [ "$gate_rc" -ne 0 ] || [ ! -s "$argv_file" ]; then
    rm -f "$argv_file" "$argv_err_file"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: argv resolution failed: $gate_err" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "argv_unresolved" "${gate_err:-no diagnostic from gate}" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record argv_unresolved" >&2
    exit 1
  fi
  INVOKE_ARGV=()
  while IFS= read -r -d '' arg; do
    INVOKE_ARGV+=("$arg")
  done < "$argv_file"
  rm -f "$argv_file" "$argv_err_file"
  if [ "${#INVOKE_ARGV[@]}" -eq 0 ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: argv resolution returned empty argv" >&2
    REVIEWER_NAME="$REVIEWER_NAME" "$TOOL_DIR/queue_error.sh" \
      "argv_unresolved" "empty argv from gate" \
      || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue_error.sh failed to record argv_unresolved" >&2
    exit 1
  fi

  # Verify the resolved CLI executable is on PATH before spawning. The first
  # argv element is the executable name; if `command -v` can't resolve it,
  # we'd otherwise get an opaque "command not found" from the child.
  EXE_NAME="${INVOKE_ARGV[0]}"
  if [ "${ECHO_EFFECT_MODE:-live}" = "live" ] && ! command -v "$EXE_NAME" >/dev/null 2>&1; then
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

  {
    printf '[%s] dispatching:' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf ' %q' "${INVOKE_ARGV[@]}"
    printf ' < %q\n' "$STDIN_FROM"
  }
  set +e
  echo_effect codex-exec -- "${INVOKE_ARGV[@]}" < "$STDIN_FROM"
  rc=$?
  set -e
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick end rc=$rc"
  exit "$rc"
} >> "$LOG_FILE" 2>&1
