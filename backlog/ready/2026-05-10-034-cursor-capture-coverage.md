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
`parseBubbleRow` (`src/capture/extractors/cursor.ts:218-221`) returns `null` when `typeof text !== 'string'`, logged as `unrecognized_bubble_shape` with `reason: 'missing_text'`. Cursor's assistant frames in Agent / Composer modes routinely store their actual content in `toolFormerData` (tool-call frames) or other shape fields, with no top-level `text`. These bubbles are valid assistant turns — they carry the model's review prose, code edits, and pushback content — but the parser drops them. The 2026-05-10 14:50 PDT journal entry confirmed this empirically: bubble `dc15993e-...` carried a 4414-char review in `.text`, but adjacent assistant bubbles in the same composer (tool-call frames) had no `.text` and were silently dropped from capture; the review *was* in SQLite, but `search_memories(source_app='cursor')` returned 0 hits because the captured atoms split the review across un-indexed gaps.

Both gaps are at the **capture layer**, before normalization or MCP wire shaping. They manifest at the consumer surface as "ECHO doesn't see Cursor review-content," forcing cross-tool spec review cycles to fall back to direct SQLite probes with composer IDs the strategist already had to memorize. Today's `/cross-tool-spec-review` pattern is structurally dependent on Cursor producing readable review content; until both gaps close, that dependency is leaky.

Evidence base (in date order):
- 029 `agent_notes` "030-deferral observation": cadence measurement (Gap A).
- 029 `review_notes` follow-up #2 "Cursor capture-cadence gap" (Gap A, escalated to its own item).
- 029 `review_notes` follow-up #1 "Cursor adapter narrow-emission enrichment" — adjacent but distinct (artifact-emission gap, not capture coverage).
- Journal 2026-05-10 14:50 PDT: M1-1 escalation #1 — `search_memories` 0 hits on cursor 032 review (Gap B effect).
- Journal 2026-05-10 15:00 PDT: M1-1 escalation #2 — cursor extractor's `.text` reads return empty for review composer's most-recent bubbles (Gap B narrowed).
- Journal 2026-05-10 16:08 PDT: M1-1 reconfirmed — `tail_session(source_app='cursor')` resolved to unrelated MRU project. That third sub-gap (resolver layer, not capture) is **separately scoped to item 035 candidate** and explicitly out-of-scope here (see "Out of Scope" below).

# Goal

Close the capture-layer coverage gaps so a cross-tool spec review producing Cursor review content in any combination of Cursor modes (legacy chat / Composer / Agent) lands in ECHO's substring index within seconds of being written, not minutes-to-never. Demo bar: founder runs a Cursor agent-mode review of 5-10 minutes, calls `search_memories(source_app='cursor', query='<word from the review>')`, and gets back the review turn. Today: hits = 0.

# In Scope (Acceptance Criteria)

### AC1 — Periodic re-poll for the global `state.vscdb` family

`src/capture/extractors/cursor.ts` adds a periodic re-poll loop that calls `handleGlobalChange()` on a fixed interval, in addition to the chokidar-driven path. The loop:

- Runs every `CURSOR_REPOLL_INTERVAL_MS` (default: 15_000 ms = 15 s).
- Is idempotent with the chokidar path — uses the same `processing` promise chain + `schedule()` queue so concurrent extraction passes serialize correctly.
- Skips the SQLite scan entirely if the global `state.vscdb` file's mtime has not advanced since the last successful scan (mtime-checkpoint guard — see `safeMtimeMs` at line 304). The guard prevents wasted DB opens during idle periods (the journal `db.mtimeMs` won't advance if Cursor isn't writing).
- Tears down cleanly on `stop()` — the existing `stopped` flag short-circuits new ticks; add a `clearInterval` analog so any pending tick is cancelled.
- Logs ticks at `debug` level (`tick_reason: 'repoll' | 'chokidar'`) so dogfooding can correlate captures with their trigger source.

Why 15 s, not 1 s or 60 s: Cursor's chat UX produces user-perceptible bubble appends every 2-20 s during active reviews; a 15 s interval bounds capture latency to <= 15 s + DB-scan time (~50-200 ms) while keeping the wakeup-tax low when Cursor is idle (the mtime-guard short-circuits in microseconds). 1 s would be over-eager (Cursor's WAL writes don't actually appear that fast at the user-visible bubble level); 60 s leaves user-visible "ECHO is behind" gaps during dense reviews.

