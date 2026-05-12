---
item_id: 2026-05-12-041-reviewer-background-execution
round: 2
spec_commit_sha: 59bcdc1c8b9c1e35607f0387c7489afbae52a5ea
artifact_path: backlog/ready/2026-05-12-041-reviewer-background-execution.md
class: narrow
requested_at: '2026-05-12T21:34:06Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify R1 patches landed: (a) AC1 ECHO_REVIEW_QUEUE_REPO_ROOT env var\
  \ contract \u2014 normative variable name, default = HOME/Desktop/Project_echo,\
  \ launchd omits, smoke sets; wrapper derives cwd + invocation from it; (b) AC2 plist\
  \ StandardOutPath/StandardErrorPath \u2192 /dev/null (AC1 wrapper owns unified logging);\
  \ macOS-version-gated bootstrap/bootout vs load/unload pulled into AC2 itself as\
  \ normative (not hints-only); smoke fires via 'launchctl kickstart -k' (NOT bootstrap\
  \ alone, since RunAtLoad: false); (c) AC4 validation-failure MV-aside to <reviewer>.md.invalid.<ISO-ts>\
  \ + queue-errors.md row \u2014 closes Codex R1 H1 unattended-retry deadlock; verify\
  \ canonical filename absent \u2192 next reviewer tick's polling step finds nothing\
  \ \u2192 regenerate fires; (d) AC5 isolated tmp work + LOCAL BARE ORIGIN; pinned\
  \ synthetic item_id 2026-05-12-999-smoke-test-synthetic; backlog/ready/<item_id>.md\
  \ stub for find_artifact() (mirrors 040 R2 fixture preamble fix); assertions include\
  \ real-GitHub-origin-unchanged sanity check; (e) Test list scalar removed; '+1 vs\
  \ baseline' + concurrency:133 pre-existing red, full-suite NOT acceptance. Five\
  \ load-bearing patches; one fold; one combine.py-fold correction (C2b). Check for\
  \ second-order gaps: does AC5's local bare origin pattern interact correctly with\
  \ push-with-retry.sh's pull-rebase retry semantics? Does AC4's MV-aside leave any\
  \ window where the canonical filename briefly exists between validation failure\
  \ and the rename (atomicity)? Does the AC1 env var contract handle the case where\
  \ ECHO_REVIEW_QUEUE_REPO_ROOT is set to a path that doesn't exist? AC6 + AC7 + AC8\
  \ unchanged from R1 \u2014 only verify they remain coherent with the patches above."
---

# What to review

Read `backlog/ready/2026-05-12-041-reviewer-background-execution.md` at commit `59bcdc1c8b9c1e35607f0387c7489afbae52a5ea`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
