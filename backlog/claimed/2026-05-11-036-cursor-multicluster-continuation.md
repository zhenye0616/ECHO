---
id: 2026-05-11-036-cursor-multicluster-continuation
title: Cursor multi-cluster continuation capture — stop silently dropping post-checkpoint assistant bubbles (M1-1 sub-gap D)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-11
spec_refs:
  - src/capture/extractors/cursor.ts                          # extractCursorTurns lines 590-612 — the V1.5.7 fast-forward to revise; line numbers approximate, anchor on the comment block starting "Gap 2 (V1.5.7..."
  - backlog/complete/2026-05-10-034-cursor-capture-coverage.md  # Out-of-Scope explicitly preserved V1.5.7's silent skip; this item is the corollary that closes the resulting gap
  - backlog/_followups.md                                     # Entry "🔴 KNOWN GAP — Cursor multi-cluster agent runs" — empirical diagnosis, three option sketches (A/B/C), strategist lean Option A
  - raw/internal/dogfooding/mcp-interactions-journal.md       # 2026-05-10 23:17 PDT + 23:30 PDT entries — empirical walkthrough on composer 4f02b335 (10/21 = 47.6% capture rate); 2026-05-11 00:07 PDT entry confirming Cursor atoms absent from a resume cluster
  - raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md  # Schema reality: bubbles still in bubbleId:/composerData: (NOT agentKv:)
blocked_by: []
suggested_builder: cursor-claude  # Per founder memory "delegate Cursor-domain work to Cursor's Claude" (deliberate dogfooding pattern); any builder is acceptable since this is pure extractor logic, no Cursor-IPC

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-11T08:35:11Z"
branch: "agent/cursor-multicluster-continuation"
worktree: "~/Desktop/Project_echo--cursor-multicluster-continuation"
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Context

Item 034 (shipped 2026-05-10) closed M1-1 sub-gaps A (mid-stream cadence) + B (tool-call bubble parsing). Item 035 (shipped 2026-05-10) closed sub-gap C (`tail_session` repo-scoping). Both items deliberately preserved the V1.5.7 streaming-continuation fast-forward in `extractCursorTurns` (explicit Out-of-Scope rule in 034: *"Do NOT reduce `orphan_assistant_bubble` warning frequency further"*).

That preservation is correct for the case it was designed for — coalescing Cursor's "more bubbles appended into a turn that was already fully captured at an earlier partial state" pattern, which produced ~902K spam warnings on the OLD `bubbleId:` layer before V1.5.7 quieted it. But 034's AC4 dogfooding on composer `4f02b335-4b1d-4bd1-a9fa-2e0d76ae5e56` (2026-05-10 23:17 PDT, journal) surfaced a fourth M1-1 sub-gap that the V1.5.7 fix is now actively creating:

**Sub-gap D — Cursor agent-mode runs are structurally multi-cluster against 034's 15 s cadence.** A typical Cursor agent-mode response writes 20-40 assistant bubbles over 20-60 s (one user question → thinking bubble → tool-call frames → file-edit narration → verdict turn). 034's 15 s periodic re-poll captures the first N bubbles as one atom and sets `lastSeenMap[<composer>] = <last assistant bubble in that cluster>`. The next tick finds that the checkpoint now lands on an assistant bubble and the V1.5.7 fast-forward at `cursor.ts` `extractCursorTurns` (the block starting `if (checkpoint !== undefined && bubbles[i]!.role === 'assistant') { while (i < bubbles.length && bubbles[i]!.role === 'assistant') i += 1; }` around lines 605-612) silently advances `i` past every remaining assistant bubble. Those bubbles never become atoms.

**Empirical scope from the 4f02b335 composer (the load-bearing data point):**

