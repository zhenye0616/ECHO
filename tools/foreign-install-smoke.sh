#!/usr/bin/env bash
# foreign-install-smoke.sh — simulate a fresh non-founder install of echoctl in
# full isolation (fake $HOME + seeded agent configs, test launchd label/port,
# isolated ECHO_HOME/data-dir/db-path/log-dir). Builds the tarball, installs it,
# brings up the daemon, probes MCP, runs `init` (repo_root omitted, to prove the
# packaged install locates its own assets), inspects wiring + skills, then tears
# down the test launchd job and verifies the production daemon (38478) is intact.
# Provenance: written 2026-06-01 for the n=1 concierge-install pre-flight.
set -uo pipefail
REPO="$HOME/Desktop/Project_echo"   # capture BEFORE we fake HOME
ORIG_HOME="$HOME"
SBOX=/tmp/echo-sbox
LABEL=com.echo.daemon.sboxtest
PORT=41789
BIN="$SBOX/npm/bin/echoctl"
PLIST="$SBOX/$LABEL.plist"
SHIMS="$SBOX/shims"
CLAUDE_ARGS="$SBOX/claude-argv.log"

rm -rf "$SBOX"
mkdir -p "$SBOX"/{npm,data,logs,shims,fakehome/.claude,fakehome/.codex}

# Seed fake foreign-coworker agent configs so detect-agents finds them
# WITHOUT ever reading/writing the real ~/.claude or ~/.codex.
printf '# CLAUDE.md (fake foreign coworker machine)\n\nSome of his own instructions here.\n' > "$SBOX/fakehome/.claude/CLAUDE.md"
printf '# codex config.toml (fake foreign coworker machine)\nmodel = "gpt-5.5"\n' > "$SBOX/fakehome/.codex/config.toml"
cat > "$SHIMS/claude" <<'SH'
#!/usr/bin/env bash
set -u
if [ "${1:-}" = "mcp" ]; then
  printf '%s\n' "$*" >> "${ECHO_FAKE_CLAUDE_ARGS:?}"
  exit 0
fi
if [ "${1:-}" = "--print" ]; then
  printf '{"pong":true,"ts":"2026-06-01T00:00:00.000Z"}\n'
  exit 0
fi
printf 'unexpected fake claude argv: %s\n' "$*" >&2
exit 2
SH
chmod +x "$SHIMS/claude"
: > "$CLAUDE_ARGS"

cleanup() {
  echo ""; echo "=================== CLEANUP ==================="
  if [ -x "$BIN" ]; then
    HOME="$SBOX/fakehome" "$BIN" daemon uninstall --label "$LABEL" --plist-path "$PLIST" --port "$PORT" --home "$SBOX/fakehome/.echo" 2>&1 | sed 's/^/[cleanup] /' || true
  fi
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  echo "[cleanup] verifying production daemon untouched (should still be on 38478):"
  launchctl print "gui/$(id -u)/com.echo.daemon" >/dev/null 2>&1 && echo "[cleanup] production com.echo.daemon STILL LOADED ✓" || echo "[cleanup] production com.echo.daemon not loaded (or never was)"
  rm -rf "$SBOX"
  echo "[cleanup] sandbox removed."
}
trap cleanup EXIT

fail() {
  echo "[assert] ERROR: $*" >&2
  exit 1
}

assert_exists() {
  [ -e "$1" ] || fail "expected path to exist: $1"
}

assert_absent() {
  [ ! -e "$1" ] || fail "expected path to be absent: $1"
}

assert_profile() {
  local expected="$1"
  node -e 'const fs=require("fs"); const p=process.argv[1]; const expected=process.argv[2]; const state=JSON.parse(fs.readFileSync(p,"utf8")); if (state.profile !== expected) { console.error(`[assert] expected profile ${expected}, got ${state.profile}`); process.exit(1); }' "$ECHO_HOME/state/onboarding.json" "$expected" \
    || fail "onboarding profile mismatch"
}

cd "$REPO"
echo "=================== STEP 0: build fresh tarball ==================="
npm pack 2>&1 | tail -2
TGZ="$REPO/echoctl-0.1.0.tgz"
ls -lh "$TGZ"

echo ""; echo "=================== STEP 1: npm install -g into sandbox prefix ==================="
npm install -g "$TGZ" --prefix "$SBOX/npm" 2>&1 | tail -4

# From here on, become the "foreign machine": fake HOME.
export HOME="$SBOX/fakehome"
export PATH="$SHIMS:$SBOX/npm/bin:$PATH"
export ECHO_HOME="$SBOX/fakehome/.echo"
export ECHO_MCP_PORT="$PORT"
export ECHO_DATA_DIR="$SBOX/data"
export ECHO_DB_PATH="$SBOX/data/echo.db"
export ECHO_FAKE_CLAUDE_ARGS="$CLAUDE_ARGS"

echo ""; echo "=== echoctl --version (from packaged global install) ==="
"$BIN" --version 2>&1 || echo "VERSION FAILED"

echo ""; echo "=== echoctl doctor BEFORE daemon (expect broken/no-daemon) ==="
"$BIN" doctor 2>&1 | head -40 || true

echo ""; echo "=================== STEP 2: daemon install (isolated label/port/paths) ==================="
"$BIN" daemon install --label "$LABEL" --plist-path "$PLIST" --home "$ECHO_HOME" --port "$PORT" --data-dir "$SBOX/data" --db-path "$SBOX/data/echo.db" --log-dir "$SBOX/logs" 2>&1 | head -40

