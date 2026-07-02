---
item_id: 2026-07-01-109-granola-meeting-intake-bridge
verdict: merge with founder fixups
reviewed_at: '2026-07-02T04:08:25Z'
test_counts:
  passed: 1870
  failed: 4
producer: review-pending-orchestrator
---
## Verdict
Independent review (Claude reviewer subagent; did NOT write the code) verdict: merge with founder fixups. Ground-truth HEAD matches recorded head_sha 4838674c. All six ACs Met with file:line evidence (candidate extraction w/ external-attendee join + cap; durable seed state machine w/ single-flight claim + fail-closed presence config; four-check seed acceptance w/ write-before-ack and event-ids coupled to the draft write, all negatives tested; 108 gate unmodified; meeting provenance in issue body; off-by-default guardrails + dismissal candidate-key + runbook smoke). Drift: none — no Linear read, no auto-create, capture untouched, no HTTP listener, diff is exactly the 13 specified files. Merge preview clean: fork point c5389953, main moved only by the handoff commit (zero path overlap); intake-hardening 5a008bfd verified as branch ancestor. Full suite in worktree 1870 passed / 4 failed: packed-manifest (expected snapshot ripple, delta verified as exactly the 4 new dist/enrich lines), shell-reachable (documented pre-existing main failure), recent-calls-endpoint + ceo-slack-brain kill-timeout (verified passing 20/20 in isolation; load flakes). Typecheck + lint clean.

## Pre-merge fixups
- [ ] Regenerate the packaging snapshot: `npx vitest -u tests/packaging/packed-manifest.test.ts` then re-run it green — pre-authorized 106-style fixup; the delta is exactly the 4 new dist/enrich/granola-intake-* entries (outside builder files_to_modify per drift rule)

## Expected merge conflicts
- none — legacy merge-tree shows content-clean merge; only commit on main since fork (83e9a184) touches backlog/ + agent-runs/ paths disjoint from the branch

## Follow-up items (defer, do not block merge)
- Store-driven retry for non-terminal seed records: retries currently depend on the classifier re-emitting the same candidate within the lookback; a transient Slack failure + classifier drop can stall a pending record forever (granola-intake-candidates.ts:388-467). Drive retries from seedStore.list() directly. Fast-follow before real traffic.
- Skip re-classification for notes whose candidate keys are all terminal — every 10-min pass currently re-runs the brain on every external note in the lookback (~1000 LLM calls/note/week).
- Extend the planned 108 packaging fix to the new dist/enrich -> dist/surfaces/ceo-slack-responder import chain (same ERR_MODULE_NOT_FOUND class as shell-reachable; masked on main, live checkout unaffected).
- Wrap ECHO_GRANOLA_INTAKE_OWNER_MAP parse errors as GranolaIntakeConfigError so a JSON typo cannot crash the whole daemon at startup (granola-intake-candidates.ts:165-179, daemon/index.ts:93).
- Minor: accepted-seed-but-Linear-unconfigured only log.debug (responder.ts:806-813); nondeterministic owner pick when multiple attendees map (:340-349).
