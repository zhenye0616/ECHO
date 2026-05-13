#!/usr/bin/env bash
# run-codex-reviewer.sh — 5-line driver delegating to _run_reviewer.sh
# (043 AC3). Body lives in _run_reviewer.sh — same wrapper for every
# headless reviewer; this script only sets REVIEWER_NAME=codex.
exec env REVIEWER_NAME=codex "$(dirname "$0")/_run_reviewer.sh"
