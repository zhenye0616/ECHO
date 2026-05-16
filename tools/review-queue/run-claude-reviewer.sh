#!/usr/bin/env bash
# run-claude-reviewer.sh — 5-line driver delegating to _run_reviewer.sh
# (056 AC4). Body lives in _run_reviewer.sh — same wrapper for every
# headless reviewer; this script only sets REVIEWER_NAME=claude.
exec env REVIEWER_NAME=claude "$(dirname "$0")/_run_reviewer.sh"
