---
id: 2026-06-07-096-workspace-identity-resolver
title: "Workspace identity: canonical-root join key (git-optional) so same-machine work joins across git init and non-git folders"
status: proposed
priority: HIGH
estimate: 1d
created: 2026-06-07
blocked_by: []
task_state_ref: 2026-06-07-096-workspace-identity-resolver
requested_reviewers: ["codex", "codex-ops"]
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
files_to_modify:
  - src/capture/workspace-root.ts                # NEW — resolveCanonicalRoot(path): git-toplevel | walk-up-to-anchor | reported-dir, with ambient-root guard + realpath/case canonicalization. Pure, capture-time.
  - src/capture/git-state.ts                      # AC1 — probeGitState uses resolveCanonicalRoot for the git-toplevel branch; origin_url capture (095) unchanged, now surfaced as git_alias
  - src/capture/extractors/claude-code.ts         # AC2 — write metadata.canonical_root (resolved from the turn cwd) alongside existing repo_root/git_state
  - src/capture/surfaces/git-watcher.ts           # AC3 — write metadata.canonical_root (= git toplevel) on each commit candidate alongside repo_root/origin_url
  - src/capture/extractors/codex.ts               # AC4 — write metadata.canonical_root (resolved from cwd/repo_root)
  - src/normalize/artifacts.ts                    # AC5 — add workspaceArtifact(canonicalRoot) as the scope/join artifact; file/branch/commit ids key on the workspace key; remote URL retained as non-join git_alias attribute (NOT a second ArtifactRef)
  - src/normalize/adapters/claude-code.ts         # AC6 — emit workspaceArtifact from metadata.canonical_root; attach git_alias from git_state.origin_url
  - src/normalize/adapters/codex.ts               # AC6 — emit workspaceArtifact from metadata.canonical_root; attach git_alias from git.origin_url
  - src/normalize/adapters/git.ts                 # AC6 — emit workspaceArtifact from metadata.canonical_root; attach git_alias from metadata.origin_url
  - tests/capture/workspace-root.test.ts          # AC8 — resolveCanonicalRoot: git-toplevel, subdir→toplevel, walk-up-to-anchor, no-anchor→reported-dir, ambient-root guard ($HOME//tmp), symlink/case canonicalization
  - tests/normalize/workspace-identity.test.ts    # AC8 — same-machine join convergence across tools; git-init transition (pre==post join); non-git folder join; file-key on workspace; git_alias is metadata, not a join edge
spec_refs:
  - raw/internal/decisions/2026-06-07-r1-workspace-identity-foundation.md   # converged design brief — READ FIRST
  - backlog/complete/2026-06-06-095-canonical-repo-identity.md              # the origin_url enrichment this builds on (becomes git_alias); nothing there is undone
  - src/normalize/artifacts.ts                    # repoArtifact / fileArtifact / normalizeRemoteUrl — the construction this changes
  - src/normalize/adapters/_shared.ts             # buildRepoArtifact — reference; the workspace path mirrors its undefined-root guard
  - src/trace/cluster.ts                          # the `${provider}:${type}:${id}` join key — reference ONLY; DO NOT modify the comparison
  - src/trace/index.ts                            # scope-edge filtering (~line 134) — reference for how the join artifact's role behaves
  - src/normalize/adapters/cursor.ts              # reference ONLY — Cursor workspace identity is PARKED (out of scope, see OoS)
  - backlog/_followups.md                         # R1 section — residuals (a)/(b)/(d)/(e) context
---

## Why

095 converged claude_code + codex + git on the **normalized git remote URL** as the repo join key — good for remote-backed git repos, but the remote URL is an **alias, not an identity**. It is absent for non-git folders and local-only repos, and it **flips** when a user runs `git init` mid-project:

