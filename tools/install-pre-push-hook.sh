#!/usr/bin/env bash
# Install ECHO's manual pre-push hook for the pinned full-history secret scan.

set -euo pipefail

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "ERROR: not inside a git working tree" >&2
  exit 1
fi

TOPLEVEL="$(git rev-parse --show-toplevel)"
HOOKS_PATH_RAW="$(git config --get core.hooksPath 2>/dev/null || true)"

if [ -n "$HOOKS_PATH_RAW" ]; then
  case "$HOOKS_PATH_RAW" in
    /*) HOOK_PATH="$HOOKS_PATH_RAW/pre-push" ;;
    *) HOOK_PATH="$TOPLEVEL/$HOOKS_PATH_RAW/pre-push" ;;
  esac
else
  HOOK_PATH="$(git rev-parse --git-path hooks/pre-push)"
  case "$HOOK_PATH" in
    /*) ;;
    *) HOOK_PATH="$TOPLEVEL/$HOOK_PATH" ;;
  esac
fi

HOOK_DIR="$(dirname "$HOOK_PATH")"
mkdir -p "$HOOK_DIR"

read -r -d '' HOOK_BODY <<'HOOK_EOF' || true
#!/usr/bin/env bash
# ECHO pre-push hook — installed by tools/install-pre-push-hook.sh.
# Runs the pinned, redacted full-history secret scan before any push.
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
exec tools/secret-scan.sh history
HOOK_EOF

TMP_HOOK="$(mktemp "$HOOK_DIR/.pre-push.XXXXXX")"
trap 'rm -f "$TMP_HOOK"' EXIT
printf '%s\n' "$HOOK_BODY" > "$TMP_HOOK"

if [ -f "$HOOK_PATH" ] && cmp -s "$TMP_HOOK" "$HOOK_PATH"; then
  rm -f "$TMP_HOOK"
  trap - EXIT
  if [ -x "$HOOK_PATH" ]; then
    echo "pre-push hook unchanged at $HOOK_PATH"
    exit 0
  fi
  chmod u+x "$HOOK_PATH"
  echo "pre-push hook mode repaired (was non-executable) at $HOOK_PATH"
  exit 0
fi

HAD_PRIOR=0
[ -f "$HOOK_PATH" ] && HAD_PRIOR=1
mv "$TMP_HOOK" "$HOOK_PATH"
trap - EXIT
chmod u+x "$HOOK_PATH"
echo "pre-push hook installed at $HOOK_PATH"
if [ "$HAD_PRIOR" -eq 1 ]; then
  echo "NOTE: existing pre-push hook was overwritten. Restore or combine custom hook behavior manually."
fi
