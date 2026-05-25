---
item_id: 2026-05-25-070-echo-global-home-scaffold
round: 1
spec_commit_sha: d4c0ad79428ef4d330c3cb61646804a494040156
artifact_path: backlog/ready/2026-05-25-070-echo-global-home-scaffold.md
class: narrow
requested_at: '2026-05-25T22:37:32Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 33af6e53-8d6c-4b7d-853e-361a8bf59f2a
focus_hints: "070 is the foundation spec for ECHO Pro's coord layer ~/.echo/ tree.\
  \ Verify: (1) AC1 path module canonical-ownership invariant \u2014 paths.ts is the\
  \ sole module knowing the ~/.echo/ layout; no other module reconstructs paths; (2)\
  \ AC2 ensureEchoHome() idempotency \u2014 second call must not rewrite existing\
  \ state files; load-bearing for daemon-restart-doesn't-clobber-wizard-progress;\
  \ (3) AC3 daemon integration ordering \u2014 ensureEchoHome() called after PID lock,\
  \ before extractors+MCP server; failure is non-fatal log+continue; (4) AC4 schema\
  \ validators \u2014 Ajv-compiled at module load, no I/O, OnboardedAgentProfile name\
  \ deliberately distinct from 072's AdapterSyncProfile (collision-avoidance is load-bearing\
  \ per cross-spec review); (5) AC5 ECHO_HOME env override honors isNonEmptyString\
  \ guard, path.resolve, no string concat with '/'; (6) Cross-spec consistency: skills/\
  \ + roles/ population ownership now lives in 072 (070 only creates empty dirs);\
  \ types.ts ownership clarified vs 072. Ops lens: module-load cost bounded (no I/O\
  \ at import), mkdirSync(recursive:true) safe across concurrent daemon starts, write-only-if-absent\
  \ invariant survives interrupted writes (no half-written state files)."
---

# What to review

Read `backlog/ready/2026-05-25-070-echo-global-home-scaffold.md` at commit `d4c0ad79428ef4d330c3cb61646804a494040156`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
