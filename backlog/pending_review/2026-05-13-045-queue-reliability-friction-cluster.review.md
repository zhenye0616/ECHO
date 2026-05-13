---
item_id: 2026-05-13-045-queue-reliability-friction-cluster
verdict: merge with founder fixups
reviewed_at: 2026-05-13T23:50:00Z
test_counts: { passed: 835, failed: 0, skipped: 21 }
---

## Verdict

Ground-truth check passed (worktree HEAD = `1e7c3ef`, matches recorded `head_sha`). All 6 ACs + 11 named sub-cases implemented to spec. `npm run lint` + `npm run typecheck` + `npm test` all clean — 835 pass / 0 fail / 21 skipped. **AC3 closes the 3-cycle orphan-cleanup deferral** (`tests/review-queue/concurrency.test.ts:128`) — no more pre-existing failure carried forward in future verify steps. No out-of-scope drift; all 11 modified files map to spec_refs or new AC-required tests.

**One mandatory pre-merge fixup** stems from the mid-cycle skills relocation (main `6d29f51`, landed AFTER 045 was claimed at `1ac85f3` but BEFORE this review). The builder couldn't have anticipated it. The fix is mechanical (1-line bash loop): copy builder's `.claude/commands/<name>.md` edits over to `skills/<name>.md`, then re-sync. Branch and main touch disjoint paths so `git merge --no-ff` will succeed cleanly — but the post-merge state has 6 adapter-vs-canonical drift pairs that `tools/sync-skills.sh --check` would reject. Fixup makes them match before the merge commit lands.

## Pre-merge fixups

- [ ] **Skills-relocation migration (HEADLINE).** After `git merge --no-ff agent/queue-reliability-friction-cluster` succeeds (no textual conflicts expected), before C8 commits the merge, run:
  ```bash
  for f in .claude/commands/merge-and-cleanup.md \
           .claude/commands/review-pending.md \
           .claude/commands/review-queue-codex.md \
           .claude/commands/review-queue-cursor.md \
           .claude/commands/review-queue-codex-ops.md \
           .claude/commands/review-queue-watch.md; do
    base=$(basename "$f")
    cp "$f" "skills/$base"
  done
  tools/sync-skills.sh --check    # MUST exit 0 now
  git add skills/
  ```
  Rationale: the builder's `.claude/commands/<name>.md` edits are strictly newer than `skills/<name>.md` (the relocation captured pre-builder content). Migrating them to canonical preserves the builder's work AND restores the sync-invariant the new architecture depends on.

- [ ] **(Skip — already done.)** Subagent noted a "builder-flagged stash" fixup: the agent_notes reference a stash titled `"process-backlog 045: stashing pre-existing strategist skills/ rename WIP"` that captured the strategist's skills-relocation WIP. **That stash was already popped + committed as `6d29f51` and the stash entry was dropped** during the relocation work (`git stash list` confirms only the older 043-era stashes remain). No action needed.

## Expected merge conflicts

None — main's relocation (`skills/`, `tools/sync-skills.sh`, decision note, CLAUDE.md subsection) and the builder's branch (`.claude/commands/*`, new helper, install script, new tests, concurrency test fix) touch disjoint paths. `git merge --no-ff` will produce a clean ort-strategy merge.

## Follow-up items (defer, do not block merge)

1. **`/merge-and-cleanup` C5 verify should add `tools/sync-skills.sh --check`** — adding it to the verify step would catch any future adapter-vs-canonical drift mechanically at every merge, not just at strategist-discovery time. Likely a tiny dedicated spec OR rolls into the same pre-commit hook follow-up named in `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`. Both can ship together. Recommend filing as 046 candidate.

2. **Code-style nit:** `tools/review-queue/validate_response_yaml.py:91` uses `__import__("os").environ` instead of a top-level `import os` + `os.environ`. Functionally fine; stylistic. Non-blocking; defer.

## Acceptance status (summary)

| AC | Status | Key evidence |
|---|---|---|
| AC1 pre-link YAML gate (a/b/c helper + grep + d clean-tree) | Met | `tools/review-queue/validate_response_yaml.py` exists + executable; reviewer prompts call it; `045-pre-link-yaml-validation.test.ts` 5/5 green; AC1d uses `git diff --exit-code` + staged-blob SHA |
| AC2 smoke gate fail-closed + test isolation | Met | `_install_reviewer_launchd.sh:34-71` smoke check before plist write; `045-smoke-gate-fail-closed.test.ts` 3 cases (temp HOME + stub launchctl/sw_vers/id) all green |
| AC3 orphan-cleanup test fix | Met | `concurrency.test.ts:128-147` Option-A `--now=` flag; **3-cycle deferral closed** |
| AC4 prose alignment | Met | `review-queue-watch.md:38` references the emitter literal `combine.py:684` verbatim |
| AC5a worktree cleanup (4-cond guard + rm -rf node_modules) | Met | `merge-and-cleanup.md:223-230` |
| AC5b post-mv stage | Met | `merge-and-cleanup.md:187-194` stage-before-mv preferred form |
| AC6 sidecar handoff (description + intro + Step E + per-sidecar push-with-retry) | Met | `review-pending.md:2, 7, 106-120, 151` |

## Test verification

- `npm run lint`: clean
- `npm run typecheck`: clean
- `npm test`: 835/856 pass / 0 fail / 21 skipped, 58 test files
- `concurrency.test.ts:128` orphan-cleanup — **NOW PASSING** (closes the deferral that's been carried in every cycle since before 042)

## Subagent reference

Full review available via SendMessage to agent `a6e958b17c98f7397` if needed.
