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
# Behavior:
#   1. git add backlog/task-state/<task-id>/round-state.md
#   2. git commit
#   3. git push origin main
#   4. On rejection: re-read remote blob; if it equals <base-blob>, the
#      lease holds and we retry once via pull-rebase + push (safe because
#      origin/main advanced but didn't touch our file). If the blob
#      changed, run the durable-log abort sequence:
#        a. git reset --hard origin/main  (discards our stale commit)
#        b. append ROUND_STATE_WRITE_CAS_ABORT_PUSH row to queue-errors.md
#        c. commit + push that log row via push-with-retry.sh
#        d. exit non-zero
#   5. If pull-rebase introduces ANY conflict on round-state.md, run the
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
  local ts
  ts=$(iso_now)
  # Step (a): discard the stale local round-state commit BEFORE writing the
  # log entry. raw/internal/queue-errors.md is tracked; if we appended
  # first then reset, the append would be wiped.
  git reset --hard origin/main >&2 || true
  mkdir -p "${REPO_ROOT}/raw/internal"
  printf '%s ROUND_STATE_WRITE_CAS_ABORT_PUSH: %s base=%s remote=%s reason=%s\n' \
    "$ts" "$TASK_ID" "$BASE_BLOB" "$remote" "$reason" \
    >> "${REPO_ROOT}/raw/internal/queue-errors.md"
  # Step (c): commit + push the log row via the generic helper. Safe
  # because this commit only touches queue-errors.md (uncontested).
  git add "${REPO_ROOT}/raw/internal/queue-errors.md"
  git commit -m "queue-errors: round-state CAS push abort (${TASK_ID})" >&2
  "${REPO_ROOT}/tools/review-queue/push-with-retry.sh" "queue-errors: round-state CAS push abort ${TASK_ID}" >&2 || true
  exit 1
}

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
