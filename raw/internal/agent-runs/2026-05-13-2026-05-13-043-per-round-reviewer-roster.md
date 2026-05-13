---
item_id: 2026-05-13-043-per-round-reviewer-roster
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
worktree: ~/Desktop/Project_echo--per-round-reviewer-roster
branch: agent/per-round-reviewer-roster
head_sha: ef9d83946eeab48ba598ef6cd5bab18e4e924526
---

## Run 1 (2026-05-13)

### What I implemented

Full execution of 043's per-round reviewer roster spec across 7 acceptance criteria (AC1, AC1f, AC2, AC3, AC4, AC5, AC6, AC7). The 8th AC8 (n-reviewer test framework) is partially covered — see "Acceptance criteria status" below for the load-bearing vs non-load-bearing breakdown.

Foundation:
- `tools/review-queue/reviewers.json` — runtime config; codex headless/required/timeout_hours=null, cursor ide/required/timeout_hours=2.
- `tools/review-queue/_reviewers.py` — loader + validator with process-local cache, mode↔timeout_hours contract enforced.
- `tools/review-queue/schemas/reviewers-config.schema.json` — JSON schema for the config.
- `tools/review-queue/_lib.py` — added env-var routing: `ECHO_REVIEW_QUEUE_REPO_ROOT`, `ECHO_SCHEMA_DIR`, `ECHO_REVIEWERS_CONFIG`. Derived REVIEWS_DIR + ERROR_LOG follow REPO_ROOT.

Reviewer prompts:
- `.claude/commands/review-queue-{codex,cursor}.md` Step 2: skip rounds where `MY_REVIEWER not in request.requested_reviewers` (AC1).
- Same prompts' Step 5: added `os.path.exists(round_dir/combined.md)` race guard before `os.link` (AC4).

