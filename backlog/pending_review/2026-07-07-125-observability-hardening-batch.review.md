---
item_id: 2026-07-07-125-observability-hardening-batch
verdict: merge as-is
reviewed_at: '2026-07-07T07:58:19Z'
test_counts:
  passed: 2087
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (95afbf4ba1b19afc0dfe97550cdca69753666e92). All 6 ACs Met with file:line evidence: AC1 channel-aware seed-store resolution (terminal sentinel → .terminal.json) + --seed-store override + provenance-loss banner from the channel-resolved store, tested at unit/wiring/e2e levels; AC2 error handlers on BOTH proxy stream directions with the no-crash invariant genuinely asserted via process-level uncaughtException capture; AC3 sequential double-append guard with the concurrent case verifiably NOT built (documented blind spot per the locked scope); AC4 --note enumerates default+terminal stores; AC5 esc() on both key and value, abandoned-not-cancelled comment, REQUIRED present-db byte-identity test with WAL checkpointed before hashing. HARD CONSTRAINT diff-verified: zero changes to 123's persisted contracts. Zero drift: exactly the 7 files_to_modify paths. All three builder flags upheld: import-only intake-terminal dependency is safe (121's entry guard confirmed at source, intake-terminal.ts:532, byte-unmodified); the AC2 OR-assertion legitimately covers both contract branches; the source-scoped unbounded guard query is the correct correctness-over-bound call since dedupe_key is not in METADATA_MATCH_KEY_WHITELIST and widening it is out of scope. Merge preview clean incl. vs item 124's concurrent branch (zero file overlap: 124 touches the dashboard test, 125 the dashboard source; semantically compatible). Gate: 2087/2087 pass (both known flakes passed in-suite), lint + typecheck clean, reproduced by the reviewer.

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: zero commits on main touch the 7 diffed files since merge-base; zero overlap with 124's branch in either merge order

## Follow-up items (defer, do not block merge)
- optional: e2e --note test through runTraceCard without override to pin the enumerate wiring directly
- optional: revisit the AC3 guard query if card-atom volume ever makes the per-emit full-source scan matter
