---
id: 2026-05-10-034-cursor-capture-coverage
title: Cursor capture coverage — mid-stream bubble cadence + tool-call bubble parsing (M1-1)
status: ready
priority: HIGH
estimate: 1.5-2d
created: 2026-05-10
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/capture/extractors/cursor.ts          # Chokidar/debounce loop + parseBubbleRow (the two gaps)
  - src/normalize/adapters/cursor.ts          # Adapter narrow-emission (already a separate _followups item; OUT OF SCOPE here)
  - src/storage/interface.ts                  # CaptureEvent shape (target output)
  - tests/capture/extractors/cursor.test.ts   # Existing extractor tests (extend, don't replace)
  - raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md  # Empirical SQLite-probe baseline; this item builds on its corrected diagnosis
  - backlog/complete/2026-05-09-029-cursor-source-breakdown-falsification.md  # Cadence finding under agent_notes "030-deferral observation" + review_notes "Cursor capture-cadence gap" follow-up
  - raw/internal/dogfooding/mcp-interactions-journal.md  # M1-1 escalation entries (2026-05-10 14:50 / 15:00 / 16:08 PDT) showing review-content silently missing from substring index
  - backlog/_followups.md  # "Cursor adapter narrow-emission enrichment" follow-up (sibling, NOT touched here)
suggested_builder: cursor-claude  # Per founder memory "delegate Cursor-domain work to Cursor's Claude" (deliberate dogfooding pattern)
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
---

# Context

Item 029 (shipped 2026-05-09) corrected the Cursor capture diagnosis: capture is healthy at the *macro* level (657 events on 2026-05-09, 932 the day before, healthy `bubbleId:` writes against the legacy schema). But its Phase 1 falsification surfaced two **micro-level** capture gaps that bite every cross-tool spec-review cycle today:

**Gap A — Mid-stream bubble cadence (the 81% miss rate):**
029 measured a single test composer in agent mode. 12 atoms were captured during the initial composer-creation burst (~110 ms). Then ~52 subsequent user/assistant bubble pairs were written over 80 minutes of active conversation and **produced zero additional events**. That is a 52/64 = ~81% miss rate against ground-truth SQLite content. Root cause hypothesis (from the 029 follow-up note): the chokidar `change` event on the `cursorDiskKV` SQLite family (`state.vscdb` + `-wal` + `-shm`) does not reliably fire on every WAL append during sustained streaming. The 300 ms `DEBOUNCE_MS` coalesces fast bursts into one tick — correct for the burst phase, but the extractor has no periodic re-poll, so when chokidar misses a WAL event the bubbles sit uncaptured until the next chokidar event arrives (which may be many minutes later, on the next WAL checkpoint).

**Gap B — Tool-call bubbles silently dropped at parse:**
`parseBubbleRow` in `src/capture/extractors/cursor.ts` returns `null` when `typeof text !== 'string'`, logged as `unrecognized_bubble_shape` with `reason: 'missing_text'`. Cursor's assistant frames in Agent / Composer modes routinely store their actual content in `toolFormerData` (tool-call frames) or other shape fields, with no top-level `text`. These bubbles are valid assistant turns — they carry the model's review prose, code edits, and pushback content — but the parser drops them. The 2026-05-10 14:50 PDT journal entry confirmed this empirically: bubble `dc15993e-...` carried a 4414-char review in `.text`, but adjacent assistant bubbles in the same composer (tool-call frames) had no `.text` and were silently dropped from capture; the review *was* in SQLite, but `search_memories(source_app='cursor')` returned 0 hits because the captured atoms split the review across un-indexed gaps.

Both gaps are at the **capture layer**, before normalization or MCP wire shaping. They manifest at the consumer surface as "ECHO doesn't see Cursor review-content," forcing cross-tool spec review cycles to fall back to direct SQLite probes with composer IDs the strategist already had to memorize. Today's `/cross-tool-spec-review` pattern is structurally dependent on Cursor producing readable review content; until both gaps close, that dependency is leaky.

Evidence base (in date order):
- 029 `agent_notes` "030-deferral observation": cadence measurement (Gap A).
- 029 `review_notes` follow-up #2 "Cursor capture-cadence gap" (Gap A, escalated to its own item).
- 029 `review_notes` follow-up #1 "Cursor adapter narrow-emission enrichment" — adjacent but distinct (artifact-emission gap, not capture coverage).
- Journal 2026-05-10 14:50 PDT: M1-1 escalation #1 — `search_memories` 0 hits on cursor 032 review (Gap B effect).
- Journal 2026-05-10 15:00 PDT: M1-1 escalation #2 — cursor extractor's `.text` reads return empty for review composer's most-recent bubbles (Gap B narrowed).
- Journal 2026-05-10 16:08 PDT: M1-1 reconfirmed — `tail_session(source_app='cursor')` resolved to unrelated MRU project. That third sub-gap (resolver layer, not capture) is **separately scoped to item 035 candidate** and explicitly out-of-scope here (see "Out of Scope" below).
- **Journal 2026-05-10 22:01 / 22:11 / 22:25 PDT (R1 round dogfooding loop, closed empirically in real time):** Cursor's full 5009-char R1 review of THIS spec never made it into ECHO's substring index — the very gap 034 fixes prevented the strategist from seeing the review via ECHO. Recovery required the SQLite-probe chain (grep `workspace.json` → `composerData WHERE lastUpdatedAt > cutoff` → bubble probe). The dogfooding closed the loop on the spec's own review cycle; the load-bearing observation is that M1-1 is firing live on cross-tool review itself, not just on past incidents.

# Goal

Close the capture-layer coverage gaps so a cross-tool spec review producing Cursor review content in any combination of Cursor modes (legacy chat / Composer / Agent) lands in ECHO's substring index within seconds of being written, not minutes-to-never. Demo bar: founder runs a Cursor agent-mode review of 5-10 minutes, calls `search_memories(source_app='cursor', query='<word from the review>')`, and gets back the review turn. Today: hits = 0.

# In Scope (Acceptance Criteria)

### AC1 — Periodic re-poll for the global `state.vscdb` family

