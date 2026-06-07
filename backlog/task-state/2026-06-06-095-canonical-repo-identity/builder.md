---
task_id: 2026-06-06-095-canonical-repo-identity
role: builder
binding: codex
claimed_at: "2026-06-07T05:02:58Z"
last_updated: "2026-06-07T05:02:58Z"
branch: agent/canonical-repo-identity
worktree: /Users/zhenye/Desktop/Project_echo--canonical-repo-identity
---

## current_thesis
Claimed 095 as codex builder. Implement capture-time `origin_url` enrichment so claude_code and git atoms use the same normalized remote-backed repo identity that codex already emits, while preserving local fallback for remote-less repos.

## locked_decisions
- AC1: add optional `GitState.origin_url`; `probeGitState` resolves `git remote get-url origin` through the existing cwd-scoped helper, strips URL userinfo before stamping, caches under the existing per-cwd TTL, and remains silent on absent remotes.
- AC2: rely on the existing claude-code metadata write and adapter read so fresh remote-backed claude_code turns resolve through `buildRepoArtifact(repo_root, origin_url)`.
- AC3: make git watcher resolve `origin_url` with repo-root-scoped `git -C <repo_root> remote get-url origin`, scrub credentials, use a bounded invalidatable per-repo cache that retries misses, and pass metadata origin through the git normalize adapter.
- AC4: same remote-backed checkout across claude_code, codex, and git must converge to one repo artifact and shared derived file/branch/commit prefixes.
- AC5: repo identity must be independent of local path or OS path style.
- AC6: existing test suite, typecheck, lint, remote-less fallback, not-a-git-repo handling, probe cache, freshness, and stale-turn behavior remain green except for additive `origin_url`.
- AC7: no persisted credentials in metadata, atom ids, cluster ids, or derived artifact ids; scrubbing happens in capture code, not in `artifacts.ts`.
- AC8: add the specified capture and normalize tests under the two listed test files.

## open_questions
- None blocking at claim. Escalate if implementation requires files outside `files_to_modify`, normalizer changes, join-key changes, new dependencies, observability/config work, or historical migration.

## dont_touch
- Do not change `src/trace/cluster.ts`, the join-key algorithm, or `${provider}:${type}:${id}`.
- Do not change `repoArtifact`, `normalizeRemoteUrl`, or `buildRepoArtifact`.
- Do not change remote-less repo semantics or add cross-machine joining for remote-less repos.
- Do not add read-time aliasing or retro-migration for historical local-id atoms.
- Do not add metadata keys beyond `origin_url`, change `repo_root` capture, add observability scaffolding, add config flags, or change surfaces.
- Do not edit `wiki/**`, founder-owned status/backlog docs, backlog item bodies, or files outside the spec's `files_to_modify` list except builder-protocol lifecycle artifacts.

## canonical_anchors
- spec: backlog/claimed/2026-06-06-095-canonical-repo-identity.md
- reviews: backlog/reviews/2026-06-06-095-canonical-repo-identity/
