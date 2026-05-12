#!/usr/bin/env bash
# install-codex-reviewer-launchd.sh — install the Codex reviewer launchd job
# (AC2 of item 041). Writes ~/Library/LaunchAgents/com.echo.review-queue-codex.plist
# and bootstraps / loads it via launchctl with version-gated semantics.
#
# Idempotent: re-running overwrites the plist + re-bootstraps.
#
# Usage:
#   install-codex-reviewer-launchd.sh           # install + bootstrap; first
#                                               # tick fires at next 10-min
#                                               # StartInterval boundary
#   install-codex-reviewer-launchd.sh --smoke   # install + bootstrap + run
#                                               # AC5 synthetic-request smoke
#                                               # test inline (does NOT
#                                               # kickstart the real job
#                                               # against production)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LABEL="com.echo.review-queue-codex"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
WRAPPER="$REPO_ROOT/tools/review-queue/run-codex-reviewer.sh"

if [ ! -x "$WRAPPER" ]; then
  echo "error: wrapper not executable at $WRAPPER" >&2
  exit 1
fi

mkdir -p "$(dirname "$PLIST")"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$WRAPPER</string>
    </array>
    <key>StartInterval</key>
    <integer>600</integer>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>WorkingDirectory</key>
    <string>$REPO_ROOT</string>
    <key>StandardOutPath</key>
    <string>/dev/null</string>
    <key>StandardErrorPath</key>
    <string>/dev/null</string>
</dict>
</plist>
EOF

# Detect macOS version to choose bootstrap (Sonoma+) vs load (older).
MACOS_VER="$(sw_vers -productVersion 2>/dev/null || echo 0)"
MAJOR="${MACOS_VER%%.*}"
DOMAIN="gui/$(id -u)"

# If already loaded, take it down first so the new plist is picked up.
if [ "${MAJOR:-0}" -ge 14 ]; then
  launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$PLIST"
else
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load -w "$PLIST"
fi

echo "Installed $LABEL (StartInterval=600s, plist=$PLIST)"
echo "First tick will fire at next 10-min boundary; tail logs at:"
echo "  ~/Library/Logs/echo-review-queue-codex.log"

if [ "${1:-}" = "--smoke" ]; then
  # Step 1 — kickstart the real launchd job for one tick (RunAtLoad=false, so
  # bootstrap alone doesn't fire). This verifies the plist + launchctl wiring
  # against the founder's production repo.
  echo "--smoke step 1/2: kickstarting $LABEL for one tick..."
  launchctl kickstart -k "$DOMAIN/$LABEL"

  # Step 2 — run the AC5 synthetic-request smoke test against an isolated
  # tmpdir repo with a local bare origin. Verifies the wrapper end-to-end
  # without touching production.
  SMOKE="$REPO_ROOT/tools/review-queue/smoke-test-codex-runner.sh"
  if [ -x "$SMOKE" ]; then
    echo "--smoke step 2/2: running synthetic-request smoke test against an isolated tmpdir repo..."
    "$SMOKE"
  else
    echo "warning: smoke test not present or not executable at $SMOKE" >&2
  fi
fi
