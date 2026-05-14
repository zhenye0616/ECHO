---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
round: 2
spec_commit_sha: aa1023ca95c9f5ae2f714e052731c22929d68e92
artifact_path: backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md
class: structural-reform
requested_at: '2026-05-14T00:40:52Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "R1: codex pushback (1H+3M), codex-ops pushback (2H+3M); strategist accepted\
  \ all 9 findings with inline patches at commit aa1023c. See r1/combined.md for the\
  \ full disposition table.\n\nR2 focused re-review areas (priority):\n1. AC4 `ref?`\
  \ parameter contract \u2014 get_role_state and list_task_states now read exclusively\
  \ via `git show <ref>:<path>` (no working-tree reads in V1); when ref is omitted,\
  \ MCP resolves to HEAD at call time and echoes resolved SHA. Verify implementability\
  \ + test coverage. (codex lens \u2014 closes R1 codex F1 + codex-ops F6.)\n2. AC4\
  \ repo-root resolution \u2014 `startMcpServer({ repo_root })` > `ECHO_REPO_ROOT`\
  \ env > `cwd()` fallback; resolved at server-start (no per-call cwd reads). Verify\
  \ test isolation contract is sufficient. (codex + codex-ops \u2014 closes R1 codex\
  \ F4.)\n3. AC1 round-state.md write protocol \u2014 watcher owns boundary rewrites;\
  \ strategist between-round edits use freshness-check (read SHA \u2192 write \u2192\
  \ abort + queue-errors.md on stale); atomic FS via os.replace. Verify the freshness-check\
  \ has no narrow TOCTOU race window (read-SHA vs commit-SHA) under concurrent strategist+watcher\
  \ writes. (codex-ops ops lens \u2014 closes R1 codex-ops F7.)\n4. AC3 hard-fail\
  \ lint upgrade \u2014 REVIEWER_FRESH_EYES_VIOLATION in validate.py for any reviewer\
  \ response referencing task_state_ref / backlog/task-state / task-state/<id>/<role>.md.\
  \ Verify string-match precision: should NOT false-positive on legitimate cross-references\
  \ (e.g., a reviewer finding's prose mentioning the pointer file path as a critique\
  \ target). (codex implementability \u2014 closes R1 codex-ops F8.)\n5. AC8 pre-merge\
  \ / post-merge split \u2014 Definition of Done updated; 1-week A/B measurement moved\
  \ to After Completion #4. Verify no remaining deadlock between merge-time requirements\
  \ and post-merge observations. (codex-ops ops lens \u2014 closes R1 codex-ops F9.)\n\
  \nQuick re-read sufficient for AC2 (lint test e flip), AC5 (ref-pinned byte-identity),\
  \ AC7 (reviewer exclusion + counter-example), AC1 canonical_anchors syntax pin (mechanical\
  \ pin + test).\n\nTarget: R2 convergence (both reviewers `proceed` or `proceed_after_patches`\
  \ with only LOW findings). Same roster [codex, codex-ops]. Cursor not on roster\
  \ \u2014 Cursor's lens not load-bearing for this spec (no IDE-side work)."
---

# What to review

Read `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at commit `aa1023ca95c9f5ae2f714e052731c22929d68e92`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
