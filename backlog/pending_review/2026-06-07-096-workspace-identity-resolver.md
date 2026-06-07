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
ready_content_sha: c025faed9cbd80a6d83e9bd30f53fb861fbfc9ef036fdee2c7d44e806c218038
claimed_by: "codex-builder-F5CFFC27-E8BD-486A-94FA-8CFF1CBC6D3C"
claimed_at: "2026-06-07T19:58:59Z"
branch: "agent/096-workspace-identity-resolver"
head_sha: "cb54f8def2b0e91c67199d356b7e8c907733dc0e"
pr_url: ""
agent_notes: |
  Built blind by a Codex builder (codex exec, danger-full-access, worktree agent/096-workspace-identity-resolver). All 12 files within the spec's files_to_modify allowlist; zero out-of-scope edits (cluster.ts / cursor.ts / normalizeRemoteUrl untouched). All 8 ACs reported satisfied.
  Verification (orchestrator-reproduced from git ground-truth, not builder self-report):
  - Focused suite GREEN: `npm run test -- tests/capture/workspace-root.test.ts tests/capture/canonical-root-capture.test.ts tests/normalize/workspace-identity.test.ts` → 3 files, 22/22 passed.
  - `npm run typecheck` clean; `npm run lint` clean.
  - Builder-run broader suites: tests/trace 105/105, tests/normalize 73/73, tests/capture 235 passed/17 skipped.
  - Known flake (NON-blocking, same as 095/followups): `tests/trace/build.test.ts` perf threshold (<500ms) trips only under combined tests/normalize+trace+capture load (~628ms); passes standalone at ~241ms. Categorically a load-timing flake, not a regression from this capture/normalize change.
  head_sha = cb54f8def2b0e91c67199d356b7e8c907733dc0e (branch agent/096-workspace-identity-resolver, pushed to origin).
review_notes: ""
files_to_modify:
  - src/capture/workspace-root.ts                 # NEW — resolveCanonicalRoot plus shared gitToplevel/canonicalization helpers; git toplevel -> anchor walk -> reported dir; no-throw capture-time resolver.
  - src/capture/git-state.ts                      # AC1/AC2 — share git-only gitToplevel (and optional GIT_PROBE_TIMEOUT_MS); repo_root stays null on git failure; origin_url capture unchanged. Do not use resolveCanonicalRoot here.
  - src/capture/extractors/claude-code.ts         # AC2 — write metadata.canonical_root via resolveCanonicalRoot; leave existing repo_root/git_state semantics intact.
  - src/capture/surfaces/git-watcher.ts           # AC3 — write metadata.canonical_root from the canonicalized git toplevel alongside repo_root/origin_url.
  - src/capture/extractors/codex.ts               # AC4 — write metadata.canonical_root (resolved from cwd/repo_root)
  - src/normalize/artifacts.ts                    # AC5 — add workspaceArtifact(canonicalRoot); file/branch/commit ids key on workspace id with abs: fallback; no remote URL ArtifactRef.
  - src/normalize/adapters/claude-code.ts         # AC6 — emit workspaceArtifact from metadata.canonical_root; set context.ambient.git_alias from git_state.origin_url.
  - src/normalize/adapters/codex.ts               # AC6 — emit workspaceArtifact from metadata.canonical_root; set context.ambient.git_alias from git.origin_url.
  - src/normalize/adapters/git.ts                 # AC6 — emit workspaceArtifact from metadata.canonical_root; set context.ambient.git_alias from metadata.origin_url.
  - tests/capture/workspace-root.test.ts          # AC8 — resolver/gitToplevel tests: git toplevel, exact anchor walk-up, no-anchor fallback, ambient guard, canonicalization, and git-failure fallback.
  - tests/capture/canonical-root-capture.test.ts  # AC8 — NEW; capture-stamp assertions that claude_code, git-watcher (canonicalized), and codex each stamp metadata.canonical_root.
  - tests/normalize/workspace-identity.test.ts    # AC8 — same-machine join convergence; git-init transition; non-git/subdir/remote-backed joins; workspace-keyed files; abs: fallback; git_alias metadata only.
