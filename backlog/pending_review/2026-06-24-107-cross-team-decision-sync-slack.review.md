---
item_id: 2026-06-24-107-cross-team-decision-sync-slack
verdict: merge with founder fixups
reviewed_at: '2026-06-24T16:49:03Z'
test_counts:
  passed: 1785
  failed: 4
producer: review-pending-orchestrator
---
## Verdict
Independent review (Claude code-reviewer, ground-truth SHA 80a89966 matched). Implementation is faithful to AC1-AC6 and binding R1-R5: two-scope split enforced in code with src/capture/gate.ts UNTOUCHED (decision atoms append directly via isAllowedDerived, per the 106 precedent / founder Resolution A); single append-only responder-hosted decision store with the responder as sole writer; propose_decision MCP tool registered in server.ts with server-side identity attribution, startup-validated confirm-target, and missing-target -> error with NO draft; decision-layer-only read path (no raw-store route); dedupe_key + latest-wins + immutability; exactly-once/atomic/replay-safe confirm with concurrent + crash-after-write tests. typecheck, lint, and sync-skills --check all pass. No drift, no out-of-scope changes. Merge is clean (no conflicts). Blocker is TWO one-line existing-test fixups (builder flagged only one) plus confirmed genuine load/perf flakes.

## Pre-merge fixups
- [ ] `tests/mcp/tools/recent-work-context.test.ts:147` - add `'propose_decision'` to the expected sorted all-tools list (between `pending_decisions` and `search_memories`) and update the count/comment (fourteen -> fifteen). Builder-flagged; expected since the tool is correctly registered.
- [ ] `tests/mcp/recent-calls-endpoint.test.ts` (`minimalArgs` switch, ~line 70) - add `case 'propose_decision': return { subject: 'smoke', decision: 'smoke decision', source_app: 'codex' };` so the 'logs every runtime-registered tool' smoke loop does not hit `default:` and throw. REQUIRED and MISSED by the builder (it mis-bucketed this as a flake); it is deterministic and reproduces in isolation. No Slack env -> handler returns isError/status=error, which the test tolerates.

## Expected merge conflicts
- none - merge-base 8cd63423; main advanced only by the review-sidecar commit; `git diff --name-only` shows no overlap with this branch's edited files (sources.ts, server.ts, responder.ts, brain.ts, the two tests). Clean --no-ff merge expected.

## Follow-up items (defer, do not block merge)
- (optional, non-blocking) `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:95-102` - wrap the postDraftCard call to dismiss/mark the draft if the Slack post throws, avoiding an orphaned `pending` draft. Acceptable for n=2 (next `/echo decision` re-proposes).
- After merge: the 4 'flake' failures (coord-volume-perf timing, shell-reachable daemon-health, ceo-slack-brain, git-watcher descendant.pid ENOENT) all pass in isolation and exercise code byte-unchanged by this diff; verify the suite is green at merge time and treat any that persist as separate pre-existing-flake backlog items, not 107 blockers.
