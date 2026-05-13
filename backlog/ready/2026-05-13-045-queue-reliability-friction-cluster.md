---
id: 2026-05-13-045-queue-reliability-friction-cluster
title: Queue-reliability friction cluster — recurring frictions surfaced during the 044 cycle (reviewer-side YAML emission gate + smoke gate fail-closed + orphan-cleanup test + cosmetic + worktree + sidecar-handoff)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-13
spec_commit_sha: ""
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
agent_notes: ""
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - backlog/complete/2026-05-13-044-reviewer-cycle-infrastructure-debt.md   # Direct parent. 044 closed friction #1-#4 from the 043 enumeration. 045 closes the cluster of recurring frictions that ALSO showed up during 044's own cycle but were out of 044's scope. Read 044's review_notes for the empirical observation list that informs this spec's scope.
  - backlog/_followups.md                                                  # Top of file documents the 13-item friction list from 043 + the 044-cycle additions. 045 bundles items from "From 044 dogfooding cycle" section + "From 044 merge" section.
  - raw/internal/dogfooding/mcp-interactions-journal.md                    # The 044-cycle journal entries that document each friction's per-cycle cost. Empirical input for the 045 spec scope decision.
  - .claude/commands/review-queue-codex.md                                 # AC1 touch: reviewer-side YAML validation gate before atomic-link write. New helper invocation before `commit-reviewer-response.sh`.
  - .claude/commands/review-queue-cursor.md                                # AC1 touch: same. The cursor-side reviewer prompt; YAML gate applies universally.
  - .claude/commands/review-queue-codex-ops.md                             # AC1 touch: same. The codex-ops slash command (deployed at 044 pre-flight).
  - .claude/commands/review-queue-watch.md                                 # AC4 touch: line 38 cosmetic prose alignment with combine.py:684 (missing-reviewer divergent-row example must match the emitter literal). Tiny edit, no behavior change.
  - .claude/commands/merge-and-cleanup.md                                  # AC5 touch: Step C9 worktree-remove robustness. Currently fails on regenerable node_modules. AC5 adds a node_modules cleanup step before the worktree-remove retry (matches the "do not --force" invariant).
  - .claude/commands/review-pending.md                                     # AC6 touch: Step C (sidecar write) gets a `git add` + commit step so the sidecar lands on origin/main before /merge-and-cleanup runs. Closes the handoff gap that hit during 044 merge (the sidecar was untracked, /merge-and-cleanup's pre-flight clean-tree check aborted, strategist had to commit it manually).
  - tools/review-queue/commit-reviewer-response.sh                         # AC2 touch: cross-reference. AC1's new helper invocation happens before this script. The helper's validation reuses validate.py's reviewer-response check before any git operation.
  - tools/review-queue/_install_reviewer_launchd.sh                        # AC2 touch: lines 97-103. When `--smoke` is requested but `smoke-test-<reviewer>-runner.sh` is absent, fail-closed (exit 1) instead of warn-and-exit-0. Closes the silent-pass that let 044's pre-flight declare "codex-ops smoke verified" without actually running a synthetic-request smoke.
  - tools/review-queue/combine.py                                          # AC4 cross-reference: line 684 is the emitter for the missing-reviewer divergent row. AC4 chooses canonical form (either edit combine.py:684 to match watcher.md:38's "—" shorthand, OR edit watcher.md:38 to match combine.py:684's full sentence — see AC4 body for the chosen direction).
  - tests/review-queue/concurrency.test.ts                                 # AC3 touch: line 133's orphan-cleanup test. Currently failing on main since before 042 (3-cycle deferral). Option-A or Option-B fix prescribed post-040 (see `_followups.md` "From 041 merge" — the `--now=` fixed-timestamp vs real-mtime mismatch under `touch -t $(date -r ...)`).
