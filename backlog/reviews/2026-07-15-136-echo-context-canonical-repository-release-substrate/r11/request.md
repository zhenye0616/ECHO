---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 11
spec_commit_sha: 1c7e894c14541db6b46be7d38cc5a42174d0bb11
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T06:00:04Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 356ed3ab-dcf0-4384-93cd-035ff6ee8d5a
focus_hints: "Verify the R10 founder-decision (option B) substrate rewrite + rider\
  \ patches: (1) destination namespace/readback as the SOLE durable mutation authority\
  \ \u2014 run-log intent markers downgraded to best-effort non-authoritative diagnostics\
  \ (presence proves nothing, absence proves nothing, log content never authorizes\
  \ continuation/recovery/attribution); (2) response-plus-readback gating \u2014 each\
  \ next external write permitted only after the previous call returned unambiguously\
  \ successful AND authenticated exact readback verified the expected object/bytes/digest/flags;\
  \ (3) lost/ambiguous response, failed/ambiguous readback, cancellation, or runner\
  \ loss => read-only reconciliation only, then nonzero failed stop for founder disposition\
  \ with zero later writes/retries/repeats/deletions/cleanup/adoption; (4) fresh dispatch\
  \ manual + founder-dispositioned, re-entering only through complete authenticated\
  \ fully paginated empty-namespace preflight, with tag-only, draft, partial-assets,\
  \ and apparently-complete-release states all blocking; (5) replaced Tests fixtures\
  \ \u2014 response+readback gating, log-loss independence, injected timeout/death/readback-failure\
  \ at every mutation boundary, zero-later-write assertions, cold recovery over empty/tag-only/tag-plus-draft/partial-assets/apparently-complete\
  \ namespaces, read-only reconciliation, no auto-adopt/auto-cleanup; (6) explicit\
  \ git push --porcelain --force-with-lease on BOTH the AC1 prepared main push and\
  \ the AC6 tag push, with fixtures rejecting invocations lacking --porcelain; (7)\
  \ pre-push annotated-tag-object verification (peeled commit + annotation bytes vs\
  \ oracle), immutable TAG_OBJECT_OID captured and used as the push refspec source\
  \ (never the mutable local refs/tags/v<version>), local-ref-retarget race fixture,\
  \ and post-push remote readback binding the remote ref to exactly TAG_OBJECT_OID;\
  \ (8) exact trace enumerating marker/diagnostic -> write -> authenticated readback\
  \ separately for each of the three named assets in fixed order, with any per-asset\
  \ readback failure stopping every later asset/publish write; (9) first-release-only\
  \ empty-namespace, strict no-retry/no-adoption/no-auto-cleanup architecture and\
  \ no-build scope preserved unchanged."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `1c7e894c14541db6b46be7d38cc5a42174d0bb11`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
