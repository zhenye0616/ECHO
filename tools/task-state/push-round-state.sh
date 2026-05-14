#!/usr/bin/env bash
# tools/task-state/push-round-state.sh — blob-lease push helper for
# `backlog/task-state/<task-id>/round-state.md`. Used by both writers
# (watcher post-combine; strategist between rounds).
#
# Unlike the generic `tools/review-queue/push-with-retry.sh`, this helper
# does NOT pull-rebase on push rejection. The reason: a clean line-level
# rebase can silently replay a stale full-file round-state rewrite onto
# a newer round-state blob, which is exactly the semantic-CAS-loss the
# protocol defends against (see skills/role-typed-task-state.md, step 6).
#
# Usage:
#   tools/task-state/push-round-state.sh <task-id> <base-blob>
#
# <base-blob> is the git blob SHA the writer read at protocol step 1.
# Pass the literal string `ABSENT` for the first-write path (round-state.md
# did not exist at HEAD when the writer began).
#
# Clean-other-than-target invariant (046 R5 F1, founder reconciliation):
#   The helper REFUSES to start if any tracked file OTHER than its target
#   round-state.md is dirty. This prevents `git reset --hard origin/main`
#   in the abort path from wiping unrelated in-flight strategist/watcher
#   edits. Callers must ensure their working tree is clean w.r.t. all
#   tracked files except the target before invoking this helper.
#
# Behavior:
#   1. Precondition: clean-other-than-target gate (exits 2 if violated).
#   2. git add backlog/task-state/<task-id>/round-state.md
#   3. git commit
#   4. git push origin main
#   5. On rejection: re-read remote blob; if it equals <base-blob>, the
#      lease holds and we retry once via pull-rebase + push (safe because
#      origin/main advanced but didn't touch our file). If the blob
#      changed, run the durable-log abort sequence:
#        a. git reset --hard origin/main  (discards our stale commit)
#        b. write per-event abort file at
#             raw/internal/queue-errors/<ISO-ts>-<writer>-<task-id>.md
#           (per-event shape avoids rebase-conflict race between
#            concurrent abort-log writers — 046 R5 F2 fix)
#        c. commit + push that log file via push-with-retry.sh
#        d. exit non-zero
#   6. If pull-rebase introduces ANY conflict on round-state.md, run the
#      durable-log abort sequence (never auto-resolve).

set -e

if [ "$#" -ne 2 ]; then
  echo "usage: push-round-state.sh <task-id> <base-blob-or-ABSENT>" >&2
  exit 2
fi

TASK_ID="$1"
BASE_BLOB="$2"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PATH_REL="backlog/task-state/${TASK_ID}/round-state.md"
PATH_ABS="${REPO_ROOT}/${PATH_REL}"

iso_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

resolve_remote_blob() {
  # Print the current blob SHA of <PATH_REL> at origin/main, or the literal
  # string ABSENT if the path does not resolve.
  local out
  if out=$(git rev-parse "origin/main:${PATH_REL}" 2>/dev/null); then
    printf '%s' "$out"
  else
    printf 'ABSENT'
  fi
}

durable_log_abort() {
  local reason="$1" remote="$2"
  local ts ts_compact writer log_rel log_abs
  ts=$(iso_now)
  ts_compact=$(date -u +%Y%m%dT%H%M%SZ)
  # Per-event log filename (046 R5 F2): avoids the rebase-conflict race
  # that two simultaneous abort-log writers would hit with a single
  # `raw/internal/queue-errors.md` appender. Writer identity comes from
  # MY_REVIEWER (reviewer-tick convention) or falls back to $USER.
  writer="${MY_REVIEWER:-${USER:-unknown}}"
  log_rel="raw/internal/queue-errors/${ts_compact}-${writer}-${TASK_ID}.md"
  log_abs="${REPO_ROOT}/${log_rel}"
  # Step (a): discard the stale local round-state commit BEFORE writing
  # the log entry. The per-event file is then created against a clean
  # origin/main base — no append-race possible since each writer owns a
  # unique path.
  git reset --hard origin/main >&2 || true
  mkdir -p "$(dirname "${log_abs}")"
  printf '%s ROUND_STATE_WRITE_CAS_ABORT_PUSH: %s base=%s remote=%s reason=%s writer=%s\n' \
    "$ts" "$TASK_ID" "$BASE_BLOB" "$remote" "$reason" "$writer" \
    > "${log_abs}"
  # Step (c): commit + push the per-event log file via the generic
  # helper. Safe because this commit only touches a unique new path
  # (no append, no concurrent-writer conflict possible).
  git add "${log_rel}"
  git commit -m "queue-errors: round-state CAS push abort (${TASK_ID})" >&2
  "${REPO_ROOT}/tools/review-queue/push-with-retry.sh" "queue-errors: round-state CAS push abort ${TASK_ID}" >&2 || true
  exit 1
}