blocked_by: []
suggested_builder: any  # Shell + Python + Markdown skill-edit work. ~7 files touched (3 reviewer prompts + 3 skill files + 1 install script) + 1 test fix + 1 new helper script. No new dependencies, no UI, no MCP/storage churn.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
review_notes: ""
---

# Queue-reliability friction cluster — friction-045

## Why this spec exists

044 closed the top-4 compounding frictions from 043's dogfooding (autostash, direct-invoke wrapper, per-reviewer timeout, single-reviewer auto-disposition). During 044's own 3-round review cycle + builder run + merge, **a NEW cluster of recurring frictions surfaced**. Per the founder's friction-first prioritization directive (2026-05-13 ~13:55 PDT, no new architecture / V1.5+ specs until friction queue is empty), 045 closes the next set.

### The recurring frictions table (from 044 cycle empirical observations)

| ID | Friction | Per-cycle cost | Recurrence | AC |
|---|---|---|---|---|
| F-A | Reviewer-side YAML emission produces malformed frontmatter; quarantined to `<reviewer>.md.invalid.<ISO-ts>`, retry-on-next-tick. | 2 quarantines in 044 (r1 codex, r3 codex-ops). Recovery worked but adds ~30-60s per quarantine and pollutes `queue-errors.md`. | **5 events across 042 r3 + 043 r2/r3 + 044 r1/r3.** Highest compound-interest signal in the journal. | AC1 |
| F-B | `_install_reviewer_launchd.sh --smoke` warns-and-exits-0 when `smoke-test-<reviewer>-runner.sh` is absent. | 044 pre-flight declared codex-ops "smoke verified" without running a synthetic-request smoke. | 1 cycle (044). Will recur every time a new reviewer is deployed unless fixed. | AC2 |
| F-C | `tests/review-queue/concurrency.test.ts:133` orphan-cleanup test fails on main. | Forced "1 fail / out of scope" in every cycle's verify step; future builder might mistake it for a real regression. | **3-cycle deferral** (042, 043, 044). Option-A/Option-B fixes prescribed post-040 but never landed. | AC3 |
| F-D | `.claude/commands/review-queue-watch.md:38` documents the missing-reviewer divergent-row example as `where: "—"`, but emitter at `tools/review-queue/combine.py:684` writes `where: "did not respond; per 044 AC4 single-reviewer auto-disposition"`. | Prose vs emitter literal divergence; readers of the watcher prose form an incorrect mental model. | 1 cycle (044). Will recur every time the AC4 path fires unless aligned. | AC4 |
| F-E | `git worktree remove` fails when the worktree contains regenerable `node_modules/` directory (left by `npm install` from build or verify). | 044 merge needed manual `rm -rf node_modules` between the failed remove and the retry. Per skill's "do not --force" invariant. | 1 cycle (044). Will recur every cycle that runs `npm install` inside the worktree (almost all of them — code-reviewer subagent runs verify in-worktree). | AC5 |
| F-F | `/review-pending` writes a `<id>.review.md` sidecar but does NOT `git add`/commit it. `/merge-and-cleanup`'s pre-flight clean-tree check aborts because the sidecar shows as untracked. Strategist must manually commit the sidecar between skill calls. | 044 merge needed a manual `git add + commit + push` step between `/review-pending` and `/merge-and-cleanup`. | 1 cycle (044), but the handoff IS every merge cycle. Will recur unless one skill closes the gap. | AC6 |

## Acceptance Criteria

### AC1 — Reviewer-side YAML emission validation gate

**Touch:**
- `.claude/commands/review-queue-codex.md` Step 5 (codex reviewer prompt)
- `.claude/commands/review-queue-cursor.md` Step 5 (cursor reviewer prompt)
- `.claude/commands/review-queue-codex-ops.md` Step 5 (codex-ops reviewer prompt)
- NEW: `tools/review-queue/validate_response_yaml.py` (shared helper)

