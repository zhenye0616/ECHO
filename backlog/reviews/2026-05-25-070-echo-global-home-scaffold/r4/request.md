---
item_id: 2026-05-25-070-echo-global-home-scaffold
round: 4
spec_commit_sha: f2edac95807666bef63657bcc72a5a74782cc74f
artifact_path: backlog/ready/2026-05-25-070-echo-global-home-scaffold.md
class: narrow
requested_at: '2026-05-25T23:08:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3f22dc55-5f42-4471-bea6-fa3334f32f39
focus_hints: "r3 verification round \u2014 single mechanical wording softening. r2\
  \ expanded Test 3 to claim it pinned the AC2.2 EEXIST handler; codex r3 correctly\
  \ flagged that a check-then-write impl would also pass Test 3 (never enters wx code\
  \ path). r3 patch: soften Test 3 wording to honest scope. Test 3 now pins existing-file\
  \ preservation only. The literal wx requirement is enforced by PR-time implementation\
  \ review. The OS-level O_EXCL cross-process race is exercised in production rather\
  \ than unit-tested. Verify line ~193 is now honest about what Test 3 does and doesn't\
  \ pin. codex-ops r3 was already clean proceed/zero findings \u2014 expecting r4\
  \ to converge to terminal."
---

# What to review

Read `backlog/ready/2026-05-25-070-echo-global-home-scaffold.md` at commit `f2edac95807666bef63657bcc72a5a74782cc74f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
