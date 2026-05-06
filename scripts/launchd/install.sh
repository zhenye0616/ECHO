#!/usr/bin/env bash
# Install ECHO daemon as a macOS LaunchAgent.
#
# Why this exists: `npm run daemon` only persists capture for as long as the
# terminal that started it stays open. If the daemon dies, every Codex/CC
# turn keeps landing in JSONL files but never reaches echo.db until the next
# manual restart — boot scan eventually backfills, but MCP retrieval and the
# trace viewer go stale in the meantime.
#
# launchd's KeepAlive solves this: the daemon runs at login (RunAtLoad) and
# auto-restarts on crash (KeepAlive.Crashed). ThrottleInterval=30 prevents
# tight crash loops.
#
# Usage:
#   ./scripts/launchd/install.sh   — install + load
#   ./scripts/launchd/uninstall.sh — unload + remove
#
# Logs land in ~/Library/Logs/echo/.

set -euo pipefail

LABEL="com.echo.daemon"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/echo"

NPM_BIN="$(command -v npm || true)"
if [ -z "$NPM_BIN" ]; then
  echo "error: npm not found on PATH" >&2
  exit 1
fi

# launchd does not inherit the user's interactive PATH, so resolve directories
# explicitly so node/npm can find each other once the daemon is launched.
NPM_BIN_DIR="$(dirname "$NPM_BIN")"
NODE_BIN_DIR="$(dirname "$(command -v node)")"

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$PLIST_PATH")"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NPM_BIN}</string>
        <string>run</string>
        <string>daemon</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/daemon.out.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/daemon.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${NPM_BIN_DIR}:${NODE_BIN_DIR}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

# bootout first so reinstall picks up plist edits; ignore if not loaded.
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/${LABEL}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "Installed: ${PLIST_PATH}"
echo "Logs:      ${LOG_DIR}/daemon.out.log"
echo "           ${LOG_DIR}/daemon.err.log"
echo
echo "Status check:"
launchctl print "gui/$(id -u)/${LABEL}" | grep -E '^\s*(state|pid|last exit code)' || true
