---
item_id: 2026-07-09-130-decision-changeset-compiler-v0
verdict: redo before merge
reviewed_at: '2026-07-09T19:54:52Z'
test_counts:
  passed: 2102
  failed: 3
producer: review-pending-orchestrator
---
## Verdict
Redo before merge. The store/apply core is correct and well-tested (CAS, lease, fencing, line_key dedup, supersession all verified; typecheck+lint clean; merge-tree clean), but two blocking gaps: (1) dist/surfaces/ceo-slack-responder/decision-changeset.js is missing from package.json files allowlist, so the packaged daemon fails boot with ERR_MODULE_NOT_FOUND — single root cause of the 3 failing suites (shell-reachable + import-closure are non-tolerated per policy); (2) the produce leg is unwired: no runtime path creates a ChangesetDraft or posts the batch card from a Granola note — createChangesetDraftFromCards/postDecisionChangesetDraftCard have zero src call sites, so AC1 is met only by direct function invocation in tests, not by the running system. Consume side (buttons, edit replies) is wired. Reviewer-offered fork: if the founder rescopes the produce leg to a fast-follow item, only fixup 1 blocks — but as-specced AC1 belongs to 130.

## Pre-merge fixups
- [ ] Add "dist/surfaces/ceo-slack-responder/decision-changeset.js" to package.json files; re-run shell-reachable, import-closure, packaged-boot suites to green (package.json:files - one line)
- [ ] Wire the producer: confirmed meeting extraction routes createChangesetDraftFromCards -> postDecisionChangesetDraftCard -> markChangesetMessage in the Granola bridge; suppress per-decision seeds for meeting batches; add a test driving AC1 THROUGH the bridge, not by direct function calls

## Expected merge conflicts
- none - git merge-tree vs origin/main is clean; main moved only in backlog/reviews/**, the item file, and raw/internal/decisions/** since branch point

## Follow-up items (defer, do not block merge)
- Repost a fresh-revision card (or update button value) after an accepted edit - current UI dead-ends: edited draft has no confirmable button (stale revision on the original card)
- Add the two pinned close-marker state-matrix tests (already-closed+marker full no-op; marker+open skips comment but still closes) and a Promise.all concurrent-CAS test
- De-duplicate classifyDecisionType (verbatim copy in decision-changeset.ts:259 and granola-intake-candidates.ts:718)