`src/capture/extractors/cursor.ts` adds a periodic re-poll loop that drives a NEW entry path into `handleGlobalChange()`, in addition to the chokidar-driven `scheduleGlobalChange()` path. The two trigger paths share the same downstream serialization (`processing` promise chain + `schedule()` queue) but have **separate entry semantics** — this is load-bearing per R1 Finding 1 from Cursor (see Review history).

**Entry path contract (NEW, additive — does not modify `scheduleGlobalChange`):**

Add a new function (suggested name `triggerRepollExtraction()` — implementer may rename) that:
1. Reads the **max mtime across the global DB family** — i.e., `MAX(safeMtimeMs(state.vscdb), safeMtimeMs(state.vscdb-wal), safeMtimeMs(state.vscdb-shm))`. **Load-bearing per R2 Finding 1 from Codex:** SQLite WAL mode can advance the `-wal` file's mtime while the main `state.vscdb` file's mtime stays stale until the next WAL checkpoint (which may be minutes away under sustained writes). Reading only the main DB's mtime would make the poll miss the exact writes it's meant to recover. The three files are already grouped as one family elsewhere in the extractor (`isGlobalDbFamily` predicate) — reuse the same set here. A small helper `async function maxGlobalDbFamilyMtime(globalDbPath: string): Promise<number>` next to `safeMtimeMs` keeps the call sites tidy.
2. Short-circuits if the family-max mtime has not advanced beyond `lastSeenScanMtime` (closure-local checkpoint, initialized by reading the family-max mtime once at extractor start so the first poll tick is not a spurious scan).
3. Calls `schedule(() => handleGlobalChange('repoll'))` **DIRECTLY** — bypassing `scheduleGlobalChange()`'s `debounceTimer` guard. This is intentional: the debounce guard is correct for coalescing fast chokidar bursts (and stays unchanged), but the periodic poll is a separate trigger source whose ticks must NOT be silently dropped by a pending chokidar debounce.
4. Updates `lastSeenScanMtime` to the read family-max mtime AFTER the `schedule()` call returns (not after the extraction completes — the `processing` chain guarantees serialization even if multiple ticks land before the prior scan finishes).

**Loop machinery:**

- Runs every `CURSOR_REPOLL_INTERVAL_MS` (default: 15_000 ms = 15 s, source constant).
- Started via `setInterval(triggerRepollExtraction, CURSOR_REPOLL_INTERVAL_MS)` inside `startCursorExtractor`, with the handle stored in a closure-local variable (e.g., `repollTimer`).
- `stop()` calls `clearInterval(repollTimer)` BEFORE awaiting the existing `processing` chain so any in-flight tick completes cleanly.
- Logs a single `debug`-level message at the entry of `handleGlobalChange()` with `tick_reason: 'repoll' | 'chokidar'`. The reason is determined by which caller invoked `handleGlobalChange` — pass it as a parameter (`handleGlobalChange(reason: 'repoll' | 'chokidar')`). Do NOT log per chokidar `dispatch` event — only on the actual extraction call (per R1 Finding from Cursor).

**Configuration:** The default value lives as the source constant `CURSOR_REPOLL_INTERVAL_MS` (exported for tests). The only runtime override is the new optional `CursorExtractorOptions.repollIntervalMs` field — **no environment variable is read**, no `process.env.*` lookup is added (per R1 Finding from Cursor). Tests use a small value (e.g., 50 ms) to exercise the loop deterministically without slowing the suite.

**Why 15 s default:** Cursor's chat UX produces user-perceptible bubble appends every 2-20 s during active reviews; a 15 s interval bounds capture latency to ≤ 15 s + DB-scan time (~50-200 ms) while keeping the wakeup-tax low when Cursor is idle (the mtime-guard short-circuits in microseconds). 1 s would be over-eager; 60 s leaves user-visible "ECHO is behind" gaps during dense reviews.

### AC2 — Tool-call / non-text bubble extraction

`parseBubbleRow` in `src/capture/extractors/cursor.ts` (the function that converts a `bubbleId:` SQLite row into a `ParsedBubble`) is extended so a bubble with `typeof text !== 'string'` (or `text === ''`) is no longer silently dropped. The replacement contract:

- If `v.text` is a non-empty string, use it verbatim (preserves current behavior — load-bearing for ~all non-Agent-mode bubbles).
- Else, attempt to derive a non-empty text representation from the following fields, in order: `v.toolFormerData`, `v.attachedHumanChanges?.fileDiff`, `v.codeBlocks` (joined as fenced code blocks — see body guard below), `v.thinkingContent`. Only the **first non-empty** derivation wins (no concatenation across sources — keeps content recognizable). If derived from a non-`text` field, the source tag is recorded **per assistant bubble** in the emitted turn (see `metadata.bubble_text_sources[]` contract below).
- If none of the fallback fields yield non-empty content, fall back to today's behavior: return `null` with `log.warn('unrecognized_bubble_shape', { reason: 'missing_text_and_fallbacks' })`. The warning log is the durable record; no `metadata.dropped_reason` is emitted.

**`codeBlocks` fallback — body guard (R1 Finding 2 from Codex, validated against `extractReferencedFiles` at `src/capture/extractors/cursor.ts`):**

The extractor already uses `codeBlocks` as a path-only structured-context field (`extractReferencedFiles` reads `codeBlocks[].uri.path`). Reusing the same field naively for assistant-prose fallback would turn path-only context into fake assistant text. The body guard:

- `tryExtractCodeBlocksText(v)` returns `string | null`.
- Returns null if `v.codeBlocks` is not an array OR is empty.
- For each entry, reads `entry.content` (string) and `entry.code` (string) — these are the actual code-body fields, distinct from `entry.uri.path`.
- If at least one entry has a non-empty `content` OR non-empty `code`, return the joined fenced code (one block per entry, language from `entry.languageId` if present).
- If **all** entries have only `uri.path` and no body, return null. Do NOT emit fake assistant prose from referenced-file lists.

