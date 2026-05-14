#!/usr/bin/env bash
# mock-codex.sh — test fixture for 047 AC4 (tests/backlog/run-codex-builder.test.ts).
#
# Records its own invocation (argv, env, stdin, lock-dir presence) to a
# side-channel directory specified by MOCK_RECORD_DIR. Optionally sleeps for
# MOCK_CODEX_SLEEP seconds before exiting (used by the atomic-lock race
# test to keep the lock held while a second invocation tries to start).
#
# The mock does NOT perform any real workflow — it only records what
# arguments / env / stdin the wrapper handed it. The wrapper contract is
# what's under test, NOT codex's runtime behavior.

set -euo pipefail

: "${MOCK_RECORD_DIR:?MOCK_RECORD_DIR env var required}"
mkdir -p "$MOCK_RECORD_DIR"

# Record argv — argv[0] from $0, then $@ each on its own line. NUL-safe
# alternative would be `printf '%s\0'` but linebreaks are fine for the
# test's purposes (test asserts on exact strings).
{
  printf '%s\n' "$0"
  for arg in "$@"; do
    printf '%s\n' "$arg"
  done
} > "$MOCK_RECORD_DIR/argv"

# Record env — `env` prints KEY=VALUE pairs newline-separated.
env > "$MOCK_RECORD_DIR/env"

# Record lock-dir presence at the moment the mock is invoked (the wrapper
# should have acquired it just before exec'ing us).
if [ -n "${ECHO_BUILDER_LOCK_DIR:-}" ] && [ -d "$ECHO_BUILDER_LOCK_DIR" ]; then
  printf 'PRESENT\n' > "$MOCK_RECORD_DIR/lock-status"
  if [ -f "$ECHO_BUILDER_LOCK_DIR/info" ]; then
    cp "$ECHO_BUILDER_LOCK_DIR/info" "$MOCK_RECORD_DIR/lock-info"
  fi
else
  printf 'ABSENT\n' > "$MOCK_RECORD_DIR/lock-status"
fi

# Record stdin — must come after the above writes so a sleep-controlled
# stub still captures it; cat blocks until EOF on stdin.
cat > "$MOCK_RECORD_DIR/stdin"

# Optional sleep — keeps the lock held while a second wrapper invocation
# tries to acquire it (atomic-lock test).
if [ -n "${MOCK_CODEX_SLEEP:-}" ]; then
  sleep "$MOCK_CODEX_SLEEP"
fi

exit 0
