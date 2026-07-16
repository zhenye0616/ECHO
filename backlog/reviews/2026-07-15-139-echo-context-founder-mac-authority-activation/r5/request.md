---
item_id: 2026-07-15-139-echo-context-founder-mac-authority-activation
round: 5
spec_commit_sha: 2bdfbf45e7eb107841d5a1a16a897bd1b952b8ff
artifact_path: backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md
class: structural-reform
requested_at: '2026-07-16T04:03:40Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8fe84fae-b1e5-4666-930a-f144dcb47747
focus_hints: "Verify the r4 propagation-completion pass at the new spec SHA: (1) AC1/Tests\
  \ \u2014 suite paths are clone-relative with realpath confinement evidence (runner\
  \ cwd, entrypoints, module resolution inside the pinned clone root) and no /Users/zhenye/Desktop\
  \ literal remains as a satisfying path; (2) AC8/AC10 \u2014 committed row's closed\
  \ field set is complete and reason-free, counts are typed per-row deltas, unknown-field/value\
  \ rejection is falsifiable; (3) AC10 \u2014 the (generation, LA date, adapter, plan\
  \ slot index) key plus mechanically derived expected set is internally consistent\
  \ including disabled-approved slots, and the seven-complete-LA-civil-days window\
  \ (midnight start/close, DST-as-one-day, reset-to-next-midnight, freeze no earlier\
  \ than close) is unambiguous; (4) AC6/AC9 \u2014 persistent disable + plist relocation\
  \ + bootstrap probe close the login/KeepAlive reload path, and the rolled-back start\
  \ path is fenced-rollback-full-only with no unfenced package/plist reinstall; (5)\
  \ AC7 \u2014 the drift-aware abort is a consumption requirement on item 138's landed\
  \ controller step with a stop-and-new-source-item gate, not rewire choreography\
  \ owned by 139; flag if that requirement exceeds what 138's contract can own."
---

# What to review

Read `backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md` at commit `2bdfbf45e7eb107841d5a1a16a897bd1b952b8ff`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
