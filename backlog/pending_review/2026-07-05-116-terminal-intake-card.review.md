---
item_id: 2026-07-05-116-terminal-intake-card
verdict: merge as-is
reviewed_at: '2026-07-05T23:57:40Z'
test_counts:
  passed: 1970
  failed: 2
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground truth passed (worktree HEAD = recorded head_sha 5c3ae4cd7008c2016a32af31df6578af68901bba, tree clean). All six ACs Met with file:line evidence; diff is exactly the three declared files (tools/intake-terminal.ts, tests/tools/intake-terminal.test.ts, package.json +1 script; 827 insertions, zero deletions) with ZERO src/enrich/** changes and no out-of-scope drift. Both agent-flagged design choices judged STAND: (a) subject = request ?? clientProject ?? meeting title is forced — SeedMarker provenance genuinely does not carry canonical_subject across the postSeed seam; (b) --once real path via startGranolaIntakeBridge(runOnStart:false).run() is correct since the brain-classifier factory is module-private and duplicating it would violate AC1. Targeted tests 8/8, typecheck clean, lint clean. Full suite 1970 passed / 2 failed — BOTH failures are pre-existing load flakes in files this diff does not touch (tests/cli/shell-reachable.test.ts, the documented flake; plus tests/surfaces/ceo-slack-brain.test.ts pid-file race, NOT previously documented) and both pass in isolation on re-run. Note: agent_notes claimed 1 full-suite failure; observed 2 — the delta is the undocumented ceo-slack-brain flake, not a regression from this branch.

## Pre-merge fixups
- [ ] (none — reviewer found no pre-merge fixups; merge as-is)

## Expected merge conflicts
- (none expected) — main at 13d777eb has zero commits since merge-base 2fd8d1a7 touching package.json, tools/, or tests/tools/ (verified via git log); both new files absent on main; package.json script insertion is in a region unmodified on main.

## Follow-up items (defer, do not block merge)
- Watch-mode dead handle: neither startIntakeTerminalWatch nor main checks handle.enabled in --watch (tools/intake-terminal.ts:384-395,498-504); a disabled no-op handle idles forever with only a JSON log.error hint. Check handle.enabled and exit 1 with a message.
- Real-path status line always reports "0 classifier errors" (tools/intake-terminal.ts:294,326) — the counting wrapper cannot wrap the bridge-internal classifier; drop the field on that path or plumb it later.
- Invalid brain-name env (e.g. ECHO_CEO_BRAIN=foo) exits via main().catch with a bare stderr message instead of the "skipped:" status-line format (tools/intake-terminal.ts:300,358).
- Enrich JSON logs interleave with cards on stdout — consider diverting to stderr for demo cleanliness; pair with item 117 observability.
- Track the undocumented ceo-slack-brain pid-file load-flake (tests/surfaces/ceo-slack-brain.test.ts "kills a timed-out brain process group", ENOENT descendant.pid under suite load; 18/18 in isolation).
