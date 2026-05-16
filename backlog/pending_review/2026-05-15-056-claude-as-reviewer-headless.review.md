---
item_id: 2026-05-15-056-claude-as-reviewer-headless
verdict: merge with founder fixups
reviewed_at: 2026-05-16T04:19:45Z
test_counts: { passed: 986, skipped: 21, total: 1007, review_queue_subset: "136/136", lint: clean, typecheck: clean, note: "All counts observed under bash -lc; raw zsh produced shell-init artifact, not a code defect." }
---

## Verdict

`merge with founder fixups`. Implementation is high-quality: all 10 ACs met with strong test coverage (136/136 review-queue, 986/1007 overall, lint+typecheck clean). The load-bearing AC5 substrate change (vendor-agnostic `invoke_command` dispatch with shlex.quote → `bash -c`) is implemented cleanly with mode-conditional validation. The AC5-part-4 durable `queue_error.sh` works in both pre-spawn and per-round shapes. AC7b installer preflight fails-closed before plist writes. The only meaningful issue is the explicitly-flagged spec deviation around `--dangerously-skip-permissions`, which under the spec's own "MAY refine during build" clause is a stand — but the founder should consciously decide how the production launchd config will grant the necessary permissions before flipping `required: true`.

## Pre-merge fixups

- [ ] **Founder must acknowledge the `--dangerously-skip-permissions` deviation in the merge commit body (or merge message).** The agent's harness blocked writing the permission-bypass flag; reviewers.json currently has `claude -p < {{PROMPT}}` instead of the spec's literal. Under the spec's "MAY refine during build" clause this is a stand, but the consequence must be conscious.
- [ ] **File a follow-up: "configure operator-side claude permissions OR add `--dangerously-skip-permissions` to reviewers.json before flipping claude `required: true`."** When the founder later installs the launchd job, an unattended `claude -p` tick will likely hit interactive permission prompts that block the headless flow. Resolution before activation, not before merge.

## Expected merge conflicts

- None. Merge-base is `69521632`; since that commit only spec 057 churn has landed on `main`. No edits on `main` to `tools/review-queue/_run_reviewer.sh`, `reviewers.json`, `_reviewers.py`, any schema, the installer, or `skills/review-queue-*.md`. Expected: clean merge. The pending-review spec file `backlog/pending_review/2026-05-15-056-…md` lives only on `main` (not on the agent branch), so merge correctly preserves it for the `complete/` move.

## Follow-up items (defer, do not block merge)

- Add the AC7b inverse-case test (synthetic-PATH-with-claude exercises plist-write success path) — small additional asset; current test covers the high-risk regression direction only.
- Future templates with quoted exe names would break `EXE_NAME=$(... | awk '{print $1}')` extraction in the installer preflight; minor V1.5 cleanup if a future reviewer template needs it.
- Spec `files_to_modify` lists `adapters/codex/skills/review-queue-claude/SKILL.md`, but `adapters/codex/` only mirrors a subset of skills today (process-backlog + review-pending). Either remove the spurious path from the spec frontmatter post-merge or clarify intent — does not affect mergeability since the file was never created and sync-skills --check is clean.
- Founder should explicitly journal a tick after the first integration cycle dispatches a round with `requested_reviewers` including `claude` (AC9 prong 2 — observational confirmation).

## Open questions for founder

None — verdict is not `block`. Two pre-merge fixups above require founder acknowledgment (commit-message language + a follow-up filing), not blocking decisions.
