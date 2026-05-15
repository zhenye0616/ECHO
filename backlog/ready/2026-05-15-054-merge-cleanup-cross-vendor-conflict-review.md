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
  # Note: the canonical codex-exec invocation recipe (-C <cwd> --sandbox <mode> - < <prompt>) is documented inline in this spec's Architectural Invariant § "Runtime cwd is the merger worktree" — no out-of-repo memory reference is needed.

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

**C3 pause contract must be modified — not just appended to.** Inserting §C3.5 *after* §C3 is insufficient: C3 currently tells the operator "Resolve conflicts in your editor, then reply `continue`." A founder who follows that literal instruction will apply the resolution before ever reaching the new C3.5 section. AC1 below therefore patches C3 itself to make the consult option visible at the right moment: the C3 pause prompt becomes a three-branch choice — `c3.5` (invoke cross-vendor consult) OR resolve-in-editor-then-`continue` OR `abort`. After C3.5 returns, control returns to the same C3 pause point (the strategist surfaces codex's verdict + any modifications; founder still applies the resolution and replies `continue` to advance). **`continue` remains the single gate that verifies + applies the resolved tree.** Strategist recommendation does NOT mandate C3.5 — founder can decline ("just apply it, I trust the sidecars").

**Runtime cwd is the merger worktree, not the live checkout.** Post-050, `/merge-and-cleanup` performs the merge inside `$MERGER_WT = $TMPDIR/echo-merger-<uuid>` (skills/merge-and-cleanup.md:77, `cd "$MERGER_WT"` at line 97). Unresolved conflict markers, staged resolutions, and any `git diff <file>` directives only exist inside `$MERGER_WT` — the live checkout at `~/Desktop/Project_echo` is on a separate branch tip with a clean tree. The C3.5 invocation MUST run with `-C "$MERGER_WT"` (or the strategist must `cd "$MERGER_WT"` before invoking with relative paths). Empirical example from 2026-05-15 050 merge used `-C ~/Desktop/Project_echo` because 050's worktree-isolation hadn't shipped yet; that command shape is no longer correct.

**No new helper script.** The invocation is one shell line per the existing reference recipe; codifying it inline in the skill prose is sufficient. Adding a `tools/review-queue/conflict-review.sh` wrapper would add scope without functional benefit — the strategist writes the prompt body inline and shells out directly.

**Audit trail in existing artifacts only.** C3.5 responses are NOT persisted to `backlog/reviews/.../c3-5/` or any new file. The strategist records (a) one C3.5-result line in `review_notes` (C6) and (b) one C3.5-summary line in the merge commit body (C8), per the AC4 spec below. This keeps C3.5 lightweight + reversible while ensuring a future reader of the merge commit can tell that a cross-vendor consult fired and what it returned. Without this rule the `proceed-with-modifications` decision and its modifications would survive only in terminal scrollback or `/tmp/`, which is unacceptable for an action that shapes the merge commit.

## Acceptance criteria

### AC1 — `skills/merge-and-cleanup.md` modifies §C3 pause contract AND adds §C3.5 between §C3 and §C4

**AC1a — §C3 pause contract change (mandatory).** The existing §C3 pause prompt language MUST be updated so the founder sees C3.5 as a branch option *before* applying the resolution. Replace the current "Resolve conflicts in your editor, then reply `continue`" line with an explicit three-branch prompt: (i) reply `c3.5` to invoke cross-vendor consult, (ii) resolve in your editor and reply `continue`, (iii) reply `abort` to back out of the merge. Mechanical detection (AC2 enforces): substring **"c3.5"** AND substring **"continue"** AND substring **"abort"** must appear in §C3 within 30 lines of the existing `<<<<<<<` conflict-marker mention. The strategist's prose also recommends `c3.5` proactively when any of the (a)-(d) triggers fires (per Architectural Invariant § above), but the prompt itself stays neutral.

**AC1b — §C3.5 insertion (mandatory).** Insert a new `### C3.5. ...` heading after the modified §C3 and before §C4. The new section MUST contain (anchored regex-detectable, per AC2 below):

1. The literal substring **"OPTIONAL"** (caps-sensitive) in the opening paragraph, so the optional-not-required posture is mechanically detectable.
2. A fenced code block whose contents include ALL THREE of these literal substrings on the same `codex exec` line: **"codex exec"** AND **"$MERGER_WT"** (or equivalent — accepts `"$MERGER_WT"` with quotes or unquoted `$MERGER_WT`) AND **"--sandbox read-only"**. Mechanical detection in AC2 asserts all three substrings co-occur on a single line inside a fenced block. This pins the invocation cwd to the merger worktree where the unresolved conflict actually exists.
3. A trigger clause that names both founder-explicit and strategist-recommended triggers (mechanical detection: substring **"founder-explicit"** AND substring **"strategist-recommended"**, both in the same section).
4. A prompt-template section listing the SIX load-bearing prompt elements: (i) working-tree state captured *inside `$MERGER_WT`* via `git status --porcelain` + `git diff` (NOT relative to the live checkout), (ii) batch context (other recent merges + their sidecar prescriptions), (iii) conflict markers (the prompt MAY direct the reviewer to read files inside `$MERGER_WT` via `git diff <file>` since the invocation cwd is `$MERGER_WT`; OR the prompt embeds conflict markers verbatim — both are acceptable), (iv) specs/sidecars the reviewer should consult, (v) the proposed resolution (verbatim), (vi) output format. Mechanical detection: an ordered/unordered list of ≥6 items under a subheading containing "prompt" (case-insensitive); the list MUST mention `$MERGER_WT` (or `MERGER_WT`) at least once.
5. An output-format specification: the reviewer's response MUST start with a YAML-like header containing `verdict: proceed-as-proposed | proceed-with-modifications | pushback` AND `reviewer: codex` (or other vendor name). Mechanical detection: substring **"proceed-as-proposed"** AND substring **"proceed-with-modifications"** AND substring **"pushback"** AND substring **"verdict:"**, all in the same section.
6. A **"Post-review handling"** subsection (the heading text MUST contain the literal "Post-review handling" case-insensitive) containing **exactly three** bullet/list entries (one per verdict). Each entry MUST start with the verdict string (as a literal substring) followed by a sentence describing the strategist's required action. Mechanical detection in AC2: locate the subsection by heading, count the three list entries, assert each entry starts with the correct verdict string AND contains a non-empty action sentence (≥30 characters of prose after the verdict string before the next list item or the next heading). The action shapes are: `proceed-as-proposed` → return to C3 pause + tell founder "codex endorsed; apply your resolution and reply `continue`"; `proceed-with-modifications` → return to C3 pause + surface the modifications + tell founder "apply original resolution + these N modifications, then reply `continue`"; `pushback` → return to C3 pause + surface the pushback + tell founder "codex pushed back on the resolution because <reason>; reconsider before applying."
7. A **"Consult-failure recovery"** subsection (the heading text MUST contain the literal "Consult-failure recovery" case-insensitive) covering the four failure modes: (i) `codex` (or other vendor binary) not found / exit code 127; (ii) `codex exec` exits non-zero with no parseable response; (iii) response file present but YAML header malformed / verdict field missing or not one of the three allowed values; (iv) response file present and parseable but the verdict cites a different artifact SHA than the strategist's prompt (i.e., the reviewer read the wrong tree). In ALL four cases, the strategist MUST (a) surface the failure to the founder with the captured stderr or response excerpt, (b) record `C3.5 cross-vendor consult: <reviewer> @ failed — <one-sentence failure reason>` in the eventual C6 review_notes line per AC4a, and (c) return to the C3 pause prompt with the existing three branches (`c3.5` retry-with-different-vendor / `continue` apply-without-consult / `abort`). The strategist does NOT auto-retry. Mechanical detection in AC2: substring **"Consult-failure recovery"** (case-insensitive) AND each of the four failure-mode signatures **"not found"** OR **"127"**, **"exit"** + **"non-zero"** (within 50 chars of each other), **"malformed"** OR **"unparsable"**, **"different artifact SHA"** OR **"wrong tree"**.

**AC1c — Failure-modes table entry (mandatory, but assertion is light).** Add one row to the existing failure-modes table at the bottom of the skill noting C3.5 is OPTIONAL and trigger-driven. AC2 does NOT mechanically assert the row text — the existing test infrastructure does not extract or shape-check the failure-modes table. The row exists for human readers.

### AC2 — `tests/skills/merge-and-cleanup-shape.test.ts` asserts §C3 contract change AND §C3.5 structural shape

Extend the existing test file with TWO parallel test blocks.

**AC2a — §C3 contract assertions:**
- Anchored regex `^#+\s+C3(?:[^A-Za-z0-9]|$)` to locate the §C3 heading.
- Anchored regex `^#+\s+C3\.5(?:[^A-Za-z0-9]|$)` to locate the §C3.5 heading (no EOF fallback; if C3.5 is missing, throw `C3.5 heading not found after C3`).
- Extract the bytes between the C3 heading and the C3.5 heading.
- Assert that the extracted block contains: substring `<<<<<<<` (the existing conflict-marker mention) AND substring `c3.5` (case-insensitive) AND substring `continue` AND substring `abort`, with `c3.5` appearing within 30 lines of the `<<<<<<<` mention.

**AC2b — §C3.5 contract assertions:**
- Anchored regex `^#+\s+C3\.5(?:[^A-Za-z0-9]|$)` to locate the §C3.5 heading.
- Anchored regex `^#+\s+C4(?:[^A-Za-z0-9]|$)` to locate the §C4 heading immediately after (no EOF fallback; if C4 is missing, throw `C4 heading not found after C3.5` — mirrors the existing C5/C6 pattern).
- Extract the bytes between the C3.5 heading and the C4 heading; call this the **C3.5 block**.
- Assert that the C3.5 block contains, in order:
  - The literal `OPTIONAL`.
  - A fenced code block (`` ``` `` … `` ``` ``) containing a single line that has all three substrings `codex exec`, `$MERGER_WT` (or `MERGER_WT` allowing for unquoted/quoted forms), AND `--sandbox read-only`.
  - The substrings `founder-explicit` AND `strategist-recommended`.
  - A list section (≥6 list items) under a subheading containing `prompt` (case-insensitive). The list section MUST mention `$MERGER_WT` (or `MERGER_WT`) at least once across its items.
  - The four verdict-header substrings (`verdict:`, `proceed-as-proposed`, `proceed-with-modifications`, `pushback`) anywhere in the block (AC1b.5 — header existence only; the YAML header co-occurrence does not constrain action-sentence scoping below).
- **Scoped post-review-handling block:** locate the "Post-review handling" subsection inside the C3.5 block via anchored regex `^#+\s+Post-review\s+handling(?:[^A-Za-z0-9]|$)` (case-insensitive). The next sibling heading inside the C3.5 block terminates the post-review-handling subsection. Within that subsection, assert exactly three list entries; each entry starts with one of the three verdict strings AND is followed by ≥30 characters of action-sentence prose before the next list item or next heading. The YAML-header occurrence of the verdict strings (above the post-review-handling subsection) is intentionally NOT used for action-sentence detection — only the scoped subsection.
- **Scoped consult-failure-recovery block:** locate the "Consult-failure recovery" subsection inside the C3.5 block via anchored regex `^#+\s+Consult-failure\s+recovery(?:[^A-Za-z0-9]|$)` (case-insensitive). Within that subsection, assert the four failure-mode signatures listed in AC1b.7: (i) `not found` OR `127`, (ii) `exit` AND `non-zero` co-occurring within 50 chars, (iii) `malformed` OR `unparsable`, (iv) `different artifact SHA` OR `wrong tree`.
- Add synthetic-content test cases (parallel to the existing C5/C6 synthetic tests at lines 87-124): one happy-path test that passes; one missing-C3.5 test (`C3.5 heading not found`); one missing-C4 test (`C4 heading not found after C3.5`); one missing-MERGER_WT-in-codex-exec-line test (distinct error message); one missing-verdict-header-string test (distinct error per missing string); one missing-Post-review-handling-subsection test (distinct error); one Post-review-handling-with-only-2-entries test (distinct error: expected 3 entries got 2); one Post-review-handling-verdict-without-action-prose test (distinct error per missing action sentence); one missing-Consult-failure-recovery-subsection test (distinct error); one Consult-failure-recovery-missing-failure-mode test (distinct error per missing signature); one §C3 missing-`c3.5`-branch test.
- The synthetic tests MUST NOT depend on the real `skills/merge-and-cleanup.md` content (so the test file is robust to future edits of the canonical skill).

### AC3 — `.claude/commands/merge-and-cleanup.md` re-synced byte-identical

After AC1's edits to the canonical `skills/merge-and-cleanup.md`, run `tools/sync-skills.sh` to re-derive the adapter; the spec MUST land with `tools/sync-skills.sh --check` exiting 0. The 052-shipped C5 sync-skills gate auto-verifies this at merge time, but the builder MUST also assert it locally before pushing the branch.

### AC4 — Audit-trail integration into §C6 (review_notes) and §C8 (commit body)

C3.5 results MUST persist into the two existing merge artifacts; no new file/directory is created.

**AC4a — §C6 review_notes template field.** The existing §C6 review_notes template MUST add a new line under "Conflicts resolved" (or as a sibling top-level entry): `C3.5 cross-vendor consult: <reviewer> @ <verdict> — <one-sentence summary>`. The `<verdict>` slot holds one of the three success verdicts (`proceed-as-proposed`, `proceed-with-modifications`, `pushback`) OR the literal `failed` when AC1b.7 consult-failure recovery fired. Summary text varies: for `proceed-as-proposed` → `"no modifications"`; for `proceed-with-modifications` → `"applied N modifications: <one-line list>"`; for `pushback` accepted → `"founder accepted pushback; redesigning resolution"`; for `pushback` overridden → `"pushback rejected by founder — applied original anyway"`; for `failed` → `"<failure mode signature, e.g. not-found / non-zero exit / malformed response / wrong SHA>"`. If no C3.5 fired during the merge, the line reads `C3.5 cross-vendor consult: none invoked`. Mechanical detection in AC2c: §C6's review_notes template (lines 197-225 in the post-AC1 canonical skill, adjust if line numbers shift) MUST contain the substring `C3.5 cross-vendor consult:`.

**AC4b — §C8 commit-body summary line.** The existing §C8 commit-message HEREDOC MUST add a one-line summary line within the commit body when C3.5 fires: `Cross-vendor consult: <reviewer> @ <verdict>; modifications: <N>`. When no C3.5 fired, the line MAY be omitted entirely (no `none invoked` clutter in the commit body — review_notes is the durable record; the commit body merely signposts non-default events). Mechanical detection in AC2c: §C8's HEREDOC template MUST contain the conditional-or-included substring `Cross-vendor consult:` in either prose or a commented placeholder so future readers know to write it.

**AC2c — Audit-trail assertions** (new sub-block in the test file): extract §C6's review_notes template block, assert substring `C3.5 cross-vendor consult:`; extract §C8's commit-message HEREDOC block, assert substring `Cross-vendor consult:`. No synthetic-content tests required for AC2c — failure mode is missing-substring with a clear error.

### AC5 — Full vitest suite green; no regression

`npm test` MUST return 953+ passed / 0 failed / 21 skipped post-implementation (matches current main HEAD post-053-merge baseline; the new shape tests in AC2 add at least 4 new passing tests, so the final count is 957+). `npm run lint` and `npm run typecheck` MUST exit 0. `tools/sync-skills.sh --check` MUST exit 0.

### AC6 — Worked example in the skill prose

§C3.5 MUST include a brief "Worked example" subsection summarizing today's 050 merge as the empirical precedent: two conflicted files, judgment-loaded resolution (test deletion + wholesale-side-take + line-combining), strategist surfaced + founder requested codex consult, codex returned `proceed-with-modifications` with two non-conflict refinements (orphaned CODEX_BIN + header-comment mismatch), both folded, merge commit `5ad67e0`. ~120-150 words. The example MUST note that the empirical invocation used `-C ~/Desktop/Project_echo` because 050's worktree-isolation hadn't shipped yet, AND that the post-050 correct invocation is `-C "$MERGER_WT"`. This honesty prevents future readers from copy-pasting the old command shape.

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
