#!/usr/bin/env bash
# Mechanical pre-merge checks for file pairs/contracts that drift together.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

failures=0

fail() {
  echo "INVARIANT FAIL: $*" >&2
  failures=$((failures + 1))
}

check_package_lock() {
  if [ ! -f package.json ] || [ ! -f package-lock.json ]; then
    return 0
  fi
  if ! node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const root = lock.packages && lock.packages[''];
if (!root) {
  console.error('package-lock.json missing packages[""] root entry');
  process.exit(1);
}
const fields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const mismatches = [];
for (const field of fields) {
  const a = pkg[field] || {};
  const b = root[field] || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of [...keys].sort()) {
    if (a[key] !== b[key]) {
      mismatches.push(`${field}.${key}: package.json=${a[key] ?? '<missing>'} package-lock=${b[key] ?? '<missing>'}`);
    }
  }
}
if ((pkg.name || '') !== (root.name || '')) {
  mismatches.push(`name: package.json=${pkg.name ?? '<missing>'} package-lock=${root.name ?? '<missing>'}`);
}
if ((pkg.version || '') !== (root.version || '')) {
  mismatches.push(`version: package.json=${pkg.version ?? '<missing>'} package-lock=${root.version ?? '<missing>'}`);
}
if (mismatches.length) {
  console.error(mismatches.join('\n'));
  process.exit(1);
}
NODE
  then
    fail "package.json <-> package-lock.json drift"
  fi
}

check_skill_adapters() {
  if [ -x tools/sync-skills.sh ]; then
    if ! tools/sync-skills.sh --check >/tmp/echo-sync-skills-check.$$ 2>&1; then
      cat /tmp/echo-sync-skills-check.$$ >&2
      rm -f /tmp/echo-sync-skills-check.$$
      fail "skills/ <-> .claude/commands/ adapter drift"
      return
    fi
    rm -f /tmp/echo-sync-skills-check.$$
  fi
}

check_mcp_registration() {
  if [ ! -f src/mcp/server.ts ]; then
    return 0
  fi
  if ! python3 <<'PY'
from __future__ import annotations

import re
import sys
from pathlib import Path

server = Path("src/mcp/server.ts").read_text(encoding="utf-8")
test_path = Path("tests/mcp/tools/recent-work-context.test.ts")
test_text = test_path.read_text(encoding="utf-8") if test_path.is_file() else ""
errors: list[str] = []

imports = re.findall(
    r"import\s+\{\s*(register[A-Za-z0-9_]+)\s*\}\s+from\s+'\.\/tools\/([A-Za-z0-9_-]+)\.js';",
    server,
)
for register_name, module_name in imports:
    tool_path = Path("src/mcp/tools") / f"{module_name}.ts"
    if not tool_path.is_file():
        errors.append(f"{register_name}: missing tool file {tool_path}")
        continue
    if not re.search(rf"\b{re.escape(register_name)}\s*\(", server):
        errors.append(f"{register_name}: imported but not called in src/mcp/server.ts")
        continue
    tool_text = tool_path.read_text(encoding="utf-8")
    m = re.search(r"server\.registerTool\(\s*['\"]([^'\"]+)['\"]", tool_text)
    if not m:
        errors.append(f"{register_name}: {tool_path} has no server.registerTool('<name>') literal")
        continue
    tool_name = m.group(1)
    if tool_name not in test_text:
        errors.append(f"{register_name}: MCP registration test does not recognize tool '{tool_name}'")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
PY
  then
    fail "src/mcp/server.ts <-> MCP tool files/tests drift"
  fi
}

check_package_lock
check_skill_adapters
check_mcp_registration

if [ "$failures" -ne 0 ]; then
  exit 1
fi

echo "OK: coupled invariants hold"