# 046 R5 F1 — clean-other-than-target precondition gate.
# Refuse to start if any tracked file OTHER than the target round-state.md
# is dirty (modified, staged, or with unmerged paths). Untracked files
# are ignored (the `??` prefix). This prevents `git reset --hard
# origin/main` in the abort path from wiping unrelated in-flight edits.
clean_other_than_target_check() {
  local porcelain target_porcelain_path
  porcelain=$(git status --porcelain 2>&1)
  # Anything matching the target round-state.md path is allowed; anything
  # else (other than `??` untracked) is a violation.
  target_porcelain_path="${PATH_REL}"
  if echo "$porcelain" \
    | awk -v target="$target_porcelain_path" '
        # skip untracked
        $1 == "??" { next }
        # skip lines whose path == target
        { sub(/^...?/, ""); if ($0 == target) next; found=1; print }
        END { exit (found ? 0 : 1) }
      ' >&2; then
    echo "push-round-state: ROUND_STATE_HELPER_DIRTY_TREE — tracked files other than ${PATH_REL} are dirty; abort before reset" >&2
    exit 2
  fi
}

clean_other_than_target_check

if [ ! -f "${PATH_ABS}" ]; then
  echo "push-round-state: file not present at ${PATH_REL}" >&2
  exit 2
fi

git add "${PATH_REL}"

# If `git add` did not stage any change (the file's tree state matches HEAD),
# `git commit` would fail. Surface a clean error rather than a generic abort.
if git diff --cached --quiet -- "${PATH_REL}"; then
  echo "push-round-state: no staged change for ${PATH_REL}; nothing to push" >&2
  exit 2
fi

git commit -m "round-state: ${TASK_ID}" >&2

if git push origin main; then
  exit 0
fi

# Push rejected — refresh the remote ref and inspect.
git fetch origin main >&2 || true
NOW_REMOTE_BLOB=$(resolve_remote_blob)

if [ "${NOW_REMOTE_BLOB}" != "${BASE_BLOB}" ]; then
  durable_log_abort "remote-blob-changed-between-read-and-push" "${NOW_REMOTE_BLOB}"
fi

# Lease holds — origin/main advanced but our file is unchanged. Safe to
# pull-rebase once and retry.
if ! git -c rebase.autoStash=false pull --rebase origin main >&2; then
  durable_log_abort "rebase-conflict-on-round-state" "${NOW_REMOTE_BLOB}"
fi

# Defensive: a rebase that succeeded "cleanly" must not have changed the
# round-state.md blob at HEAD vs. the SHA we just committed. If it did,
# bail rather than push a silently-merged result.
POST_REBASE_BLOB=$(git rev-parse "HEAD:${PATH_REL}" 2>/dev/null || printf 'ABSENT')
if [ "${POST_REBASE_BLOB}" = "ABSENT" ] || [ "${POST_REBASE_BLOB}" = "${NOW_REMOTE_BLOB}" ]; then
  # Either our commit got dropped, or the rebase resolved by taking
  # remote's version. Both are lease-broken.
  durable_log_abort "rebase-replaced-local-blob" "${NOW_REMOTE_BLOB}"
fi

if git push origin main; then
  exit 0
fi

# Second push rejected — fall back to durable-log abort.
durable_log_abort "second-push-rejected" "$(resolve_remote_blob)"
