---
id: 2026-05-12-042-reviewer-emission-yaml-validation
title: Reviewer emission YAML validation — make malformed-YAML rejection a typed first-class failure (reviewer-side gate at commit + combine.py defensive parse on round read)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-12
spec_commit_sha: ""
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-13T05:06:42Z"
branch: "agent/reviewer-emission-yaml-validation"
head_sha: ""
agent_notes: ""
spec_refs:
  - backlog/complete/2026-05-12-041-reviewer-background-execution.md   # 041 wired validate.py into commit-reviewer-response.sh (AC4); this item closes the unhandled-YAML-error path validate.py still leaks
  - backlog/complete/2026-05-12-040-watcher-state-executable-test.md    # 040 R1 produced the canonical failure: Cursor cursor.md had `finding: ""embedded quote..."`; yaml.parser.ParserError leaked from combine.py with full traceback; queue stalled; strategist hand-patched cursor.md
  - backlog/_followups.md                                                # "🔴 AC3 reviewer-emission validation gap" entry (filed 2026-05-12 ~03:00 PDT, line 522) — this item is its scoped resolution
  - tools/review-queue/validate.py                                       # Catches jsonschema.ValidationError + ValueError; does NOT catch yaml.YAMLError; needs the gap closed
  - tools/review-queue/_lib.py                                           # parse_frontmatter calls yaml.safe_load() directly; YAMLError propagates unwrapped — the actual source of the traceback
  - tools/review-queue/combine.py                                        # Reads reviewer responses via _lib.parse_frontmatter on each round; per AC2 must convert YAML-parse failure to escalated_to_founder combined.md instead of crashing
  - tools/review-queue/commit-reviewer-response.sh                       # The reviewer-side commit helper; AC4 of 041 made it invoke validate.py; AC1 here ensures validate.py actually rejects malformed YAML
  - tools/review-queue/schemas/{reviewer,combined}.schema.json           # Combined-schema additions per AC3: append `malformed_reviewer_response` to `combined_verdict` enum + declare optional `offending_response` (oneOf string/array, minItems:2) + declare optional `parse_error` (oneOf string/array, minItems:2). `escalated_to_founder` already present.
  - .claude/commands/review-queue-codex.md                               # Step 5 prose; touch only if AC1's behavior needs surfacing
  - .claude/commands/review-queue-cursor.md                              # Same
  - raw/internal/queue-errors.md                                         # Append-only queue-error sink; AC4 here writes one row per AC2 escalation
  - CLAUDE.md                                                            # Founder-gate semantics — 042 stays inside per-round mechanics; no new founder checkpoint introduced
blocked_by: []
suggested_builder: any  # Pure Python (3 files in tools/review-queue/) + 2 new pytest-or-vitest tests + 1 schema addition. Reviewer prompt prose edits if any are trivial.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
review_notes: ""
---

## Summary

The cross-tool review queue (item 039, generalized by item 041 to background-execute) has one remaining failure mode that crashes the loop and forces founder intervention: a reviewer emits a `cursor.md` (or `codex.md`) whose frontmatter YAML is syntactically invalid. The current code path leaks `yaml.YAMLError` (subclasses: `ParserError`, `ScannerError`, `ConstructorError`) as an uncaught traceback from both:

1. **Reviewer side** — `commit-reviewer-response.sh` invokes `validate.py` post-write; `validate.py` calls `_lib.parse_frontmatter`; `parse_frontmatter` calls `yaml.safe_load`; YAML-parse failure → uncaught `YAMLError` → traceback → non-zero exit, but with no clean error message and no obvious "regenerate without committing" instruction.
2. **Strategist watcher side** — `combine.py` opens each reviewer-response via the same `_lib.parse_frontmatter`; YAML-parse failure → traceback → watcher tick crashes → queue stalls until someone (today: the founder + strategist together) hand-patches the offending file.

Both halves of this failure are the same bug-class with two blast radii. 042 closes them as one item.

The canonical case that surfaced this gap was 040 R1 (~2026-05-12 02:33 PDT): Cursor wrote `finding: ""embedded literal quote and surrounding text..."`. YAML read the first `""` as an empty scalar and choked on the trailing text. The strategist inline-patched `cursor.md` (outer `"` → outer `'`); the queue resumed; the incident was filed as the "🔴 AC3 reviewer-emission validation gap" entry in `_followups.md`.

