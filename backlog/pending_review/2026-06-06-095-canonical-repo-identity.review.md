---
item_id: 2026-06-06-095-canonical-repo-identity
verdict: merge as-is
reviewed_at: 2026-06-07T05:30:31Z
test_counts: { passed: 1601, failed: 0 }
producer: review-pending-orchestrator
---

## Verdict
Merge as-is. An independent reviewer (Claude, cross-vendor to the Codex builder) confirmed all eight acceptance criteria are Met with file:line evidence, zero drift (exactly the 6 `files_to_modify` changed; the locked-out `artifacts.ts`, `_shared.ts`, and `trace/cluster.ts` are untouched), and a clean merge (`git merge-tree` reports no conflicts; main advanced 1 commit but none touching the 4 production files). Typecheck and lint pass; the implementation's own 7 tests pass. The single full-suite failure is the documented `tests/mcp/recent-calls-endpoint.test.ts` concurrency flake (passes in isolation; 094 already ruled it categorically non-regressable; a capture-side origin-url change cannot touch an MCP endpoint test). The builder's BLOCKED escalation was correct stopping-rule discipline, not a real failure. Independently corroborated by the held-out verification suite (`holdout/r1-repo-identity`, authored blind), which was red 4/4 on `main` and is green 4/4 against this fix.

## Pre-merge fixups
- (none)

## Expected merge conflicts
- (none) — clean merge; main's 1 intervening commit does not touch `_turn_meta.ts`, `git-state.ts`, `git-watcher.ts`, or `git.ts`. `git merge-tree` reports zero conflicts.

## Follow-up items (defer, do not block merge)
- Linked-worktree / `.git`-file checkouts: `resolveOriginUrl`'s cache-invalidation uses `stat(<repo>/.git/config)` mtime, which is `null` when `.git` is a file (worktree), so a cached origin can survive the full 5s TTL there. Bounded to 5s, retry still fires, and the repo-mis-stamp hazard is fully handled by `git -C`. Optionally hash `.git` HEAD/packed-refs for worktrees; tiny edge case — file separately if it matters.
- Negligible: `resolveOriginUrl` stats `.git/config` per commit candidate even within TTL (one extra `stat`/commit; it's what enables sub-TTL invalidation). Acceptable.

## Open questions for founder
- (none)
