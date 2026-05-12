---
id: 2026-05-12-042-reviewer-emission-yaml-validation
title: Reviewer emission YAML validation — make malformed-YAML rejection a typed first-class failure (reviewer-side gate at commit + combine.py defensive parse on round read)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-12
spec_commit_sha: ""
claimed_by: ""
claimed_at: ""
branch: ""
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
  - tools/review-queue/schemas/{reviewer,combined}.schema.json           # Combined-schema addition: `escalated_to_founder: bool` + `reason: enum[..., malformed_reviewer_response]` if not already present
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

**Implementation.** Identify every call site in `combine.py` where a reviewer-response file is loaded (today: via `_lib.parse_frontmatter`). Wrap each in `try/except ValueError as exc` (the typed exception now raised after AC1's `_lib` wrap — combine.py imports from `_lib`, so the catch is local and obvious). On catch:

1. Compose a `combined.md` for this round with frontmatter fields:
   - `escalated_to_founder: true`
   - `reason: malformed_reviewer_response`
   - `offending_response: <relative path from repo root>`
   - `parse_error: <the stringified ValueError>`
   - `convergent: []`
   - `divergent: []`
   - `verdict: escalated`
   - `next_round: null`
2. Body text: a short human-readable explanation ("Reviewer response at `<path>` failed YAML parse with: `<msg>`. Reviewer must regenerate. Strategist + founder: see `raw/internal/queue-errors.md` for the full incident log and the regeneration handshake.").
3. Write atomically (`os.link` from a `combined.md.<pid>.tmp` per the existing pattern in combine.py).
4. Commit + `push-with-retry.sh` (existing helper).
5. Exit 0 (watcher tick proceeds; combine.py's "one round per tick" property holds; the next tick will skip this round because `combined.md` exists and is terminal).

**Test.** New file `tests/review-queue/combine-malformed-response.test.ts`:
- **AC2a** — fixture round with `r1/request.md` valid + `r1/codex.md` valid + `r1/cursor.md` malformed (same 040 R1 pattern). Invoke `combine.py` against the round. Assert: exit 0, `r1/combined.md` exists, frontmatter has `escalated_to_founder: true` + `reason: malformed_reviewer_response` + `offending_response: r1/cursor.md`, no Python traceback on stderr.
- **AC2b** — fixture round with **both** reviewer responses malformed. Same assertions, but `offending_response` is a list of both paths (or whichever shape AC2's schema lands on — see AC3).

### AC3 — Schema addition (one field, one enum value)

**Implementation.** Add to `tools/review-queue/schemas/combined.schema.json`:
- `escalated_to_founder: { type: boolean }` if not present.
- `reason: { type: string, enum: [..., "malformed_reviewer_response"] }` — append to the existing enum or introduce if absent.
- `offending_response: { oneOf: [{ type: string }, { type: array, items: { type: string } }] }` — captures both AC2a (single) and AC2b (list) cases.
- `parse_error: { type: string }`.

If `combined.schema.json` doesn't currently allow `escalated_to_founder` / `reason`, this is a strict superset addition — no existing valid combined.md becomes invalid.

**Test.** Pre-existing `validate.py combined <fixture>` schema test will fail until the schema lands. Update one fixture or add one.

### AC4 — queue-errors.md append on AC2 escalation

**Implementation.** On AC2's catch path (after the combined.md write but before exit), append one row to `raw/internal/queue-errors.md` matching the existing format used by `push-with-retry.sh`:

```
- 2026-05-XX HH:MM PDT — combine.py escalated round <round_id> to founder: malformed YAML in `<offending_response>` (`<parse_error_one_line>`)
```

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
- **No new schema fields beyond AC3's four.** Don't introduce `severity: critical` or `recovery_state: ...` or any other field "while we're in there".
- **Don't touch `validate.py` beyond the AC1 _lib wrap.** Its current contract (jsonschema + parseability) is correct; the only bug is the leaked `YAMLError`.
- **Don't add YAML schema validation as a separate AC.** jsonschema already gates structural correctness; YAML parseability is what's missing. They compose; don't conflate.

## Test Plan Summary

| AC | New test file | New it() blocks | Notes |
|---|---|---|---|
| AC1 | `tests/review-queue/yaml-error-handling.test.ts` | 2 (AC1a + AC1b) | Real cursor.md fixtures from 040 R1 + a second YAML-failure-mode fixture |
| AC2 | `tests/review-queue/combine-malformed-response.test.ts` | 2 (AC2a + AC2b) | Real round fixture; assert escalation stub, not traceback |
| AC3 | Update `tests/review-queue/schemas.test.ts` fixture | 0 new files | Schema-level coverage |
| AC4 | Folded into AC2's tests | 0 new files | queue-errors.md row check |

Net: +2 test files, +4 it()/test() blocks. Existing review-queue suite was 47 at 041 merge → should be 51 at 042 merge.

## Builder Discipline Reminders

- Read `spec_refs` before any code.
- AC1 is ~3-5 lines in `_lib.py` + 1-2 lines in `validate.py` if any (likely zero). Don't refactor `parse_frontmatter`'s signature.
- AC2's combined.md output must use the same atomic-write pattern (`os.link`) as the existing combine.py write path — don't introduce a second pattern.
- The AC2 escalation does NOT call `dispatch-next-round.py`. The round is terminal (`next_round: null`). Founder + strategist handle recovery out-of-band.
- AC4's queue-errors.md row uses local PDT time per the founder's `feedback_local_time_in_human_artifacts.md` convention. Use Python's `zoneinfo.ZoneInfo("America/Los_Angeles")`.
- If you find a related bug while in `combine.py` (e.g., the finding-enumeration audit), log it in `raw/internal/decisions/` as a drift-event and STOP. File it as a separate followup. Do not inline-fix.

## After Completion (Strategist Notes)

**No new wiki page.** This is operating-mechanics inside the existing review-queue surface (covered by `wiki/operating-model/cross-tool-spec-review.md` and `wiki/operating-model/one-session-coordination-loop.md`).

After merge, strategist should:

1. **Verify the AC8 measurement landed in `review_notes`** — this is the load-bearing dogfooding output of 042, not the code change. If the count is 0, that's the empirical close on the 039/041 dogfooding gate.
2. **Update `wiki/operating-model/cross-tool-spec-review.md`** with one sentence acknowledging that reviewer-emission YAML validation is now mechanically enforced (gate at reviewer-commit + defensive parse at combine.py) and that the failure-recovery handshake is `escalated_to_founder: true` in `combined.md` + a row in `queue-errors.md`. Reference 042's spec_commit_sha at merge.
3. **Cross out the "🔴 AC3 reviewer-emission validation gap" entry in `_followups.md`** (line 522 at time of filing) with a ✅ cross-out + commit SHA.
4. **Regenerate the wiki index** via `tools/wiki_index.py` if the cross-tool-spec-review.md page changed.
5. **If AC8 count was >0**: file 043 with the specific friction. This spec assumes the count is 0; if it's not, that itself is the most valuable finding.
