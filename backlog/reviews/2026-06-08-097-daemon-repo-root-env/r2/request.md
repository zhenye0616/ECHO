---
item_id: 2026-06-08-097-daemon-repo-root-env
round: 2
spec_commit_sha: c80d3c582daf89e0419174b887d49da46a7261be
artifact_path: backlog/proposed/2026-06-08-097-daemon-repo-root-env.md
class: narrow
requested_at: '2026-06-08T21:12:36Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e1e4dbf7-d8b8-4f0f-8a48-387f8487e718
focus_hints: "r1: 4 MED all accepted, all proceed_after_patches. One harness-marker\
  \ guard (<root>/tools/review-queue/ must exist) resolves #1/#3/#4 + relative-path\
  \ resolution for #2. R2 verifies internal consistency: (a) ALL plist writes gated\
  \ on tools/review-queue/ existing; (b) failure split \u2014 explicit flag \u2192\
  \ exit non-zero + no plist, auto-derive \u2192 silent omit; (c) AC5 covers git-ENOENT-omit,\
  \ relative\u2192absolute, unrelated-repo-omit, explicit-bad-path\u2192non-zero.\
  \ Confirm no over-engineering (gate is literal tools/review-queue/, not a repo-identity\
  \ probe \u2014 see OoS). New HIGH or >=2 findings = re-escalate; 0 = claim-ready."
---

# What to review

Read `backlog/proposed/2026-06-08-097-daemon-repo-root-env.md` at commit `c80d3c582daf89e0419174b887d49da46a7261be`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