The next instance of this failure-class **will** recur the moment any reviewer cites text containing a literal double-quote character, an unescaped tab inside a flow-style mapping, a colon in an unquoted value, or any of the other normal YAML hazards. The reviewer prompts can't be relied on to perfectly escape arbitrary cited text; the queue mechanics must absorb the defect without founder intervention.

This item also serves the **AC8 empirical test** carried forward from 041: it is the first qualifying post-041 spec; its review cycle is the measurement vehicle for "did founder activations drop to 0–1 with the launchd reviewer running?" Strategist records the observation in `review_notes` at merge.

## Acceptance Criteria

### AC1 — Reviewer-side validation gate rejects malformed YAML cleanly

**Implementation.** `tools/review-queue/_lib.py:parse_frontmatter` already calls `yaml.safe_load`. Wrap the call so a `yaml.YAMLError` (the base class — covers `ParserError`, `ScannerError`, and friends) is converted to `ValueError` with a clear message including the path, the YAML error's `problem` + `problem_mark.line`+`column` if available, and the suggested user action ("regenerate response with valid YAML; do not hand-edit committed reviewer files").

`tools/review-queue/validate.py` already catches `ValueError` and exits 1 with the message. After the `_lib` wrap, the existing `validate.py` plumbing automatically produces a clean exit-1-with-message instead of a traceback when YAML parsing fails. **No change needed in `commit-reviewer-response.sh`** — it already invokes `validate.py` before `git add` per 041 AC4; once `validate.py` exits cleanly on YAML failure, the helper aborts the commit with a clean reviewer-visible error.

