---
id: 2026-06-06-095-canonical-repo-identity
title: "Canonical repo identity: capture origin_url so claude_code + git join codex on the same remote"
status: proposed
priority: HIGH
estimate: 0.5d
created: 2026-06-06
blocked_by: []
task_state_ref: 2026-06-06-095-canonical-repo-identity
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/capture/extractors/_turn_meta.ts        # AC1 — add optional origin_url field to GitState interface
  - src/capture/git-state.ts                     # AC1 — probeGitState captures `git remote get-url origin` (normalized at read), stamps GitState.origin_url; cache it like the other fields
  - src/capture/surfaces/git-watcher.ts          # AC3 — capture origin_url once per repo and stamp metadata.origin_url on each commit candidate
  - src/normalize/adapters/git.ts                # AC3 — read metadata.origin_url and pass it to repoArtifact instead of hardcoded null
spec_refs:
  - raw/internal/decisions/2026-06-06-r1-cross-adapter-repo-identity-gap-brief.md  # the converged root-cause brief (READ FIRST)
  - src/normalize/artifacts.ts                    # repoArtifact + normalizeRemoteUrl — NO change; normalizer already handles ssh/https/.git
  - src/normalize/adapters/_shared.ts             # buildRepoArtifact — NO change; already passes origin_url → repoArtifact
  - src/normalize/adapters/codex.ts               # reference: codex already resolves provider=github via git.origin_url — the target identity to match
  - src/normalize/adapters/claude-code.ts         # reference: already consumes git_state.origin_url; only capture-side is missing
  - src/capture/extractors/claude-code.ts         # reference: probeGitState result is written to metadata.git_state (lines ~564–578)
  - src/capture/extractors/codex.ts               # reference: codex extractor parses repository_url → git.origin_url (lines ~164–173)
  - src/trace/cluster.ts                          # reference ONLY — the `provider:type:id` join key; DO NOT modify
---

## Why

`find_clusters(repo_path=/Users/zhenye/Desktop/Project_echo)` over a single 4h window returned TWO clusters for the SAME checkout: rank-1 `ctx_5b528bf1` (source_breakdown `{git:1, claude_code:4}`) and rank-2 `ctx_25ea6b68` (source_breakdown `{codex:1}`). A Codex atom about the same repo, in the same window, did not join the Claude/git cluster.

Root cause: the same checkout is captured under two different repo-artifact identities depending on which tool saw it.

- **Codex** emits the repo as the normalized GitHub remote: provider `github`, id `https://github.com/zhenye0616/ECHO`. The codex extractor parses `payload.git.repository_url → metadata.git.origin_url` (src/capture/extractors/codex.ts ~164/788) and the codex adapter consumes it (src/normalize/adapters/codex.ts:53–54).
- **Claude Code** falls back to local identity: provider `local`, id `local:/Users/zhenye/Desktop/Project_echo`. The adapter already *reads* `metadata.git_state.origin_url` (src/normalize/adapters/claude-code.ts:55) — but the capture-side `probeGitState` (src/capture/git-state.ts) only captures head_sha/branch/dirty_count and never `origin_url`, and the `GitState` type (src/capture/extractors/_turn_meta.ts:25) has no such field. So `buildRepoArtifact(repo_root, undefined)` falls back to local.
- **git** also falls back to local: the git watcher writes only `metadata.repo_root` (src/capture/surfaces/git-watcher.ts:198–205) and the git adapter hardcodes `repoArtifact(null, repoRoot)` (src/normalize/adapters/git.ts:52).

The cluster engine unions atoms on exact `${provider}:${type}:${id}` equality (src/trace/cluster.ts:7). `local:repo:local:/...` (claude+git) and `github:repo:https://...` (codex) are different keys, so they never union. The repo artifact's role is `scope` and scope edges are filtered from the *visible* edge set (src/trace/index.ts:134), so the split unions silently — it shows up only as fragmented clusters.

Blast radius: `repo.id` is the prefix of every derived artifact id — file (`${repoId}::<rel>`, artifacts.ts:80), branch (`${repoId}::<branch>`, :123), commit (`${repoId}::<sha>`, :132). So the divergence breaks cross-tool joining at file/branch/commit granularity too, including the highest-signal "same file touched by two tools" edge.

The repo identity that codex already uses — the normalized remote URL — is the correct canonical identity, and it is the only candidate that is machine-independent (a Windows tester's `C:\...` checkout of the same remote must join the founder's `/Users/...` checkout; a local path can never satisfy that). `metadata.repo_root` is already captured consistently by all three sources but is used only to filter candidates (src/mcp/internal/cluster-engine.ts:126), not as a join key. The fix makes claude_code and git capture + emit the normalized remote URL so all three resolve to the same `repoArtifact`.

## Locked decisions

