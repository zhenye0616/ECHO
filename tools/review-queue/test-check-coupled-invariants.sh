#!/usr/bin/env bash
# test-check-coupled-invariants.sh — AC4 test for the pre-merge coupled-file
# invariant checker.
#
# Asserts:
#   (i)   package.json bumped but package-lock.json stale FAILS (077->078)
#   (ii)  skills/ edited but .claude/commands/ not re-synced FAILS
#   (iii) a registerX added with no matching tool file / no registration-test
#         entry FAILS
#   - a fully-coherent merged tree PASSES all three
#
# Each fixture is a throwaway git repo (the checker resolves its root via
# `git rev-parse --show-toplevel`). Run from the repo root.

set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
CHECKER="$ROOT/tools/review-queue/check-coupled-invariants.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }

# Build a baseline coherent fixture repo and echo its path.
make_fixture() {
  local d
  d=$(mktemp -d -t echo-rq-coupled-XXXX)
  git -C "$d" init -q -b main
  git -C "$d" config user.email t@e.com
  git -C "$d" config user.name t

  # Coupled pair (i): package.json <-> package-lock.json in sync.
  cat > "$d/package.json" <<'JSON'
{
  "name": "echo-fixture",
  "version": "1.0.0",
  "dependencies": { "left-pad": "^1.3.0" }
}
JSON
  cat > "$d/package-lock.json" <<'JSON'
{
  "name": "echo-fixture",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "packages": {
    "": {
      "name": "echo-fixture",
      "version": "1.0.0",
      "dependencies": { "left-pad": "^1.3.0" }
    }
  }
}
JSON

  # Coupled pair (ii): a sync-skills.sh that is in sync by construction.
  # We stub sync-skills.sh so the test controls invariant (ii) directly
  # (the real one compares skills/ vs .claude/commands/).
  mkdir -p "$d/tools" "$d/skills" "$d/.claude/commands"
  echo "canonical body" > "$d/skills/demo.md"
  echo "canonical body" > "$d/.claude/commands/demo.md"
  cat > "$d/tools/sync-skills.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
if [ "${1:-}" = "--check" ]; then
  for f in "$ROOT"/skills/*.md; do
    base=$(basename "$f")
    if ! diff -q "$f" "$ROOT/.claude/commands/$base" >/dev/null 2>&1; then
      echo "DRIFT: .claude/commands/$base differs from skills/$base" >&2
      exit 1
    fi
  done
  echo "OK: adapters match"
fi
SH
  chmod +x "$d/tools/sync-skills.sh"

  # Coupled trio (iii): one registered MCP tool, its file, and a test that
  # recognizes its tool-name literal.
  mkdir -p "$d/src/mcp/tools" "$d/tests/mcp/tools"
  cat > "$d/src/mcp/server.ts" <<'TS'
import { registerDemoTool } from './tools/demo-tool.js';
export function build(server: unknown) {
  registerDemoTool(server);
}
TS
  cat > "$d/src/mcp/tools/demo-tool.ts" <<'TS'
export function registerDemoTool(server: any) {
  server.registerTool('demo_tool', {}, async () => ({}));
}
TS
  cat > "$d/tests/mcp/tools/recent-work-context.test.ts" <<'TS'
// registration test recognizes: demo_tool
TS

  # Copy the checker invariant scripts into the fixture so it can run there.
  mkdir -p "$d/tools/review-queue"
  cp "$ROOT/tools/review-queue/check-coupled-invariants.sh" "$d/tools/review-queue/"

  git -C "$d" add -A
  git -C "$d" commit -q -m baseline
  echo "$d"
}

run_checker() {
  # $1 = fixture dir. Returns the checker exit code.
  ( cd "$1" && tools/review-queue/check-coupled-invariants.sh >/dev/null 2>&1 )
}

# ── coherent baseline PASSES ────────────────────────────────────────────
FX=$(make_fixture)
run_checker "$FX" || fail "coherent baseline fixture did not pass all invariants"
rm -rf "$FX"

# ── (i) package.json bumped, lockfile stale FAILS ───────────────────────
FX=$(make_fixture)
# Bump a dependency in package.json only.
sed -i.bak 's/"left-pad": "\^1.3.0"/"left-pad": "^1.4.0"/' "$FX/package.json" && rm -f "$FX/package.json.bak"
if run_checker "$FX"; then fail "(i) stale package-lock.json was NOT caught"; fi
rm -rf "$FX"

# ── (ii) skills edited, adapter not re-synced FAILS ─────────────────────
FX=$(make_fixture)
echo "edited canonical body" > "$FX/skills/demo.md"   # adapter left stale
if run_checker "$FX"; then fail "(ii) skill-adapter drift was NOT caught"; fi
rm -rf "$FX"

# ── (iii) registerX added with no tool file / no test entry FAILS ───────
FX=$(make_fixture)
cat >> "$FX/src/mcp/server.ts" <<'TS'
import { registerGhostTool } from './tools/ghost-tool.js';
TS
# Add the import + a call but NO ./tools/ghost-tool.ts file and NO test entry.
sed -i.bak 's/  registerDemoTool(server);/  registerDemoTool(server);\n  registerGhostTool(server);/' "$FX/src/mcp/server.ts" && rm -f "$FX/src/mcp/server.ts.bak"
if run_checker "$FX"; then fail "(iii) missing MCP tool file / test entry was NOT caught"; fi
rm -rf "$FX"

echo "PASS: coupled-invariant checker catches (i) lockfile drift, (ii) adapter drift, (iii) MCP-registration drift; coherent tree passes"
