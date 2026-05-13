---
backlog_item: 2026-05-12-042-reviewer-emission-yaml-validation
agent_run_started: 2026-05-13T05:06:42Z
agent_run_ended: 2026-05-13T05:15:00Z
status: ready_for_review
test_status: passing
agent_id: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
branch: agent/reviewer-emission-yaml-validation
head_sha: 69809e2573db57efc9519a7aa72f3b31ac6b26db
---

# Agent Run: Reviewer emission YAML validation

## What I Implemented

Closed the unhandled-YAML-error path on both sides of the cross-tool review queue:

1. **AC1 — Reviewer-side gate.** Wrapped the `yaml.safe_load` call inside `_lib.parse_frontmatter` so any `yaml.YAMLError` (covers `ParserError`, `ScannerError`, `ConstructorError`) is converted to a `ValueError` whose message reports the file path, line + column, the parser's `problem` field, and the remediation hint ("regenerate response with valid YAML; do not hand-edit committed reviewer files"). Because `validate.py` already catches `ValueError` and exits 1 with the message on stderr, this single wrap closes the leaked traceback path through `commit-reviewer-response.sh` (which invokes `validate.py` per 041 AC4). No edit required in `validate.py` or `commit-reviewer-response.sh`.

2. **AC2 — Strategist-side defensive parse in `combine.py`.** Replaced the unconditional `read_response` calls in `build_combined` with a phase-1 collect that runs `parse_frontmatter` on both codex.md and cursor.md and records every `(path, parse_error_str)` tuple before deciding what to emit. If any failure occurred, phase 2 delegates to the new `build_malformed_combined` helper which produces a terminal combined.md with:
   - `combined_verdict: malformed_reviewer_response`
   - `escalated_to_founder: true`
   - `offending_response`: string when one offender, list-of-strings when ≥2 (stable order: codex first per the `REVIEWERS` enum), repo-root-relative path shape
   - `parse_error`: same string-or-list shape, index-aligned with `offending_response`
   - `codex_response`/`cursor_response`: `codex.md`/`cursor.md` if the file exists (independent of malformed status), `null` otherwise
   - `patch_commit_sha: null`, `next_round: null` (round is terminal)
   The body is a short human-readable enumeration listing each offender + first-line parse error, plus a pointer to `raw/internal/queue-errors.md` for the regeneration handshake. The two-phase shape ensures a doubly-malformed round produces one combined.md naming both offenders rather than short-circuiting on the first.

3. **AC3 — `combined.schema.json`.** Strict additive change: appended `malformed_reviewer_response` to the `combined_verdict` enum, declared optional `offending_response` (`oneOf` string with path pattern `^backlog/reviews/[^/]+/r\d+/[a-z]+\.md$` OR array of same pattern with `minItems: 2`), declared optional `parse_error` (`oneOf` string OR array of strings with `minItems: 2`). No removals, no `required` change — every existing valid combined.md remains valid. Conditional required-ness (these fields MUST appear when verdict is malformed) is enforced by `combine.py` emission, not by schema.

4. **AC4 — `queue-errors.md` append in the same commit.** On the malformed branch, `combine.py`'s `main()` appends one row per offender to `raw/internal/queue-errors.md` in the format `<UTC>Z MALFORMED-REVIEWER-RESPONSE: combine.py round <item_id>/r<N> offending_response=<repo-root-relative path> parse_error="<one-line excerpt>"` — matching the existing `<UTC>Z EVENT-TOKEN: …` shape used by `push-with-retry.sh` in the same file. The subsequent `git add` stages BOTH `combined.md` AND `queue-errors.md` in one commit so the next watcher tick's `git pull --rebase` isn't tripped by a leftover dirty path.

5. **AC5 (observational)** — recorded for the strategist at merge in `review_notes`.

## Files Modified