The shapes of `toolFormerData`, `attachedHumanChanges.fileDiff`, and `thinkingContent` are variable across Cursor versions — the implementer writes `tryExtractToolFormerText(v)`, `tryExtractFileDiffText(v)`, `tryExtractThinkingText(v)` as defensive parsers that return `string | null` (empty string treated as null). All parsers are top-level functions next to `parseBubbleRow`, exported for test access, ≤ 30 lines each, and treat every shape mismatch as `return null` — never throw.

The precedence order is by likelihood of carrying user-visible content; the implementer may reorder based on dogfooding evidence as long as deterministic precedence is preserved.

**`metadata.bubble_text_sources[]` per-bubble attribution (R1 Finding 1 from Codex):**

A single emitted `CursorTurn` concatenates ≥ 1 consecutive assistant bubbles (see the existing assistant-cluster loop in `extractCursorTurns`). Different bubbles in the cluster MAY have different text sources — the load-bearing example: bubble 1 has `.text`, bubble 2 derives from `toolFormerData`, bubble 3 derives from `codeBlocks`. Singular `metadata.bubble_text_source` cannot represent this; the field is **plural** and recorded per-bubble:

- `metadata.bubble_text_sources` is an array of strings, one entry per assistant bubble in `assistant_bubble_ids[]`, in the same order.
- Each entry is one of: `'text'`, `'toolFormerData'`, `'fileDiff'`, `'codeBlocks'`, `'thinkingContent'`.
- The field is **omitted entirely** if every bubble in the cluster used the primary `text` field (the 99% no-Agent-mode case), preserving the existing no-bloat property on the typical Cursor atom's metadata.
- The field is **present** as soon as ANY bubble used a fallback source. Bubbles that used primary `text` in a mixed-cluster turn still get the explicit `'text'` entry so the array length stays equal to `assistant_bubble_ids.length` (no implicit defaulting — consumers can read the array directly without cross-referencing).

**Stale-comment cleanup (R1 Finding 5 from Codex — in scope as a mechanical fixup while touching this file):**

The streaming-continuation comment in `extractCursorTurns` (the block immediately before the assistant-cluster fast-forward loop) currently says "proper fix is the `agentKv:` schema rewrite (Path B, V1.6+; Cursor moved to a new storage namespace on 2026-05-01 and the bubbleId: table has been frozen since)". That comment was written under the V1.5.7 misdiagnosis and was empirically corrected on 2026-05-09 (see `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md`). Update the comment to point at this item's corrected understanding — one-line edit, no semantic change to the fast-forward logic itself.

**Decision: tool-call frames captured this way are NOT split into multiple atoms.** They become part of the same user→assistant turn pairing per the existing assistant-cluster logic in `extractCursorTurns`. The clustering treats them as continuations.

### AC3 — Test coverage

Three test families. **All AC3 tests live OUTSIDE the existing `describe.skip('startCursorExtractor (lifecycle + integration)', ...)` quarantined block in `tests/capture/extractors/cursor.test.ts`** — that block is the chokidar/FSEvents-lifecycle quarantine from item 2026-05-08-023, and adding tests inside it would inherit the flake. AC3 tests target **pure functions and the new `triggerRepollExtraction` entry path via `__testHooks`** (see test-seam contract below), NOT the chokidar watcher.

**Test-seam contract (R2 Finding 4 from Codex + R2 Medium #2 from Cursor — both reviewers caught this):** `triggerRepollExtraction` lives inside `startCursorExtractor` as a closure-local function and is NOT exported. To make AC3 tests reachable, `CursorExtractorHandle` gains an **optional `__testHooks` field**, populated only when a new `exposeTestHooks?: true` option is set in `CursorExtractorOptions` (production callers do not set this; the field stays `undefined`). The `__testHooks` shape:

```ts
interface CursorExtractorTestHooks {
  /** Invoke the repoll entry path once. Resolves after the scheduled extraction completes. */
  triggerRepoll(): Promise<void>;
  /** Read the current checkpoint (for assertions). */
  getLastSeenScanMtime(): number;
  /** Override the checkpoint. Tests use this to bypass auto-init so the FIRST repoll tick can fire. */
  setLastSeenScanMtime(value: number): void;
}
```

The double-underscore prefix marks the field as test-only. The handle's production surface (`stop`) is unchanged. This replaces the R1 `__disableRepollExtraction` flag entirely (tests just don't call `triggerRepoll`), but **`__disableToolCallFallbacks?: boolean` stays** as an option flag because the AC2 parsers are closure-local pure functions and there's no other clean way to hook them off for the revert test.

**Test plan:**

- **AC1 — Periodic re-poll:** unit test against `handle.__testHooks!.triggerRepoll()` directly. Use `vi.useFakeTimers()`. Fixture: an in-memory SQLite fixture, seeded **before** the extractor starts. **Ordering for "first tick captures new bubbles" (R2 Finding 3 from Codex):** because `lastSeenScanMtime` auto-initializes at extractor start to the current family-max mtime, a naive "seed → start → trigger → expect atom" test would short-circuit on the mtime guard. The fix: tests call `handle.__testHooks!.setLastSeenScanMtime(0)` immediately after `startCursorExtractor` returns, **then** invoke `triggerRepoll` — that path correctly detects the fixture's mtime as "advanced beyond 0" and runs the scan. Test cases:
  - **Test 1 (first tick after checkpoint-reset):** seed 1 pair, start extractor, set checkpoint to 0, trigger repoll, assert 1 atom appended.
  - **Test 2 (no mtime change between ticks):** trigger again immediately, assert short-circuit (no new atom).
  - **Test 3 (mtime advances between ticks):** write a new pair (mtime advances), trigger again, assert 2 total atoms.
  - **Test 4 (WAL mtime only — R2 Finding 1 from Codex):** seed initial state. Touch the `.vscdb-wal` file's mtime (e.g., `utimes('state.vscdb-wal', now, now)`) WITHOUT touching `state.vscdb`. Trigger repoll. Assert the family-max-mtime guard detects the advance and runs the scan even though `state.vscdb` mtime is unchanged. Counter-test: touch only `state.vscdb` with an OLDER timestamp, assert short-circuit (mtime did not advance).
  - **Do not call `scheduleGlobalChange()` in these tests** — the repoll entry path is separate from the chokidar debounce by contract.
