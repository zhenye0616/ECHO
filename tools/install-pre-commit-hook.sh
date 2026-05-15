#!/usr/bin/env bash
# tools/install-pre-commit-hook.sh — install ECHO's pre-commit hook that runs
# `tools/sync-skills.sh --check` and aborts the commit on canonical/adapter drift.
#
# This installer is MANUAL ONLY. It is not auto-invoked by any other tool,
# skill, or test. The founder runs it once per checkout, deliberately.
#
# Overwrite policy: this installer OVERWRITES any existing pre-commit hook
# content unconditionally on the content-differs branch. Rationale: pre-commit
# hooks are local-only (never committed), this installer is the canonical way
# to install ECHO's hook, and merging this hook with a hand-written one is out
# of scope. Operators who have a custom pre-commit hook MUST manually
# concatenate the two — the installer prints a warning on the overwrite branch
# to remind them.
#
# Hook path resolution (handles linked worktrees and core.hooksPath, including
# relative core.hooksPath values from nested cwd):
#   1. If `core.hooksPath` is set:
#      - absolute path → use directly
#      - relative path → normalize against `git rev-parse --show-toplevel`
#        (NOT cwd; that would silently misplace the hook from a subdirectory)
#   2. Otherwise → `git rev-parse --git-path hooks/pre-commit`
#
# Idempotent on content AND mode: a no-op re-install leaves a byte-identical,
# user-executable hook. If the existing hook is byte-identical but not
# executable (git silently ignores non-executable hooks), the installer
# repairs the mode in place.
#
# Usage:
#   tools/install-pre-commit-hook.sh

set -euo pipefail

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "ERROR: not inside a git working tree" >&2
  exit 1
fi

TOPLEVEL="$(git rev-parse --show-toplevel)"

# --- resolve hook path ---
HOOKS_PATH_RAW="$(git config --get core.hooksPath 2>/dev/null || true)"
if [ -n "$HOOKS_PATH_RAW" ]; then
  case "$HOOKS_PATH_RAW" in
    /*)
      HOOK_PATH="$HOOKS_PATH_RAW/pre-commit"
      ;;
    *)
      # Git resolves a relative core.hooksPath against the repo's working-tree
      # root, NOT against the cwd from which `git` was invoked. Mirroring that
      # here is required so an installer invocation from a subdirectory like
      # `tools/` does not silently write to `tools/<hooksPath>/pre-commit`.
      HOOK_PATH="$TOPLEVEL/$HOOKS_PATH_RAW/pre-commit"
      ;;
  esac
else
  HOOK_PATH="$(git rev-parse --git-path hooks/pre-commit)"
  # `git rev-parse --git-path` may return a relative path; normalize.
  case "$HOOK_PATH" in
    /*) ;;
    *) HOOK_PATH="$TOPLEVEL/$HOOK_PATH" ;;
  esac
fi

HOOK_DIR="$(dirname "$HOOK_PATH")"
mkdir -p "$HOOK_DIR"

# --- hook body ---
# The hook runs from whatever cwd `git commit` was launched in; jump to the
# repo's working-tree root before invoking the sync check so relative paths
# resolve consistently.
read -r -d '' HOOK_BODY <<'HOOK_EOF' || true
#!/usr/bin/env bash
# ECHO pre-commit hook — installed by tools/install-pre-commit-hook.sh.
# Verifies skills/ ↔ .claude/commands/ (and other registered adapters) are in
# sync; aborts the commit on drift.
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
exec tools/sync-skills.sh --check
HOOK_EOF

# --- write to temp in same dir for atomic rename, then branch on content/mode ---
TMP_HOOK="$(mktemp "$HOOK_DIR/.pre-commit.XXXXXX")"
trap 'rm -f "$TMP_HOOK"' EXIT
printf '%s\n' "$HOOK_BODY" > "$TMP_HOOK"

if [ -f "$HOOK_PATH" ] && cmp -s "$TMP_HOOK" "$HOOK_PATH"; then
  # Content byte-identical to what we'd install.
  if [ -x "$HOOK_PATH" ]; then
    # Already correct on content + mode → discard temp, no-op.
    rm -f "$TMP_HOOK"
    trap - EXIT
    echo "pre-commit hook unchanged at $HOOK_PATH"
    exit 0
  fi
  # Identical content but non-executable → repair mode in place (git silently
  # ignores non-executable hooks; a no-op reinstall without this branch would
  # be a silent failure).
  rm -f "$TMP_HOOK"
  trap - EXIT
  chmod u+x "$HOOK_PATH"
  echo "pre-commit hook mode repaired (was non-executable) at $HOOK_PATH"
  exit 0
fi

# Content differs OR hook missing → install (overwrite).
HAD_PRIOR=0
[ -f "$HOOK_PATH" ] && HAD_PRIOR=1
mv "$TMP_HOOK" "$HOOK_PATH"
trap - EXIT
chmod u+x "$HOOK_PATH"
echo "pre-commit hook installed at $HOOK_PATH"
if [ "$HAD_PRIOR" -eq 1 ]; then
  echo "NOTE: existing pre-commit hook was overwritten. If you had a custom hook, restore it from your shell history or version-controlled backup."
fi