- `tools/review-queue/_lib.py` — `parse_frontmatter` now wraps `yaml.safe_load` with `yaml.YAMLError → ValueError`, surfaces `problem_mark.line+column+1` when available (+19, −1 lines).
- `tools/review-queue/combine.py` — split `build_combined` into a phase-1 collect + phase-2 emit; added `build_malformed_combined` helper; `main()` now stages `combined.md` + `queue-errors.md` together on the malformed branch (+130, −5 lines).
- `tools/review-queue/schemas/combined.schema.json` — new enum value + two new optional properties (+18, −1 lines).
- `tests/review-queue/schemas.test.ts` — 4 new fixtures (AC3a–AC3d): valid string, valid array(2), invalid array(1), invalid item-relative path (+57, 0 lines).
- `tests/review-queue/yaml-error-handling.test.ts` — new file, 2 it() blocks (AC1a embedded-quote + AC1b tab-in-flow-mapping) (+62 lines).
- `tests/review-queue/combine-malformed-response.test.ts` — new file, 2 it() blocks (AC2a single-offender + AC2b dual-offender) (+225 lines).

Branch: `agent/reviewer-emission-yaml-validation`. Pushed head: `69809e2573db57efc9519a7aa72f3b31ac6b26db`.

## Decisions Made During Implementation

### Decision 1: `_lib.parse_frontmatter` raises `ValueError`, not a custom exception

- **Options considered:** (a) raise `ValueError` (as the existing code already does for two other failure modes); (b) introduce a new typed exception class `MalformedYAMLError`.
- **Chose:** (a).
- **Why:** Spec AC1 explicitly says "converted to `ValueError` with a clear message". `validate.py` already catches `ValueError` for the `no frontmatter` and `not a mapping` cases; reusing it means no edit to `validate.py` and a single typed-failure shape across the three failure modes the helper can raise.
- **Worth founder review?** No — directly mandated by spec.

### Decision 2: `build_malformed_combined` lives in `combine.py` alongside the normal `build_combined`

- **Options considered:** (a) inline the malformed branch inside `build_combined`; (b) extract a sibling helper called from `build_combined`.
- **Chose:** (b).
- **Why:** The malformed path is genuinely different — it doesn't go through `compute_combined_verdict`, doesn't build the convergent/divergent tables, doesn't run the cross_ref matching. Inlining it would have produced an irregular early-return inside an otherwise linear pipeline. Sibling helper keeps each function's mental model tight. Per the spec's atomic-write guidance, `build_malformed_combined` uses the same return shape (`{"frontmatter": ..., "body": ...}` + extra keys) so the existing `write_combined` + atomic-link path is reused as-is.
- **Worth founder review?** No — clearly within the spec's design intent ("Restructure as a collect-then-emit pass").

### Decision 3: Phase-1 collect iterates only over reviewer files that exist on disk

- **Why:** combine.py's existing `find_eligible_rounds` allows a round to become eligible via timeout even when one or both reviewer files are missing. The malformed-response failure mode requires the file to be PRESENT but unparseable. So a missing reviewer file is NOT a malformed response — it's a regular single-reviewer-timeout / no-responses case. The phase-1 check uses `.exists()` before attempting `parse_frontmatter`, mirroring the prior behavior; the malformed branch only triggers when files are present + unparseable. AC2 spec is silent on this edge but the structural reading is unambiguous (the `single_reviewer_timeout` + `no_responses` enum values stay valid; `malformed_reviewer_response` covers a strictly different shape).
- **Worth founder review?** Low-risk; mentioning for completeness.

### Decision 4: `parse_error` is one-line-flattened with `" ".join(s.split())`

- **Why:** PyYAML's parser error messages can include newlines (the "expected ... but found ..." stem on one line, a multi-line context indicator on the next). The spec's queue-errors.md row format uses `parse_error="<one-line excerpt>"` — a literal one-line shape. Flattening whitespace runs to single spaces before serialization keeps both the frontmatter `parse_error` field and the queue-errors.md row readable and grep-friendly. The schema doesn't constrain `parse_error` shape beyond `string`, so this is implementation choice.
- **Worth founder review?** No.

