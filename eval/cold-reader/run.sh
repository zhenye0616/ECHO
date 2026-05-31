#!/usr/bin/env bash
# Cold Reader Test runner — runs the ECHO-off (floor) and ECHO-on (test) arms for one case.
# Usage: eval/cold-reader/run.sh <case-dir>      e.g. eval/cold-reader/run.sh 060-hotkey-overlay
#
# Each arm runs a fresh Codex agent from an EMPTY temp dir (nothing to grep),
# sandbox read-only, prompt piped from the case's on.md / off.md.
# Outputs are teed to results/<case>.{on,off}.out.txt for the scorer.
set -euo pipefail

CASE="${1:?usage: eval/cold-reader/run.sh <case-dir>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CASE_DIR="$HERE/$CASE"
RESULTS="$HERE/results"

[ -f "$CASE_DIR/on.md" ]  || { echo "missing $CASE_DIR/on.md";  exit 2; }
[ -f "$CASE_DIR/off.md" ] || { echo "missing $CASE_DIR/off.md"; exit 2; }
mkdir -p "$RESULTS"

SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

run_arm () {  # $1 = arm (on|off)
  local arm="$1"
  local ARM; ARM="$(printf '%s' "$arm" | tr '[:lower:]' '[:upper:]')"
  echo "▶ ECHO-${ARM} — $CASE  (sandbox: $SANDBOX)"
  codex exec -C "$SANDBOX" --skip-git-repo-check --sandbox read-only - \
    < "$CASE_DIR/${arm}.md" 2>&1 | tee "$RESULTS/$CASE.${arm}.out.txt"
  echo ""
}

run_arm off    # floor first
run_arm on     # then the test

echo "✓ $CASE done → $RESULTS/$CASE.{on,off}.out.txt"
echo "  next: ask a scoring agent (NOT you, NOT the reader): \"use echo to retrieve + score $CASE\""
