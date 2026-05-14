#!/usr/bin/env bash
# tools/sync-skills.sh — sync ECHO skills from canonical `skills/` to per-client adapter directories.
#
# ECHO is the substrate that hosts the cross-tool collaboration protocol. The
# protocol — the slash-command skills (process-backlog, review-pending,
# merge-and-cleanup, review-queue-*) — is the shared grammar that EVERY AI
# client speaks. The canonical content lives under `skills/` (vendor-neutral,
# ECHO-namespaced). Each AI client has its own discovery directory:
#
#   - Claude Code:    .claude/commands/<name>.md             (flat real-file copy)
#   - Cursor's Claude: reuses .claude/commands/ via compat
#   - Codex CLI:      adapters/codex/skills/<name>/SKILL.md  (directory wrapper,
#                     codex-shaped frontmatter, materialized only for skills
#                     that document a "## Binding-specific notes — codex"
#                     section in their canonical body)
#   - Web ChatGPT / future clients: TBD (future: MCP `echo_skill(name)` tool)
#
# Claude Code adapters are real-file copies (not symlinks) because Claude Code's
# skill discovery does NOT follow file-level symlinks — the ECHO skills disappear
# from the available-skills list when symlinked. The sync script + a pre-commit
# verification step are the durable substitute.
#
# Codex adapters live under `adapters/codex/skills/<name>/SKILL.md` (tracked in
# git) and are deployed to `~/.codex/skills/<name>/` via the separate
# `tools/install-codex-adapters.sh` helper (symlink by default; `--copy` mode
# available for platforms whose codex builds do not resolve symlinks). The
# sync step is purely repo-side; user-home deploy is a separate step.
#
# Usage:
#   tools/sync-skills.sh            # sync (copies canonical → all adapters)
#   tools/sync-skills.sh --check    # verify identity, exit non-zero on drift

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
CLAUDE_DIR="$REPO_ROOT/.claude/commands"
CODEX_DIR="$REPO_ROOT/adapters/codex/skills"

MODE="${1:-sync}"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "ERROR: $SKILLS_DIR does not exist — nothing to sync" >&2
  exit 1
fi

has_codex_notes() {
  python3 - "$1" <<'PYEOF'
import sys
needle = "## Binding-specific notes — codex"
print("yes" if needle in open(sys.argv[1], encoding="utf-8").read() else "no")
PYEOF
}

emit_codex_skill_md() {
  python3 - "$1" "$2" <<'PYEOF'
import sys, re, yaml
canonical_path, name = sys.argv[1], sys.argv[2]
text = open(canonical_path, encoding="utf-8").read()
m = re.match(r"^---\n(.*?)\n---\n(.*)\Z", text, re.DOTALL)
if not m:
    sys.stderr.write(f"ERROR: {canonical_path} has no YAML frontmatter\n")
    sys.exit(1)
# Line-based scan of the canonical frontmatter. yaml.safe_load is too strict
# here: canonical descriptions contain unquoted colon-space sequences
# (e.g. "Idempotent: a crashed run...") which YAML treats as nested mappings.
# We only need the description field for the codex transform.
fm = {}
for line in m.group(1).split("\n"):
    if not line or line.startswith(" ") or line.startswith("\t") or line.startswith("#"):
        continue
    key, sep, val = line.partition(":")
    if not sep:
        continue
    fm[key.strip()] = val.strip()
body = m.group(2)
desc = fm.get("description", "")
short = desc[:80]
if len(desc) > 80 and " " in short:
    short = short[:short.rfind(" ")]
out_fm = {
    "name": name,
    "description": desc,
    "metadata": {"short-description": short},
}
fm_yaml = yaml.safe_dump(
    out_fm, default_flow_style=False, sort_keys=False, allow_unicode=True
)
sys.stdout.write("---\n" + fm_yaml + "---\n" + body)
PYEOF
}

emit_skill_body() {
  python3 - "$1" <<'PYEOF'
import sys, re
text = open(sys.argv[1], encoding="utf-8").read()
m = re.match(r"^---\n(.*?)\n---\n(.*)\Z", text, re.DOTALL)
sys.stdout.write(m.group(2) if m else text)
PYEOF
}

verify_codex_frontmatter() {
  python3 - "$1" "$2" "$3" <<'PYEOF'
import sys, re, yaml
canonical_path, adapter_path, name = sys.argv[1], sys.argv[2], sys.argv[3]
canon = open(canonical_path, encoding="utf-8").read()
adapter = open(adapter_path, encoding="utf-8").read()
m_a = re.match(r"^---\n(.*?)\n---\n", adapter, re.DOTALL)
m_c = re.match(r"^---\n(.*?)\n---\n", canon, re.DOTALL)
if not m_a or not m_c:
    print("malformed frontmatter")
    sys.exit(0)
# Adapter frontmatter MUST be valid YAML (codex requires it). We always
# emit it via yaml.safe_dump, so safe_load round-trips. Canonical
# frontmatter uses ECHO's simpler line-key:value convention (descriptions
# can contain unquoted colon-space sequences), so parse it by hand.
try:
    fm_a = yaml.safe_load(m_a.group(1)) or {}
except Exception as e:
    print(f"adapter YAML parse failed: {e}")
    sys.exit(0)
fm_c = {}
for line in m_c.group(1).split("\n"):
    if not line or line.startswith(" ") or line.startswith("\t") or line.startswith("#"):
        continue
    k, sep, v = line.partition(":")
    if sep:
        fm_c[k.strip()] = v.strip()
if fm_a.get("name") != name:
    print(f"name {fm_a.get('name')!r} != expected {name!r}")
    sys.exit(0)
if fm_a.get("description") != fm_c.get("description"):
    print("description does not match canonical")
    sys.exit(0)
md = fm_a.get("metadata") or {}
short = md.get("short-description")
if not isinstance(short, str) or not short or len(short) > 80:
    print("invalid metadata.short-description")
    sys.exit(0)
desc = fm_c.get("description", "")
expected_short = desc[:80]
if len(desc) > 80 and " " in expected_short:
    expected_short = expected_short[:expected_short.rfind(" ")]
if short != expected_short:
    print(f"short-description {short!r} != expected {expected_short!r}")
    sys.exit(0)
print("ok")
PYEOF
}

