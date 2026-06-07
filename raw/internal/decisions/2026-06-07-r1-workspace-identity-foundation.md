# R1 foundation: workspace identity (canonical-root) as the same-machine join key

**Date:** 2026-06-07
**Status:** converged design brief — READ FIRST for item 096
**Origin:** strategist↔founder session 2026-06-07, validated across two ECHO-backed Codex consults (`codex exec`, read-only/escalated; both journaled in `raw/internal/dogfooding/mcp-interactions-journal-2026-06.md` 2026-06-07 11:32 + 11:45 PDT).

## The problem this fixes (R1, after 095)

095 made claude_code + codex + git converge on the **normalized git remote URL** as the repo join key. That closed the dominant cross-adapter split for *remote-backed git repos*. But the remote URL is an **alias, not an identity** — it is absent for non-git folders, local-only repos, and (critically) it **flips** the moment a user runs `git init` mid-project:

- T0 (pre-`git init`) atoms → `local:<path>`
- T2 (post-`git init`) atoms → `github:<remote>`
- Same folder, two join keys → they never union. Read-time recompute cannot heal T0 (it captured no git facts).

The same flip means a plain non-git working directory degrades to a machine-local `local:<path>` that is brittle to **cwd-subdir mismatch** (claude uses launch cwd as `repo_root`, git uses the toplevel), so even same-machine work fragments.

## The converged model

**A workspace is a directory, identified by its canonical root.** Git is an *enrichment*, never an assumption.

- **Same-machine identity (universal, the join key):** `local_workspace_key = workspace:<canonical-root>` — a path-based key. Works for git repos, local-only repos, and plain non-git folders alike, and is **stable across `git init`** (init does not move the directory).
- **Cross-machine identity (git-only, accepted boundary):** `git_alias = <normalized-origin-url>` — optional, machine-independent. Captured and stored, but used **only** by a future cross-machine merge, never as a same-machine join edge.
- **Files:** `local_workspace_key :: <relative-path>` (relative to the canonical root, normalized separators). No content hashing.

**The invariant (Codex's framing, 11:45 consult): _one active join key per join domain._** Same-machine clustering joins on `local_workspace_key` and nothing else. The git artifact must **not** be emitted as a peer join edge in the same domain, or the alias-splitting bug returns.

### Canonical-root discovery (the mechanism)

From whatever path a tool reports (a launch cwd, or a commit's repo_root), resolve ONE canonical root:

1. If inside a git work tree → the git toplevel (`git rev-parse --show-toplevel`). This makes a subdir-launch and a root-launch resolve identically.
2. Else → walk up to the nearest directory containing a project anchor (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pnpm-workspace.yaml`, …).
3. Else → the reported directory itself. **Ambient-root guard:** never climb to or past `$HOME`, `/`, `/tmp`, or the filesystem root; if no anchor is found below the guard, use exactly the reported directory.
4. **Canonicalize:** resolve symlinks (realpath) and normalize case on case-insensitive filesystems, before the key is formed. (Codex: symlink/case is the real same-machine *split* risk.)

Resolution happens at **capture time** (like 095's origin_url), stored in metadata, so normalize/read does not hit the filesystem per atom and does not depend on the path still existing at read time.

## Why this is correct on the hard cases

- **`git init` mid-project:** T0 and T2 share the same canonical root (the dir didn't move) → both carry `workspace:<root>` → they join. No backfill, no alias table.
- **Cross-machine:** machine A `(workspace:/Users/a/proj, git_alias=…/repo)` and machine B `(workspace:C:\proj, git_alias=…/repo)` reconcile on the shared `git_alias` in the future merge. Bare paths are local identifiers; the cross-machine layer must machine-scope them.
- **Non-git folder:** `workspace:<canonical-root>`, same-machine only — accepted.

## Accepted residuals / boundaries (do NOT solve here)

- Pre-git work done in a **subdir with no anchor file** → post-`git init` the canonical root jumps up to the toplevel → split. Narrow, same-machine-only, accepted.
- **Temporal path reuse** (delete/recreate at same path, `/tmp` reuse, mount swap) can wrong-merge unrelated work. Not solved now (would need fingerprints/inodes — cut).
- **Cross-machine merge itself** is not built here — only the `git_alias` it will need is captured.

## Explicitly CUT (founder guardrails: do not overengineer; do not assume git)

content-fingerprinting; confidence-scored entity graphs; fork/migration disambiguation policy; multi-root hashing; identity-at-rest materialization (separate later item, gap #2); workspace/package sub-layering for monorepos (future).

## Relationship to 095 (nothing shipped is undone)

095's captured/scrubbed/normalized remote URL becomes the `git_alias` verbatim — no capture-side rework. The only change is **consumer semantics:** the normalized remote URL stops being the same-machine join key (the `workspace:<canonical-root>` key takes that role); the remote URL is retained as additive `git_alias` metadata for the future cross-machine merge.

## Provider-namespace note (Codex, 11:32 consult)

The cluster join key is `${provider}:${type}:${id}`. The workspace join artifact must use a single stable provider namespace (e.g. `workspace`/`local`) so identity is the canonical-root path, not a per-tool provider. The git_alias, when later promoted to a cross-machine key, must likewise use a stable `git:` provider with the remote/root inside the id (so a GitHub checkout and its GitLab mirror can reconcile) — but that is the cross-machine layer, out of scope here.

## Live dogfooding evidence (this session, in the journal)

Both Codex consults used ECHO to reconstruct this very design session and reproduced R1/R2 on it: the claude_code and codex halves of one continuous thread landed in **separate sibling clusters** ("discussion about Project_echo" vs "discussion about ECHO") — R1 firing on the R1 work; a cross-project cluster out-ranked the active thread (R2 recency miss); and a `-07:00` window returned 0 atoms (R2 tz bug). The workspace/session join key this item introduces is exactly what would have unioned the split halves.