spec_refs:
  - raw/internal/decisions/2026-06-07-r1-workspace-identity-foundation.md   # converged design brief — READ FIRST
  - backlog/complete/2026-06-06-095-canonical-repo-identity.md              # the origin_url enrichment this builds on (becomes git_alias); nothing there is undone
  - src/normalize/artifacts.ts                    # workspace/file/branch/commit artifact construction; normalizeRemoteUrl reference only for git_alias
  - src/normalize/adapters/_shared.ts             # buildRepoArtifact fallback/undefined-root guard reference
  - src/trace/cluster.ts                          # `${provider}:${type}:${id}` join key reference ONLY; DO NOT modify comparison
  - src/trace/index.ts                            # scope-edge filtering reference ONLY; DO NOT modify join behavior
  - src/normalize/adapters/cursor.ts              # reference ONLY — Cursor workspace identity is PARKED (out of scope, see OoS)
  - backlog/_followups.md                         # R1 section — residuals (a)/(b)/(d)/(e) context
---

## Why

095 converged claude_code + codex + git on the **normalized git remote URL** as the repo join key — good for remote-backed git repos, but the remote URL is an **alias, not an identity**. It is absent for non-git folders and local-only repos, and it **flips** when a user runs `git init` mid-project:

- T0 (pre-`git init`) atoms resolve to a path-derived local key; T2 (post-`git init`) atoms resolve to a remote-derived key. Same folder, two join keys → **they never union**, and read-time recompute cannot heal T0 (it captured no git facts).
- A plain non-git working directory degrades to a path-derived local key, which is brittle to **cwd-subdir mismatch**: claude_code uses the launch cwd as `repo_root` (src/capture/extractors/claude-code.ts:409) while the git watcher uses the toplevel, so even same-machine work fragments.

The fix is to make the **canonical workspace root** — a path-based key that exists with or without git and is stable across `git init` — the same-machine join key, and demote the remote URL to additive `git_alias` metadata for the (future, out-of-scope) cross-machine merge. See the design brief `raw/internal/decisions/2026-06-07-r1-workspace-identity-foundation.md` (READ FIRST) for the full reasoning and the two ECHO-backed Codex consults that converged it.

## Locked decisions

1. **Same-machine join key = the workspace artifact, with this EXACT tuple:** `provider: "local"`, `type: "workspace"`, `id: <canonical-root absolute path>` (the canonicalized root, no scheme prefix — the provider+type already namespace it). The resulting join key (`src/trace/cluster.ts` `${provider}:${type}:${id}`) is therefore the literal string **`local:workspace:<canonical-root>`** — e.g. `local:workspace:/Users/zhen/proj`. AC7 tests assert this exact key string. This is THE join edge for same-machine clustering.
2. **One active join key per join domain (the invariant).** The git/remote identity must NOT be emitted as a *peer* join ArtifactRef in the same domain — it is retained as a non-join `git_alias` attribute only. Emitting both the local workspace artifact and a remote repo edge would reintroduce alias-splitting.
3. **Canonical-root discovery, resolved at CAPTURE time:** git toplevel when inside a git work tree; else walk up to the nearest directory containing a project anchor; else the reported directory. The **exact anchor set, traversal stop rules, ambient-root guard, non-existent-path canonicalization, and bounded best-effort never-throw behavior are fully specified in AC1**. Canonicalize (realpath for symlinks; case-fold on case-insensitive FS) before forming the key.
4. **`git_alias` = the normalized remote URL from 095, stored only at `context.ambient.git_alias`.** It is captured-and-stored metadata, NOT a same-machine join key or ArtifactRef. It exists only to feed a future cross-machine merge. 095's capture/scrub/normalize path is reused verbatim — no capture-side rework, nothing undone.
5. **Files key on the workspace id:** `fileArtifact` id becomes `workspace:<canonical-root>::<rel>` (relative path normalized). Branch/commit ids likewise prefix on the workspace id.
6. **`git init` mid-project must join.** Pre-init and post-init atoms from the same directory resolve to the same canonical root (init does not move the dir) and therefore the same `local:workspace:<root>` key → one cluster. This is the headline behavior test.
7. **Do NOT change the cluster join-key comparison** (src/trace/cluster.ts `${provider}:${type}:${id}`). Converge the *inputs*: emit the workspace artifact as the scope/join artifact in place of the repo artifact.
8. **Cursor is PARKED.** Cursor does not capture a reliable workspace root today (separate gap); it keeps its current artifacts. `fileArtifact` stays backward-compatible for Cursor's `fileArtifact(null, path)` calls.