### Decision 5: Repo-root-relative path resolution via `Path.resolve().relative_to(repo_root.resolve())`

- **Why:** Tests pass `--repo-root=<tmpdir>`. The temp dir on macOS resolves through `/private/var/...` symlinks. Without `.resolve()` on both sides, `relative_to` raises `ValueError: ... is not in the subpath`. Resolving both sides normalizes through the symlink chain.
- **Worth founder review?** No — defensive path arithmetic, no behavioral surface.

## Acceptance Criteria Status

- [x] **AC1 — Reviewer-side validation gate rejects malformed YAML cleanly.** `_lib.parse_frontmatter` raises `ValueError(f"{path}: malformed YAML at line N column M: <problem>. Regenerate ...")`. `validate.py` catches it via the existing handler → exit 1, no traceback. Tests AC1a (embedded-quote, the real 040 R1 incident) + AC1b (tab inside flow mapping) both pass.

- [x] **AC2 — `combine.py` defensive parse on round read.** Phase-1 collect + phase-2 emit implemented. `build_combined` returns a malformed-shape result with `combined_verdict: malformed_reviewer_response`. Test AC2a verifies string-shape `offending_response` + string `parse_error` + queue-errors row + clean git status. Test AC2b verifies array shape (codex first), index-aligned parse_error array, TWO queue-errors rows (proving phase-1 collected both before emit), clean git status.

- [x] **AC3 — Schema additions.** New enum value + two new optional properties added to `combined.schema.json`. 4 new fixtures in `schemas.test.ts` cover all four shape-cases.

- [x] **AC4 — queue-errors.md append on AC2 escalation.** `combine.py` `main()` opens `raw/internal/queue-errors.md` in append mode and writes the `<UTC>Z MALFORMED-REVIEWER-RESPONSE: …` row before staging. The subsequent `git add` includes the queue-errors path. AC2a/AC2b assertions verify both the row presence AND the post-commit clean working tree.

- [ ] **AC5 — Empirical measurement.** Observational only; strategist records founder-activation count in `review_notes` at merge time. No code change.

## Tests Run

Targeted test files (the four AC test surfaces) ran clean:

```
$ npx vitest run tests/review-queue/yaml-error-handling.test.ts
 ✓ tests/review-queue/yaml-error-handling.test.ts (2 tests) 370ms
 Test Files  1 passed (1)
      Tests  2 passed (2)

$ npx vitest run tests/review-queue/schemas.test.ts
 ✓ tests/review-queue/schemas.test.ts (17 tests) 2809ms
 Test Files  1 passed (1)
      Tests  17 passed (17)

$ npx vitest run tests/review-queue/combine-malformed-response.test.ts
 ✓ tests/review-queue/combine-malformed-response.test.ts (2 tests) 4913ms
 Test Files  1 passed (1)
      Tests  2 passed (2)

$ npx vitest run tests/review-queue/combine.test.ts
 ✓ tests/review-queue/combine.test.ts (14 tests) 1657ms
 Test Files  1 passed (1)
      Tests  14 passed (14)
```

Full review-queue suite:

```
$ npx vitest run tests/review-queue/
 Test Files  1 failed | 8 passed (9)
      Tests  1 failed | 55 passed (56)
```

The one failure is **pre-existing and unrelated to 042**:

```
FAIL  tests/review-queue/concurrency.test.ts > review-queue concurrency + timeout
      > orphan .tmp.* older than 30 min is cleaned up by combine.py
AssertionError: expected true to be false
  expect(existsSync(stale)).toBe(false);
```

