#!/usr/bin/env bash
# run-codex-ops-reviewer.sh — 5-line driver delegating to _run_reviewer.sh
# (043 AC3). Body lives in _run_reviewer.sh — same wrapper for every
# headless reviewer; this script only sets REVIEWER_NAME=codex-ops.
exec env REVIEWER_NAME=codex-ops "$(dirname "$0")/_run_reviewer.sh"
