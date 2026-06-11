#!/usr/bin/env bash
# _install_reviewer_launchd.sh <slug> — install a headless reviewer's launchd
# job (043 AC3 + 056 AC7b/AC8). Writes
# ~/Library/LaunchAgents/com.echo.review-queue-<slug>.plist pointing at a
# per-reviewer wrapper script. Idempotent: re-running overwrites the plist
# + re-bootstraps.
#
# Validates that <slug> exists in reviewers.json with mode:headless and has a
# reviewer-bindings.json argv binding before writing anything; refuses to
# install for IDE-mode reviewers (those have no launchd presence — they run
# inside the IDE on user invocation).
#
# 056 AC7b — install-context fail-closed preflight. The installer ALWAYS
# treats itself as install-context: BEFORE writing the plist or invoking
# launchctl, resolve the reviewer's argv from reviewer-bindings.json, read
# argv[0] (the executable name — `codex`, `claude`, etc.), and run
# `command -v <exe>`. If the executable is not on PATH, exit non-zero with a
# clear diagnostic and DO NOT write the plist. This prevents the scenario
# where a misconfigured CLI install leaves `com.echo.review-queue-<slug>`
# firing every 10 minutes with `command-not-found` (which burns the silent
# launchd-fail surface).
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
INSTALL_CONTEXT_FLAG=0
for arg in "$@"; do
  case "$arg" in
    --smoke) SMOKE_REQUESTED=1 ;;
    --install-context) INSTALL_CONTEXT_FLAG=1 ;;
  esac
done
# The installer IS the install-context by definition. The explicit
# --install-context flag is accepted (no-op other than being forwarded to
# the smoke runner) so operators can be explicit; the implicit default is
# also install-context. See 056 AC7b.

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

# 056 AC7b / 087 — install-context preflight. Resolve the argv vector from
# reviewer-bindings.json, read argv[0] (executable name), and gate on
# `command -v`. Refuse to write the plist if the CLI is not installed. We do
# NOT need a real $WT here — the placeholder preflight path is only used to
# complete deterministic binding substitution before reading argv[0].
argv_file="$(mktemp "${TMPDIR:-/tmp}/echo-rq-install-argv.XXXXXX")"
argv_err_file="$(mktemp "${TMPDIR:-/tmp}/echo-rq-install-argv-err.XXXXXX")"
set +e
REVIEWER_NAME="$REVIEWER" WT="/preflight/wt" \
  python3 "$TOOL_DIR/_reviewer_gate.py" --print argv_nul > "$argv_file" 2>"$argv_err_file"
INVOKE_RC=$?
INVOKE_ERR=$(cat "$argv_err_file" 2>/dev/null || true)
set -e
if [ "$INVOKE_RC" -ne 0 ] || [ ! -s "$argv_file" ]; then
  rm -f "$argv_file" "$argv_err_file"
  echo "error: could not resolve reviewer argv for $REVIEWER: ${INVOKE_ERR:-no diagnostic from gate}" >&2
  echo "  fix: ensure tools/review-queue/reviewer-bindings.json has a valid argv binding for $REVIEWER" >&2
  exit 1
fi
INVOKE_ARGV=()
while IFS= read -r -d '' arg; do
  INVOKE_ARGV+=("$arg")
done < "$argv_file"
rm -f "$argv_file" "$argv_err_file"
if [ "${#INVOKE_ARGV[@]}" -eq 0 ]; then
  echo "error: reviewer argv for $REVIEWER resolved to an empty vector" >&2
  echo "  fix: ensure tools/review-queue/reviewer-bindings.json has a valid argv binding for $REVIEWER" >&2
  exit 1
fi
INVOKE_EXE="${INVOKE_ARGV[0]}"
if ! command -v "$INVOKE_EXE" >/dev/null 2>&1; then
  echo "error: $INVOKE_EXE not found on PATH; cannot install $LABEL" >&2
  {
    printf '  Resolved argv:'
    printf ' %q' "${INVOKE_ARGV[@]}"
    printf '\n'
  } >&2
  echo "  Either install the $INVOKE_EXE CLI first, or edit tools/review-queue/reviewer-bindings.json to use a different binding." >&2
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

# launchd-level stdout/stderr go to the SAME per-reviewer log file the
# wrapper itself appends to. Previously both keys were /dev/null, which left
# a silent-failure window: everything _run_reviewer.sh does BEFORE its own
# `{ ... } >> $LOG_FILE` block redirect (REVIEWER_NAME validation, repo-root
# cd/git checks, sourcing _effect-runner.sh, the reviewer gate, log rotation)
# failed invisibly — the exact silent-launchd-fail class this queue exists
# to prevent. launchd does NOT expand ~ or environment variables in
# StandardOutPath/StandardErrorPath, so the absolute expanded path is baked
# at install time (this script runs as the operator, so $HOME is correct).
# launchd opens these paths O_CREAT|O_APPEND (append, not truncate), and the
# wrapper's own block redirect also opens in append mode, so the two fds
# interleave safely on the same file. Rotation caveat: the wrapper rotates
# by `mv` at >10MB; the tick that performs the rotation already holds the
# launchd fd on the old inode, so that one tick's pre-redirect lines land in
# the .1 sidecar — subsequent ticks reopen the fresh path.
LAUNCHD_LOG_FILE="$HOME/Library/Logs/echo-review-queue-${REVIEWER}.log"
mkdir -p "$(dirname "$LAUNCHD_LOG_FILE")"

# launchd's per-LaunchAgent environment does NOT reliably inherit TMPDIR
# from the user's Aqua session — _run_reviewer.sh hard-aborts when TMPDIR
# is unset (the 050 ephemeral-worktree path needs a real temp dir). Pin
# the user's canonical per-user temp dir into the plist so launchd-spawned
# ticks see the same value as interactive runs.
USER_TMPDIR="$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null || echo "/tmp/")"

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
    <string>$LAUNCHD_LOG_FILE</string>
    <key>StandardErrorPath</key>
    <string>$LAUNCHD_LOG_FILE</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>TMPDIR</key>
        <string>$USER_TMPDIR</string>
    </dict>
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
  #
  # 056 AC7b — installer always operates in install-context. Forward the
  # flag so the smoke runner's `command -v <cli>` preflight fails-closed
  # rather than fail-open. (The preflight at the top of this script
  # already caught a missing CLI, but the smoke runner re-verifies in
  # case the operator's PATH differs between this script and the smoke.)
  echo "--smoke step 2/2: running synthetic-request smoke test against an isolated tmpdir repo..."
  "$SMOKE" --install-context
fi
