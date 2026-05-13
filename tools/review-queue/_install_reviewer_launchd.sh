#!/usr/bin/env bash
# _install_reviewer_launchd.sh <slug> — install a headless reviewer's launchd
# job (043 AC3). Writes ~/Library/LaunchAgents/com.echo.review-queue-<slug>.plist
# pointing at a per-reviewer wrapper script. Idempotent: re-running overwrites
# the plist + re-bootstraps.
#
# Validates that <slug> exists in reviewers.json with mode:headless before
# writing anything; refuses to install for IDE-mode reviewers (those have no
# launchd presence — they run inside the IDE on user invocation).
#
# Usage:
#   _install_reviewer_launchd.sh <slug> [--smoke]
#
# `run-<slug>-reviewer.sh` must already exist in this directory; the canonical
# pattern is a 5-line driver that `exec env REVIEWER_NAME=<slug>
# ${this_script_dir}/_run_reviewer.sh`. (`install-codex-reviewer-launchd.sh`
# delegates here and `run-codex-reviewer.sh` is the canonical driver.)

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <reviewer-slug> [--smoke]" >&2
  exit 2
fi

REVIEWER="$1"
shift

TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$TOOL_DIR/../.." && pwd)"
export PYTHONPATH="$TOOL_DIR:${PYTHONPATH:-}"

# Validate slug is in reviewers.json with mode=headless. Reuses the same
# gate script as _run_reviewer.sh (043 AC3).
REVIEWER_NAME="$REVIEWER" python3 "$TOOL_DIR/_reviewer_gate.py" >/dev/null

LABEL="com.echo.review-queue-$REVIEWER"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
WRAPPER="$TOOL_DIR/run-$REVIEWER-reviewer.sh"

if [ ! -x "$WRAPPER" ]; then
  echo "error: wrapper not executable at $WRAPPER" >&2
  echo "create a 5-line driver: '#!/usr/bin/env bash; exec env REVIEWER_NAME=$REVIEWER \"\$(dirname \"\$0\")/_run_reviewer.sh\"' and chmod +x" >&2
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

if [ "${MAJOR:-0}" -ge 14 ]; then
  launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$PLIST"
else
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load -w "$PLIST"
fi

echo "Installed $LABEL (StartInterval=600s, plist=$PLIST)"
echo "First tick will fire at next 10-min boundary; tail logs at:"
echo "  ~/Library/Logs/echo-review-queue-${REVIEWER}.log"

if [ "${1:-}" = "--smoke" ]; then
  echo "--smoke step 1/2: kickstarting $LABEL for one tick..."
  launchctl kickstart -k "$DOMAIN/$LABEL"

  SMOKE="$TOOL_DIR/smoke-test-${REVIEWER}-runner.sh"
  if [ -x "$SMOKE" ]; then
    echo "--smoke step 2/2: running synthetic-request smoke test against an isolated tmpdir repo..."
    "$SMOKE"
  else
    echo "warning: smoke test not present or not executable at $SMOKE" >&2
  fi
fi
