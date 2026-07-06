---
item_id: 2026-07-06-118-drift-join-nomination
verdict: merge as-is
reviewed_at: '2026-07-06T03:19:30Z'
test_counts:
  passed: 1767
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches rebased head_sha (07ad880a, single commit atop origin/main containing 119+120). All 5 ACs Met: shared normalizer folds _/- separators with the 3 measured word-identical fixture pairs (subject.ts:20-22); extraction prompt pins space-separated-lowercase format (prompt-only, granola-signals.ts:868); AI-free Jaccard nominator (threshold 0.2, cap 5, named constants, no embeddings/LLM — seam decision 19 preserved) feeds the existing judge with unchanged budget/checkpoint/pair-key semantics; no-match observability counters in result+log plus deterministic drift_nomination_miss near-miss logging (the mechanism that makes 'misses become data' real); e2e tests cover the empirically-measured shapes incl. openai-sponsorship-vs-investment-terms nomination and retroactive snake_case decision joining. REBASE PRESERVATION verified by diff-trace: 120's retryable_failures/degraded/heartbeat and 119's typed rejection/retry_count/terminal-on-MAX semantics intact, deliverPair byte-identical, multi-nomination watermark/blockingSeqs interaction correct, no pair-key aliasing, over-cap drop per spec. Zero scope drift. Reviewer verification: typecheck clean, lint clean, test:product 1767 passed / 0 failed (36 drift tests with all three items' suites coexisting).

## Pre-merge fixups
- [ ] none — clean as-is

## Expected merge conflicts
- none expected: branch base 258b9527; origin/main advanced only by backlog/agent-run commits (117 adoption + 118 handoff), zero overlap with the 5 code files

## Follow-up items (defer, do not block merge)
- optional cosmetic: revert 4 incidental prettier reformats (metaString, resolveDriftBrainConfig, postDriftAlertCard, disabledHandle) to shrink the diff — behaviorally identical
- strategist-owned: wiki drift-alert page update (join is now nominate-then-confirm); collect the first week of statements_no_candidate near-miss logs as the alias-table decision input; re-run the drift path on real Granola meetings before the Jul 18 freeze