- 1 user message, 26 consecutive assistant bubbles in SQLite ground truth.
- 11 bubbles captured as ONE atom on the first cadence tick (40,601 chars). Last captured: an assistant bubble.
- 15 follow-on assistant bubbles silently dropped by V1.5.7's fast-forward — including the **verdict turn** ("ECHO says the latest real state is: 034 landed and was merged as 7362d88..."), the analysis paragraph ("There are two overlapping threads..."), and the action narration ("I'm appending a short dogfooding journal entry...").
- AC4 capture rate per 034's formula: 10/21 = 47.6 % (P1 territory). The 10/11 hit rate on the first cluster is correct; the missing 15 are all from V1.5.7's silent skip.

**Why M1-1 isn't structurally closed without this:** the founder's load-bearing daily workflow is *cross-tool spec review*, which is **agent-mode by nature** (Cursor reviews specs by reading files = tool calls). M1-1's demo bar of "≥ 90 % capture rate on a real review session" is unreachable while V1.5.7 is silently dropping the second-and-onwards clusters of every agent-mode run. The 034 + 035 + 036 trilogy becomes a tetralogy; 036 is the last piece.

**Cross-tool review confirmation:** the 2026-05-11 00:07 PDT journal resume call returned a rank-1 cluster with `source_breakdown={git:23, claude_code:36}` — **zero Cursor atoms** despite extensive Cursor agent-mode activity in the same window on composer `4f02b335`. The cross-tool resume pattern is degraded today; 036 fixes it.

# Goal

When the V1.5.7 fast-forward branch fires (checkpoint lands on an assistant bubble AND more assistant bubbles follow before the next user bubble or end-of-stream), emit a **continuation atom** containing the new bubbles instead of silently skipping them. Demo bar: founder runs a 5-10 min Cursor agent-mode review, calls `mcp__echo__search_memories(query='<distinctive phrase from the verdict turn>', source_app='cursor')`, gets ≥ 1 match returned. Today this returns 0 even though the phrase is in SQLite.

# In Scope (Acceptance Criteria)

### AC1 — Continuation atom emission in `extractCursorTurns`

Replace the silent fast-forward block in `extractCursorTurns` (`src/capture/extractors/cursor.ts`, the block immediately following the comment that begins `// Gap 2 (V1.5.7, surfaced 2026-05-08 17:01 PDT v1.5-livetest):`) with logic that emits a continuation turn instead of skipping.

**Contract:**

When `checkpoint !== undefined && bubbles[startIdx].role === 'assistant'`:

1. Collect every consecutive assistant bubble at `bubbles[startIdx ...]` into a `continuationCluster: ParsedBubble[]` until role flips to `user` or end of array.
2. If `continuationCluster.length === 0`, no-op (the existing case where the checkpoint pointed at the very last bubble and nothing new arrived — short-circuit cleanly, no atom emitted, no warning).
3. Otherwise, walk backwards from the checkpoint bubble to find the **preceding user bubble** in the same `bubbles[]` array (it should be there — `byComposer` collects all bubbles for the composer, not just post-checkpoint). Call its index `userIdx`. Use `bubbles[userIdx]` for the continuation atom's `user_message` and `user_bubble_id`.
4. If no preceding user bubble is found within `bubbles[]` (truly anomalous — would mean every prior bubble in the composer is also an assistant, which doesn't match any observed Cursor flow), log `warn('continuation_no_preceding_user', { composer_id, checkpoint })` and fall back to the existing silent-skip behavior. This is the defensive guard; it should never fire in practice.
5. Emit a `CursorTurn` matching the existing turn shape, with two additional fields populated:
   - `is_continuation: true`
   - `continuation_of_assistant_bubble_id: <checkpoint>` (the assistant bubble id that lastSeenMap was pointing at)
6. Update `lastSeenMap` to the last bubble of the continuation cluster — same mechanism as a normal turn, no special-case bookkeeping (the existing `lastSeenMap.set(turn.composer_id, turn.assistant_bubble_id)` line at the candidate-accepted path handles this uniformly).
7. Advance the main loop index past the continuation cluster: `i = startIdx + continuationCluster.length`, then `continue` the outer loop so any subsequent user→assistant turns later in the same `bubbles[]` array (rare but possible — a third user message landing in the same tick) emit cleanly.

**CursorTurn shape extension:**

```ts
export interface CursorTurn {
  // ... existing fields unchanged ...

  // True when this turn is a continuation of a prior atom's assistant cluster
  // for the same user message (Cursor wrote more bubbles after the prior
  // capture tick's checkpoint). Omitted (not `false`) on normal turns to
  // preserve the no-bloat property on the 99% case where this never fires.
  is_continuation?: true;

  // The assistant bubble id that the prior atom's `assistant_bubble_id`
  // pointed at — i.e., the checkpoint value at the moment this continuation
  // was emitted. Consumer join key: `continuation_of_assistant_bubble_id`
  // here ↔ `assistant_bubble_id` on the prior atom. Always present when
  // `is_continuation: true`; always absent otherwise.
  continuation_of_assistant_bubble_id?: string;
}
```

**Metadata extension at atom emission (`handleGlobalChange` in `cursor.ts`):**

When `turn.is_continuation === true`, the candidate metadata gets two additional keys:

- `metadata.is_continuation: true`
- `metadata.continuation_of_assistant_bubble_id: <turn.continuation_of_assistant_bubble_id>`

Both keys are **omitted entirely** on normal turns (matching the existing `bubble_text_sources` no-bloat pattern from 034).

**Content shape for continuation atoms:**

`content` is built the same way as normal turns: `\`USER: ${turn.user_message}\n\nASSISTANT: ${turn.assistant_message}\``. The same user_message text appears on both the prior atom and the continuation atom — this is intentional and load-bearing: it means `search_memories(query='<user phrase>')` returns BOTH atoms, so a consumer searching for the user's question gets the full assistant response across both atoms without having to know about the continuation_of join. Consumers that DO care about deduping a logical turn join on `continuation_of_assistant_bubble_id`.

### AC2 — `extractCursorTurns` returns continuation turns in chronological order

The existing trailing sort at the end of `extractCursorTurns` (`turns.sort((a, b) => a.assistant_created_at - b.assistant_created_at)`) covers this for free — continuation turns have `assistant_created_at = last.createdAt` of the continuation cluster, which is strictly greater than the prior atom's `assistant_created_at`. Verify the sort still produces the correct ordering when one tick emits both a continuation atom AND a fresh user→assistant turn arriving later in the same `bubbles[]` array (AC3 Test 4 covers this).

### AC3 — Test coverage

All tests live in `tests/capture/extractors/cursor.test.ts` **outside** the existing `describe.skip('startCursorExtractor (lifecycle + integration)', ...)` quarantine block (per 034 / item 023). Tests target the pure `extractCursorTurns` function directly, and the `triggerRepoll` test seam from 034 for the integration cases.

**Test plan (minimum 6 new cases):**

- **Test 1 — Single continuation, single composer (the load-bearing case):** seed 1 user bubble + 3 assistant bubbles. Run `extractCursorTurns` with an empty `lastSeenMap`. Assert 1 turn returned with `assistant_bubble_ids.length === 3`, `is_continuation === undefined`. Then set `lastSeenMap[<composer>] = <2nd assistant's bubble_id>`. Seed 2 MORE assistant bubbles into the fixture (now 5 assistants total for the same user, simulating Cursor continuing the response). Run `extractCursorTurns` again with the populated map. Assert 1 turn returned with `is_continuation === true`, `continuation_of_assistant_bubble_id === <2nd assistant's bubble_id>`, `assistant_bubble_ids` containing exactly the 3rd, 4th, and 5th assistant ids, `user_bubble_id` matching the original user bubble id, `user_message` matching the original user text verbatim.

- **Test 2 — Empty continuation short-circuit:** seed 1 user + 3 assistants. Run with `lastSeenMap[<composer>] = <last assistant's bubble_id>`. Assert 0 turns returned, no warnings logged. This is the "checkpoint already at the end" case — Cursor wrote nothing new since last tick.

- **Test 3 — Continuation followed by a fresh user→assistant turn:** seed 1 user + 2 assistants + 1 user + 1 assistant. Set `lastSeenMap[<composer>] = <first user's first assistant>`. Run `extractCursorTurns`. Assert 2 turns returned, sorted by `assistant_created_at`: (1) a continuation turn (`is_continuation: true`, `continuation_of_assistant_bubble_id` = first assistant) with `assistant_bubble_ids = [second assistant's id]`, then (2) a normal turn for the second user→assistant pair (`is_continuation: undefined`).

- **Test 4 — Continuation across multiple composers in one tick:** seed two composers, each with the multi-cluster shape from Test 1. Assert both continuation atoms are emitted, both carry the right `composer_id` + `continuation_of_assistant_bubble_id` for their respective composers (no cross-pollination).

- **Test 5 — Defensive guard fires when no preceding user is in the bubble array:** craft a pathological fixture where `bubbles[]` for a composer is `[assistant, assistant, assistant]` only (no user ever — would be a true anomaly). Set checkpoint to the first assistant. Run `extractCursorTurns`. Assert 0 turns emitted AND `log.warn` called with `continuation_no_preceding_user` (use a `logSpy` matching the existing test conventions in the file). Subsequent fast-forward to end of array completes silently.

- **Test 6 — End-to-end via 034's `triggerRepoll` test seam:** start `startCursorExtractor` with `exposeTestHooks: true` against an in-memory SQLite fixture seeded with 1 user + 3 assistants. Reset checkpoint via `__testHooks.setLastSeenScanMtime(0)`. Trigger repoll. Assert 1 atom appended to storage. Seed 2 more assistants into the SQLite fixture. Touch the WAL file mtime so 034's family-max-mtime guard advances. Trigger repoll again. Assert a SECOND atom appended whose `metadata.is_continuation === true` and `metadata.continuation_of_assistant_bubble_id` matches the prior atom's `metadata.assistant_bubble_id`. Verify by reading both atoms back from the test storage.

Full suite must remain green (zero new failures, zero new skips outside these tests).

### AC4 — Dogfooding verification (post-merge, founder or strategist)

After merge + daemon kickstart, founder or strategist (NOT the builder agent) runs:

1. Open Cursor; start a fresh agent-mode composer; have a 5-10 minute conversation that includes ≥ 3 tool calls within a single user→assistant turn so the response is structurally multi-bubble across at least one 15 s cadence tick.
2. Within 60 s of the LAST assistant bubble being written, call `mcp__echo__search_memories(query='<distinctive 3-4 word phrase from the LATER bubbles — e.g., the verdict turn>', source_app='cursor')`.
3. Expected: ≥ 1 match returned with `metadata.composer_id` matching the test composer.
4. Re-run 034's AC4 capture-rate formula (`Capture rate = |captured_bubble_ids| / N_eligible_bubbles` where `captured_bubble_ids` is the set union of `metadata.assistant_bubble_ids[]` across atoms — continuation atoms count toward the same union since the join is via set membership, not atom count).
5. Expected: ≥ 90 % capture rate. If two consecutive dogfooding runs on different days both ≥ 90 %, M1-1 is empirically + structurally closed.

If a run lands in 60-89 %, file a narrow follow-up item against the residual loss path (most likely candidate: a bubble-write that races with `triggerRepoll`'s mtime read — a single inFlight-coalescing guard would dedupe). < 60 % → file P1 item; revisit at the next strategist conversation.

Log every dogfooding run to `raw/internal/dogfooding/mcp-interactions-journal.md` using the 6-field template, including explicit `Read sources` listing the SQLite ground-truth bubble count vs ECHO atom count.

### AC5 — Wiki + followups housekeeping (post-merge, strategist task)

Folded into "After Completion" section below. Not a builder-agent acceptance.

# Out of Scope (Don't Drift)

- **Do NOT modify the existing first-cluster emission path.** The user → assistant cluster loop starting at `while (i < bubbles.length)` is correct for normal turns; this item ONLY changes the `if (checkpoint !== undefined && bubbles[i]!.role === 'assistant')` branch that currently silently skips. Don't refactor adjacent logic for cleanliness while you're there.
- **Do NOT touch chokidar setup, debounce, or 034's `triggerRepollExtraction` / `maxGlobalDbFamilyMtime` machinery.** All of those are correct as shipped; 036's fix is upstream of them in `extractCursorTurns`.
- **Do NOT touch the tool-call fallback chain (`tryExtractToolFormerText` / `tryExtractFileDiffText` / `tryExtractCodeBlocksText` / `tryExtractThinkingText`).** Those are 034 territory; continuation atoms inherit the same parser chain transparently because the new assistant bubbles flow through the same `parseBubbleRow`.
- **Do NOT introduce a new MCP wire surface.** Continuation atoms appear as regular atoms via `search_memories` / `tail_session` / `find_clusters` / `get_atoms` — no new tool, no new field projection rules, no new envelope-cap handling. The two new metadata keys (`is_continuation`, `continuation_of_assistant_bubble_id`) flow through `WIRE_SHAPE_CAPS`'s existing per-key projection like any other metadata key.
- **Do NOT update normalization layer adapters (`src/normalize/adapters/cursor.ts`) to promote `is_continuation` to a top-level field.** The Cursor adapter narrow-emission follow-up is a separate `_followups.md` entry; mixing it in here dilutes the demo bar.
- **Do NOT change the existing `assistant_bubble_id` semantics.** It's still the LAST bubble in the emitted cluster — for a continuation atom that's the last bubble of the continuation cluster, NOT the original turn's last bubble. The `continuation_of_assistant_bubble_id` is the join key back to the prior atom; `assistant_bubble_id` remains the resume checkpoint.
- **Do NOT add an `inFlight: boolean` guard for race coalescing on `triggerRepoll`.** 034's review surfaced this as a non-blocking optional follow-up; correctness already holds via `lastSeenMap` idempotence. If 036's AC4 capture rate lands < 90 % and the residual loss is empirically attributable to that race, file a separate item; do not pre-emptively fix.
- **Do NOT touch Option B (hold-the-pairing-open) or Option C (update-in-place re-emission).** Option A (continuation atom emission) was the strategist lean during the diagnosis (per `_followups.md` 036 entry); Option B introduces latency cost and Option C breaks the append-only substrate model. 036 is Option A only.
- **Do NOT extract `agentKv:blob:` content.** Same Out-of-Scope rationale as 034 — content-addressed dedupe storage, not a chat-schema replacement; chat turns remain in `bubbleId:` / `composerData:` (2026-05-09 diagnosis correction).

# Implementation Notes

- The `extractCursorTurns` function returns a flat `CursorTurn[]` array. Adding continuation turns to this array preserves the existing caller contract — `handleGlobalChange` iterates `for (const turn of turns)` and treats every turn uniformly. The only change at the call site is the two new optional metadata keys.
- `processCandidate` and the capture-gate path: continuation atoms flow through the same chokepoint as normal atoms. The candidate's `source: \`fs:${globalDbPath}\`` is identical; only the metadata differs. No capture-gate change required.
- `lastSeenMap` semantics: a continuation atom's last assistant bubble becomes the new `lastSeenMap[<composer>]` value. The next tick's checkpoint walk lands on THAT bubble; if Cursor keeps streaming, another continuation atom emits on the next tick, with `continuation_of_assistant_bubble_id` chaining to this one. The chain is linear; consumers traversing it walk from atom N → N-1 → ... → N=0 (the original turn, where `is_continuation` is absent).
- The "walk backwards to find preceding user" step is a simple `for (let k = checkpoint_index - 1; k >= 0; k--) if (bubbles[k].role === 'user') { userBubble = bubbles[k]; break; }`. It runs once per continuation emission per composer per tick, in-memory; cost is microseconds even for composers with hundreds of bubbles.
- Search semantics: a query matching the user's question phrase will return BOTH the original atom AND every continuation atom for that turn (because each atom's content carries `USER: <same text>` as a prefix). This is intentional and load-bearing — it makes the search recovery primitive robust to the multi-cluster structure without requiring consumer join logic. Consumers that want a deduplicated logical-turn view group on `metadata.user_bubble_id` (same id across the prior + continuation atoms of one logical turn).
- Logging: emit a single `log.info('continuation_atom', { composer_id, continuation_of_assistant_bubble_id, n_new_bubbles })` at the moment the continuation cluster is collected, BEFORE the candidate emission. This is the diagnostic breadcrumb for AC4's dogfooding journal entries.
- No new configuration knob. No env var. The continuation behavior is unconditional once 036 ships — there's no behavioral regression risk because the pre-036 code dropped these bubbles silently; post-036 the same bubbles surface as atoms.

# After Completion (Strategist Notes)

**Wiki promotion pass after item lands in `complete/`:**

1. `wiki/capture/cursor-extractor.md` — add a "Multi-cluster continuation atoms" subsection documenting (a) when continuation atoms emit (post-checkpoint assistant bubbles before next user), (b) the `is_continuation` + `continuation_of_assistant_bubble_id` metadata contract, (c) the consumer join pattern (group atoms by `metadata.user_bubble_id` for a deduplicated logical-turn view). Append to the existing 034 "Capture cadence" + "Bubble shape coverage" subsections.
2. `wiki/capture/per-app/cursor-collected-data.md` — extend the "Captured fields" table with two rows: `metadata.is_continuation` (optional `true`, present only on continuation atoms) and `metadata.continuation_of_assistant_bubble_id` (optional, present iff `is_continuation === true`).
3. `wiki/architecture/system-architecture.md` — no change expected (capture-layer fix below the architectural diagram's resolution).
4. `backlog/_followups.md` — move the entry titled "🔴 KNOWN GAP — Cursor multi-cluster agent runs" under "From 034 merge" to a "Resolved (V1.6 wave — items 034 + 035 + 036)" subsection with this item's merge SHA + the AC4 dogfooding-verification entry timestamps.
5. **Strategic re-evaluation:** apply 034's AC4 capture-rate calculation against the post-036 daemon. ≥ 90 % on two consecutive agent-mode dogfooding runs → M1-1 is structurally + empirically closed; the M1-1 trilogy-to-tetralogy framing in the 2026-05-10 / 2026-05-11 dogfooding journal entries is complete.
6. **Item 031 deprecation gate:** 036's merge + ≥ 1 week of post-merge dogfooding evidence (per the gating rule in `_followups.md`'s 031 entry) closes the second dimension of the 031 deprecation gate ("atoms exist for queries to hit" — partial-close noted in the 2026-05-11 00:07 PDT journal entry becomes full-close). Trigger the 031 deprecation conversation in the next strategist pass once the dogfooding cadence is established.
7. **Cross-tool spec-review pattern promotion:** the dogfooding journal between 2026-05-10 22:01 PDT (R1 of 034) and 2026-05-11 00:07 PDT (resume call missing Cursor atoms) is now a complete empirical record of the cross-tool spec-review workflow firing live on the very item that fixes it. Worth promoting to `wiki/operating-model/cross-tool-spec-review.md` as the canonical reference case, alongside the 034 R1/R2 convergence analysis.

**Wiki creation deferred:** no new wiki page (extensions of existing pages, not new surface).

**Naming reminder:** the M1-1 sub-gap taxonomy now has four entries (A: cadence, B: parse, C: resolver, D: multi-cluster continuation). When 036 lands, M1-1 is structurally closed; the next M1-2 work (semantic ranking / verdict-turn finding) becomes the load-bearing remaining item per founder direction 2026-05-10 20:08 PDT ("the hardest — saved till the end").