`concurrency.test.ts` is not in `files_to_modify`. The failing test exercises orphan-tmp cleanup (combine.py's `cleanup_orphans`) which I did not touch. I confirmed the failure is reproducible on baseline `main` (`9669c11`) before any of my edits land. **Per spec Out-of-Scope rules and the drift-event template, I did not investigate or fix the pre-existing failure** — it belongs in a separate followup item.

Spec target: 47 passing at 041 merge → 51 at 042 merge (+4 it() blocks in 2 new files). Actual: 47 → 55 (+8: +2 yaml-error-handling, +2 combine-malformed-response, +4 schema fixtures in the existing file). The +4 schema-fixture delta is what AC3's test plan describes ("4 fixtures … 0 new files") but the spec's "Net" line only tallied new-file deltas. Strictly more test coverage; no regressions on prior tests.

Wider test suite (untouched surfaces — exec_skill, daemon, mcp, watchers, etc.):

```
$ npx vitest run
 Test Files  1 failed | 52 passed | 1 skipped (54)
      Tests  1 failed | 795 passed | 21 skipped (817)
```

Same single failure (`concurrency.test.ts` orphan cleanup). No new regressions introduced.

## Open Questions for Founder

None blocking review. One observational note for the strategist:

- **AC5 measurement vehicle.** This item's own review cycle is the test bed for "founder activations during a post-041 review cycle". The launchd reviewer is operational per 041 AC2; cursor is accept-degradation per 041 AC6. Recording in `review_notes` at merge is the strategist's job per the spec; my run log just notes the timing window: from the moment `r1/request.md` is pushed for this item until `combined.md` is pushed, every founder activation should be tallied.

## Anything I Almost Did But Stopped Myself

1. **The pre-existing `concurrency.test.ts` orphan-cleanup failure.** I traced it quickly while debugging my AC2 tests — it looked like the `cleanup_orphans` function in `combine.py` may not be receiving the stale .tmp.* file's path correctly in a temp-dir test fixture (or possibly a stat-mtime epoch-vs-now mismatch). **I stopped immediately.** It's outside `files_to_modify` for 042; the spec's Out-of-Scope §1 explicitly says "No changes to combine.py's finding-enumeration logic. The double-folding / dropped / double-listed behaviors observed in 041 R1+R2 are a separate followup". By the same logic the concurrency-test bug is a separate followup. Pattern caught: "While I'm in here, let me also fix this adjacent test" — drift Pattern 1. Did not write a `DRIFT-` note because I caught the temptation before acting on it; flagging here for the strategist to file (or not) as a followup.

2. **Updating reviewer-prompt step-5 prose** in `review-queue-codex.md` / `review-queue-cursor.md`. The spec lists both in `spec_refs` with the caveat "touch only if AC1's behavior needs surfacing". After implementing AC1, the new behavior surface is: a failed `validate.py` invocation now reports `malformed YAML at line N column M: …` instead of a Python traceback. The existing Step 5 prose in both prompts already describes "validate before commit; on failure, regenerate response without committing" (per 041 AC4). The new typed message slots into that handshake without requiring prose changes. **Did not touch the prompts.**

3. **Refactoring `serialize_frontmatter` to force a flow style for short lists.** While debugging my AC2b test's `parse_error` block-vs-flow detection, I considered making the YAML output more predictable. **Rejected:** spec is explicit ("AC2's combined.md output must use the same atomic-write pattern (`os.link`) as the existing combine.py write path — don't introduce a second pattern"). I changed the test to parse YAML properly via Python instead of guessing serialization shape — cleaner outcome with zero implementation change.

## Next Suggested Backlog Items (Don't Auto-Create)

1. **Investigate pre-existing `concurrency.test.ts` orphan-cleanup failure.** Either a stat-mtime test fixture flake or an actual regression in `combine.py`'s `cleanup_orphans` after 041's refactors. Reproducible on baseline `main` independent of 042.

2. **Once 042 is merged, retire the `_followups.md` "🔴 AC3 reviewer-emission validation gap" entry.** Strategist task per spec's "After Completion" notes — replace 🔴 with ✅ + this item's spec_commit_sha.
