---
item_id: 2026-07-04-115-station-2-contract-pinning
round: 2
spec_commit_sha: 58da7523c2723e60b2a0132c9528c8f6fb2de68f
artifact_path: backlog/proposed/2026-07-04-115-station-2-contract-pinning.md
class: narrow
requested_at: '2026-07-05T00:34:37Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3bad8076-9fb9-4fad-aa5c-76ac12eab9e3
focus_hints: "Verify the five r1 patches at the patched spec SHA: (a) premise-corrected\
  \ AC1/AC2 \u2014 helper composes the EXISTING resolveCurrentGranolaSignalRuns (granola-signals.ts:479),\
  \ resolver-unchanged is an Out-of-Scope invariant; (b) retry-orphan ManifestFailOnceStorage\
  \ fixture exercised by BOTH helper unit test and tool-path parity test; (c) AC3\
  \ counter keys complete vs actual buildRawGranolaNotes skip paths; (d) AC5 zero-snapshot-delta\
  \ consistent with no-new-file; (e) malformed-chain semantics match superseded-set\
  \ construction"
---

# What to review

Read `backlog/proposed/2026-07-04-115-station-2-contract-pinning.md` at commit `58da7523c2723e60b2a0132c9528c8f6fb2de68f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
