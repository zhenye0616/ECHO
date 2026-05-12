---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 3
spec_commit_sha: 784698ff0742e1f3cd3dcf260261354706a11068
artifact_path: backlog/ready/2026-05-12-040-watcher-state-executable-test.md
class: narrow
requested_at: '2026-05-12T09:50:01Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify R2 dispositions landed: (a) AC3 fixture preamble now requires\
  \ tmpdir to contain backlog/ready/<item_id>.md stub so request.py find_artifact()\
  \ succeeds before r2/request.md is written; (b) AC1 idempotency clause weakened\
  \ from 'never reformats' to 'no unintended semantic edits on any other field; YAML\
  \ cosmetic reformat permitted but minimized' \u2014 reconciles AC1 with AC3 fixture\
  \ 1's 'YAML serializers may reformat' clause; (c) AC2 git block now shows two explicit\
  \ branch-specific variants \u2014 (b) adds combined.md + r{N+1}/request.md with\
  \ 'dispatch' messages, (a)/(c) adds combined.md only with 'terminal' messages \u2014\
  \ with commit + push messages branch-aligned (N vs N+1). Three patches; check for\
  \ any introduced second-order gap. AC6 still observational. If this is your second\
  \ pass with no new load-bearing findings, the right verdict is 'proceed' (claim-ready);\
  \ if you find load-bearing issues, 'proceed_after_patches'; if all findings are\
  \ deferred to follow-ups, 'pushback' with explicit followup pointers (case (a) terminal)."
---

# What to review

Read `backlog/ready/2026-05-12-040-watcher-state-executable-test.md` at commit `784698ff0742e1f3cd3dcf260261354706a11068`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