**Change:** Before any reviewer prompts call `commit-reviewer-response.sh`, they invoke a new shared helper `validate_response_yaml.py <path>` that parses the response file's frontmatter and validates against `reviewer.schema.json`. On parse failure or schema violation, the helper exits non-zero with a clear diagnostic, the reviewer prompt aborts before `os.link`, deletes the temp file, and writes a `PRE-LINK-INVALID:` row to `raw/internal/queue-errors.md` instead of producing a quarantined file. The reviewer prompt then retries the response generation in-session (codex CLI's existing in-session retry pattern, just shifted earlier in the flow).

The shared helper reuses the existing `validate.py reviewer` logic — it does NOT duplicate schema validation, just calls the same code path before atomic-link write.

**Why:** Eliminates F-A. Today's quarantine semantic (042 AC4 + AC5: `<reviewer>.md.invalid.<ISO-ts>` + queue-errors row) is reactive — the malformed file gets atomically linked, validated, and then renamed-aside. The validation should happen BEFORE the link operation, so malformed YAML never enters the live state. Compound-interest payoff: 5 quarantines across 042/043/044 → expected 0 in 046+ cycles.

**Out-of-scope drift to defend against:** Do NOT change the post-link quarantine path itself (042 AC4) — keep it as a defense-in-depth backstop for cases where the pre-link validator misses something (e.g., a different file shape than schema covers). Do NOT change `commit-reviewer-response.sh`'s validation gate (041 AC4); the pre-link helper is an EARLIER gate, not a replacement. Do NOT add YAML validation to reviewer prompts via inline `python3 -c "..."` heredoc — use the dedicated script (`_reviewer_gate.py` precedent from 043 AC3 — heredoc stderr is unreliable across shell-wrapping permutations).

**Test:** Add `tests/review-queue/045-pre-link-yaml-validation.test.ts`:
1. Fixture: synthetic request.md + a reviewer-side response file with malformed YAML (e.g., unescaped quote in `finding:` string, or `completed_at: datetime.datetime(...)` not string).
2. Invoke the reviewer prompt's pre-link step.
3. Assert: no `<reviewer>.md` exists at the target path; temp file cleaned up; `queue-errors.md` has a `PRE-LINK-INVALID:` row.
4. Repeat with a valid response — assert link succeeds.

### AC2 — Smoke gate fail-closed

**Touch:** `tools/review-queue/_install_reviewer_launchd.sh:97-103`

**Change:** When `--smoke` is requested and `smoke-test-<reviewer>-runner.sh` does NOT exist (or is not executable), the script exits 1 with a clear diagnostic ("smoke runner missing for reviewer <slug>: expected <path>") instead of printing a warning and exiting 0. The plist install step still completes before the smoke gate runs (so the launchd job is in place even if smoke fails — the founder/strategist can then either author the missing smoke runner or accept the deploy without smoke by re-running without `--smoke`).

**Why:** Eliminates F-B. 044's pre-flight declared codex-ops "smoke verified" without running a synthetic-request smoke. Operationally this means no isolated falsification of the new reviewer's wrapper + commit-helper chain before production launch. Fix is tiny (≤10 lines).

**Out-of-scope drift to defend against:** Do NOT create a generic `_smoke_test_runner.sh` fallback in this spec (that would be a separate item — it requires designing what a parameterized smoke test looks like for an arbitrary reviewer slug). The 045 fix is just fail-closed.

