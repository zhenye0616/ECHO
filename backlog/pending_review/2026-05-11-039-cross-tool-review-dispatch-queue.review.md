---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
verdict: merge with founder fixups
reviewed_at: 2026-05-12T08:55:00Z
test_counts: { passed: 42, failed: 0, suite_passed: 5, suite_failed: 0 }
reviewer_inputs:
  - codex_spec_r4: backlog/reviews/2026-05-11-039-cross-tool-review-dispatch-queue/r4/codex.md
  - cursor_spec_r4: backlog/reviews/2026-05-11-039-cross-tool-review-dispatch-queue/r4/cursor.md
  - codex_impl_monitor: fs:/Users/zhenye/.codex/sessions/2026/05/12/rollout-2026-05-12T01-20-54-019e1b46-5350-7ca1-abad-4d4f90a01bdd.jsonl
---

## Verdict

`merge with founder fixups` — the implementation is structurally sound, all 42 focused tests pass cleanly after a fresh `npm install` in the worktree, lint + typecheck are green, and the merge is conflict-free (22 net-new files; zero modifications to existing main-side files). Codex's R4 LOW #2 (stale "primary or related section overlap" wording → exact-primary or cross_ref) is fully closed in spec + impl. Codex R4 LOW #1 (AC3.5 (b)-branch executable fixture) is **partially closed**: the (a)/(b)/(c) fixtures exist in `combine.test.ts`, but the load-bearing `next_round=N+1` transition lives in the watcher slash-command and is only human-auditable, not unit-runnable — a defensible architectural choice (combine.py is intentionally state-machine-free) that warrants a non-blocking V1.6+ follow-up. Two of Codex's implementation-monitor claims confirmed as low-severity polish (#1 arch-conditional shebang risk, #2 stale spec line 410 vs impl no-op-on-existing); one partial (#3 e2e fresh-tmp persistence); one disconfirmed (#4 node_modules — clean after `npm install`).

## Pre-merge fixups

- [ ] (Recommended, optional) Add arch-aware re-exec around the jsonschema import in `tools/review-queue/_lib.py` so the slash-command body invocation cannot fail under Rosetta-shell parents. Pattern in §7 of the reviewer report.
- [ ] (Founder note before merge) Delete or revise the stale `- combined.md exists, no --force: error.` line in the AC4 test list of the spec (line 410). The impl's no-op behavior is internally consistent with the rest of AC4 and operationally correct under `/loop 10m` driving; the bullet is RC2/RC3-era residue.

Both are mechanical; neither blocks merge.

## Expected merge conflicts

- **None.** `git diff main...agent/cross-tool-review-dispatch-queue --name-status` shows 22 net-new files only (`.claude/commands/review-queue-*.md`, `backlog/reviews/.gitkeep`, `docs/review-queue-setup.md`, `tests/review-queue/*`, `tools/review-queue/*`). No modifications to existing files on main. `--no-ff` merge will apply cleanly.

## Follow-up items (defer, do not block merge)

1. **Runtime arch-aware python re-exec** — wrap the jsonschema/yaml import in `_lib.py` so direct shebang invocation works under any shell parent. Closes Codex implementation-monitor claim #1 permanently. V1.6+.
2. **Watcher-state executable test** — convert the prose-level (b)-branch assertion in `review-queue-watch.md` into an integration test that drives the slash-command body (or an extracted helper) and asserts `r{N+1}/request.md` exists + `next_round: <N+1>` in `combined.md`. Closes Codex R4 L1 with full executable falsifiability. V1.6+.
3. **Spec wording cleanup** — post-merge spec patch removing the stale `combined.md exists → error` bullet from AC4 (line 410); reconcile with the impl's no-op-on-existing semantics that the rest of AC4 already implies.
4. **e2e.test.ts cleanup wording** — add an explicit in-test comment that the fresh-tmp persistence in `r1Dir` is a no-op artifact (the reviewer's later success cleans it), not a coverage gap. Closes Codex implementation-monitor claim #3.
5. **AC6b post-merge dogfooding** — already filed per spec §After Completion §5; the next qualifying spec is the first end-to-end zero-dispatch-message test of the queue. Founder's documented "loop-close gate."

## Open questions for founder

None — verdict is not `block`. The two real findings are mechanical post-merge cleanups.

## Sources consulted

- **Cross-tool spec reviewers (already converged at R4):** Codex R4 `proceed_after_patches` (2 LOW findings, addressed in RC5); Cursor R4 `proceed` (zero findings).
- **Codex implementation-monitor session** (separate from the spec reviewer; `rollout-2026-05-12T01-20-54-...jsonl`) — was watching the worktree live during the builder's commit cycle and surfaced four candidate issues. Two confirmed as low-severity polish, one partial, one disconfirmed after fresh `npm install`. The fact that ECHO surfaced this independent reviewer voice ahead of the founder-side merge review is itself empirical validation of the queue's "reviewer-harness-agnostic" property (per spec §"Out of Scope" #5): a third reviewer voice (Claude Code → Codex monitor) attached to the same canonical artifact and contributed without protocol changes.
- **R5 founder-side implementation review** (this sidecar) — performed by a code-reviewer subagent against `agent/cross-tool-review-dispatch-queue` at `cd02160`. Ground-truth check passed (worktree HEAD matches recorded head_sha). All 42 review-queue tests pass; npm lint + typecheck clean.
