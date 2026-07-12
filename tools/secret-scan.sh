#!/usr/bin/env bash
# Run ECHO's pinned, redacted Gitleaks scan from any directory in the repo.

set -euo pipefail

EXPECTED_GITLEAKS_VERSION="8.30.1"
MODE="${1:-history}"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "ERROR: gitleaks ${EXPECTED_GITLEAKS_VERSION} is required; install it before running the secret scan" >&2
  exit 2
fi

ACTUAL_GITLEAKS_VERSION="$(gitleaks version)"
if [ "$ACTUAL_GITLEAKS_VERSION" != "$EXPECTED_GITLEAKS_VERSION" ]; then
  echo "ERROR: expected gitleaks ${EXPECTED_GITLEAKS_VERSION}, found ${ACTUAL_GITLEAKS_VERSION}" >&2
  exit 2
fi

if ! REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "ERROR: not inside a git working tree" >&2
  exit 2
fi

case "$MODE" in
  history)
    gitleaks git "$REPO_ROOT" \
      --log-opts=--all \
      --redact=100 \
      --no-banner \
      --no-color
    exec node "$REPO_ROOT/tools/binary-history-scan.mjs"
    ;;
  *)
    echo "ERROR: unsupported secret-scan mode: ${MODE}" >&2
    echo "usage: tools/secret-scan.sh [history]" >&2
    exit 2
    ;;
esac