mkdir -p "$CLAUDE_DIR"

in_scope_codex=()
for canonical in "$SKILLS_DIR"/*.md; do
  [ -e "$canonical" ] || continue
  name="$(basename "$canonical" .md)"
  if [ "$(has_codex_notes "$canonical")" = "yes" ]; then
    in_scope_codex+=("$name")
  fi
done

drift=0
synced_claude=0
synced_codex=0

# --- Claude Code adapter (existing behavior, byte-stable) ---
for canonical in "$SKILLS_DIR"/*.md; do
  [ -e "$canonical" ] || continue
  name="$(basename "$canonical")"
  adapter="$CLAUDE_DIR/$name"

  if [ "$MODE" = "--check" ]; then
    if [ ! -f "$adapter" ]; then
      echo "DRIFT: missing adapter at $adapter (canonical: $canonical)" >&2
      drift=1
    elif ! cmp -s "$canonical" "$adapter"; then
      echo "DRIFT: $adapter differs from canonical $canonical" >&2
      drift=1
    fi
  else
    cp "$canonical" "$adapter"
    synced_claude=$((synced_claude + 1))
  fi
done

# --- Codex adapter (new, in-scope set only) ---
if [ "$MODE" != "--check" ]; then
  mkdir -p "$CODEX_DIR"
fi

for name in "${in_scope_codex[@]+"${in_scope_codex[@]}"}"; do
  canonical="$SKILLS_DIR/$name.md"
  codex_skill_dir="$CODEX_DIR/$name"
  codex_skill="$codex_skill_dir/SKILL.md"

  if [ "$MODE" = "--check" ]; then
    if [ ! -f "$codex_skill" ]; then
      echo "DRIFT: missing codex adapter at $codex_skill (canonical: $canonical)" >&2
      drift=1
      continue
    fi
    canonical_body=$(emit_skill_body "$canonical")
    adapter_body=$(emit_skill_body "$codex_skill")
    if [ "$canonical_body" != "$adapter_body" ]; then
      echo "DRIFT: $codex_skill body differs from canonical $canonical body" >&2
      drift=1
    fi
    verdict=$(verify_codex_frontmatter "$canonical" "$codex_skill" "$name")
    if [ "$verdict" != "ok" ]; then
      echo "DRIFT: $codex_skill — $verdict" >&2
      drift=1
    fi
  else
    mkdir -p "$codex_skill_dir"
    emit_codex_skill_md "$canonical" "$name" > "$codex_skill"
    synced_codex=$((synced_codex + 1))
  fi
done

# --- --check: reject unexpected codex adapter directories ---
if [ "$MODE" = "--check" ] && [ -d "$CODEX_DIR" ]; then
  for dir in "$CODEX_DIR"/*/; do
    [ -d "$dir" ] || continue
    actual_name="$(basename "$dir")"
    found=0
    for name in "${in_scope_codex[@]+"${in_scope_codex[@]}"}"; do
      if [ "$name" = "$actual_name" ]; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      echo "DRIFT: unexpected codex adapter at $dir (canonical skills/$actual_name.md does not document '## Binding-specific notes — codex')" >&2
      drift=1
    fi
  done
fi

# --- --check: warn (not error) on stale --copy installs in $HOME/.codex/skills ---
# Install-step concern (drift between adapter content and what's deployed under
# user HOME), not a sync-step error. Operator can re-run install-codex-adapters.sh
# --copy to refresh. Symlink-mode installs are auto-fresh by construction.
if [ "$MODE" = "--check" ] && [ -n "${HOME:-}" ] && [ -d "$HOME/.codex/skills" ]; then
  for managed_dir in "$HOME/.codex/skills"/*/; do
    [ -d "$managed_dir" ] || continue
    [ -L "${managed_dir%/}" ] && continue
    sentinel="${managed_dir}.echo-managed"
    [ -f "$sentinel" ] || continue
    iname="$(basename "$managed_dir")"
    adapter_skill="$CODEX_DIR/$iname/SKILL.md"
    [ -f "$adapter_skill" ] || continue
    installed_hash="$(awk -F= '/^synced_content_sha256=/ { print $2 }' "$sentinel" | tr -d '[:space:]')"
    [ -n "$installed_hash" ] || continue
    current_hash="$(shasum -a 256 "$adapter_skill" | awk '{print $1}')"
    if [ "$installed_hash" != "$current_hash" ]; then
      echo "WARNING: $HOME/.codex/skills/$iname is a --copy install with stale content (installed sha256=$installed_hash, current=$current_hash). Re-run tools/install-codex-adapters.sh --copy to refresh." >&2
    fi
  done
fi

if [ "$MODE" = "--check" ]; then
  if [ "$drift" -eq 0 ]; then
    echo "OK: all adapters match canonical skills/"
    exit 0
  fi
  echo "" >&2
  echo "Fix: run tools/sync-skills.sh (without --check) and re-commit." >&2
  exit 1
fi

echo "Synced $synced_claude Claude Code adapter(s) and $synced_codex codex adapter(s)."