1. **Canonical repo identity = the normalized remote URL** (as already produced by `normalizeRemoteUrl` + `repoArtifact` in src/normalize/artifacts.ts). Codex is the reference behavior; claude_code and git are brought into alignment with it.
2. **Capture-time enrichment, not read-time.** Read-time can normalize the *spelling* of a URL but cannot invent a missing remote from a local path. The remote must be captured when the turn/commit is captured. claude_code captures it via `probeGitState`; git captures it in the watcher.
3. **Do NOT change the cluster join-key algorithm** (src/trace/cluster.ts). The join key stays `${provider}:${type}:${id}`. The fix makes the *inputs* converge, not the comparison.
4. **Repos without a remote keep the `local:<root>` fallback.** `repoArtifact(null, root)` and `buildRepoArtifact(root, undefined)` behavior is unchanged. Remote-less repos join only same-machine; that is acceptable and out of scope to fix.
5. **Do NOT retro-migrate historical atoms.** Atoms already stored with `local:` ids will not retroactively converge from a capture-time change. Read-time aliasing for legacy data is a separate, deferrable item.
6. **No change to `artifacts.ts` or `_shared.ts`.** The normalizer and `buildRepoArtifact` already accept and correctly handle an `origin_url`; the only missing wiring is on the capture side (and the git adapter's hardcoded `null`).

## Acceptance criteria

1. **GitState carries the remote, and `probeGitState` captures it.**
   - `GitState` (src/capture/extractors/_turn_meta.ts) gains an optional `origin_url?: string` field, documented as the repo's remote (origin) URL as captured at probe time.
   - `probeGitState` (src/capture/git-state.ts) additionally runs `git remote get-url origin` (alongside the existing rev-parse/status probes, via the same `gitOne` helper and Promise.all fan-out), and when it returns a non-empty value, stamps it onto `GitState.origin_url`. The value is cached in the per-cwd cache entry exactly like the other fields (so a burst of turns in one repo does not re-fan-out). Absence of a remote (non-zero exit / empty output) leaves `origin_url` undefined — no error, no log noise; this matches the existing silent-failure convention.
   - The existing freshness/stale-skip and not-a-git-repo negative-cache behavior is unchanged.

2. **claude_code atoms for a remote-backed checkout get the normalized-remote repo id.**
   - With AC1 in place, the claude-code extractor's existing write of `metadata.git_state` (src/capture/extractors/claude-code.ts ~564) now includes `origin_url` for remote-backed, freshly-probed turns, and the already-present adapter read at src/normalize/adapters/claude-code.ts:55 resolves the repo via `buildRepoArtifact(repo_root, origin_url)`.
   - Observable outcome: a claude_code turn captured in a remote-backed checkout produces a repo artifact whose `provider`/`id` equal what codex produces for the same remote (e.g. provider `github`, id `https://github.com/<owner>/<repo>`) rather than `local:<path>`.

3. **git commit atoms get the normalized-remote repo id.**
   - The git watcher (src/capture/surfaces/git-watcher.ts) resolves the repo's origin URL (e.g. once per repo, `git remote get-url origin`) and, when present, stamps it onto each commit candidate's metadata under `origin_url` alongside the existing `repo_root`.
   - The git adapter (src/normalize/adapters/git.ts) reads `metadata.origin_url` and passes it to `repoArtifact(originUrl ?? null, repoRoot)` instead of the current hardcoded `repoArtifact(null, repoRoot)`. When `origin_url` is absent, behavior is identical to today (local fallback).
   - Observable outcome: a git commit atom in a remote-backed checkout produces the same repo `provider`/`id` as codex/claude_code for that remote.

4. **Behavior contract — one checkout, three tools, one cluster.**
   - When the SAME remote-backed checkout is captured by claude_code, codex, and git within one cluster window, all three repo artifacts resolve to a single canonical repo id, so their atoms union into ONE cluster (no rank-1/rank-2 split by source).
   - Derived artifacts are consistent too: file artifacts from different tools for the same relative path share the same `${repoId}::<rel>` id (and likewise branch/commit ids share the canonical prefix), so the cross-tool same-file edge forms.

5. **Machine-independence.**
   - The canonical repo id is derived purely from the normalized remote URL, independent of the local checkout path. The same remote checked out at a different local path (and/or a different OS path style — `/Users/...` vs `C:\...`) resolves to the same repo id and therefore joins the same cluster. (`locator` may still differ per machine; identity does not.)

6. **Regression guard.** The existing test suite, typecheck, and lint all stay green. Remote-less repos and not-a-git-repo cwds behave exactly as before (local fallback / undefined). The `probeGitState` cache, freshness window, and stale-turn partial-GitState path are unchanged except for the additive `origin_url` field.

## Out of Scope (Don't Drift)

- **Do NOT change the cluster join algorithm** (src/trace/cluster.ts) or the `${provider}:${type}:${id}` key shape. Converge the inputs only.
- **Do NOT change `repoArtifact` / `normalizeRemoteUrl` / `buildRepoArtifact`.** They already handle ssh/https/.git normalization and the `null → local` fallback. If a real normalizer bug surfaces, log it as a separate drift-event — do not fix it here.
- **Repos with no remote** keep `local:<root>` identity and only join same-machine. Not fixing cross-machine joining for remote-less repos in this item.
- **No read-time aliasing / no retro-migration** of historical `local:`-id atoms in this item. That is a separate, deferrable concern.
- **No new metadata keys beyond `origin_url`**, and no change to `repo_root` capture (it is already consistent across sources and still used for candidate filtering).
- Do not add observability scaffolding, new config flags, or surface changes. This is a capture-side identity fix only.

## After Completion (Strategist Notes)

- Post-ship, update the architecture wiki on artifact identity — most likely the `system-architecture` page (and any page documenting the canonical artifact model / repo-artifact construction) to record that repo identity is the normalized remote URL across all repo-bearing sources, with `local:<root>` as the explicit remote-less fallback, and that this is captured at capture time.
- Note in the operating-model / dogfooding record that this is the **first R1 context-layer fix for the beta** — it directly removes the cross-adapter repo-identity split that fragments same-checkout clusters, which is a prerequisite for the cross-machine (founder macOS vs Windows tester) joining the beta depends on.
