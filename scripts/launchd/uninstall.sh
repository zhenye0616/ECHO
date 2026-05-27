#!/usr/bin/env bash
# Uninstall the ECHO daemon LaunchAgent. Idempotent: succeeds whether or not
# the agent is currently loaded.

set -euo pipefail

LABEL="${ECHO_DAEMON_LABEL:-com.echo.daemon}"
PLIST_PATH="${ECHO_DAEMON_PLIST_PATH:-$HOME/Library/LaunchAgents/${LABEL}.plist}"

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
rm -f "$PLIST_PATH"

echo "Uninstalled: ${PLIST_PATH}"
echo "Logs preserved at ~/Library/Logs/echo/ — remove manually if desired."