The constant is exported (for tests) and overridable via a new optional `CursorExtractorOptions.repollIntervalMs` field. Tests use a small value (e.g., 50 ms) to exercise the loop deterministically without slowing the suite.

### AC2 — Tool-call / non-text bubble extraction

`parseBubbleRow` (`src/capture/extractors/cursor.ts:182-247`) is extended so a bubble with `typeof text !== 'string'` is no longer silently dropped. The replacement contract:

- If `v.text` is a non-empty string, use it verbatim (preserves current behavior — load-bearing for ~all non-Agent-mode bubbles).
- Else, attempt to derive a non-empty text representation from the following fields, in order: `v.toolFormerData`, `v.attachedHumanChanges?.fileDiff`, `v.codeBlocks` (joined as fenced code), `v.thinkingContent`. Only the **first non-empty** derivation wins (no concatenation across sources — keeps content recognizable). If derived from a non-`text` field, emit a `metadata.bubble_text_source: 'toolFormerData' | 'fileDiff' | 'codeBlocks' | 'thinkingContent'` field on the resulting `CaptureEvent` so consumers can tell extracted content apart from primary-text content.
- If none of the fallback fields yield non-empty content, fall back to today's behavior: return `null` with `log.warn('unrecognized_bubble_shape', { reason: 'missing_text_and_fallbacks' })`. Emit `metadata.dropped_reason` is NOT needed here (the warning log is the durable record).

The shape of `toolFormerData` and the other fallback fields is variable across Cursor versions — the implementer should write `tryExtractToolFormerText(v)` etc. as defensive parsers that return `string | null` (empty string is treated as null). The order is by likelihood of carrying user-visible content; the implementer may reorder based on dogfooding evidence as long as deterministic precedence is preserved.

**Decision: tool-call frames captured this way are NOT split into multiple atoms.** They become part of the same user→assistant turn pairing per the existing assistant-cluster logic (`src/capture/extractors/cursor.ts:425-430`). The clustering treats them as continuations.

### AC3 — Test coverage

Three new test families:

- **AC1 — Periodic re-poll:** unit test with `repollIntervalMs: 50`, no chokidar event fired, mtime advances between two ticks. Assert handleGlobalChange runs ≥ 2 times in 200 ms AND captures both bubble-pair generations. Counter-test: mtime does NOT advance — assert handleGlobalChange runs 0 times (or runs once but the SQLite scan is skipped via mtime-guard; either is acceptable as long as no spurious atoms appear).
- **AC2 — Tool-call extraction:** fixture rows with each fallback shape: (a) pure `text`, (b) `toolFormerData` only, (c) `attachedHumanChanges.fileDiff` only, (d) `codeBlocks` only, (e) `thinkingContent` only, (f) all four fallbacks present (assert first-non-empty precedence wins), (g) none of the above (assert `null` + warning, no atom emitted). Verify `metadata.bubble_text_source` is set correctly on (b)-(f).
- **AC3 — Integration:** end-to-end against a synthetic SQLite fixture mimicking an agent-mode composer with 8 bubble pairs (mixed text + tool-call). With both AC1 (re-poll) and AC2 (parse) active, assert all 8 user/assistant turn-pairs reach `storage.append`. With either fix reverted, assert at least 3 pairs are missing — proves both fixes are load-bearing.

Total expected test additions: 8-12 new test cases. Full suite must remain green (zero new failures, zero new skips outside the new tests).

### AC4 — Dogfooding verification (post-merge, written by founder or strategist)

After merge + daemon kickstart, founder or strategist (NOT the builder agent) runs the following chain and logs the outcome to `raw/internal/dogfooding/mcp-interactions-journal.md` per the 6-field template:

1. Open Cursor; start a fresh agent-mode composer; have a 5-10 minute conversation that includes ≥1 tool-call frame (any Cursor agent task that invokes file edits triggers this).
2. Within 60 s of the LAST assistant bubble being written, call `mcp__echo__search_memories(query='<a distinctive 3-4 word phrase from the user message>', source_app='cursor')`.
3. Expected: ≥ 1 match returned within the right composer (verify `metadata.composer_id`).
4. Then call `mcp__echo__search_memories(query='<distinctive phrase from the assistant tool-call frame>', source_app='cursor')`.
5. Expected: ≥ 1 match returned; verify `metadata.bubble_text_source` field is populated if the captured content came from a non-`text` fallback.

