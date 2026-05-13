#!/usr/bin/env bash
# install-codex-reviewer-launchd.sh — 5-line driver delegating to
# _install_reviewer_launchd.sh codex (043 AC3). Forwards --smoke if passed.
exec "$(dirname "$0")/_install_reviewer_launchd.sh" codex "$@"
