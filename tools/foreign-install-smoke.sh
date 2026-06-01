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

rm -rf "$SBOX"
mkdir -p "$SBOX"/{npm,data,logs,fakehome/.claude,fakehome/.codex}

# Seed fake foreign-coworker agent configs so detect-agents finds them
# WITHOUT ever reading/writing the real ~/.claude or ~/.codex.
printf '# CLAUDE.md (fake foreign coworker machine)\n\nSome of his own instructions here.\n' > "$SBOX/fakehome/.claude/CLAUDE.md"
printf '# codex config.toml (fake foreign coworker machine)\nmodel = "gpt-5.5"\n' > "$SBOX/fakehome/.codex/config.toml"

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

cd "$REPO"
echo "=================== STEP 0: build fresh tarball ==================="
npm pack 2>&1 | tail -2
TGZ="$REPO/echoctl-0.1.0.tgz"
ls -lh "$TGZ"

echo ""; echo "=================== STEP 1: npm install -g into sandbox prefix ==================="
npm install -g "$TGZ" --prefix "$SBOX/npm" 2>&1 | tail -4

# From here on, become the "foreign machine": fake HOME.
export HOME="$SBOX/fakehome"
export PATH="$SBOX/npm/bin:$PATH"
export ECHO_HOME="$SBOX/fakehome/.echo"
export ECHO_MCP_PORT="$PORT"
export ECHO_DATA_DIR="$SBOX/data"
export ECHO_DB_PATH="$SBOX/data/echo.db"

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
"$BIN" init --home "$ECHO_HOME" --port "$PORT" --label "$LABEL" --answer-file "$SBOX/answers.json" 2>&1 | head -70
echo "(init exit code: $?)"

echo ""; echo "=== what skills landed in the user's ~/.echo/skills? ==="
ls -1 "$ECHO_HOME/skills" 2>&1 || echo "(no skills dir created)"

echo ""; echo "=== did wire inject an ECHO block into his codex config.toml? ==="
grep -nE "ECHO|echo|mcp|38478|$PORT" "$SBOX/fakehome/.codex/config.toml" 2>/dev/null | head || echo "(no ECHO content in codex config)"
echo ""; echo "=== into his CLAUDE.md? ==="
grep -nE "BEGIN ECHO|END ECHO|ECHO" "$SBOX/fakehome/.claude/CLAUDE.md" 2>/dev/null | head || echo "(no ECHO block in CLAUDE.md)"

echo ""; echo "=================== STEP 4: doctor AFTER install ==================="
"$BIN" doctor 2>&1 | head -50 || true
