#!/usr/bin/env bash
# run-codex-builder.sh — invoke codex as a builder binding for ECHO's
# process-backlog protocol (047 AC1).
#
# Manually invoked from a regular terminal when the founder wants codex to
# claim and execute the next ready backlog item. NOT a launchd / cron job —
# the builder lifecycle is one-shot and long-running (claim → worktree →
# tests → push → pending_review), not periodic. A periodic invocation would
# either race multiple builders on the same item or fire long after the
# founder wants the work to start. See backlog item 047 (codex-as-builder
# binding adapter) Out of Scope #1.
#
# Shape matches tools/review-queue/_run_reviewer.sh for shared concerns
# (repo-root validation, PATH augmentation, log rotation, codex exec
# invocation). Builder-specific concerns layered on top: ECHO_AGENT_ID
# resolution, atomic lock DIRECTORY (mkdir is atomic create-or-fail), and
# argv[0]=codex preservation via `exec -a codex`.

set -euo pipefail

REPO_ROOT="${ECHO_BACKLOG_REPO_ROOT:-$HOME/Desktop/Project_echo}"

if ! cd "$REPO_ROOT" 2>/dev/null; then
  echo "ECHO_BACKLOG_REPO_ROOT is missing or not a directory: '${ECHO_BACKLOG_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ECHO_BACKLOG_REPO_ROOT is missing or not a git repo: '${ECHO_BACKLOG_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi

# PATH augmentation — launchd / minimal-env shells strip PATH. Mirror the
# reviewer wrapper so codex + git + node resolve from user-local bin dirs.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.nodenv/shims:$HOME/.asdf/shims:$HOME/bin:$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# ECHO_AGENT_ID — stable per-machine persona; required for the
# builder.md writer-identity and for claimed_by frontmatter. Env wins; else
# read or initialize ~/.echo/agent-id (UUID4 on first run).
AGENT_ID_FILE="$HOME/.echo/agent-id"
if [ -z "${ECHO_AGENT_ID:-}" ]; then
  if [ ! -f "$AGENT_ID_FILE" ]; then
    mkdir -p "$(dirname "$AGENT_ID_FILE")"
    uuidgen > "$AGENT_ID_FILE"
  fi
  ECHO_AGENT_ID="$(cat "$AGENT_ID_FILE")"
fi
export ECHO_AGENT_ID

# Log file — same path / rotation policy as the reviewer wrapper (10MB,
# one .1 sidecar, drop older).
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/echo-backlog-codex-builder.log"
mkdir -p "$LOG_DIR"

if [ -f "$LOG_FILE" ]; then
  size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "${size:-0}" -gt 10485760 ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.1"
  fi
fi

# Atomic lock DIRECTORY (not file). `mkdir` is atomic create-or-fail on
# APFS / HFS+ / ext4 — closes the race that `[ -e ]` + `echo >` leaves
# open, where two near-simultaneous wrapper invocations would both enter
# the critical section. Lock-info content uses ONLY wrapper-known
# metadata (no $ITEM_ID — selection happens inside codex exec, after the
# lock is held, so referencing it here would be unbound under `set -u`).
LOCK_DIR="$REPO_ROOT/.git/echo-builder-in-progress.d"
export ECHO_BUILDER_LOCK_DIR="$LOCK_DIR"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "ERROR: existing lock at $LOCK_DIR" >&2
  [ -f "$LOCK_DIR/info" ] && echo "  contents: $(cat "$LOCK_DIR/info")" >&2
  echo "  remove with: rm -rf $LOCK_DIR" >&2
  exit 1
fi
echo "codex-builder @ $(date -u +%Y-%m-%dT%H:%M:%SZ) by $$ agent=$ECHO_AGENT_ID" > "$LOCK_DIR/info"
trap 'rm -rf "$LOCK_DIR"' EXIT INT TERM

PROMPT="$REPO_ROOT/skills/process-backlog.md"
if [ ! -f "$PROMPT" ]; then
  echo "ERROR: prompt missing at $PROMPT" >&2
  exit 1
fi

# CODEX_BIN — defaults to the literal string `codex` (resolved by PATH
# search at exec time, which yields argv[0]="codex" via execve semantics).
# Tests inject a path to a `.sh` shebang script; shebang re-exec on
# Linux/macOS rewrites argv[0] to the interpreter, so a shebang mock
# cannot observe argv[0]="codex" the way a real `codex` binary would.
# The `.sh`-suffix branch below sources the mock inside a `bash -c`
# shell where `$0="codex"` survives — production semantics are
# unchanged (the else-branch is the only path that runs when CODEX_BIN
# resolves to a real binary).
CODEX_BIN="${CODEX_BIN:-codex}"

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] codex-builder start ECHO_BACKLOG_REPO_ROOT=$REPO_ROOT ECHO_AGENT_ID=$ECHO_AGENT_ID CODEX_BIN=$CODEX_BIN"
  set +e
  if [[ "$CODEX_BIN" == *.sh ]]; then
    # Test path: source the shebang mock inside `bash -c` so the mock's $0
    # is "codex" (matching what a real codex binary would observe). The
    # shifted positional layout means the mock's $@ matches production —
    # ["exec", "-C", $REPO_ROOT, "--sandbox", "danger-full-access", "-"].
    (exec -a codex bash -c 'mock="$1"; shift; . "$mock"' codex "$CODEX_BIN" exec -C "$REPO_ROOT" --sandbox danger-full-access -) < "$PROMPT"
  else
    (exec -a codex "$CODEX_BIN" exec -C "$REPO_ROOT" --sandbox danger-full-access -) < "$PROMPT"
  fi
  rc=$?
  set -e
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] codex-builder end rc=$rc"
  exit "$rc"
} >> "$LOG_FILE" 2>&1
