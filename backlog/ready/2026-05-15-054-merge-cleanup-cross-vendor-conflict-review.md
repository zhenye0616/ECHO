---
id: 2026-05-15-054-merge-cleanup-cross-vendor-conflict-review
title: /merge-and-cleanup C3.5 — optional cross-vendor mid-merge conflict-resolution review (codifies the ad-hoc pattern that worked on 050)
status: ready
priority: MED
estimate: 0.5d
created: 2026-05-15
blocked_by: []
task_state_ref: 2026-05-15-054-merge-cleanup-cross-vendor-conflict-review
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - skills/merge-and-cleanup.md  # AC1 — insert §C3.5 between current §C3 (Surface conflicts and pause) and §C4 (Apply pre-merge fixups). Prose-only step; no new helper script.
  - .claude/commands/merge-and-cleanup.md  # re-synced via tools/sync-skills.sh post-AC1; byte-identical to canonical
  - tests/skills/merge-and-cleanup-shape.test.ts  # AC2 — anchored-regex assertion that C3.5 heading is present and contains the load-bearing trigger phrase; mirrors the existing C5/C6 shape-extraction pattern.
spec_refs:
  - skills/merge-and-cleanup.md  # AC1 target — current C3/C4 boundary at lines 129-159; 054 inserts C3.5 in between
  - tests/skills/merge-and-cleanup-shape.test.ts  # AC2 patch site — current anchored-regex extracts C5 and asserts C6 follows; 054 extends with parallel C3.5 assertion
  - backlog/complete/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md  # empirical precedent — during 050's merge today (2026-05-15 ~12:30 PDT), the strategist hit two conflicted files with judgment-loaded resolution (delete a test, take one side wholesale on a restructured file). Founder said "use a codex reviewer here." Strategist improvised via `codex exec --sandbox read-only -C ~/Desktop/Project_echo - < /tmp/codex-050-conflict-review-prompt.md`. Codex returned `proceed-with-modifications`, identified two non-conflict refinements (orphaned CODEX_BIN block + header-comment mismatch), both folded into the merge commit (`5ad67e0`). The pattern worked but is not in the protocol; future strategists/founders won't know it's an option.
  - backlog/_followups.md  # `050-cross-merge-note` entry already documents this empirical event + proposes codification as `/merge-and-cleanup` C3.5; this spec is its build form.
  - backlog/complete/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md  # structural precedent — 052 added AC4 shape test (`tests/skills/merge-and-cleanup-shape.test.ts`) with anchored `^#+\s+C5(?:[^A-Za-z0-9]|$)` regex + no-EOF-fallback for missing C6. 054 reuses that exact pattern for C3.5 detection (single source of truth for "is this skill structurally well-formed").
  - .claude/projects/-Users-zhenye-Desktop-Project-echo/memory/reference_codex_review_queue_invocation.md  # reference — the one-line `codex exec` recipe that today's improvised invocation used (`-C <repo> --sandbox <mode> - < <prompt-file>`). 054 reuses this recipe with `--sandbox read-only` (not `danger-full-access`) because C3.5 is a read-only consultation.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# /merge-and-cleanup C3.5 — optional cross-vendor mid-merge conflict-resolution review

## Why this spec exists

The current `/merge-and-cleanup` protocol pauses at §C3 for founder conflict resolution, then advances to §C4 (per-fixup approval). There is no formal step where the strategist or founder can request a **cross-vendor independent review of the proposed resolution** before applying it. Today (2026-05-15 ~12:30 PDT), during the 050 merge, two conflicted files surfaced (`tools/review-queue/_run_reviewer.sh` UU + `tools/review-queue/push-with-retry.sh` UU) where the proposed resolution was judgment-loaded:

