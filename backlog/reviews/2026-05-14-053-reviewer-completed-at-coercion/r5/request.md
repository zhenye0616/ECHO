---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
round: 5
spec_commit_sha: c8fe2cc743c59c59b06c6e31aa18b47941e97823
artifact_path: backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md
class: narrow
requested_at: '2026-05-15T08:47:21Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: Verify the AC3.2 'no quarantine triggered' assertion now anchors on the
  helper's REAL mechanism (<reviewer>.md.invalid.<ISO-ts> sibling files + VALIDATION-FAIL
  row in raw/internal/queue-errors.md), not the non-existent raw/internal/quarantine/
  directory. Verify the Node execFileSync alternative is copyable as written (two-arg
  form with command + argv, os.homedir() not literal ~, status+signal+40-hex assertions
  specified). Flag if any remaining AC3.2 mechanic still depends on a helper behavior
  that doesn't match what commit-reviewer-response.sh / push-with-retry.sh / combine.py
  actually do today.
---

# What to review

Read `backlog/ready/2026-05-14-053-reviewer-completed-at-coercion.md` at commit `c8fe2cc743c59c59b06c6e31aa18b47941e97823`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