## Acceptance criteria

1. **`resolveCanonicalRoot(path)` exists, is fully specified, and is bounded best-effort.** New function in `src/capture/workspace-root.ts`. All returned roots are canonicalized (realpath for symlinks; case-fold on case-insensitive FS) before being stored or used as ids. Resolution order:
   - **(i) git toplevel** when `path` is inside a git work tree, via a **git-only primitive `gitToplevel(path)`** (`git rev-parse --show-toplevel`, repo-root-scoped) that returns **`null` on any git failure** (non-git dir, ENOENT, timeout, non-zero exit, other error) and NEVER falls through to anchor/reported-dir. This primitive is the single git-toplevel resolver shared by `probeGitState` (AC2) and the git watcher (AC3); the (ii)/(iii) fallback chain belongs to `resolveCanonicalRoot` ONLY, never to a caller that wants a git-only answer.
   - **(ii) walk-up to the nearest project anchor** otherwise. A directory is an anchor root if it directly contains ANY of: `.git`, `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pnpm-workspace.yaml`. Ascend parent-by-parent from `path`, returning the first ancestor that contains an anchor.
   - **(iii) the reported directory itself** if no anchor is found before the guard.
   - **Ambient-root guard:** the set `{ resolved $HOME, /, /tmp, /private/tmp, filesystem root }` is NEVER returned as a *discovered* (walk-up) root — it may only be the result when it is the literal `path` passed in (branch iii). **The `$HOME` ascent ceiling applies ONLY when the start `path` is under the resolved home directory.** If the start path is outside home (e.g. `/tmp/<workspace>`, an external volume, `/var/...`) — or if `HOME` is unset/unresolvable in a daemon/launchd environment — walk-up still proceeds normally toward the filesystem root and returns the first non-ambient ancestor with an anchor.
   - **Non-existent-path canonicalization:** canonicalize by `realpath`-ing the longest existing ancestor prefix (resolving symlinks), then re-appending the non-existent remainder lexically (normalizing `.`/`..`/separators); case-fold only on a case-insensitive filesystem. Never call `realpath` on a path that may not exist in a way that throws.
   - **Bounded best-effort; never aborts capture.** The branch-(i) git probe runs via `execFile`/`execFileP` reusing the **existing git-subprocess timeout already used by capture — `1_500` ms** (the literal at `src/capture/git-state.ts:44` and `src/capture/surfaces/git-watcher.ts:86`; name a shared `GIT_PROBE_TIMEOUT_MS = 1_500` if convenient, but do NOT invent a new/different value or a config knob). On git timeout, non-zero exit, ENOENT (`git` not on PATH), or any error, branch (i) yields null and `resolveCanonicalRoot` degrades to (ii)→(iii). **The pure-filesystem branches (ii) walk-up and (iii)/canonicalization realpath introduce NO timer, `AbortController`, or timeout** — they are bounded by plain `stat`/`realpath` calls. Any failure — missing `git`, concurrent-`git init` race, permission-denied ancestor, deleted cwd — degrades down the chain and ultimately to the canonicalized reported `path`. The function MUST NOT throw out of the capture path. Degradation follows the **existing silent-failure convention** (mirrors `probeGitState`'s `return`-without-logging) — **no new observability scaffolding, diagnostics surface, or config** is added.

2. **claude_code writes `metadata.canonical_root`.** The extractor resolves the turn's cwd through `resolveCanonicalRoot` and stamps `metadata.canonical_root`. Existing `repo_root`/`git_state` writes are **unchanged** — in particular, `probeGitState.repo_root` continues to use the **git-only `gitToplevel` primitive** (AC1 branch i), NOT `resolveCanonicalRoot`, so it never receives the anchor/reported-dir fallback and 095's `git_state` semantics are preserved. `git_state.origin_url` (095) continues to be captured and is surfaced to the adapter as `git_alias`.

3. **git watcher writes `metadata.canonical_root`.** Each commit candidate is stamped with `canonical_root` = the repo-root-scoped git toplevel **passed through the SAME canonicalization (realpath/symlink + case-fold) that `resolveCanonicalRoot` applies** — the watcher must not stamp a raw, un-canonicalized toplevel, or a symlinked/case-variant repo path would split from claude_code/codex captures of the same checkout. Stamped alongside the existing `repo_root` and `origin_url` (095). No change to `origin_url` capture.

4. **codex writes `metadata.canonical_root`.** Resolved from the codex turn's cwd/repo_root via `resolveCanonicalRoot`.

5. **`workspaceArtifact` is the scope/join artifact.** `src/normalize/artifacts.ts` gains `workspaceArtifact(canonicalRoot)` with the LD1 tuple (`provider: "local"`, `type: "workspace"`, id = canonical root), scope role mirroring today's repo artifact. `fileArtifact`/`branchArtifact`/`commitArtifact` key on the workspace id. **`git_alias` has ONE pinned location: the atom's ambient context map — `context.ambient.git_alias` (a single normalized-URL string)** — the same container the git adapter already uses for `parent_sha` etc. It is NEVER placed on the `workspaceArtifact` (the artifact stays a pure join key) and NEVER emitted as an additional ArtifactRef. All three adapters and all tests read/write exactly this location.
   - **File relativization fallback:** when a captured file path is NOT safely inside `canonical_root` after canonicalization — i.e. it is outside the root, or relativizing would require a `..` segment — `fileArtifact` MUST fall back to the existing machine-local `abs:<path>` id (the fallback already present in `src/normalize/artifacts.ts`). It MUST NOT emit a `..`-bearing workspace file id and MUST NOT throw.

6. **All repo-bearing adapters emit the workspace artifact.** claude_code, codex, and git adapters emit `workspaceArtifact(metadata.canonical_root)` as the scope/join artifact (replacing the repo artifact's join role) and set `context.ambient.git_alias` (AC5's pinned location) from their respective origin_url field. When `canonical_root` is absent (older atoms / unresolvable), behavior falls back to today's repo-artifact construction (no regression).

7. **Behavior contract — same-machine joins that 095 could not.** (Union assertions check the exact LD1 key string `local:workspace:<canonical-root>`.)
   - **git-init transition:** atoms captured in `/dir` before `git init` and after `git init` (with or without a remote) share `local:workspace:/dir` and union into ONE cluster.
   - **non-git folder:** two tools working in the same non-git `/dir` (resolving to the same canonical root) union into ONE cluster.
   - **subdir launch:** a tool launched in `/repo/sub` and a tool/commit at `/repo` resolve to the same canonical root (git toplevel) and union.
   - **no regression for remote-backed git:** a remote-backed checkout captured by all three tools still unions into one cluster (now on the `local:workspace:<root>` key; `git_alias` carries the remote for the future cross-machine layer).

8. **Tests and verification commands.**
   - `tests/capture/workspace-root.test.ts` covers AC1: git toplevel, subdir→toplevel, walk-up-to-anchor over the exact anchor set, no-anchor→reported-dir, ambient-root guard for each of `$HOME`/`/`/`/tmp`/`/private/tmp`, symlink canonicalization, non-existent-path canonicalization, git-failure no-throw fallback, anchored temp/external workspace outside `$HOME`, and missing-`HOME` walk-up behavior.
   - Case-canonicalization is host-FS-deterministic: exercise the pure canonicalization helper through an injected `caseInsensitiveFilesystem: boolean` seam (test-only, internal, NOT a runtime resolver API change), asserting both `true` (folds) and `false` (preserves). Any assertion that depends on real host FS case-sensitivity must be conditional/skipped on the opposite FS so case-sensitive CI stays green.
   - `tests/capture/canonical-root-capture.test.ts` directly asserts that claude_code (AC2), the git watcher (AC3, with the canonicalized value), and codex (AC4) each stamp `metadata.canonical_root`.
   - `tests/normalize/workspace-identity.test.ts` covers AC7 (git-init transition join, non-git join, subdir join, remote-backed no-regression — all asserting the exact `local:workspace:<root>` key) and AC5 (file id keyed on workspace; outside-root / `..` file path falls back to `abs:<path>` and never emits a `..`-bearing id; `git_alias` present at `context.ambient.git_alias` but NOT producing a join edge). Also assert `fileArtifact(null, path)` still yields the unchanged `abs:<path>` shape, so the PARKED Cursor adapter is unaffected.
   - Builder must run these exact repo commands before moving the item to review:
     ```bash
     npm run test -- tests/capture/workspace-root.test.ts tests/capture/canonical-root-capture.test.ts tests/normalize/workspace-identity.test.ts
     npm run typecheck
     npm run lint
     ```

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
