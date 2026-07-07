---
item_id: 2026-07-07-126-daemon-smoke-test-serialization
verdict: merge with founder fixups
reviewed_at: '2026-07-07T19:28:38Z'
test_counts:
  passed: 2096
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge with one trivial founder fixup (a stale comment word). Ground-truth HEAD matches (09ffcd4a5a69132f8bb8d319aa3028cc3303e3b0). All 4 ACs Met after a reviewer-driven fixup round that materially improved the item: the initial five-green evidence was contradicted by the reviewer's spot-check (residual stop→start flake), the builder's first patch still flaked once, and the ensuing diagnosis found the true root cause — launchd's async bootout racing a start retry into the loaded-but-unhealthy fast-fail path (verified at daemon.ts:857-874 vs restart():892-918). Final mechanism: race-safe bounded-retry install (daemon bind+health IS the port allocation signal; TOCTOU findFreePort removed), restart-on-retry for the stop→start step (every retry gets a real health window), 180s timeout justified by measured data (82s isolated / 136s under load — the reviewer's own 120s suggestion would have timed out), finally-guard proven structurally unable to touch the production daemon. AC2's ceo-slack-brain fix unchanged (timeout-vs-cold-start root cause documented in-file; kill semantics still genuinely exercised). AC3 re-proven: five consecutive fully-green npm run test (2096/0 each, shell-reachable stable 62-67s) + the reviewer's corroborating spot-check = 6/6 post-fixup. AC4 held throughout: zero product code; the blocking pre-existing defect was escalated and became item 128 rather than drift. Zero drift: the entire branch diff is the two spec-named test files. This item retires the flaky-test merge exemption (see After Completion).

## Pre-merge fixups
- [ ] tests/cli/shell-reachable.test.ts:162 — comment says "raised to 120s" but the value is 180_000; change the word to 180s (founder-delegate pre-approves applying this at C4; zero behavioral effect)

## Expected merge conflicts
- none: neither test file touched on main since merge-base; branch is test-files-only

## Follow-up items (defer, do not block merge)
- retire packaged-boot.test.ts's TOCTOU findFreePort the same way (already filed)
- coord-volume-perf load-tolerant budget (already filed)
- strategist: retire the flaky-test special-case from merger prompts per the item's After Completion — 126's fixes make shell-reachable/ceo-slack-brain failures REAL signals from now on
