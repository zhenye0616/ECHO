#!/usr/bin/env bash
# uninstall-codex-reviewer-launchd.sh — remove the Codex reviewer launchd job
# (AC2 of item 041). Idempotent: no-op if already gone.

set -uo pipefail

LABEL="com.echo.review-queue-codex"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

MACOS_VER="$(sw_vers -productVersion 2>/dev/null || echo 0)"
MAJOR="${MACOS_VER%%.*}"

if [ "${MAJOR:-0}" -ge 14 ]; then
  launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
else
  launchctl unload "$PLIST" 2>/dev/null || true
fi

rm -f "$PLIST"
echo "Uninstalled $LABEL"
