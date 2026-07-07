---
item_id: 2026-07-06-122-live-loop-dashboard
verdict: merge as-is
reviewed_at: '2026-07-07T03:08:32Z'
test_counts:
  passed: 2052
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (1930df5c5bd2e5a81173d7b145a7dae8d59f83c0). All 5 ACs Met with file:line evidence: AC1 port precedence + fatal invalid-port + 121-identical entry guard; AC2 pinned /api/status shape, EXPECTED_WORKERS iteration, 10s throttle, single-flight with cold-join + 8s timeout, fail-soft never-500; AC3 self-contained page, stations 1/2/3/4/6, distinct status rendering; AC4 no-write test asserts db absent before AND after plus ECHO_HOME byte-identical over the REAL buildLoopReport; AC5 all 16 enumerated tests present and passing. Zero drift: exactly the 3 permitted surfaces (tools/loop-dashboard.ts, one package.json script line, tests/tools/**). Load-bearing design call verified at source: buildDoctorReport runs probeMcp (MCP initialize HTTP probe, doctor.ts:1231), a codex-adapter execFile child (:1253), and agent probes — all AC4 violations — so reusing buildLoopReport (which carries stations + serving identity + dist staleness, doctor.ts:1135-1196) is correct, not drift; station 6 correctly comes from the drift heartbeat. In-process-only (no child fallback) conforms to the r3-patched AC5 shipped-path scoping. The 1 recorded test failure is tests/cli/shell-reachable.test.ts, a pre-existing real-launchd daemon smoke that PASSES in isolation (1/1, 23.5s) — full-suite port/load contention, not a regression; this item touches nothing the CLI binary or daemon-install path imports. Lint and typecheck clean.

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: merge-tree reports 0 conflict markers against current main; main moved only 2 commits (backlog/journal files) with zero file overlap; package.json insertion context identical on both sides

## Follow-up items (defer, do not block merge)
- esc() the counters segment in heartbeatLine (tools/loop-dashboard.ts:585-586) for HTML-escaping consistency (cosmetic, localhost-only exposure)
- optional comment: a timed-out doctor computation is abandoned-not-cancelled (single-flight guards new starts, not stragglers)
- optional AC4 test variant with a PRESENT db (belt-and-braces; doctor's SELECT-only behavior already covered by 117 tests)
- flaky-under-load: tests/cli/shell-reachable.test.ts fails in full-suite runs on port contention while passing in isolation — recurring signal, consider serializing or porting off the fixed test port