- **AC2 — Tool-call extraction:** fixture rows with each fallback shape: (a) pure `text`, (b) `toolFormerData` only, (c) `attachedHumanChanges.fileDiff` only, (d) `codeBlocks` with non-empty `content` body (positive case), (e) `codeBlocks` with `uri.path` only and no body (path-only — negative case, MUST drop or fall through to next parser, per R1 Finding 2 from Codex), (f) `thinkingContent` only, (g) all four fallbacks present (assert first-non-empty precedence wins), (h) none of the above (assert `null` + warning, no atom emitted). Verify `metadata.bubble_text_sources[]` matches the expected per-bubble source on cases (b)-(g). Additional fixture (i): multi-bubble assistant cluster where bubble 1 = `'text'`, bubble 2 = `'toolFormerData'`, bubble 3 = `'codeBlocks'` (with body) → assert `bubble_text_sources: ['text', 'toolFormerData', 'codeBlocks']`. Fixture (j): single-bubble cluster with `'text'` only → assert `bubble_text_sources` field is **omitted** from metadata (no-bloat 99% case).
- **AC3 — Integration (revert-mechanism via test seams):** end-to-end against a synthetic SQLite fixture mimicking an agent-mode composer with 8 bubble pairs (mixed text + tool-call). The "revert" mechanism uses the test seams precisely (R2 Cursor minor #3 — "chokidar fired" wording fix):
  - **Both fixes active (control):** start extractor with `exposeTestHooks: true`. Reset checkpoint to 0. Trigger repoll. Assert all 8 user/assistant turn-pairs reach `storage.append`.
  - **Cadence-gap revert (proves AC1 load-bearing):** start extractor with `exposeTestHooks: true` AND do NOT call `triggerRepoll` after seeding additional bubbles. Manually invoke a SINGLE `handleGlobalChange('chokidar')` after seeding the FIRST 2 pairs to simulate one chokidar dispatch tick. Then seed the remaining 6 pairs and DO NOT trigger another scan. Assert ≥ 3 turn-pairs are missing — proves the new repoll path is what closes the cadence gap (the single chokidar tick covered only the first 2 pairs).
  - **Parse-gap revert (proves AC2 load-bearing):** start extractor with `exposeTestHooks: true` AND `__disableToolCallFallbacks: true`. Reset checkpoint and trigger repoll. Assert ≥ 3 turn-pairs are missing from atoms whose source bubbles relied on `toolFormerData` / `fileDiff` / etc. — proves the AC2 fallback chain is what closes the parse gap.

Total expected test additions: 11-15 new test cases. Full suite must remain green (zero new failures, zero new skips outside the new tests). The existing `describe.skip('startCursorExtractor (lifecycle + integration)')` block stays quarantined as-is — do NOT attempt to fix it as part of 034.

### AC4 — Dogfooding verification (post-merge, written by founder or strategist)

After merge + daemon kickstart, founder or strategist (NOT the builder agent) runs the following chain and logs the outcome to `raw/internal/dogfooding/mcp-interactions-journal.md` per the 6-field template:

1. Open Cursor; start a fresh agent-mode composer; have a 5-10 minute conversation that includes ≥1 tool-call frame (any Cursor agent task that invokes file edits triggers this).
2. Within 60 s of the LAST assistant bubble being written, call `mcp__echo__search_memories(query='<a distinctive 3-4 word phrase from the user message>', source_app='cursor')`.
3. Expected: ≥ 1 match returned within the right composer (verify `metadata.composer_id`).
4. Then call `mcp__echo__search_memories(query='<distinctive phrase from the assistant tool-call frame>', source_app='cursor')`.
5. Expected: ≥ 1 match returned; verify `metadata.bubble_text_sources[]` is populated and contains the expected non-`text` source(s) for the bubbles that triggered the fallback path.

**Strategist also runs `tools/mcp-integration-smoke.sh`** at the same time to confirm no regression in the broader 8-tool MCP surface. Build/smoke ownership is founder/strategist territory (R1 Finding 4 from Codex — explicitly NOT a builder task post-merge).

**Capture-rate calculation (R1 Finding from Cursor, R2 HIGH from both reviewers — numerator/denominator must count the same unit):**

The R1 formula `N_atoms / N_eligible_bubbles` was wrong: it mixed grains. The extractor emits one atom per user→assistant cluster with `assistant_bubble_id` pointing at only the **last** bubble in the cluster, while `assistant_bubble_ids[]` lists every bubble in that cluster. At perfect 100% capture, a single 3-bubble cluster scores 1 distinct `assistant_bubble_id` vs 3 eligible — ratio 1/3, triggering a spurious P1. Fixed by widening the numerator to a set union:

`Capture rate = |captured_bubble_ids| / N_eligible_bubbles` where:

- `captured_bubble_ids` = the **set union** of `metadata.assistant_bubble_ids[]` arrays across all atoms in `echo.db` where `metadata.composer_id === <test_composer_id>` over the test window. Each bubble id appears at most once in the union (deduplicate if multiple atoms list it — should not happen given extractor semantics, but the union shape is robust to it).
- `N_eligible_bubbles` = count of assistant bubbles in `cursorDiskKV` for the same composer (key prefix `bubbleId:<composer_id>:`, JSON `type === 2`) where **at least one** of `{ .text non-empty, .toolFormerData non-empty, .attachedHumanChanges.fileDiff non-empty, .codeBlocks has body, .thinkingContent non-empty }` would parse. Truly-empty assistant bubbles (all fields empty) are excluded from the denominator since 034 doesn't claim to capture those.

At perfect 100% capture, every eligible bubble's id appears in some atom's `assistant_bubble_ids[]` (because every cluster of assistant bubbles between two user bubbles is emitted as a single atom carrying the full id list). Ratio = 1.0. Partial captures correctly produce ratios in (0, 1).

Strategic re-evaluation thresholds (against this exact calculation):
- ≥ 90 %: M1-1 capture friction is empirically closed.
- 60–89 %: file a narrow follow-up item (smaller poll interval, or workspace.db secondary trigger).
- < 60 %: file P1 item; revisit at the next strategist conversation.

Two consecutive successful dogfooding runs (different days, different composers, both ≥ 5 min duration) closes the M1-1 capture-coverage friction. Log both runs. If either fails, the agent who ran the dogfooding stops, restores the journal entry with the failure mode, and writes a follow-up item — they do **not** silently re-tune the spec.

### AC5 — Wiki + followups housekeeping (post-merge, strategist task)

Folded into "After Completion" section below. Not a builder-agent acceptance — listed for the strategist's wiki-promotion pass.

# Out of Scope (Don't Drift)

- **Do NOT touch `src/normalize/adapters/cursor.ts`.** The Cursor adapter narrow-emission gap (cursor atoms emit only `conversation:cursor:<composer_id>`, no file/repo artifact) is a known sibling follow-up in `backlog/_followups.md` under "From 029 merge". It manifests at the trace clustering layer, not capture; mixing it in here would dilute the capture-coverage demo bar.
- **Do NOT add `tail_session` repo-scoping / `workspace_id` filter.** Sub-gap C (the 2026-05-10 16:08 PDT and 22:25 PDT journal escalations showing `tail_session(source_app='cursor')` resolves to an unrelated MRU composer) is genuinely separate — it's an MCP-resolver-layer fix in `src/mcp/tools/tail-session.ts`, not a capture fix. Reserved for **item 035 candidate** post-034. The 22:25 PDT entry's SQLite-probe recovery chain (grep `workspace.json` → SQLite `composerData` by `lastUpdatedAt` → bubble probe) is the prototype for 035's spec; until 035 ships, cross-tool review uses that workaround.
- **Do NOT extract `agentKv:blob:` content-addressed values into atoms.** The 2026-05-09 diagnosis correction empirically established that `agentKv:blob:` is *deduped message-body storage* (content-addressed hashes pointing at individual `{role, content}` records, including the Cursor system prompt repeated across sessions), NOT a chat-schema replacement. The bubbles ECHO needs (composer turns) are still in `bubbleId:` / `composerData:`. Reading `agentKv:blob:` would either (a) duplicate content already extracted from `bubbleId:`, or (b) leak the Cursor system prompt into every Cursor atom. Both are wrong shapes. If a future Cursor version moves chat turns into `agentKv:` proper (not `agentKv:blob:`), that's a separate item.
- **Do NOT touch the chokidar setup.** `awaitWriteFinish: false`, `ignoreInitial: true`, the three watched paths — all stay as-is. The fix is *additive* polling via a separate entry path, not a chokidar replacement. Replacing chokidar would be a much larger item with cross-platform-correctness risk.
- **Do NOT change the chokidar debounce or its 300 ms constant.** `DEBOUNCE_MS = 300` and `scheduleGlobalChange()`'s short-circuit-on-`debounceTimer` are correct for the burst-coalescing they do; the periodic re-poll uses a separate entry path (`triggerRepollExtraction`) that intentionally bypasses the debounce guard. The chokidar-driven `scheduleGlobalChange` path is unchanged.
- **Do NOT reduce `orphan_assistant_bubble` warning frequency further.** V1.5.7 quieted ~902K spurious warnings via the streaming-continuation fast-forward inside `extractCursorTurns`. That fix stays. Real orphan bubbles (non-streaming-continuation) still log warn — intended behavior post-V1.5.7.
- **Do NOT add `metadata.bubble_text_sources[]` to the normalize layer's promoted fields.** It's a capture-layer hint useful for the dogfooding journal + future debugging; consumers reading via `search_memories` see the content in `match.content` and don't need the array promoted into the normalized shape. If a consumer demand surfaces later for "filter cursor matches by text-source," that's a separate normalize-layer item.
- **Do NOT change capture-time mtime semantics.** `safeMtimeMs(globalDbPath)` is the existing helper, and the mtime is recorded on each turn (`turn.mtime` → `metadata.mtime`). The new poll-side mtime-checkpoint is a *guard* on the scan, not a replacement of `turn.mtime`.

# Implementation Notes

- **The poll loop uses a separate entry path, NOT `scheduleGlobalChange()`.** The R1 review surfaced that `scheduleGlobalChange()` short-circuits when `debounceTimer !== null` — that guard is correct for coalescing fast chokidar bursts but would drop periodic poll ticks that race with chokidar events. The new `triggerRepollExtraction()` calls `schedule(() => handleGlobalChange('repoll'))` directly. Both paths funnel through the same `processing` promise chain, so concurrent extraction passes still serialize.
- The mtime-checkpoint variable is per-extractor-instance (closure-local, like `lastSeenMap`). Reset on extractor start by reading the current mtime once before the loop begins so the first tick isn't a spurious scan.
- `handleGlobalChange` gains a `reason: 'repoll' | 'chokidar'` parameter, logged once at function entry. The chokidar path passes `'chokidar'`; the repoll path passes `'repoll'`. Do NOT log on every chokidar `dispatch()` call — that would flood the daemon log; the existing chokidar dispatch path stays log-free.
- For AC2 — the `tryExtract*` helpers are top-level functions next to `parseBubbleRow`, exported for test access. Each parser is ≤ 30 lines and treats every shape mismatch as `return null` — never throw. The parser is the boundary; throws here would crash the extractor mid-tick.
- `metadata.bubble_text_sources[]` is omitted entirely when every bubble in the cluster used primary `'text'` (the 99% case). When present, the array length always equals `assistant_bubble_ids.length` — no implicit defaulting; consumers can read the array directly without cross-referencing.
- Test isolation: `tests/capture/extractors/cursor.test.ts` already drives the extractor against in-memory SQLite fixtures (review the existing test file before adding new ones — there's likely a `makeBubbleRow()` or `seedDb()` helper to reuse). The periodic-poll tests use `vi.useFakeTimers()` AND target `triggerRepollExtraction` directly. **Do NOT** add tests inside the `describe.skip('startCursorExtractor (lifecycle + integration)')` quarantine block — that block stays quarantined per item 023.
- Configuration knobs: `CURSOR_REPOLL_INTERVAL_MS` is the source-level default constant (exported for tests); `CursorExtractorOptions.repollIntervalMs` is the only runtime override; no environment variable is read.
- Test seams (R2 patch — replaces R1's `__disable*` flags pair): `CursorExtractorOptions.exposeTestHooks?: true` gates the `__testHooks` field on `CursorExtractorHandle`, populated with `triggerRepoll() / getLastSeenScanMtime() / setLastSeenScanMtime(n)` (see AC3 test-seam contract). The `__disableToolCallFallbacks?: boolean` option stays for the AC2 parse-gap revert test (the parsers are closure-local pure functions, no other clean hook). Double-underscore prefix marks these as test-only; not documented for production use.

# After Completion (Strategist Notes)

**Wiki promotion pass after item lands in `complete/`:**

1. `wiki/capture/cursor-extractor.md` — add a "Capture cadence" subsection documenting the periodic re-poll + mtime-guard + the separate-entry-path contract (no debounce sharing); add a "Bubble shape coverage" subsection enumerating the `bubble_text_sources[]` fallback chain and when each fires. Keep `capture_status: shipped` (item 029 already reversed the degraded designation).
2. `wiki/capture/per-app/cursor-collected-data.md` — extend the "Captured fields" table with `metadata.bubble_text_sources[]` (optional array, capture-layer hint, omitted when every bubble used primary `text`).
3. `wiki/architecture/system-architecture.md` — no change expected (capture-layer fix below the architectural diagram's resolution).
4. `backlog/_followups.md` — move "Cursor capture-cadence gap" under "From 029 merge" to a "Resolved (V1.6 wave — items 030 + 032 + 033 + 034)" subsection with this item's merge SHA + the dogfooding-verification entry timestamp from AC4.
5. **Strategic re-evaluation:** apply the AC4 capture-rate calculation (numerator/denominator defined under AC4). ≥ 90 % → M1-1 closed; 60–89 % → narrow follow-up item; < 60 % → P1 item.

**Wiki creation deferred:** no new wiki page (the changes are extensions of existing pages, not new surface).

**M1-1 follow-on items teed up by this work landing:**
- **Item 035 candidate** — `tail_session` repo-scoping / `workspace_id` filter. Spec when 034 ships + ≥ 3 dogfooding entries surface the resolver-layer gap as still-load-bearing.
- **Cursor adapter narrow-emission enrichment** (already in `_followups.md`) — re-prioritize after 034 to whichever next slot is appropriate; the M1-1 narrative is no longer load-bearing for it.

# Cross-tool review checklist (post-R1)

- [x] **Gate 1 — Diff vs precedent.** Compared against 029 (extractor coverage falsification) + 032 (resume-friendly retrieval). 034 inherits 029's measurement-first discipline and 032's "explicit-over-implicit" stance on opt-in metadata fields (`bubble_text_sources[]` is implicit-by-absence-of-fallbacks, exactly per 032's `prefer='newest_first'` precedent — only present when non-default applies).
- [x] **Gate 2 — Out-of-scope drift.** Three nearby items explicitly listed as out-of-scope (adapter narrow-emission, tail_session repo-scoping, agentKv:blob: extraction). Plus four "do NOT touch" rules on the chokidar + debounce + warning + normalize-promotion surfaces.
- [x] **Gate 3 — Falsifiable ACs.** AC1 has a deterministic test pattern targeting `triggerRepollExtraction` directly with fake timers + mtime control (per Cursor R1 Issue 1). AC2 has 10 fixture cases including the path-only-`codeBlocks` negative case (per Codex R1 Finding 2) and the multi-bubble mixed-source case (per Codex R1 Finding 1). AC3 integration test uses `__disable*` flags to revert each fix independently; both must show ≥ 3 missing pairs to prove load-bearing (per Cursor R1 minor 3 — revert mechanism pinned).
- [x] **Gate 4 — Cross-reference consistency.** All references use symbol names, not line numbers, after R1 (per both reviewers' line-drift findings). `M1-1` taxonomy lines up with the 2026-05-10 Magic Moments framing in `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md`. Sibling-item numbers (035) are spelled "candidate" not "next" to avoid pre-allocating an ID before strategist conversation lands it.

# Review history

## R1 — 2026-05-10 22:01 PDT (Codex) + 22:25 PDT (Cursor, recovered via SQLite probe) — patched 2026-05-10 22:45 PDT by strategist

**Recovery shape:** Codex's review came in via group session (`tail_session(source_app='codex')` + `get_atom` for two elided turns at atom_size_bytes 4029 and 5826). Cursor's review did NOT surface via ECHO — `tail_session(source_app='cursor')` resolved to an unrelated MRU composer (M1-1 sub-gap C firing live on the very review of M1-1), AND `search_memories(source_app='cursor', query=<5+ variations>)` returned 0 matches even though the 5009-char review existed in SQLite (M1-1 sub-gap A firing live on the very capture-coverage spec). Recovered Cursor's review via direct SQLite probe: `grep workspace.json` → workspace hash `a8bc68a00c4ea9c5abb926cd2c42a906` → `composerData WHERE lastUpdatedAt > cutoff` → composer `d352562e-c958-417c-bbc4-a822c4fae3c4` → bubble `9d219e89-720a-421e-85ab-b9fee3a3c41d` (5009 chars). The dogfooding closed the loop: the very gap 034 fixes prevented the strategist from seeing Cursor's review via ECHO. Full recovery chain documented in `raw/internal/dogfooding/mcp-interactions-journal.md` 2026-05-10 22:01 / 22:11 / 22:25 PDT entries.

**Differentiated reviewer value (strongest data point in journal):** Codex caught **contract clarity** (5 findings, all about spec semantics that would have created ambiguity during build). Cursor caught **implementation correctness** (1 HIGH + 4 minor — Cursor's HIGH was a load-bearing impl bug Codex missed entirely). Worth promoting to `wiki/operating-model/cross-tool-spec-review.md` "Findings classes" post-merge.

### Findings + dispositions

| # | Reviewer | Severity | Finding | Disposition in R1 patch |
|---|---|---|---|---|
| 1 | Codex | Medium | `metadata.bubble_text_source` singular ignores per-bubble fallback variation in multi-bubble assistant turns | **Fixed.** AC2 + Implementation Notes — `metadata.bubble_text_sources[]` plural, one entry per assistant bubble, length = `assistant_bubble_ids.length`, omitted when every bubble used `'text'` (no-bloat 99% case). |
| 2 | Codex | Medium | `codeBlocks` fallback can fake assistant prose from path-only structured context (existing `extractReferencedFiles` reads `codeBlocks[].uri.path`) | **Fixed.** AC2 — `tryExtractCodeBlocksText` body guard: requires non-empty `entry.content` OR `entry.code`; rejects path-only entries. AC3 fixture (e) is the negative case. |
| 3 | Codex | Medium | AC1's periodic-repoll test plan risks landing inside the quarantined chokidar lifecycle suite | **Fixed.** AC3 — all new tests live OUTSIDE the `describe.skip('startCursorExtractor (lifecycle + integration)')` quarantine; target pure functions + the new `triggerRepollExtraction` entry path; quarantine stays as-is per item 023. |
| 4 | Codex | Low | Implementation Notes ask builder to run smoke after merge — not a builder task | **Fixed.** AC4 — smoke ownership moved to founder/strategist. Implementation Notes line stripped. |
| 5 | Codex | Low | Stale streaming-continuation comment at `cursor.ts` (in `extractCursorTurns`) says "proper fix is `agentKv:` rewrite", contradicting 2026-05-09 diagnosis correction | **Fixed.** AC2 — comment cleanup is now an in-scope mechanical fixup while touching the file. One-line edit, no semantic change to fast-forward logic. |
| 6 | Cursor | **HIGH** | **`scheduleGlobalChange` short-circuits on `debounceTimer !== null` → repoll ticks fired during a 300 ms debounce window are silently dropped.** AC1's test plan directly conflicts with my V1 spec's "interval calls `scheduleGlobalChange()`" guidance | **Fixed (load-bearing).** AC1 + Implementation Notes — periodic poll uses NEW entry function `triggerRepollExtraction` that calls `schedule(() => handleGlobalChange('repoll'))` directly, bypassing the debounce guard. The chokidar path stays unchanged. Out-of-Scope explicitly notes the two-trigger-paths architecture. |
| 7 | Cursor | Medium | Env vs options for `CURSOR_REPOLL_INTERVAL_MS` — spec ambiguous about whether env var is supported | **Fixed.** AC1 + Implementation Notes — no environment variable is read; source-constant default + `CursorExtractorOptions.repollIntervalMs` override is the only knob. |
| 8 | Cursor | Minor | AC3 "revert one fix" mechanism unspecified | **Fixed.** AC3 — implementer adds two test-only options flags (`__disableRepollExtraction`, `__disableToolCallFallbacks`); double-underscore prefix marks them as test-only. |
| 9 | Cursor | Minor | `tick_reason` logging unclear — every dispatch event or only on actual extraction | **Fixed.** Implementation Notes — `handleGlobalChange` gains `reason: 'repoll' \| 'chokidar'` parameter, logged once at function entry. Chokidar `dispatch()` path stays log-free. |
| 10 | Cursor | Minor | AC4 thresholds (90/60/<60 %) without numerator/denominator definition | **Fixed.** AC4 — explicit `Capture rate = N_atoms / N_eligible_bubbles` formula, with `N_eligible_bubbles` defined as "bubbles where at least one fallback field would parse" (excludes truly-empty bubbles). |
| 11 | Both | — | Line-number drift (`182-247` actual is `190-247`; `425-430` is now stale; `624-629` is stale) | **Fixed.** All line-number references replaced with symbol names throughout. |

### Strategist self-finding (added during R1 patch authoring)

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 12 | Low | The R1 cycle itself was the strongest empirical evidence yet for 034 — Cursor reviewed and ECHO didn't capture. Worth surfacing in `Context` (not just the journal) so future readers know the M1-1 dogfooding loop closed on this spec. | **Deferred to R2.** Adding to `Context` after R2 review confirms the framing is correct. Decision: keep R1 patch focused on the load-bearing reviewer findings; let R2 decide on prose-level enhancement. |

### Validation after patch

- `tools/blocked.py --validate` — passes (run after final commit below).
- Spec line-number drift — all stale refs stripped or symbol-replaced.
- Out-of-Scope drift check — all 8 do-not-touch rules still hold post-patch; no new in-scope surface introduced that wasn't called out.

### What R2 should focus on (pre-R2 prompt — kept here for historical record; R2 outcomes recorded below)

- Whether the `triggerRepollExtraction` / `scheduleGlobalChange` split is the right architecture, or whether the spec should mandate refactoring `scheduleGlobalChange` to accept a `forcePassThrough: boolean` parameter instead (the two-function approach is cleaner; pinning explicitly to head off R2 churn).
- Whether the `__disable*` test-only flags should live on `CursorExtractorOptions` or in a separate `CursorExtractorTestSeams` type (test-flag-on-production-type is a known minor smell; current choice keeps the test surface concentrated, but pinning for R2 acknowledgment).
- Whether `bubble_text_sources[]` should be present when every bubble used `'text'` (current spec omits it for no-bloat) — counter-argument: presence-always makes consumer code simpler. Pinning for R2 explicit acknowledgment.
- Re-test the R1 recovery pattern: does ECHO now (post-034 spec patch) surface this turn? Expected NO — 034 isn't implemented yet; the SQLite-probe workaround remains load-bearing until 034 ships.

## R2 — 2026-05-10 22:27 PDT (Codex) + 22:30 PDT (Cursor, recovered via SQLite probe again) — patched 2026-05-10 22:45 PDT by strategist

**Recovery shape:** Same M1-1 sub-gap A + C firing again. Codex's R2 turn was captured-but-elided (`atom 742d4ff3`, `bytes_elided: 2320`), recovered cleanly via `get_atom`. Cursor's R2 (4975 chars in bubble `95ff18b2-d838-4b58-bcea-9608df002879`, composer `d352562e`) **was not captured by ECHO at all** — repeated the R1 recovery chain (SQLite probe with rowid > R1's bubble). Second consecutive review cycle where the M1-1 gap bit the strategist on the very spec that fixes it. The R2 cross-tool spec review pattern continues to depend on a SQLite-probe workaround until 034 ships.

**R2 architecture decisions confirmed (both reviewers acked, kept as-is):**

- Two-function `triggerRepollExtraction` / `scheduleGlobalChange` split — kept.
- `__disable*` and `exposeTestHooks` on `CursorExtractorOptions` (vs separate `CursorExtractorTestSeams` type) — acceptable for current repo size; not blocking.
- `bubble_text_sources[]` omitted when every bubble used `'text'` — kept (no-bloat 99% case wins).

**R2 findings + dispositions (5 unique, 2 convergent):**

| # | Reviewer | Severity | Finding | Disposition in R2 patch |
|---|---|---|---|---|
| 1 | Codex | **HIGH** | **AC1 mtime guard watches only `state.vscdb`, but SQLite WAL mode can advance `state.vscdb-wal` mtime while main DB mtime is stale.** Existing `isGlobalDbFamily` already groups the three files. The poll could miss the exact writes it's meant to recover. | **Fixed (load-bearing).** AC1 step 1 now requires `MAX(safeMtimeMs(state.vscdb, -wal, -shm))` via new `maxGlobalDbFamilyMtime()` helper. AC3 Test 4 added: touch `-wal` mtime only, assert family-max guard detects advance. |
| 2 | Codex | **HIGH** | **AC4 capture-rate formula undercounts perfect multi-bubble captures** — `N_atoms` (distinct `assistant_bubble_id`) vs `N_eligible_bubbles` mixes grains; 3-bubble cluster captured perfectly scores 1/3. (Cursor R2 caught this independently as their Critical finding.) | **Fixed (load-bearing).** AC4 numerator changed to `|captured_bubble_ids|` = set union of `metadata.assistant_bubble_ids[]` across atoms for the test composer. At 100% capture, ratio = 1.0. The 90/60/<60 thresholds now reflect actual capture coverage. |
| 3 | Codex | Medium | AC3's first repoll test contradicts checkpoint initialization — checkpoint auto-inits at extractor start to current mtime, so "seed → start → trigger → expect atom" short-circuits. | **Fixed.** AC3 Test 1 now explicitly resets the checkpoint via `__testHooks.setLastSeenScanMtime(0)` after extractor start, then triggers repoll. Ordering pinned in the test plan. |
| 4 | Both (Codex Med #4, Cursor Med #2) | Medium | **Test seam still underspecified — `triggerRepollExtraction` is closure-local; `CursorExtractorHandle` exposes only `stop`. Tests can't reach it.** Cursor recommended `__testHooks` on the handle. | **Fixed.** AC3 introduces `CursorExtractorTestHooks` interface (`triggerRepoll() / getLastSeenScanMtime() / setLastSeenScanMtime(n)`), exposed via `handle.__testHooks` when `CursorExtractorOptions.exposeTestHooks: true` is set. R1's `__disableRepollExtraction` flag dropped (tests just don't call `triggerRepoll`); `__disableToolCallFallbacks` stays for AC2 parse-gap revert (parsers are closure-local, no other clean hook). |
| 5 | Cursor | Low | AC3's "only initial chokidar fired" is a misnomer — integration tests don't actually start chokidar (it lives in the quarantined block). | **Fixed.** AC3 cadence-gap revert test now reads: "Manually invoke a SINGLE `handleGlobalChange('chokidar')` after seeding the FIRST 2 pairs to simulate one chokidar dispatch tick." No reference to real chokidar firing. |

**Strategist self-finding (added during R2 patch authoring, was R1 Finding 12 deferred):**

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 6 | Low | The R1 dogfooding loop is a load-bearing piece of empirical evidence for 034 that future readers will want surfaced outside the journal | **Added.** Context section now includes a one-sentence reference to the 22:01/22:11/22:25 PDT R1 round, framing it as "M1-1 firing live on cross-tool review itself." |

**Convergence analysis (worth promoting to `wiki/operating-model/cross-tool-spec-review.md`):**

- **Both reviewers converged on the AC4 capture-rate formula bug** at HIGH/Critical severity, with different recommended fixes. Convergence on severity + divergence on prescription is the right shape — strategist picked Option B (set union) because it preserves bubble-granularity in the threshold while eliminating the grain mismatch.
- **Both reviewers converged on the test-seam exposure problem** at Medium severity. Cursor recommended `__testHooks` on the handle; Codex recommended "exported/internal test harness, not production `CursorExtractorOptions.__disable*` flags." Strategist combined: kept `__disableToolCallFallbacks` (parsers are closure-local with no other hook) but moved repoll-trigger access to `handle.__testHooks` per Cursor's specific shape.
- **Codex caught two findings Cursor missed** (WAL mtime guard, checkpoint-init test ordering) — both implementation correctness. **Cursor caught one finding Codex missed** (the AC3 "chokidar fired" misnomer) — language clarity. Same pattern as R1: Codex specializes in implementation correctness, Cursor in language/contract clarity. Two independent confirmation cycles now — pattern is no longer single-observation.

### Validation after R2 patch

- `tools/blocked.py --validate` — passes (run after final commit below).
- No new in-scope surface; all 4 gates still hold.
- AC4 formula now mathematically consistent (numerator/denominator both per-bubble-id, set-union shape).
- Test plan now buildable: every test references either a pure function (parsers), an exported helper (`maxGlobalDbFamilyMtime`), or a publicly-named seam (`handle.__testHooks`, `CursorExtractorOptions.__disableToolCallFallbacks`).

### What R3 (if needed) should focus on

- This spec is now claimable per both reviewers' verdicts. R3 is OPTIONAL — strategist's call after founder review of this R2 patch.
- If R3 happens: validate the `maxGlobalDbFamilyMtime` helper's interaction with chokidar's awaitWriteFinish: false (chokidar may fire on `-wal` writes before they're durably synced; the mtime read is async vs chokidar's notification, so a tick that finds advanced mtime should always see consistent SQLite state at scan time).
- If R3 doesn't happen: founder green-lights claim; Cursor's Claude picks up item 034 as the builder agent per the project's Cursor-domain delegation pattern.
