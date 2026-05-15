---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
round: 3
spec_commit_sha: dc46e101a7bb8dea5d59c1c2eabe3964357c5c2a
artifact_path: backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md
class: narrow
requested_at: '2026-05-15T08:33:57Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Verify the 8-step hermetic test-repo setup in AC3.2 is complete (mktemp\
  \ + bare origin + -b main checkout + LOCAL git identity config + remote add + initial-commit-pushed-to-origin\
  \ + helpers copied + request.md placed) \u2014 no missing prerequisites for commit-reviewer-response.sh\
  \ + push-with-retry.sh in a cron/CI environment with no global identity. Verify\
  \ the pre-pipeline origin-URL assertion catches file:// and tmpdir variants while\
  \ rejecting ANY value containing github.com. Verify the production-repo guard's\
  \ try/finally/afterEach/trap-EXIT wrapper is REQUIRED (not just suggested) so it\
  \ fires on every exit path including mid-pipeline crash. Verify PROD_REMOTE_MAIN_PRE/POST\
  \ asserts byte-comparison against the REAL github.com refs/heads/main SHA, not against\
  \ a fixture-name pattern (push-with-retry.sh pushes origin main, not a fixture-named\
  \ branch). Flag if any remaining AC3.2 prose leaves a path that could leak writes\
  \ to the founder's real remote or depend on global machine state."
---

# What to review

Read `backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md` at commit `dc46e101a7bb8dea5d59c1c2eabe3964357c5c2a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