Two consecutive successful dogfooding runs (different days, different composers, both ≥ 5 min duration) closes the M1-1 capture-coverage friction. Log both runs. If either fails, the agent who ran the dogfooding stops, restores the journal entry with the failure mode, and writes a follow-up item — they do **not** silently re-tune the spec.

### AC5 — Wiki + followups housekeeping (post-merge, strategist task)

Folded into "After Completion" section below. Not a builder-agent acceptance — listed for the strategist's wiki-promotion pass.

# Out of Scope (Don't Drift)

- **Do NOT touch `src/normalize/adapters/cursor.ts`.** The Cursor adapter narrow-emission gap (cursor atoms emit only `conversation:cursor:<composer_id>`, no file/repo artifact) is a known sibling item in `backlog/_followups.md` line 127-131. It manifests at the trace clustering layer, not capture; mixing it in here would dilute the capture-coverage demo bar.
- **Do NOT add `tail_session` repo-scoping / `workspace_id` filter.** Sub-gap C (the 2026-05-10 16:08 PDT journal escalation showing `tail_session(source_app='cursor')` resolves to an unrelated MRU composer) is genuinely separate — it's an MCP-resolver-layer fix in `src/mcp/tools/tail-session.ts`, not a capture fix. Reserved for **item 035 candidate** post-034. Cross-tool spec review currently mitigates by passing exact `source=` per the 030 group-session pattern; that workaround is acceptable until 034 ships and we measure whether the resolver gap is still load-bearing.
- **Do NOT extract `agentKv:blob:` content-addressed values into atoms.** The 2026-05-09 diagnosis correction empirically established that `agentKv:blob:` is *deduped message-body storage* (content-addressed hashes pointing at individual `{role, content}` records, including the Cursor system prompt repeated across sessions), NOT a chat-schema replacement. The bubbles ECHO needs (composer turns) are still in `bubbleId:` / `composerData:`. Reading `agentKv:blob:` would either (a) duplicate content already extracted from `bubbleId:`, or (b) leak the Cursor system prompt into every Cursor atom. Both are wrong shapes. If a future Cursor version moves chat turns into `agentKv:` proper (not `agentKv:blob:`), that's a separate item.
- **Do NOT touch the chokidar setup.** `awaitWriteFinish: false`, `ignoreInitial: true`, the three watched paths — all stay as-is. The fix is *additive* polling, not a chokidar replacement. Replacing chokidar would be a much larger item with cross-platform-correctness risk; the additive poll is the smallest fix that closes the cadence gap.
- **Do NOT change the chokidar debounce or its 300 ms constant.** `DEBOUNCE_MS = 300` is correct for the burst-coalescing it does; the re-poll loop is a *separate* trigger source, not a replacement.
- **Do NOT reduce `orphan_assistant_bubble` warning frequency further.** V1.5.7 quieted ~902K spurious warnings via the streaming-continuation fast-forward at lines 389-409. That fix stays. Real orphan bubbles (non-streaming-continuation) still log warn — that's the intended behavior post-V1.5.7.
- **Do NOT add the new `metadata.bubble_text_source` field to the normalize layer's promoted fields.** It's a capture-layer hint useful for the dogfooding journal + future debugging; consumers reading via `search_memories` see the content in `match.content` and don't need the field promoted into the normalized shape. If a consumer demand surfaces later for "filter cursor matches by text-source," that's a separate normalize-layer item.
- **Do NOT change capture-time mtime semantics.** `safeMtimeMs(globalDbPath)` lives at line 304 and the mtime is recorded on each turn (`turn.mtime` → `metadata.mtime`). The new poll-side mtime-checkpoint is a *guard* on the scan, not a replacement of `turn.mtime`.

# Implementation Notes