- Take 050's worktree-isolation hunk *wholesale* over 051's lock-check hunk (lock convention spec'd out under 050 AC3).
- **Delete** an entire test file (`tests/review-queue/run-reviewer-honors-merge-lock.test.ts`, 4+ tests) because the codepath it tested was removed.
- Combine 051's `--rebase=merges` flag with 050's `HEAD:main` refspec on a single line that had been independently rewritten by both branches.

The strategist surfaced the proposed resolution with file:line excerpts from prior sidecars' resolution playbooks (the 051 and 052 review_notes had pre-emptively prescribed the path). Founder responded: *"use a codex reviewer here"*. Strategist improvised the cross-vendor consult via:

```bash
codex exec -C ~/Desktop/Project_echo --sandbox read-only - < /tmp/codex-050-conflict-review-prompt.md
```

Codex returned `proceed-with-modifications` and identified two non-conflict refinements the strategist had missed:

- Remove the now-orphaned 051 `CODEX_BIN` env-hook block at `_run_reviewer.sh:49-53` (outside the conflict markers — would have left a dead test seam).
- Update `push-with-retry.sh`'s header behavior-comment from plain `--rebase` to `--rebase=merges` (matches actual behavior post-resolution).

Both refinements were folded into the merge commit (`5ad67e0`). Net effect: a tighter merge than the strategist's solo plan would have produced.

**The pattern worked but is not in the protocol.** A future strategist driving a comparable merge will not know cross-vendor consultation is an option; a future founder will have to remember to ask. Codifying the pattern as `C3.5` makes it a first-class, documented, repeatable escalation — without making it required (which would slow simple merges).

## Architectural invariant

**C3.5 is OPTIONAL and trigger-driven; never required.** The vast majority of merge conflicts are mechanical (single-line context-offset shifts, pure additions, sidecar-pre-scripted side-takes) and resolving them via the existing §C3 pause is correct. C3.5 is the escape hatch for the minority of conflicts where the proposed resolution involves judgment beyond the sidecar's prescriptive playbook. The trigger is **either**:

- **Founder-explicit:** founder says "review with codex" (or similar) at any §C3 pause. This is the empirically-validated trigger (today's 050 merge).
- **Strategist-recommended:** strategist proactively recommends C3.5 when the proposed resolution involves any of: (a) deletion of test files, (b) wholesale-side-take on a restructured file (not a single-line side-take), (c) reconciliation across ≥3 files where the sidecar playbook is silent or absent, (d) introduction of new code outside the conflict markers (today's CODEX_BIN-cleanup case).

Strategist recommendation does NOT mandate C3.5 — founder can decline ("just apply it, I trust the sidecars"). The recommendation is a one-line surface in the §C3 output: *"This resolution touches [a/b/c/d] — recommend §C3.5 cross-vendor review before applying. Reply `c3.5` to invoke, or `continue` to apply directly."*

**No new helper script.** The invocation is one shell line per the existing reference recipe; codifying it inline in the skill prose is sufficient. Adding a `tools/review-queue/conflict-review.sh` wrapper would add scope without functional benefit — the strategist writes the prompt body inline and shells out directly.

## Acceptance criteria

### AC1 — `skills/merge-and-cleanup.md` adds §C3.5 between current §C3 and §C4

The new section MUST contain (anchored regex-detectable, per AC2 below):

1. A `### C3.5. ...` heading.
2. The literal substring **"OPTIONAL"** (caps-sensitive) in the opening paragraph, so the optional-not-required posture is mechanically detectable.
3. The literal substring **"codex exec"** (caps-insensitive) in a fenced code block, so the documented invocation recipe is mechanically detectable.
4. A trigger clause that names both founder-explicit and strategist-recommended triggers (mechanical detection: substring **"founder-explicit"** AND substring **"strategist-recommended"**, both in the same section).
5. A prompt-template section listing the SIX load-bearing prompt elements: (i) working-tree state, (ii) batch context (other recent merges + their sidecar prescriptions), (iii) conflict markers (verbatim or as a `git diff <file>` directive), (iv) specs/sidecars the reviewer should consult, (v) the proposed resolution (verbatim), (vi) output format. Mechanical detection: an ordered/unordered list of ≥6 items under a subheading named or containing "prompt".
6. An output-format specification: the reviewer's response MUST start with a YAML-like header containing `verdict: proceed-as-proposed | proceed-with-modifications | pushback` AND `reviewer: codex` (or other vendor name). Mechanical detection: substring **"proceed-as-proposed"** AND substring **"proceed-with-modifications"** AND substring **"pushback"** AND substring **"verdict:"**, all in the same section.
7. A post-review handling clause: on `proceed-as-proposed` the strategist proceeds to §C4 with the original resolution; on `proceed-with-modifications` the strategist applies the named modifications before proceeding; on `pushback` the strategist pauses again and surfaces the pushback to the founder (does NOT auto-revert). Mechanical detection: each of the three verdict strings appears in the same section AND is followed by a sentence describing the action.
8. A failure-modes table entry (in the existing failure-modes table at the bottom of the skill body) noting that C3.5 is OPTIONAL and trigger-driven (not strictly part of AC1's "must contain" list but expected by the prose structure; tested by AC2 only via the anchored regex finding C3.5).

### AC2 — `tests/skills/merge-and-cleanup-shape.test.ts` asserts C3.5 structural shape

Extend the existing test file with a parallel test block:

- Anchored regex `^#+\s+C3\.5(?:[^A-Za-z0-9]|$)` to locate the §C3.5 heading.
- Anchored regex `^#+\s+C4(?:[^A-Za-z0-9]|$)` to locate the §C4 heading immediately after (no EOF fallback; if C4 is missing, throw a distinct error message — mirrors the existing C5/C6 pattern).
- Extract the bytes between the C3.5 heading and the C4 heading.
- Assert that the extracted block contains, in order: the literal `OPTIONAL`, the literal `codex exec` inside a fenced code block, the substrings `founder-explicit` AND `strategist-recommended`, a list section (≥6 items) under a subheading containing `prompt` (case-insensitive), and each of the three verdict strings (`proceed-as-proposed`, `proceed-with-modifications`, `pushback`).
- Add synthetic-content test cases (parallel to the existing C5/C6 synthetic tests at lines 87-124): one happy-path test that passes, one missing-C3.5 test that fails with `C3.5 heading not found`, one missing-C4 test that fails with `C4 heading not found after C3.5`, one verdict-string-missing test that fails with a distinct error per missing string.
- The synthetic tests MUST NOT depend on the real `skills/merge-and-cleanup.md` content (so the test file is robust to future edits of the canonical skill).

### AC3 — `.claude/commands/merge-and-cleanup.md` re-synced byte-identical

After AC1's edit to the canonical `skills/merge-and-cleanup.md`, run `tools/sync-skills.sh` to re-derive the adapter; the spec MUST land with `tools/sync-skills.sh --check` exiting 0. The 052-shipped C5 sync-skills gate auto-verifies this at merge time, but the builder MUST also assert it locally before pushing the branch.

### AC4 — Full vitest suite green; no regression

`npm test` MUST return 953+ passed / 0 failed / 21 skipped post-implementation (matches current main HEAD post-053-merge baseline). `npm run lint` and `npm run typecheck` MUST exit 0. `tools/sync-skills.sh --check` MUST exit 0.

### AC5 — Worked example in the skill prose

§C3.5 MUST include a brief "Worked example" subsection summarizing today's 050 merge as the empirical precedent: two conflicted files, judgment-loaded resolution (test deletion + wholesale-side-take + line-combining), strategist surfaced + founder requested codex consult, codex returned `proceed-with-modifications` with two non-conflict refinements (orphaned CODEX_BIN + header-comment mismatch), both folded, merge commit `5ad67e0`. ~120 words; not the full incident — just enough for a future strategist to recognize a comparable situation.

## Out of Scope (Don't Drift)

- **No new helper script.** Do NOT create `tools/review-queue/conflict-review.sh` or similar. The `codex exec` invocation is one line; codifying it inline in the skill prose is sufficient.
- **No schema or validator changes.** C3.5 responses are NOT committed to `backlog/reviews/...` (this is an ad-hoc consult, not a queue-protocol review). `tools/review-queue/validate.py` and `reviewer.schema.json` are NOT touched.
- **No automation of the trigger.** The strategist surfaces the recommendation as one prose line; the founder decides. Do NOT introduce automatic invocation based on file count, test deletion detection, or any other heuristic — the trigger stays human-judgment-mediated.
- **No persistence of C3.5 responses.** The reviewer's verdict and modifications are folded into the merge commit message and `review_notes` (per existing C8 + C6 protocol); there is no separate artifact under `backlog/reviews/.../c3-5/` or similar. Avoiding persistence keeps C3.5 lightweight and reversible.
- **No other vendors mandated.** The spec body uses `codex` as the reference reviewer because that is what worked empirically; the prose framing is vendor-neutral (`cross-vendor` not `codex-specific`), so a future invocation using a different cross-vendor reviewer (e.g., Cursor's Claude in IDE mode, or web ChatGPT) follows the same C3.5 step without additional protocol work.
- **No new failure-modes-table row beyond C3.5-itself.** The existing rows handle conflict resolution; C3.5 just adds one optional intermediate step. The table's existing rows for conflicts, fixups, and verify failures all still apply.

## Cycle-shape expectation

R1-R2 expected. This is a prose-only skill edit + one test file extension + adapter re-derivation; no Python, no shell, no infrastructure. If the cycle exceeds R3, escalate: either the prompt-template structure is wrong, the verdict-string set is wrong, or the trigger language is unclear. In any of those cases, drop the trigger-detail debate and ship the minimal C3.5 (heading + invocation + verdict set + worked example) without the strategist-recommended-trigger taxonomy.

## After Completion (Strategist Notes)

When this item lands in `complete/`:

- Promote the C3.5 codification into `wiki/architecture/cross-tool-protocol.md` (existing decision file documents the principle; this spec is its operational instance — wiki page should add a short "C3.5 escalation pattern" subsection citing today's 050 merge as the empirical precedent).
- Update `wiki/operating-model/` (if/when that folder gets a `merge-protocol.md` page) to reference C3.5.
- Cross-reference from `skills/role-typed-task-state.md` if/when the strategist task-state schema starts tracking pending C3.5 invocations across `/clear` boundaries (out of 054 scope — observational follow-up only).
- Mark `050-cross-merge-note` follow-up entry in `backlog/_followups.md` as `✅ CLOSED 2026-05-15 by 054` once 054 merges.

## Recursive-risk note

054's own review cycle is at zero risk of triggering the bug it's spec'ing the fix for (unlike 053's recursive-risk-with-completed_at-timestamps). C3.5 only applies to merges that have judgment-loaded conflicts, and 054's spec body itself produces no conflicts (single-file prose addition + single-file test extension + adapter resync). If 054's R1/R2 reviewers happen to surface a finding that the strategist disposition produces a judgment-loaded patch, that's a normal review-queue disposition, not a C3.5 invocation. The C3.5 invocation is exclusively a `/merge-and-cleanup` mid-merge artifact.