**Test:** Add a `tests/review-queue/045-smoke-gate-fail-closed.test.ts`:
1. Fixture: temp install of a `mock-reviewer` slug into reviewers.json.
2. Confirm `smoke-test-mock-reviewer-runner.sh` does NOT exist.
3. Invoke `_install_reviewer_launchd.sh mock-reviewer --smoke`.
4. Assert: script exits 1; the plist IS installed (it's the smoke step that failed, not the install); stderr contains the expected "smoke runner missing" diagnostic.
5. Touch a valid `smoke-test-mock-reviewer-runner.sh` and re-run — assert exit 0.

### AC3 — Orphan-cleanup test fix

**Touch:** `tests/review-queue/concurrency.test.ts:133`

**Change:** Apply Option-A from `_followups.md` "From 041 merge" — pass `--now=` flag to `combine.py` with a known-stable timestamp matching the orphan's mtime synthetic. Currently the test sets up a fake-stale orphan via `touch -t <real-mtime - 31min>`, but `combine.py`'s real-time `now` doesn't match — under specific clock alignments the >30min threshold falls inside the test's window.

The cleanest fix (Option-A): in the test, capture `now_iso` BEFORE `touch -t`, pass it to `combine.py --now=$now_iso`. Then the test's `now` and combine.py's `now` agree; the 31min synthetic orphan is unambiguously stale.

If Option-A doesn't work (e.g., combine.py rejects `--now` for the orphan-cleanup path specifically): Option-B — adjust the touch threshold from 31min to 60min, well past any plausible clock drift.

**Why:** Eliminates F-C. 3-cycle deferral. Every verify step ends with "1 fail / out of scope" — a future builder may mistake the failure for a real regression. Fix has been prescribed since post-040; finally landing it.

**Out-of-scope drift to defend against:** Do NOT refactor the orphan-cleanup logic in `combine.py` itself; AC3 is test-side. Do NOT change `combine.py`'s clock-reading semantics globally; this is a single-test fix.

**Test:** Re-run the existing test post-fix. Assert: `tests/review-queue/concurrency.test.ts` ALL tests pass (including line 133's orphan-cleanup, which has been failing since before 042).

### AC4 — Cosmetic prose alignment

**Touch:** `.claude/commands/review-queue-watch.md:38` OR `tools/review-queue/combine.py:684` (pick one canonical form).

**Change:** The chosen canonical form is the **emitter literal** at `combine.py:684`: `where: "did not respond; per 044 AC4 single-reviewer auto-disposition"`. The watcher's slash-command prose example at line 38 is updated to match. Rationale: the emitter is the source of truth (it's what actually appears in combined.md bodies the watcher reads); the prose is documentation of behavior.

**Why:** Eliminates F-D. Trivial prose change but the divergence forms an incorrect mental model for readers of the watcher slash command. Bundled into 045 because it's effectively zero scope.

**Out-of-scope drift to defend against:** Do NOT change the emitter literal at combine.py:684 (that would invalidate 044's AC4 tests). Do NOT touch any other prose-vs-emitter divergence beyond this single line — this is a known-recurring class but each instance is its own decision.

**Test:** Visual diff inspection during review. No automated test required.

### AC5 — Worktree cleanup robustness in /merge-and-cleanup

**Touch:** `.claude/commands/merge-and-cleanup.md` Step C9 ("Cleanup worktree and branches")

**Change:** Before `git worktree remove "$WORKTREE"`, the skill prose adds an explicit `rm -rf "$WORKTREE/node_modules"` step (with a comment explaining: regenerable, not work; `npm install` from the build or code-reviewer verify left it). After the rm, attempt `git worktree remove` once. If it still fails, surface the new blocker to the founder per the existing "do not --force" rule. The strict no-force invariant on `git worktree remove` is preserved — the surgical `rm -rf node_modules` is justified because `node_modules` is regenerable and never contains user work.

**Why:** Eliminates F-E. Every cycle that runs `npm install` inside the worktree (almost all — code-reviewer subagent runs `npm test` in-worktree) will leave `node_modules/` untracked. The skill's existing retry-without-force loop loops forever on this benign blocker.

**Out-of-scope drift to defend against:** Do NOT add `rm -rf` for other paths (e.g., dist/, .vite/, etc.) — node_modules is the load-bearing one. Add others only when empirically observed blocking. Do NOT replace `git worktree remove` with `--force` — the no-force invariant is the trust anchor.

**Test:** This is a skill-prose edit. Test is "the next /merge-and-cleanup run that has node_modules in the worktree completes C9 without manual founder intervention." No unit test feasible for skill prose.

### AC6 — /review-pending sidecar commit gap

**Touch:** `.claude/commands/review-pending.md` Step C ("Synthesize and write per-item sidecar plans")

**Change:** After writing each sidecar at `backlog/pending_review/<id>.review.md`, the skill prose adds explicit git operations:
```bash
git add backlog/pending_review/<id>.review.md
```
The sidecar is staged but NOT committed inside /review-pending — the strategist may want to edit it before commit. The strategist (or founder) commits via standard `git commit` workflow before invoking /merge-and-cleanup. Alternative: /review-pending commits the sidecar itself with message `review: <id>` (matches 044's manual commit). The spec picks COMMIT (not just add): the sidecar IS a complete review artifact and benefits from atomic git history, and the founder can still edit + amend if needed.

Updated /review-pending prose:
```bash
for SIDECAR in "${SIDECARS[@]}"; do
  git add "$SIDECAR"
  git commit -m "review: $(basename "$SIDECAR" .review.md)" "$SIDECAR"
  git push origin main || true  # tolerate push race; the next strategist op will rebase
done
```

Updated /review-pending Step E "What You Must NOT Do" — REMOVE the line "Do not commit anything" and REPLACE with "Do not commit anything OTHER than the review sidecars themselves (which are the deliverable of this skill)."

**Why:** Eliminates F-F. /review-pending → /merge-and-cleanup handoff currently requires a manual strategist commit between skills. Closing this gap brings the merge-cycle's automation depth to parity with the review-cycle's (where reviewers commit their responses atomically via `commit-reviewer-response.sh`).

**Out-of-scope drift to defend against:** Do NOT change /review-pending's read-only invariant for any OTHER state (no modifications to the item file, no moves between stages, no edits to wiki/ or docs/BACKLOG.md). Only the sidecar — which the skill creates — becomes commit-able. Do NOT have /review-pending commit its own internal artifacts (like temp files, subagent output, etc.).

**Test:** Run /review-pending against a fixture pending_review item. Assert: sidecar lands as a tracked file on origin/main with commit message `review: <id>`. Then run /merge-and-cleanup against the same item — assert pre-flight passes without manual intervention.

## Out of Scope (Don't Drift)

044's lesson held: scope-creep defenses worked. 045 preserves them. Items DELIBERATELY out of scope:

- **F-G: Spec drift discipline.** When pre-flight reality deviates from spec prose (e.g., 044's `timeout_hours: 0.5` → `null` flip during deploy), patch the prose immediately. This is strategist process discipline, not infrastructure. Cannot be fixed by 045.
- **F-H: Reviewer process state vs git commit state.** codex CLI processes stay alive after writing responses; `ps` shows them as live while git log shows commits landed. Strategist convention: poll git, not processes. Documentation only.
- **F-I: Cron ticks during cycle.** launchd jobs at 10-min boundaries can fire during strategist disposition work. 043 #10 + 044 #9. Needs design (pause-during-active-strategist OR queue-the-tick-until-strategist-idle). Not 045 scope; file as 046 candidate after 045 ships.
- **F-J: Path-(c) waiver criterion fuzzy** (043 #12). Strategist-judgment friction. Needs better rule OR explicit waiver template. Not 045.
- **F-K: Round-to-round disposition drift** (043 #11). Diff-since-prior-round view in combined.md. Needs design. Not 045.
- **F-L: Two-reviews-disagree at merge contract** (043 #7). merge-and-cleanup edit. Smaller than the cluster in 045; defer until empirically hit again.
- **F-M: Dispatch-next-round verdict semantic mismatch** (043 #8). Documentation; not load-bearing. Defer.
- **F-N: Subprocess-args grep miss** (044 #6). Strategist tooling/convention. Defer to a strategist-tooling spec if pattern recurs.
- **F-O: PUSH-RACE-FALLBACK accumulation in queue-errors.md** (cosmetic). 044's AC1 reduced the cause; if the file still accumulates rows post-044-build, address in a future cycle.
- **F-P: Reviewer prompts' Step 1 pull also lacks autostash.** Per 044's out-of-scope defense, reviewer ticks should observe a clean tree at start-of-tick. If empirically wrong (a reviewer hits dirty tree at start-of-tick), extend autostash to those prompts as a tiny follow-up.
- **NEW architecture / V1.5+ features.** Per founder direction 2026-05-13 ~13:55 PDT, until the friction queue is empty.

## Definition of Done

1. AC1–AC6 implemented per their per-AC test specs.
2. Empirical measurement during 045's own review cycle:
   - **F-A (YAML emission quarantines) count:** target 0 (the pre-link gate should prevent malformed files from ever atomically linking).
   - **F-E (worktree node_modules block) count:** target 0 in the merge step.
   - **F-F (sidecar handoff manual commit) count:** target 0 — /review-pending should commit the sidecar; /merge-and-cleanup's pre-flight should pass without manual intervention.
3. Round count: target ≤3 (the structural-reform / class:narrow baseline — 042=3, 040=3, 044=3).
4. `npm test` post-merge: AC3 fix means `concurrency.test.ts` is now FULLY passing (no more "1 pre-existing fail" line in review_notes). New AC1/AC2/AC3 tests pass.
5. Friction journal entries post-046-cycle report 0 instances of F-A through F-F.

## After Completion (Strategist Notes)

Once 045 lands in `complete/`, the strategist should:

1. **Promote `wiki/operating-model/reviewer-response-validation.md`** (new page) — document the two-layer validation (pre-link helper + post-link quarantine backstop). codex-ops's perspective applies: defense-in-depth.
2. **Update `wiki/operating-model/cross-tool-spec-review.md`** with the /review-pending → /merge-and-cleanup atomic handoff pattern (now closed by AC6).
3. **Append the empirical results from Definition of Done step 2 to `mcp-interactions-journal.md`** as the 045 close-of-cycle entry. Track F-A → F-F count changes to validate the cure-debt-first compound-interest framing.
4. **Decide if any "Out of Scope" items here (F-G through F-P) graduate to 046's scope** based on the 045 cycle's empirical observations. The friction-first directive's "no new specs until queue is empty" still applies — F-G through F-P are friction items, NOT architecture, so they're 046-candidates.

## Risk Register

- **AC1 pre-link gate misses a malformed shape** the post-link quarantine path would have caught. Mitigation: 042's quarantine path stays as defense-in-depth (kept untouched per Out-of-Scope). Any case the pre-link gate misses, the post-link still catches.
- **AC3 fix introduces a regression** in a related concurrency test. Mitigation: AC3 is test-side only; production code untouched. Re-run the FULL `concurrency.test.ts` post-AC3, not just line 133.
- **AC5 `rm -rf node_modules` is a destructive command in skill prose.** Mitigation: the path is fully-qualified (`$WORKTREE/node_modules`); `$WORKTREE` is computed from the agent slug; there's a deterministic identity check earlier in /merge-and-cleanup that the worktree is the right path. node_modules is regenerable by definition.
- **AC6 sidecar commit conflicts with concurrent strategist work.** Mitigation: the sidecar lives at a deterministic path (`backlog/pending_review/<id>.review.md`); concurrent strategist work would conflict on the SAME file only if two `/review-pending` runs target the same item, which the read-only invariant of /review-pending already serializes externally.
- **AC1 + AC2 + AC3 + AC4 + AC5 + AC6 is a larger surface than 044.** Mitigation: each AC is mechanical and small; the Out-of-Scope section is explicit about NOT bundling F-G through F-P. The strategist should defend scope against codex-ops-style "while we're here" findings during review (the 043 lesson applies — reviewer pattern is biased toward expansion; strategist counterweight).