**Test.** New file `tests/review-queue/yaml-error-handling.test.ts` (matches directory convention — all existing review-queue tests are `.test.ts` using vitest, shelling out to `python3 tools/review-queue/validate.py` via `child_process`):
- **AC1a** — vitest test shells out to `python3 tools/review-queue/validate.py reviewer <fixture>` against a fixture `cursor.md` whose `finding:` value contains the literal `""embedded quote..."` pattern from the real 040 R1 incident. Asserts: exit code 1, stderr matches `/malformed YAML.*line \d+/i`, stdout silent.
- **AC1b** — same shape against a fixture `cursor.md` with a stray tab character inside a flow-mapping (a different YAML failure mode, to prove AC1a isn't only catching ParserError). Same assertions.

### AC2 — combine.py defensive parse on round read

**Implementation — two-phase.** Identify every call site in `combine.py` where a reviewer-response file is loaded (today: via `_lib.parse_frontmatter`). Restructure as a collect-then-emit pass so multi-failure rounds produce a single combined.md that lists all malformed responses:

1. **Phase 1 — collect.** Iterate every reviewer-response file expected for this round (`r<N>/codex.md`, `r<N>/cursor.md`, future reviewers). For each, attempt `_lib.parse_frontmatter`. On `ValueError` (the typed exception now raised after AC1's `_lib` wrap), record a `(path, parse_error_string)` tuple in a `malformed_responses` list. On success, proceed with normal merging logic.
2. **Phase 2 — emit (only if `malformed_responses` is non-empty).** Compose a `combined.md` for this round with frontmatter fields:
   - `combined_verdict: malformed_reviewer_response` (new enum value — see AC3)
   - `escalated_to_founder: true`
   - `offending_response: <repo-root-relative path>` **if `len(malformed_responses) == 1`** — string shape, e.g. `backlog/reviews/<item_id>/r<N>/cursor.md`
   - `offending_response: [<path1>, <path2>, ...]` **if `len(malformed_responses) >= 2`** — array-of-strings shape, every path repo-root-relative
   - `parse_error: <stringified ValueError>` **if `len == 1`** — single string
   - `parse_error: [<err1>, <err2>, ...]` **if `len >= 2`** — array of strings, index-aligned with `offending_response`
   - `codex_response: codex.md | null` (per existing schema — independent of malformed status; null only when literally absent)
   - `cursor_response: cursor.md | null` (same)
   - `patch_commit_sha: null`
   - `next_round: null`
3. **Body text:** a short human-readable explanation enumerating each malformed response and its error (e.g. "Reviewer response at `backlog/reviews/<item_id>/r<N>/cursor.md` failed YAML parse with: `<msg>`. Reviewer must regenerate. Strategist + founder: see `raw/internal/queue-errors.md` for the full incident log and the regeneration handshake.").
4. **Write atomically** (`os.link` from a `combined.md.<pid>.tmp` per the existing pattern in combine.py).
5. **Commit + `push-with-retry.sh`** (existing helper) — the commit MUST stage **both** the new `combined.md` AND the appended row in `raw/internal/queue-errors.md` (see AC4) in a single commit. Bare `git add r<N>/combined.md` is insufficient: it leaves the queue-errors.md append as a tracked modification in the worktree, which then trips the next tick's `git pull --rebase`. Use `git add <combined.md path> raw/internal/queue-errors.md` together. Post-commit assertion (used by AC2a/AC2b tests): `git status --short` returns either empty or contains only paths outside the queue write surface (`backlog/reviews/<item_id>/r<N>/` + `raw/internal/queue-errors.md`).
6. **Exit 0** (watcher tick proceeds; combine.py's "one round per tick" property holds; the next tick will skip this round because `combined.md` exists and is terminal).

**Builder note on path base.** All `offending_response` paths in `combined.md` frontmatter, in test fixtures, and in error messages MUST be **repo-root-relative** (e.g. `backlog/reviews/2026-05-12-042-.../r1/cursor.md`). The shorter item-directory-relative form (`r1/cursor.md`) is forbidden; pick this base consistently so builders + downstream consumers don't have to guess. AC2a and AC2b fixture assertions verify exact path strings.

**Test.** New file `tests/review-queue/combine-malformed-response.test.ts`:
- **AC2a** — fixture round with `r1/request.md` valid + `r1/codex.md` valid + `r1/cursor.md` malformed (same 040 R1 pattern). Invoke `combine.py` against the round. Assert: exit 0; `r1/combined.md` exists; frontmatter has `combined_verdict: "malformed_reviewer_response"` + `escalated_to_founder: true` + `offending_response: "backlog/reviews/<item_id>/r1/cursor.md"` (string shape, repo-root-relative — NOT `r1/cursor.md`); `parse_error` is a string; no Python traceback on stderr; **post-combine `git status --short` is empty inside the fixture repo** (the AC4 queue-errors.md append landed in the same commit as combined.md; nothing tracked is left dirty).
- **AC2b** — fixture round with **both** `codex.md` AND `cursor.md` malformed. Assert: `offending_response` is a list of length 2 with both repo-root-relative paths in stable iteration order (codex first per the reviewer enum order); `parse_error` is a list of length 2 index-aligned with `offending_response`; combine.py must have parsed (and recorded errors for) BOTH files, not short-circuited on the first; **post-combine `git status --short` is empty** (same cleanliness invariant as AC2a).

### AC3 — Schema additions to `combined.schema.json` (existing schema, additive only)

**Context.** The current `tools/review-queue/schemas/combined.schema.json` (frozen by 039) has:
- A `combined_verdict` field (string, enum: `proceed | proceed_after_patches | pushback | divergent | single_reviewer_timeout | no_responses`)
- An `escalated_to_founder` field (boolean) — already present
- `additionalProperties: false` at the top level — meaning any new field must be declared explicitly

**Implementation.** Three additive changes to the schema, no removals, no renames:

1. **Append `malformed_reviewer_response` to the `combined_verdict` enum.** New enum becomes: `proceed | proceed_after_patches | pushback | divergent | single_reviewer_timeout | no_responses | malformed_reviewer_response`. Strict superset — every existing valid combined.md remains valid.

2. **Declare two new optional properties under `properties:`:**
   - `offending_response`:
     ```json
     "offending_response": {
       "oneOf": [
         { "type": "string", "pattern": "^backlog/reviews/[^/]+/r\\d+/[a-z]+\\.md$" },
         { "type": "array", "items": { "type": "string", "pattern": "^backlog/reviews/[^/]+/r\\d+/[a-z]+\\.md$" }, "minItems": 2 }
       ]
     }
     ```
     The pattern enforces repo-root-relative path shape (closes Finding 3). `minItems: 2` on the array variant prevents the single-failure case from sneaking through as a 1-element list — AC2's string-vs-array choice is canonical.
   - `parse_error`:
     ```json
     "parse_error": {
       "oneOf": [
         { "type": "string" },
         { "type": "array", "items": { "type": "string" }, "minItems": 2 }
       ]
     }
     ```
     Same shape discipline as `offending_response`. Array index alignment with `offending_response` is a runtime invariant enforced by combine.py (not the schema).

3. **No change to `required`** — both new fields are optional at the schema level. They MUST be present when `combined_verdict == "malformed_reviewer_response"`, but that conditional is enforced by `combine.py` emission logic (and tested in AC2a/AC2b), not by jsonschema (which can't express conditional required-ness cleanly without `if/then`).

**No new `reason` field.** Earlier draft introduced a `reason` field separate from `combined_verdict`; reviewer's Finding 1 correctly identified this as redundant. The enum value `malformed_reviewer_response` carries the reason; no separate `reason` key.

**Test.** Update `tests/review-queue/schemas.test.ts` to add one fixture per shape:
- Fixture #1 — `combined_verdict: malformed_reviewer_response` + `offending_response: "backlog/reviews/.../r1/cursor.md"` (string) + `parse_error: "<msg>"` (string) → must validate.
- Fixture #2 — same + array variants (length 2) → must validate.
- Fixture #3 — array variant with length 1 → must FAIL (the `minItems: 2` gate).
- Fixture #4 — `offending_response: "r1/cursor.md"` (item-relative, not repo-root) → must FAIL (the pattern gate).

### AC4 — queue-errors.md append on AC2 escalation

**Implementation.** On AC2's catch path (after the combined.md write but before exit), append one row to `raw/internal/queue-errors.md` matching the **exact format already used by `push-with-retry.sh`** in the same file: UTC ISO 8601 timestamp + space + EVENT-TOKEN + colon + diagnostic text. Pattern:

```
2026-05-XX HH:MM:SSZ MALFORMED-REVIEWER-RESPONSE: combine.py round <item_id>/r<N> offending_response=<repo-root-relative path> parse_error="<one-line excerpt>"
```

The format choice is deliberately NOT a Markdown bullet and NOT local PDT, despite the Builder Discipline preference for PDT in human artifacts (line 179). Reason: `queue-errors.md` is a machine-parseable operational log (already grepped by `push-with-retry.sh`'s race-fallback logic), not a human-narrative artifact like the dogfooding journal. Existing rows in this file ALL use the `<UTC>Z EVENT-TOKEN: ...` form; AC4 must stay in that form so future `grep`-based readers don't have to handle two shapes.

This is the only mutating-write to a shared file outside `backlog/reviews/<round>/` — same surface `push-with-retry.sh` already writes to, same append-only handshake, no new contention.

**Test.** AC2's existing unit test asserts the new queue-errors.md row exists after the combine.py run (open file, grep last 5 lines for the `round_id`).

### AC5 — AC8 empirical measurement (observational, recorded at merge)

**No code change.** Strategist records in this spec's `review_notes` at merge time:
- Number of founder activations during 042's own review cycle (Codex + Cursor combined).
- Per-activation: the trigger, the reviewer affected, the recovery action taken.
- Target: 0.
- If >0: cite the specific friction observed and file 043 against it.

The Codex reviewer launchd job is already installed (per 041 AC2); Cursor remains accept-degradation per 041 AC6 (single_reviewer_timeout path). Strategist watcher runs in active session. The full path from `request.md` push to `combined.md` push should require zero founder physical activations.

## Out of Scope (Don't Drift)

- **No changes to `combine.py`'s finding-enumeration logic.** The double-folding / dropped / double-listed behaviors observed in 041 R1+R2 are a separate followup; conflating them with this item dilutes both reviews.
- **No new escalation surfaces beyond `escalated_to_founder` in combined.md + the existing queue-errors.md append.** Don't add Slack pings, don't add a daemon notifier, don't add a separate `escalations/` directory.
- **No changes to the reviewer prompts beyond a single-line note** (if any) acknowledging the gate. Don't restructure Step 5; don't introduce a new step.
- **No changes to `push-with-retry.sh`.** Its retry semantics are already correct for both the AC2 success path (combined.md push) and the AC4 path (queue-errors.md append).
- **No new schema fields beyond AC3's actual additions** — two optional properties (`offending_response`, `parse_error`) and one enum value (`malformed_reviewer_response`) added to the existing `combined_verdict` enum. Don't introduce `severity: critical` or `recovery_state: ...` or any other field "while we're in there".
- **Don't touch `validate.py` beyond the AC1 _lib wrap.** Its current contract (jsonschema + parseability) is correct; the only bug is the leaked `YAMLError`.
- **Don't add YAML schema validation as a separate AC.** jsonschema already gates structural correctness; YAML parseability is what's missing. They compose; don't conflate.

## Test Plan Summary

| AC | New test file | New it() blocks | Notes |
|---|---|---|---|
| AC1 | `tests/review-queue/yaml-error-handling.test.ts` | 2 (AC1a + AC1b) | Real cursor.md fixtures from 040 R1 + a second YAML-failure-mode fixture |
| AC2 | `tests/review-queue/combine-malformed-response.test.ts` | 2 (AC2a + AC2b) | Real round fixture; assert escalation stub uses `combined_verdict` field + repo-root-relative `offending_response` paths; AC2b verifies the two-phase collect (BOTH files parsed before emit) |
| AC3 | Update `tests/review-queue/schemas.test.ts` fixtures | 0 new files | 4 fixtures: valid string, valid array(≥2), invalid array(1) → reject, invalid item-relative path → reject |
| AC4 | Folded into AC2's tests | 0 new files | queue-errors.md row check |

Net: +2 test files, +4 it()/test() blocks. Existing review-queue suite was 47 at 041 merge → should be 51 at 042 merge.

## Builder Discipline Reminders

- Read `spec_refs` before any code.
- AC1 is ~3-5 lines in `_lib.py` + 1-2 lines in `validate.py` if any (likely zero). Don't refactor `parse_frontmatter`'s signature.
- AC2's combined.md output must use the same atomic-write pattern (`os.link`) as the existing combine.py write path — don't introduce a second pattern.
- The AC2 escalation does NOT call `dispatch-next-round.py`. The round is terminal (`next_round: null`). Founder + strategist handle recovery out-of-band.
- AC4's queue-errors.md row uses **UTC ISO 8601 with `Z` suffix** (e.g. `2026-05-12T23:57:09Z MALFORMED-REVIEWER-RESPONSE: ...`) to match the existing `<UTC>Z EVENT-TOKEN: ...` format used by `push-with-retry.sh` in the same file. This intentionally diverges from `feedback_local_time_in_human_artifacts.md`'s PDT preference because `queue-errors.md` is a machine-parseable operational log, not a human-narrative artifact — see AC4 implementation note above.
- If you find a related bug while in `combine.py` (e.g., the finding-enumeration audit), log it in `raw/internal/decisions/` as a drift-event and STOP. File it as a separate followup. Do not inline-fix.

## After Completion (Strategist Notes)

**No new wiki page.** This is operating-mechanics inside the existing review-queue surface (covered by `wiki/operating-model/cross-tool-spec-review.md` and `wiki/operating-model/one-session-coordination-loop.md`).

After merge, strategist should:

1. **Verify the AC8 measurement landed in `review_notes`** — this is the load-bearing dogfooding output of 042, not the code change. If the count is 0, that's the empirical close on the 039/041 dogfooding gate.
2. **Update `wiki/operating-model/cross-tool-spec-review.md`** with one sentence acknowledging that reviewer-emission YAML validation is now mechanically enforced (gate at reviewer-commit + defensive parse at combine.py) and that the failure-recovery handshake is `escalated_to_founder: true` in `combined.md` + a row in `queue-errors.md`. Reference 042's spec_commit_sha at merge.
3. **Cross out the "🔴 AC3 reviewer-emission validation gap" entry in `_followups.md`** (line 522 at time of filing) with a ✅ cross-out + commit SHA.
4. **Regenerate the wiki index** via `tools/wiki_index.py` if the cross-tool-spec-review.md page changed.
5. **If AC8 count was >0**: file 043 with the specific friction. This spec assumes the count is 0; if it's not, that itself is the most valuable finding.
