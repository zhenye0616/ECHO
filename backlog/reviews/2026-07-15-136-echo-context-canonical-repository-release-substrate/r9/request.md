---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 9
spec_commit_sha: 19449fd0c8a57f132ad11e87a786ef36ae12d450
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T05:08:00Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7077139f-bbc9-4417-8798-dff99d14dc26
focus_hints: "Verify the r8 correction patches: tag-before-draft AC6 write sequence\
  \ (annotated tag pushed and verified \u2014 ref \u2192 tag object \u2192 peeled\
  \ approved source SHA + exact annotation \u2014 before any draft; draft references\
  \ the existing tag, target_commitish never source authority; draft readback proves\
  \ the tag was not replaced/retargeted/mutated; lone-tag/tag-plus-draft ambiguity\
  \ fail-stop with founder cleanup and fresh empty-namespace re-entry; lost-response\
  \ and release-identity fixtures reordered); successor provenance/runtime-inventory.v2.json\
  \ with immutable v1 bytes and v2-bound generator/verifier/tests; release-mode --source-sha/--version\
  \ three-way cross-check (approved tuple vs authenticated manifest vs checkout/package\
  \ identity) with wrong-source/wrong-version fixtures; build:artifact machine-readable\
  \ manifest_hash=<hex> stdout/job-output carrier consumed by source-mode acceptance;\
  \ exact main-only environment policy pin (protected_branches=false, custom_branch_policies=true,\
  \ fully paginated policy set exactly {main}); deterministic echo-context-<version>-release\
  \ ZIP workflow-artifact identity and raw-ZIP digest; secret-literal non-disclosure\
  \ fixture and bootstrap binding as migration evidence; Tests bullet alignment for\
  \ all of the above."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `19449fd0c8a57f132ad11e87a786ef36ae12d450`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
