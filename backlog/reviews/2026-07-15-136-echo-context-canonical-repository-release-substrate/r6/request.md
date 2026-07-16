---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 6
spec_commit_sha: 3d74d33bdf0a3bd81c409478b83b3702d4704c67
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T03:44:31Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 932c08ad-d73d-4c24-9118-c61b1537ced0
focus_hints: "Verify the r5 fail-closed structural cut: fixed release identity/flags\
  \ (tag ref refs/tags/v<version> at approved source SHA, draft:true staging, prerelease:true\
  \ + make_latest:false at publish, flags verified in readbacks); ownership marker,\
  \ deterministic tag-object SHA, ambiguous-write resume, and automated cleanup all\
  \ removed \u2014 fail-stop no-delete after any lost/ambiguous write with founder\
  \ manual disposition and fresh-dispatch re-entry via the empty-namespace rule; dispatch\
  \ inputs reduced to source SHA + version + expected lock hash (manifest hash computed\
  \ once in build-artifact, bound by nine-field tuple approval, no pre-dispatch build);\
  \ run_attempt==1 rerun rejection; fully paginated exact-set final postcondition\
  \ (one expected tag, one published prerelease, exactly three matching assets, nothing\
  \ else); Tests bullet alignment (release-identity, fail-stop, final-postcondition,\
  \ rerun-rejection fixtures; wrong-expected-manifest-hash fixture removed)."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `3d74d33bdf0a3bd81c409478b83b3702d4704c67`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