echo ""; echo "=== formation probe: is the daemon actually serving MCP on $PORT? ==="
curl -s -m 6 -X POST "http://127.0.0.1:$PORT/mcp" \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"sbox","version":"0"}}}' \
  | head -c 500; echo " <<EOF"

echo ""; echo "=================== STEP 3: init via answer-file, repo_root OMITTED ==================="
echo "(This tests your worry: can a packaged install LOCATE its skills/source on a machine with no repo?)"
cat > "$SBOX/answers.json" <<'JSON'
{ "confirm_setup": true, "selected_agents": ["codex","claude-code"], "default_project_repo_root": null }
JSON
INIT_LOG="$SBOX/init.out"
"$BIN" init --home "$ECHO_HOME" --port "$PORT" --label "$LABEL" --answer-file "$SBOX/answers.json" > "$INIT_LOG" 2>&1
INIT_RC=$?
sed -n '1,70p' "$INIT_LOG"
echo "(init exit code: $INIT_RC)"
[ "$INIT_RC" -eq 0 ] || fail "echoctl init exited $INIT_RC"

EXPECTED_CLAUDE_ARGV="mcp add --transport http --scope user echo http://127.0.0.1:$PORT/mcp"
if ! grep -Fxq "$EXPECTED_CLAUDE_ARGV" "$CLAUDE_ARGS"; then
  echo "[assert] recorded fake claude argv:" >&2
  sed 's/^/[assert]   /' "$CLAUDE_ARGS" >&2
  fail "claude-code MCP registration argv missing or mismatched; expected: $EXPECTED_CLAUDE_ARGV"
fi
echo "[assert] claude-code MCP registration argv OK"

echo ""; echo "=== what skills landed in the user's ~/.echo/skills? ==="
ls -1 "$ECHO_HOME/skills" 2>&1 || echo "(no skills dir created)"
assert_profile customer
assert_exists "$ECHO_HOME/skills/using-echo-mcp.md"
assert_absent "$ECHO_HOME/skills/using-echo-coord.md"
assert_absent "$SBOX/fakehome/.claude/commands/using-echo-coord.md"
assert_absent "$ECHO_HOME/roles/builder.toml"
assert_absent "$ECHO_HOME/roles/reviewer.toml"
assert_absent "$ECHO_HOME/roles/strategist.toml"
assert_absent "$ECHO_HOME/workflows/change-review.toml"
echo "[assert] default customer surface OK"

echo ""; echo "=== did wire inject an ECHO block into his codex config.toml? ==="
grep -nE "ECHO|echo|mcp|38478|$PORT" "$SBOX/fakehome/.codex/config.toml" 2>/dev/null | head || echo "(no ECHO content in codex config)"
echo ""; echo "=== into his CLAUDE.md? ==="
grep -nE "BEGIN ECHO|END ECHO|ECHO" "$SBOX/fakehome/.claude/CLAUDE.md" 2>/dev/null | head || echo "(no ECHO block in CLAUDE.md)"

echo ""; echo "=================== STEP 4: doctor AFTER install ==================="
"$BIN" doctor 2>&1 | head -50 || true

echo ""; echo "=================== STEP 5: no-flag rerun stays customer ==================="
"$BIN" init --home "$ECHO_HOME" --port "$PORT" --label "$LABEL" --answer-file "$SBOX/answers.json" > "$SBOX/init-rerun.out" 2>&1
RERUN_RC=$?
sed -n '1,40p' "$SBOX/init-rerun.out"
[ "$RERUN_RC" -eq 0 ] || fail "echoctl init rerun exited $RERUN_RC"
assert_profile customer
assert_absent "$ECHO_HOME/skills/using-echo-coord.md"
assert_absent "$SBOX/fakehome/.claude/commands/using-echo-coord.md"
echo "[assert] no-flag customer rerun stayed customer"

echo ""; echo "=================== STEP 6: explicit dogfood install gets full coord surface ==================="
cat > "$SBOX/answers-dogfood.json" <<'JSON'
{ "confirm_setup": true, "selected_agents": ["codex","claude-code"], "default_project_repo_root": null }
JSON
"$BIN" init --home "$ECHO_HOME" --port "$PORT" --profile dogfood --label "$LABEL" --answer-file "$SBOX/answers-dogfood.json" > "$SBOX/init-dogfood.out" 2>&1
DOGFOOD_RC=$?
sed -n '1,50p' "$SBOX/init-dogfood.out"
[ "$DOGFOOD_RC" -eq 0 ] || fail "echoctl init --profile dogfood exited $DOGFOOD_RC"
assert_profile dogfood
assert_exists "$ECHO_HOME/skills/using-echo-mcp.md"
assert_exists "$ECHO_HOME/skills/using-echo-coord.md"
assert_exists "$SBOX/fakehome/.claude/commands/using-echo-coord.md"
assert_exists "$ECHO_HOME/roles/builder.toml"
assert_exists "$ECHO_HOME/roles/reviewer.toml"
assert_exists "$ECHO_HOME/roles/strategist.toml"
assert_exists "$ECHO_HOME/workflows/change-review.toml"
echo "[assert] explicit dogfood surface OK"
