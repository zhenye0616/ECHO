---
id: 2026-05-12-040-watcher-state-executable-test
title: Watcher post-combine state machine — executable test of AC3.5 (b) (closes Codex R4 LOW #1)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-12
claimed_by: null
claimed_at: null
branch: null
head_sha: null
agent_notes: null
spec_refs:
  - backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md   # Parent item; AC3.5 prose lives in its slash-commands; R4 LOW #1 is the gap this closes
  - .claude/commands/review-queue-watch.md                                # Lines 33-73 — the (a)/(b)/(c) prose being made executable
  - tests/review-queue/combine.test.ts                                    # Lines 288-342 — existing AC3.5 (a)/(b)/(c) fixtures cover combine.py OUTPUTS only; new tests sit alongside and cover the WATCHER post-combine transition
  - tools/review-queue/combine.py                                         # Today's behavior: combine.py leaves next_round=null; the watcher promotes it. New helper must preserve this contract.
  - tools/review-queue/request.py                                         # The script the new helper invokes to write r{N+1}/request.md
  - tools/review-queue/_lib.py                                            # Frontmatter parse + REPO_ROOT — reuse, do not duplicate
  - tools/review-queue/schemas/                                           # request.schema.json + reviewer.schema.json + combined.schema.json — helper writes into combined.md frontmatter (next_round) so schema-validate after write
  - CLAUDE.md                                                             # Founder-gate semantics — the helper executes a dispositioned decision; it does NOT auto-decide (a)/(b)/(c). Strategist disposition still owns the call.
blocked_by: []
suggested_builder: any  # Pure helper-script extraction + integration test; no app-specific knowledge. Strategist-as-builder (Claude Code) is fine — this is the strategist's own dispatch path being hardened. An independent builder is also fine.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
review_notes: null
---

## Why this now

This item is the **AC6b loop-close empirical test** for item 039 (see `backlog/_followups.md` lines 503-516 + the parent spec's §After Completion §5). 040 is the first qualifying spec to enter the new file-backed review-queue. Per the 039 followup: *"If the next spec requires any manual reviewer-dispatch message from founder, that is an AC6b empirical failure."* The work itself is small and self-contained, which makes it a clean signal: any failure of the queue surfaces as queue mechanics, not as scope mass.

It also closes Codex R4 LOW #1 (the load-bearing AC3.5 (b) transition is currently verified by reading slash-command prose, not by an executable assertion).

## Goal

Make the watcher's post-combine state machine — the (a)/(b)/(c) transition documented in `.claude/commands/review-queue-watch.md` lines 33-73 — falsifiable by an integration test that drives a single helper script. Today's `combine.test.ts:288-342` fixtures cover what `combine.py` outputs; they do **not** cover what the watcher does between `combine.py` and `request.py`. This item makes that gap go away.

The shape: extract the (b)-branch shell sequence — `request.py <item_id> <N+1> ... && git add r{N+1}/request.md && set next_round=N+1 in combined.md` — into a single helper script (`tools/review-queue/dispatch-next-round.py`). The watcher slash-command becomes a thin caller of that helper. The integration test then constructs a `combined.md` whose disposition implies (b), runs the helper, and asserts the two load-bearing post-conditions: `r{N+1}/request.md` exists with the correct `spec_commit_sha`, and `next_round: <N+1>` is set in the prior round's `combined.md` (validated against `combined.schema.json`).

## Acceptance Criteria

**AC1 — Helper script extracted.** `tools/review-queue/dispatch-next-round.py` exists. Signature:

```
dispatch-next-round.py <item_id> <current_round> \
  --verdict={proceed, proceed_after_patches, pushback} \
  --patches-applied={true, false} \
  --class={narrow, structural-reform} \
  --focus-hints=<str> \
  [--repo-root=<path>]                   # test-override
```

Behavior:
- **(a) verdict=proceed AND patches-applied=false** → no-op success (exit 0). Asserts `next_round` is already `null` in `r{N}/combined.md`; emits nothing else.
- **(b) patches-applied=true** → invokes `request.py <item_id> <N+1> --class=<class> --focus-hints=<str>`; on its success, opens `r{N}/combined.md`, sets `next_round: <N+1>` in the frontmatter (preserving formatting + body), schema-validates the result against `combined.schema.json`, writes atomically via the link-rename pattern already used in `request.py`. Returns exit 0 on success.
- **(c) verdict=proceed_after_patches AND patches-applied=false (explicit waiver)** → writes the literal `verification waived; rationale: <inherited from --focus-hints>` line into combined.md (preserved as a body addition, NOT a frontmatter field — the existing prose puts it in the body); leaves `next_round: null`. Returns exit 0.
- **Race-loser semantics** mirror `request.py`'s §AC2: if `r{N+1}/request.md` already exists at the same `spec_commit_sha`, exit 0 idempotent; at a different SHA, exit 2 with diagnostic.

**AC2 — Watcher slash-command updated to call the helper.** `.claude/commands/review-queue-watch.md` Step 3 (the (a)/(b)/(c) post-disposition prose) is rewritten so the actual file-mutation steps are a single `dispatch-next-round.py` invocation. The strategist's judgment (filling in the `Disposition` column) is preserved verbatim — the helper executes the dispositioned decision; it does not auto-decide. The committed-spec-patch step (the `git add <spec_file> && git commit` for inline-applied patches in case (b)) stays separate and BEFORE the helper invocation, since the helper depends on the patched SHA being the `spec_commit_sha` for r{N+1}.

**AC3 — Executable (b) test.** New file `tests/review-queue/watcher-state.test.ts` (or appended to existing `combine.test.ts` — builder's call) with at least three fixtures:

1. **(b) positive — load-bearing transition.** Construct an item directory + r1/{request.md, codex.md, cursor.md} where both reviewers landed `proceed_after_patches` on a convergent HIGH finding. Run `combine.py` (drives the existing input shape). Run `dispatch-next-round.py <item_id> 1 --verdict=proceed_after_patches --patches-applied=true --class=narrow --focus-hints="<canned>"`. Assertions:
   - `backlog/reviews/<item_id>/r2/request.md` exists.
   - That file's `spec_commit_sha` matches the HEAD SHA at helper-invocation time (test passes a fixed `--spec-sha` through to `request.py` via the override flag if `request.py` exposes one; otherwise the test pins HEAD before invocation).
   - `backlog/reviews/<item_id>/r1/combined.md` frontmatter now reads `next_round: 2`; the body is unchanged byte-for-byte except for that single frontmatter field. The combined.md after-state schema-validates.

2. **(a) negative — no transition.** Mirror fixture 1 but both reviewers land `proceed` with `[]` findings. Run `combine.py`. Run `dispatch-next-round.py <item_id> 1 --verdict=proceed --patches-applied=false --class=narrow --focus-hints=""`. Assertions:
   - `r2/request.md` does **not** exist.
   - `r1/combined.md` frontmatter `next_round` remains `null`.
   - Helper exits 0.

3. **(b) race-loser — idempotent re-invocation.** After fixture 1's transition, immediately re-invoke the helper with the same arguments at the same SHA. Assertions:
   - Exit 0 (idempotent).
   - `r2/request.md` content is byte-identical (no rewrite, no `_lib.py`-style temp-file leak in `r2/`).
   - Re-invocation at a **different** simulated `--spec-sha` (mock or test-only override) exits 2 with the schema-drift diagnostic from `request.py`.

A (c) fixture is optional but encouraged — assert the literal waiver-line is appended to the body and `next_round` stays `null`.

**AC4 — All existing review-queue tests still pass.** `npm test -- tests/review-queue/` must report no regressions. The existing AC3.5 (a)/(b)/(c) fixtures in `combine.test.ts:288-342` keep passing (they assert combine.py outputs; this item adds **complementary** assertions on the watcher post-combine step — not replacements).

**AC5 — Helper has its own one-line `tools/review-queue/test-dispatch-next-round.sh`** (mirroring `test-reviewer-prompt.sh` + `test-watcher-prompt.sh` conventions in the same directory). Runs the helper end-to-end against a tmpdir fixture and exits 0 on success. Hooked into the same conventions the 039 builder established; not invoked from vitest (which already has full coverage via AC3) but available for ad-hoc shell debugging.

**AC6 (loop-close meta) — Zero founder dispatch messages.** Per the 039 AC6b gate, this item's review rounds must run through the new queue (`backlog/reviews/2026-05-12-040-.../r{N}/request.md` written by the strategist, responses by reviewers, combine + disposition by the watcher) with **zero** manual messages from founder to reviewers. If founder is asked to manually dispatch a review at any round, mark AC6 failed in the merge `review_notes`, file the failure mode in `backlog/_followups.md` under the 040 section, and bounce to a follow-up item with priority HIGH. AC6 is **observed**, not implemented — it is the live-test verdict.

## Out of Scope (Don't Drift)

- **Auto-disposition of the convergent/divergent tables.** The strategist still fills the `Disposition` column by hand; the helper executes the result. Auto-disposition is a separate, larger item (would require LLM judgment encoded as code).
- **New verdicts** beyond `{proceed, proceed_after_patches, pushback}`. The reviewer.schema.json enum is frozen by 039; widening it is V1.6+ territory and would invalidate the cross-tool review history's verdict baseline.
- **The watcher's polling / tick body.** This item touches Step 3 (the post-combine state machine) only. Step 1 (scan for ready-to-combine rounds) and Step 2 (run combine.py) stay as-is.
- **Modifying `combine.py` outputs.** combine.py keeps emitting `next_round: null`; the watcher (now via this helper) promotes it. The 039 contract that combine.py is observation-only and the watcher is the dispatcher is preserved exactly.
- **Founder-escalation paths.** Single-reviewer-timeout / no-responses / proceed↔pushback boundary crossing — those are AC3 in 039, not AC3.5. Don't touch them.
- **Schema changes.** `combined.schema.json` already permits `next_round: integer | null`; no schema edit needed. If a schema gap surfaces, file a follow-up; do not patch the schema inline.
- **The 039 wiki promotion bundle.** That is strategist work owed separately (`wiki/surfaces/review-queue.md` + the journal principle page + the operating-model note). Do not touch wiki/ from this item.

## After Completion (Strategist Notes)

When this item lands in `backlog/complete/`:

1. **Cross out 039 R4 LOW #1** in `backlog/_followups.md` line 505 (the watcher-state executable test entry) — mark `✅ DONE 2026-05-12 (item 040)` with the merge SHA.
2. **AC6b empirical verdict** — record in this item's `review_notes` whether the live-test gate fired clean or whether founder had to manually dispatch any review round. Either outcome is data; document both honestly.
3. **No wiki promotion specific to 040.** The (a)/(b)/(c) state machine will be documented as part of the future `wiki/surfaces/review-queue.md` page (still owed from 039). When that page is written post-039, the (b) transition section should reference `tools/review-queue/dispatch-next-round.py` instead of inline prose. Add a one-line breadcrumb to the 039 wiki-promotion debt entry noting the helper exists.
4. **Heuristic data point** — log in `raw/internal/dogfooding/mcp-interactions-journal.md` whether 040 settled in 1 round (narrow class, mechanical extraction) or more. The 039 followup line 516 calls for two more data points (040, 041) to lock the "structural reforms ≈ 3 rounds, narrow features ≈ 1-2 rounds" heuristic; 040 is data point one.
5. **If AC6 fails** (founder dispatch messages were needed) — file the failure mode as `2026-05-XX-041-...` with the specific friction observed. Do not patch 039 inline; surface to backlog per the 039 loop-close memory note.

## Test list (for the reviewer/builder)

- `tests/review-queue/watcher-state.test.ts` (new) — fixtures (b)+, (a)−, (b) race-loser; optional (c)
- `tests/review-queue/combine.test.ts:288-342` (unchanged — keeps asserting combine.py outputs)
- `tools/review-queue/test-dispatch-next-round.sh` (new) — shell smoke
- `npm test` — full suite, expect 782+2 = 784 pass / 21 skipped (existing 42/42 review-queue suite grows to ~44-45)
- `npm run typecheck` — clean
- `npm run lint` — clean

## Implementation hints (non-binding)

- Mirror `tools/review-queue/request.py`'s argparse + `_lib.py`-based atomic write pattern. The link-rename idiom and the REPO_ROOT resolution are already there.
- The watcher slash-command's `Step 3` prose is currently 40 lines of shell. The post-extraction version should be ~10 lines: disposition narrative + a single `dispatch-next-round.py` invocation + the per-branch (a)/(b)/(c) chooser. Don't over-engineer; the strategist still reads + executes the prose, and the prose should remain human-readable for the strategist's judgment step.
- For AC3 fixture 3 (race-loser at different SHA), if `request.py` doesn't expose a `--spec-sha` test override today, you may add one minimally (it already accepts `--repo-root` for tests) — that is in-scope mechanical glue, not scope expansion.
