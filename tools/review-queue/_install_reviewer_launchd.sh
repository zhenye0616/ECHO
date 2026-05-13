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

# 045 AC2 — detect --smoke up front so we can fail-closed on a missing smoke
# runner BEFORE any plist write, bootout, bootstrap, or kickstart. Detect-
# only here; the actual smoke kickstart still fires at the end of the
# script. We intentionally do not `shift` away the flag so existing
# positional logic (none today, but defensive) is unaffected.
SMOKE_REQUESTED=0
for arg in "$@"; do
  case "$arg" in
    --smoke) SMOKE_REQUESTED=1 ;;
  esac
done

TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$TOOL_DIR/../.." && pwd)"
export PYTHONPATH="$TOOL_DIR:${PYTHONPATH:-}"

# Validate slug is in reviewers.json with mode=headless. Reuses the same
# gate script as _run_reviewer.sh (043 AC3).
REVIEWER_NAME="$REVIEWER" python3 "$TOOL_DIR/_reviewer_gate.py" >/dev/null

LABEL="com.echo.review-queue-$REVIEWER"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
WRAPPER="$TOOL_DIR/run-$REVIEWER-reviewer.sh"
SMOKE="$TOOL_DIR/smoke-test-${REVIEWER}-runner.sh"

if [ ! -x "$WRAPPER" ]; then
  echo "error: wrapper not executable at $WRAPPER" >&2
  echo "create a 5-line driver: '#!/usr/bin/env bash; exec env REVIEWER_NAME=$REVIEWER \"\$(dirname \"\$0\")/_run_reviewer.sh\"' and chmod +x" >&2
  exit 1
fi

# 045 AC2 — fail-closed smoke gate. When --smoke is requested but the
# smoke runner is absent or not executable, abort BEFORE any plist write or
# launchctl invocation. The previous shape (warn-and-exit-0 AFTER install
# + kickstart) left an active StartInterval job running unverified
# production reviewer ticks even when the smoke leg failed; this closes
# that fail-open path. Operator's two recovery options:
#   * Author the missing smoke runner at the expected path, then re-run.
#   * Re-run WITHOUT --smoke to install-without-verification (explicit
#     operator choice; production state changes proceed normally).
if [ "$SMOKE_REQUESTED" -eq 1 ] && [ ! -x "$SMOKE" ]; then
  echo "error: smoke runner missing for reviewer $REVIEWER: expected $SMOKE" >&2
  echo "  fix: author smoke-test-${REVIEWER}-runner.sh, OR re-run without --smoke to install without smoke verification" >&2
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

if [ "$SMOKE_REQUESTED" -eq 1 ]; then
  echo "--smoke step 1/2: kickstarting $LABEL for one tick..."
  launchctl kickstart -k "$DOMAIN/$LABEL"

  # The pre-install gate (045 AC2) already verified $SMOKE is executable,
  # so this branch is unconditional. If $SMOKE somehow disappeared between
  # the gate and here (operator deleted the file mid-install), surface the
  # failure non-zero — the production state changes already landed, so the
  # operator's recovery is "re-run after authoring the smoke runner".
  echo "--smoke step 2/2: running synthetic-request smoke test against an isolated tmpdir repo..."
  "$SMOKE"
fi