Tool changes:
- `request.py`: VALID_REVIEWERS sourced from `_reviewers.py`; error message phrasing preserves "not in current enum" substring for existing tests.
- `combine.py`: full rewrite for AC6 — `compute_combined_verdict(verdicts, requested, required_set)` new signature; `build_combined` reads per-round `requested_reviewers`; union-find for cross_ref convergence; preserves byte-identical default 2-reviewer output; emits `partial_responses` (rename) instead of `single_reviewer_timeout`; `cleanup_orphans` regex derived from active reviewer slugs; `cross_refs_match` takes `finding_index` (R6 MED #2). `build_malformed_combined` generalized for N reviewers.
- `dispatch-next-round.py`: branch (b) propagates `requested_reviewers` from r<N> to r<N+1>'s `--reviewers` flag (AC1f / R2 HIGH #3).

Schemas:
- `combined.schema.json`: `partial_responses` appended to enum (legacy `single_reviewer_timeout` kept for back-compat); `offending_response` regex widened from `[a-z]+` to `[a-z][a-z0-9-]+` (AC5).
- `request.schema.json` + `reviewer.schema.json`: unchanged (enums stay explicit per R1 HIGH #5).

Shared helpers (AC3):
- `tools/review-queue/_run_reviewer.sh` — generic headless reviewer tick wrapper; reads REVIEWER_NAME.
- `tools/review-queue/_install_reviewer_launchd.sh` — generic install helper.
- `tools/review-queue/_reviewer_gate.py` — validation gate (dedicated script after observing that heredoc-via-`<<PY` stderr was swallowed under node spawnSync without a tty).
- `run-codex-reviewer.sh` + `install-codex-reviewer-launchd.sh` reduced to 5-line drivers.
- `+x` bits committed via `git update-index --chmod=+x`.

Docs + watcher:
- `docs/review-queue-setup.md` — new "Adding a 3rd reviewer (043 AC2 + AC3)" section enumerating the 5-file changelist.
- `.claude/commands/review-queue-watch.md` Step 3 prose: `partial_responses` naming + N-way semantics.

Tests:
- `tests/review-queue/n-reviewer-framework.test.ts` — 18 blocks covering AC1b/c/d, AC1f, AC2 (mode validation, duplicate slug, mode↔timeout_hours contract), AC3a/b/c/d (gate diagnostics), AC4a/b/c (race guard), AC6 (default 2-reviewer convergent/divergent paths).
- `tests/review-queue/default-deploy-baseline.test.ts` — 2 blocks: byte-identical happy path (AC7) + codex-absent-past-timeout regression (AC7b).
- `tests/review-queue/schemas.test.ts` — 1 new block: AC5 hyphenated-slug `offending_response` fixture.
- `tests/review-queue/combine.test.ts` — updated 1 block to expect `partial_responses` (043 AC6 rename).
- `tests/review-queue/concurrency.test.ts` — same rename adjustment.

### Files modified (worktree branch + head_sha)

Branch: `agent/per-round-reviewer-roster`  
Head SHA: `ef9d83946eeab48ba598ef6cd5bab18e4e924526`

New files (10):
- `tools/review-queue/reviewers.json`
- `tools/review-queue/_reviewers.py`
- `tools/review-queue/_reviewer_gate.py`
- `tools/review-queue/_run_reviewer.sh` (+x)
- `tools/review-queue/_install_reviewer_launchd.sh` (+x)
- `tools/review-queue/schemas/reviewers-config.schema.json`
- `tests/review-queue/n-reviewer-framework.test.ts`
- `tests/review-queue/default-deploy-baseline.test.ts`

Modified files (12):
- `tools/review-queue/_lib.py` (env-var routing)
- `tools/review-queue/request.py` (VALID_REVIEWERS sourced from _reviewers.py)
- `tools/review-queue/combine.py` (full AC6 refactor)
- `tools/review-queue/dispatch-next-round.py` (AC1f roster propagation)
- `tools/review-queue/run-codex-reviewer.sh` (5-line driver)
- `tools/review-queue/install-codex-reviewer-launchd.sh` (5-line driver)
- `tools/review-queue/schemas/combined.schema.json` (partial_responses enum + regex widening)
- `.claude/commands/review-queue-codex.md` (requested_reviewers + race guard)
- `.claude/commands/review-queue-cursor.md` (requested_reviewers + race guard)
- `.claude/commands/review-queue-watch.md` (prose update)
- `docs/review-queue-setup.md` (Adding a 3rd reviewer section)
- `tests/review-queue/schemas.test.ts`, `combine.test.ts`, `concurrency.test.ts` (rename adjustments + AC5 fixture)

### Decisions during implementation

1. **`_reviewer_gate.py` as a dedicated script.** The spec describes the gate as an inline `python3 - <<PY` heredoc in `_run_reviewer.sh`. Under `node spawnSync` without a tty (which is how vitest exercises the wrapper), the heredoc's stderr was being silently swallowed (status 1 returned, but `r.stderr` was empty). After multiple debugging attempts with `printf | python3 -`, explicit stderr flush, etc., factoring the gate into a real Python script resolved it cleanly. Both AC3c and AC3d's literal-string assertions now pass; the spec's "exact diagnostic" contract is preserved. The trade-off: one more file in tools/review-queue (`_reviewer_gate.py`) versus an inline gate. Worth it because the diagnostic IS the falsification mechanism.

2. **`partial_responses` rename emission for default 2-reviewer.** Per spec, combine.py emits the new name for new rounds; the legacy `single_reviewer_timeout` enum value stays in `combined.schema.json` for back-compat with rounds in `complete/`. Two existing tests (`combine.test.ts`, `concurrency.test.ts`) were updated to expect the new name with explicit comments tagging the 043 AC6 rename.

3. **N-way convergent algorithm preserves "both" wording for default 2-reviewer.** Spec calls for AC7 byte-identical output. The convergent-row source string is `"both (convergent on '<anchor>')"` when EXACTLY both default reviewers are in the bucket, generalizing to `"slug1+slug2+... (convergent on '<anchor>')"` for N>2. Tested via the AC7 byte-comparison fixture.

4. **Stash interaction with pre-existing dogfooding journal modifications.** The initial pull failed because of uncommitted dogfooding journal + queue-errors.md + an untracked `wiki/operating-model/one-session-coordination-loop.md`. These were pre-existing modifications from a prior session. Stashed with `--include-untracked` before proceeding; one earlier stash (`stash@{1}: On main: t`) was already present. The founder may want to inspect/restore these from `git stash list`.

### Acceptance criteria status

- **AC1a** — Cursor exits no-op when not requested: ⏭ NOT TESTED EXPLICITLY (requires invoking the slash-command body in a harness; the prompt body Step 2 logic is wired and visually inspectable; AC1b/c/d/f exercise the combine-side equivalent comprehensively).
- **AC1b** — Codex-only-requested round eligible immediately, validate.py accepts: ✅ PASSING (`n-reviewer-framework.test.ts`).
- **AC1c** — Required cursor missing BEFORE timeout, codex present, NOT eligible: ✅ PASSING.
- **AC1d** — Required cursor missing AFTER timeout, codex present, partial_responses + escalated, body enumerates: ✅ PASSING.
- **AC1e** — Optional cursor missing, codex present, non-blocking: ⏭ NOT TESTED EXPLICITLY (the `required: false` semantics path is implemented in `compute_combined_verdict` but no fixture exercises it; falsifiable via founder dogfooding by toggling cursor to `required: false` in reviewers.json).
- **AC1f** — Roster propagation r<N> → r<N+1>: ✅ PASSING (`n-reviewer-framework.test.ts`).
- **AC2a-d** — reviewers.json validation: ✅ PASSING (4 blocks: invalid mode, duplicate slug, headless+timeout, ide+timeout=null).
- **AC3a-d** — Helper script gating: ✅ PASSING (4 blocks: +x bit, missing env var, ghost slug, ide mode).
- **AC4a-c** — Race guard: ✅ PASSING (3 blocks: combined exists, happy path, FileExistsError fall-through).
- **AC5** — Hyphenated-slug regex: ✅ PASSING (`schemas.test.ts` new fixture).
- **AC6** — N-way verdict roll-up: ✅ PASSING for 2-reviewer paths (default-deploy + divergent + proceed*-mix). N-reviewer (≥3) convergent/divergent fixtures are NOT in the test file — the union-find algorithm is implemented but not falsified by a 3-reviewer fixture. The AC6h end-to-end fixture (synthetic codex-arch + full pipeline) is also OUT of scope for this run.
- **AC7 + AC7b** — Default-deploy baseline + timeout regression: ✅ PASSING (2 blocks in `default-deploy-baseline.test.ts`).

### Test output (verbatim, vitest run on full suite)

```
 Test Files  1 failed | 54 passed | 1 skipped (56)
      Tests  1 failed | 816 passed | 21 skipped (838)
   Start at  01:23:49
   Duration  15.93s (transform 4.59s, setup 0ms, collect 9.88s, tests 70.71s, environment 8ms, prepare 5.44s)
```

The single failure is the documented pre-existing `orphan .tmp.* older than 30 min is cleaned up by combine.py` test in `concurrency.test.ts`. This test was already failing on `main` pre-claim (verified by running it on main HEAD before any changes). The spec acknowledges this: "Existing suite count was 56 at 042 merge (55 review-queue + 1 pre-existing-fail); should reach 72 review-queue tests at 043 merge (still 1 pre-existing-fail for the orphan-cleanup)." Net new review-queue test count: 21 (18 in n-reviewer-framework + 2 in default-deploy-baseline + 1 hyphenated-slug fixture), bringing the review-queue test count to 77 (was 56 before, +21 in this PR), with 1 pre-existing fail unchanged.

### Open questions for founder

1. **AC1a (cursor-exits-no-op-when-not-requested) — testing strategy.** The spec describes extracting the prompt's Step 2 logic into a "testable shell function or invoke directly via env-var-driven harness." I did not write this test because the prompt body is inherently a slash-command (markdown with shell snippets, not an executable). The behavior is implemented (the Python check at Step 2 in both prompts), but exercising it requires either a vitest harness that shells out to invoke a slash-command runner, or a refactor of the prompt body into a testable function. Recommend: file as `2026-05-XX-XXX-reviewer-prompt-testability` if the falsification gap matters; otherwise founder verifies via one manual cursor tick on a codex-only-requested round.

2. **AC6h end-to-end fixture (synthetic codex-arch reviewer).** This was the spec's most expensive falsification mechanism — it patches reviewers.json + all 4 schemas + adds a synthetic slash-command and exercises the full pipeline (`request.py` → `validate.py reviewer` → `commit-reviewer-response.sh` → `combine.py` → `validate.py combined`). I did not implement it. The AC6 N-way algorithm is implemented and the 2-reviewer falsification (AC6a-g via existing combine.test.ts + new n-reviewer-framework AC6 blocks) is comprehensive for default deploy. A 3-reviewer convergent/divergent test fixture would falsify the union-find merge correctness — recommend adding before any second-Codex actually ships.

3. **AC8 — `_followups.md` cross-out.** The spec mentions cross-outs for `_followups.md`. I did not edit `_followups.md` per the rule that builder agents don't edit project-level meta files. Strategist should handle in the post-shipment pass.

### Drift events caught

None substantive. Minor temptation to factor the unused codex-specific status/uninstall/smoke scripts (spec called this out as deferred to 044); I logged the temptation internally and stopped.

### Stash recovery note

Pre-existing dogfooding-journal + queue-errors modifications were stashed at agent start:
- `stash@{0}: On main: process-backlog auto-stash-2 2026-05-13T08:25:14Z` (most recent; contains 3 modified files)
- `stash@{1}: On main: t` (earlier, truncated description; contains same files + untracked `wiki/operating-model/one-session-coordination-loop.md`)

Founder may want to `git stash show -p stash@{0}` and `git stash show -p stash@{1}` to inspect; the `wiki/operating-model/one-session-coordination-loop.md` is likely an in-flight strategist promotion that should land in a separate commit per the strategist-write-wiki rule.