- T0 (pre-`git init`) atoms resolve to `local:<path>`; T2 (post-`git init`) atoms resolve to `github:<remote>`. Same folder, two join keys → **they never union**, and read-time recompute cannot heal T0 (it captured no git facts).
- A plain non-git working directory degrades to `local:<path>`, which is brittle to **cwd-subdir mismatch**: claude_code uses the launch cwd as `repo_root` (src/capture/extractors/claude-code.ts:409) while the git watcher uses the toplevel, so even same-machine work fragments.

The fix is to make the **canonical workspace root** — a path-based key that exists with or without git and is stable across `git init` — the same-machine join key, and demote the remote URL to additive `git_alias` metadata for the (future, out-of-scope) cross-machine merge. See the design brief `raw/internal/decisions/2026-06-07-r1-workspace-identity-foundation.md` (READ FIRST) for the full reasoning and the two ECHO-backed Codex consults that converged it.

## Locked decisions

1. **Same-machine join key = `workspace:<canonical-root>`.** A single stable provider namespace (`workspace` or `local`), id = the canonical root path. This is THE join edge for same-machine clustering.
2. **One active join key per join domain (the invariant).** The git/remote identity must NOT be emitted as a *peer* join ArtifactRef in the same domain — it is retained as a non-join `git_alias` attribute only. Emitting both `workspace:<path>` and a `github:<remote>` repo edge would reintroduce alias-splitting.
3. **Canonical-root discovery, resolved at CAPTURE time:** git toplevel when inside a git work tree; else walk up to the nearest project anchor (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pnpm-workspace.yaml`, …); else the reported directory. **Ambient-root guard:** never climb to/past `$HOME`, `/`, `/tmp`, or filesystem root. **Canonicalize** (realpath for symlinks; case-fold on case-insensitive FS) before forming the key.
4. **`git_alias` = the normalized remote URL from 095, captured-and-stored but NOT a same-machine join key.** It exists only to feed a future cross-machine merge. 095's capture/scrub/normalize path is reused verbatim — no capture-side rework, nothing undone.
5. **Files key on the workspace key:** `fileArtifact` id becomes `workspace:<canonical-root>::<rel>` (relative path normalized). Branch/commit ids likewise prefix on the workspace key.
6. **`git init` mid-project must join.** Pre-init and post-init atoms from the same directory resolve to the same canonical root (init does not move the dir) and therefore the same `workspace:<root>` key → one cluster. This is the headline behavior test.
7. **Do NOT change the cluster join-key comparison** (src/trace/cluster.ts `${provider}:${type}:${id}`). Converge the *inputs*: emit the workspace artifact as the scope/join artifact in place of the repo artifact.
8. **Cursor is PARKED.** Cursor does not capture a reliable workspace root today (separate gap); it keeps its current artifacts. `fileArtifact` stays backward-compatible for Cursor's `fileArtifact(null, path)` calls.

## Acceptance criteria

1. **`resolveCanonicalRoot(path)` exists and is correct.** New pure function in `src/capture/workspace-root.ts`: returns the git toplevel when `path` is inside a git work tree; else the nearest ancestor containing a project anchor; else the canonicalized reported directory. Honors the ambient-root guard ($HOME, /, /tmp, fs-root are never returned as a discovered root via walk-up — only as the literal reported dir if that is what was passed). Resolves symlinks and case before returning. No throw on a non-existent path (returns the canonicalized input).

2. **claude_code writes `metadata.canonical_root`.** The extractor resolves the turn's cwd through `resolveCanonicalRoot` and stamps `metadata.canonical_root`. Existing `repo_root`/`git_state` writes are unchanged. `git_state.origin_url` (095) continues to be captured and is surfaced to the adapter as `git_alias`.

3. **git watcher writes `metadata.canonical_root`.** Each commit candidate is stamped with `canonical_root` = the repo-root-scoped git toplevel, alongside the existing `repo_root` and `origin_url` (095). No change to `origin_url` capture.

4. **codex writes `metadata.canonical_root`.** Resolved from the codex turn's cwd/repo_root via `resolveCanonicalRoot`.

5. **`workspaceArtifact` is the scope/join artifact.** `src/normalize/artifacts.ts` gains `workspaceArtifact(canonicalRoot)` (stable provider, `type: 'workspace'`, id = canonical root, scope role mirroring today's repo artifact). `fileArtifact`/`branchArtifact`/`commitArtifact` key on the workspace id. The normalized remote URL is attached as a non-join `git_alias` attribute (on the workspace artifact or ambient metadata) — never as an additional join ArtifactRef.

6. **All repo-bearing adapters emit the workspace artifact.** claude_code, codex, and git adapters emit `workspaceArtifact(metadata.canonical_root)` as the scope/join artifact (replacing the repo artifact's join role) and attach `git_alias` from their respective origin_url field. When `canonical_root` is absent (older atoms / unresolvable), behavior falls back to today's repo-artifact construction (no regression).

7. **Behavior contract — same-machine joins that 095 could not.**
   - **git-init transition:** atoms captured in `/dir` before `git init` and after `git init` (with or without a remote) share `workspace:/dir` and union into ONE cluster.
   - **non-git folder:** two tools working in the same non-git `/dir` (resolving to the same canonical root) union into ONE cluster.
   - **subdir launch:** a tool launched in `/repo/sub` and a tool/commit at `/repo` resolve to the same canonical root (git toplevel) and union.
   - **no regression for remote-backed git:** a remote-backed checkout captured by all three tools still unions into one cluster (now on the workspace key; `git_alias` carries the remote for the future cross-machine layer).

8. **Tests (builder-authored).** `tests/capture/workspace-root.test.ts` covers AC1 (git toplevel, subdir→toplevel, walk-up-to-anchor, no-anchor→reported-dir, ambient-root guard, symlink + case canonicalization). `tests/normalize/workspace-identity.test.ts` covers AC7 (git-init transition join, non-git join, subdir join, remote-backed no-regression) and AC5 (file id keyed on workspace; `git_alias` present as metadata but NOT producing a join edge). Existing suite, typecheck, and lint stay green.

## Out of Scope (Don't Drift)

- **Identity-at-rest / materialized resolver table** (followups gap #2) — resolution stays capture-time-into-metadata + read-time-from-metadata, exactly like 095. No new storage table, no schema change. Separate later item.
- **Cross-machine merge** — only the `git_alias` it will need is captured/stored. No reconciliation logic, no machine-scoping of path keys, no `git:` cross-machine provider promotion here.
- **Cursor workspace identity** — PARKED. Do not modify the cursor adapter; keep `fileArtifact` backward-compatible.
- **Content fingerprinting, confidence-scored entity graphs, fork/migration disambiguation, multi-root hashing, monorepo workspace/package sub-layering** — all cut per founder guardrails.
- **Historical backfill / retro-migration** of `local:`/`github:`-keyed atoms — not in this item (same posture as 095 LD5).
- **Do NOT change** `normalizeRemoteUrl` semantics or the `src/trace/cluster.ts` join comparison. If a real normalizer bug surfaces (e.g. the `.git/` or `ssh://` residuals d/e), log a drift-event — do not fix here.
- **Temporal path-reuse wrong-merge** (`/tmp` reuse, delete-recreate) — accepted residual, not solved.

## After Completion (Strategist Notes)

- Promote the architecture-identity wiki page: repo identity → **workspace identity (canonical-root) as the same-machine join key, git as an enrichment alias**; record the git-optional foundation and the accepted same-machine/cross-machine boundary.
- Update `backlog/_followups.md` R1: mark the git-init-transition / non-git same-machine split closed; keep cross-machine-non-git, identity-at-rest (#2), Cursor, and residuals (d)/(e) open.
- Record in the dogfooding journal whether, post-deploy, the claude_code+codex halves of a single session stop fragmenting into sibling clusters (the live failure observed during this spec's own design).