- The poll loop and the chokidar dispatch share `processing` and `schedule()`. The simplest implementation is a `setInterval` whose callback is `() => { if (mtime > lastSeenMtime) scheduleGlobalChange(); }`. Reuses the existing `scheduleGlobalChange()` deduper (which short-circuits if `debounceTimer !== null`), so a chokidar event that fires within 300 ms of a poll tick just coalesces without double-extraction.
- The mtime-checkpoint variable is per-extractor-instance (closure-local, like `lastSeenMap`). Reset on extractor start by reading the current mtime once before the loop begins so the first tick isn't a spurious scan.
- For AC2 — the `tryExtractToolFormerText` etc. helpers should be top-level functions next to `parseBubbleRow`, exported for test access. Each parser is ≤ 30 lines and treats every shape mismatch as "return null" — never throw. The parser is the boundary; throws here would crash the extractor mid-tick.
- `metadata.bubble_text_source` is only written when content was derived from a non-`text` fallback. Don't write it as `'text'` for normal bubbles — the *absence* of the field implicitly means `text`, which avoids inflating every Cursor atom's metadata by ~24 bytes for the 99% case.
- Test isolation: `tests/capture/extractors/cursor.test.ts` already drives the extractor against in-memory SQLite fixtures (review the existing test file before adding new ones — there's likely a `makeBubbleRow()` or `seedDb()` helper to reuse). The periodic-poll tests must control time deterministically (vitest `vi.useFakeTimers()` works; do NOT use real `setTimeout` with sleep-based assertions).
- Builder agent should run the existing `tools/mcp-integration-smoke.sh` after merge to confirm no regression in the 8-tool surface; the smoke script doesn't exercise Cursor capture directly but does verify `search_memories` still works end-to-end.

# After Completion (Strategist Notes)

**Wiki promotion pass after item lands in `complete/`:**

1. `wiki/capture/cursor-extractor.md` — add a "Capture cadence" subsection documenting the periodic re-poll + mtime-guard; add a "Bubble shape coverage" subsection enumerating the `bubble_text_source` fallback chain and when each fires. Keep `capture_status: shipped` (item 029 already reversed the degraded designation).
2. `wiki/capture/per-app/cursor-collected-data.md` — extend the "Captured fields" table with `metadata.bubble_text_source` (optional, capture-layer hint).
3. `wiki/architecture/system-architecture.md` — no change expected (capture-layer fix below the architectural diagram's resolution).
4. `backlog/_followups.md` — move "Cursor capture-cadence gap" from line ~134-138 to a "Resolved (V1.6 wave — items 030 + 032 + 033 + 034)" subsection with this item's merge SHA + the dogfooding-verification entry timestamp from AC4.
5. **Strategic re-evaluation:** if the AC4 dogfooding runs show ≥ 90 % capture rate on Cursor agent-mode composers, the M1-1 friction is empirically closed. If 60-89 %, file a narrow follow-up item (likely a smaller poll interval or a workspace.db secondary trigger). If < 60 %, file a P1 item — the fix didn't work; revisit at the next strategist conversation.

**Wiki creation deferred:** no new wiki page (the changes are extensions of existing pages, not new surface).

**M1-1 follow-on items teed up by this work landing:**
- **Item 035 candidate** — `tail_session` repo-scoping / `workspace_id` filter. Spec when 034 ships + ≥ 3 dogfooding entries surface the resolver-layer gap as still-load-bearing.
- **Cursor adapter narrow-emission enrichment** (already in `_followups.md`) — re-prioritize after 034 to whichever next slot is appropriate; the M1-1 narrative is no longer load-bearing for it.

# Cross-tool review checklist (pre-claim)

- [ ] **Gate 1 — Diff vs precedent.** Compared against 029 (extractor coverage falsification) + 032 (resume-friendly retrieval). 034 inherits 029's measurement-first discipline and 032's "explicit-over-implicit" stance on opt-in metadata fields (`bubble_text_source` is implicit-by-absence, exactly per 032's `prefer='newest_first'` precedent — only present when non-default applies).
- [ ] **Gate 2 — Out-of-scope drift.** Three nearby items explicitly listed as out-of-scope (adapter narrow-emission, tail_session repo-scoping, agentKv:blob: extraction). Plus three "do NOT touch" rules on the chokidar + warning surfaces.
- [ ] **Gate 3 — Falsifiable ACs.** AC1 has a deterministic test pattern (fake timers + mtime control). AC2 has 7 fixture cases. AC3 integration test asserts ≥ 3 missing pairs when either fix is reverted — load-bearing on both. AC4 dogfooding is empirical with a numeric demo bar.
- [ ] **Gate 4 — Cross-reference consistency.** All references to constants, file paths, and earlier items follow the existing project conventions. `M1-1` taxonomy lines up with the 2026-05-10 Magic Moments framing in `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md`. Sibling-item numbers (035) are spelled "candidate" not "next" to avoid pre-allocating an ID before strategist conversation lands it.

# Review history

*This spec is V1 (initial draft). If cross-tool review surfaces revisions, append R1 / R2 / etc. sections here per the operating-model convention.*
