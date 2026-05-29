#!/usr/bin/env bash
# Shared clean-snapshot entrypoint for review-queue automation.
#
# Source this file, then call:
#   echo_enter_clean_snapshot <role-slug>
#
# The caller must start in the production repo checkout it wants to anchor on.
# The function creates a detached worktree at $TMPDIR/echo-<role>-<uuid>, pins
# it to origin/main, exports WT and ECHO_REVIEW_QUEUE_REPO_ROOT, cd's into WT,
# and installs a unified cleanup trap for success and failure paths.

echo_enter_clean_snapshot() {
  local role_slug="${1:-}"
  if [ -z "$role_slug" ]; then
    echo "echo_enter_clean_snapshot: role slug required" >&2
    return 2
  fi
  case "$role_slug" in
    *[!A-Za-z0-9._-]*)
      echo "echo_enter_clean_snapshot: unsafe role slug: $role_slug" >&2
      return 2
      ;;
  esac

  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "echo_enter_clean_snapshot: current directory is not a git worktree" >&2
    return 1
  }
  export ECHO_CLEAN_SNAPSHOT_REPO_ROOT="$repo_root"

  # Pre-flight worktree hygiene (order matters).
  git worktree prune || true

  local registered_wt
  registered_wt="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}')"

  if [ -n "${TMPDIR:-}" ] && [ -d "$TMPDIR" ]; then
    local orphan
    while IFS= read -r -d '' orphan; do
      if printf '%s\n' "$registered_wt" | grep -Fxq "$orphan"; then
        continue
      fi
      rm -rf -- "$orphan" || true
    done < <(find "$TMPDIR" -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0 2>/dev/null)
  fi

  git fetch origin main

  if [ -z "${TMPDIR:-}" ]; then
    echo "echo_enter_clean_snapshot: TMPDIR unset; cannot place ephemeral worktree" >&2
    return 1
  fi

  WT="$TMPDIR/echo-${role_slug}-$(uuidgen)"
  export WT

  if ! git worktree add --detach "$WT" origin/main; then
    echo "echo_enter_clean_snapshot: git worktree add failed at $WT" >&2
    return 1
  fi

  echo_clean_snapshot_cleanup() {
    local rc=$?
    cd "$ECHO_CLEAN_SNAPSHOT_REPO_ROOT" 2>/dev/null || true
    if [ -n "${WT:-}" ] && [ -d "$WT" ]; then
      git worktree remove --force "$WT" 2>/dev/null || true
    fi
    git worktree prune 2>/dev/null || true
    return "$rc"
  }

  trap echo_clean_snapshot_cleanup EXIT
  trap 'echo_clean_snapshot_cleanup; exit 1' ERR INT TERM

  cd "$WT"
  export ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"
}
