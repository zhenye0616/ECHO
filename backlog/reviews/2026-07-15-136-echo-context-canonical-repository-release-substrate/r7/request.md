---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 7
spec_commit_sha: d309cdebc804c2fd5aa924f14d4d7496358b0a0a
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T04:12:56Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1cf8e7be-61c4-4c1b-ace8-988b8885aabf
focus_hints: "Verify the r6 propagation-completion patches: layered rerun rejection\
  \ (permissions-empty rerun-guard job failing on run_attempt != 1, every other job\
  \ needs the guard + its own run_attempt == 1 condition \u2014 failed conclusion,\
  \ never all-skipped green); dispatch version input bound to package.json's version\
  \ at the approved source SHA before any upload/approval; manifest hash derived once\
  \ in build-artifact, every verifier recomputes canonical-JSON SHA-256; release identity\
  \ (draft target_commitish = approved source SHA, no implicit tag at draft, ref->tag-object->peeled-commit\
  \ readback, string make_latest \"false\" on the wire, not-latest via latest-release\
  \ lookup); artifact handoff (step-to-job outputs, actions: read, API/pinned-action\
  \ download by exact ID, run-ownership/name/expiry checks, raw-archive digest before\
  \ extraction); AC4/AC1 governance (exact PR+push-to-main trigger contract with pinned\
  \ check names, fetch-depth-0 + fail-closed shallow preflight, per-platform gitleaks\
  \ digest map, unmaskable nonzero scan exits); protected-environment API readback\
  \ (reviewer set exactly zhenye0616, prevent-self-review deliberately disabled, no\
  \ admin bypass, main-only) with fail-closed stop on unenforceable tiers; Tests bullet\
  \ alignment for all of the above."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `d309cdebc804c2fd5aa924f14d4d7496358b0a0a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
