---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 4
spec_commit_sha: adb9000e3eeb27cfb5ee1c8725604bdbdafa4d69
artifact_path: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md
class: narrow
requested_at: '2026-05-14T22:46:14Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "R4 is FINAL VERIFICATION on a converged-shape cycle. R3 was the convergence\
  \ inflection \u2014 both reviewers proceed*; R3 R2 simplification was accepted by\
  \ codex-ops explicitly ('not re-opening the deferred followups'); finding trajectory\
  \ R1=8 \u2192 R2=7 \u2192 R3=4 strictly decreasing. R3 disposition at adb9000 applied\
  \ 4 mechanical fixes: (1) removed stale tools/review-queue/_lib.py from files_to_modify;\
  \ (2) scoped AC1 wrapper to headless reviewers only (cursor via AC4 prose only \u2014\
  \ IDE-mode); (3) added pre-commit re-fetch + no-op-on-overlap guard to AC1 step\
  \ 5 covering same-reviewer launchd overlap (R3 codex-ops F1); (4) made journal commit\
  \ ordering explicit \u2014 push BEFORE cleanup trap (R3 codex-ops F2). Added 6 reviewer\
  \ skill files to files_to_modify (skills/review-queue-{codex,codex-ops,cursor}.md\
  \ + their .claude/commands mirrors) so the guards land in prompt prose. Verify mechanically:\
  \ (a) the 4 fix sites are correctly patched and self-consistent; (b) no new structural\
  \ surface introduced (the disposition was prose-tightening, not adding ACs); (c)\
  \ AC1 step 5 same-reviewer-overlap-no-op is implementable (the re-fetch + check\
  \ is ~3 lines); (d) AC1 step 5 journal-before-cleanup ordering is unambiguous to\
  \ the builder; (e) the headless-vs-IDE wrapper split is internally consistent across\
  \ AC1 + AC4. CONVERGENCE TARGET: 0-2 LOW or nit findings \u2192 declare CLAIM-READY.\
  \ If R4 surfaces a NEW HIGH or MED on the original spec (not on R3 disposition),\
  \ that's a sign we missed something architectural; otherwise CLAIM-READY at R4."
---

# What to review

Read `backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` at commit `adb9000e3eeb27cfb5ee1c8725604bdbdafa4d69`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
