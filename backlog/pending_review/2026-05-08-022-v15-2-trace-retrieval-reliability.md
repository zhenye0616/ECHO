---
id: 2026-05-08-022-v15-2-trace-retrieval-reliability
title: V1.5.2 trace + retrieval reliability — close the cross-source bias and silent-failure bugs
status: claimed
priority: HIGH
estimate: 3-4d
created: 2026-05-08
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-08T08:12:38Z"
branch: "agent/v15-2-trace-retrieval-reliability"
spec_refs:
  - src/capture/pipeline.ts
  - src/capture/gate.ts
  - src/capture/surfaces/git-watcher.ts
  - src/capture/surfaces/fs-watcher.ts
  - src/storage/sqlite.ts
  - src/storage/migrate.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/tools/search-memories.ts
  - backlog/complete/2026-05-07-021-trace-cross-gap-where-left-off.md
  - backlog/complete/2026-05-07-019-trace-edge-filter-and-format.md
  - raw/internal/dogfooding/2026-05-07-trace-layer.md
blocked_by: []
acceptance:
  - "**Bug A — Centralize timestamp canonicalization at the capture chokepoint.** All `CaptureEvent.timestamp` values written to storage MUST be in UTC `Z` form (e.g. `2026-05-08T07:30:00.000Z`). Any source emitting offset-bearing timestamps (today: git-watcher emits `-07:00` via `commit.author_iso`) is canonicalized at a single ingestion chokepoint, not patched per-source. Recommended chokepoint: `src/capture/pipeline.ts` immediately before `storage.append(toAppend)` at line 30, OR inside `src/capture/gate.ts` if the gate is the natural fail-loud point. Pick whichever is the smaller diff and document the decision in the run log. Implementation: `new Date(t).toISOString()` is the one-liner — converts both `Z` and `±HH:MM` forms to canonical `Z`."
  - "  - All four current capture surfaces (git-watcher, fs-watcher, claude-code extractor, codex extractor, cursor extractor) audited; the run log lists each surface's pre-canonicalization timestamp form."
  - "  - A unit test in the canonicalizer's location asserts: `Z` input → unchanged; `+07:00` input → converted to `Z`; `-07:00` input → converted to `Z`; missing TZ (naive) input → either canonicalized assuming UTC OR rejected with a structured error (pick one and document)."
  - "**Bug A migration — Rewrite existing `-07:00` git rows to `Z` form.** Storage migration script in `src/storage/migrate.ts` (or a sibling in the migrations dir) that runs on daemon startup or via `npm run migrate:timestamps`. Idempotent: running twice does not double-convert. Implementation: do the conversion in Node, NOT in pure SQL — SQLite's `datetime()` truncates sub-second precision. Loop rows where `timestamp NOT LIKE '%Z'`, update each with `new Date(row.timestamp).toISOString()` inside a single transaction. (Pure-SQL alternatives like `strftime('%Y-%m-%dT%H:%M:%fZ', datetime(timestamp))` are NOT acceptable because the inner `datetime()` call drops millisecond precision before `strftime` reads it.)"
  - "  - Migration tested on a fixture DB with 5+ mixed-form rows: pre-migration count split (`Z` vs offset) recorded; post-migration all `Z`; row IDs and content unchanged."
  - "  - Migration verifies before exit that `SELECT COUNT(*) FROM events WHERE timestamp NOT LIKE '%Z'` returns 0."
  - "**Bug A regression test in storage layer.** New test in `tests/storage/sqlite.test.ts` that seeds a row with `2026-05-08T00:00:00-07:00` (= `2026-05-08T07:00:00Z`), then queries with window `2026-05-08T05:00:00Z..09:00:00Z`. Pre-fix: row not returned (lex compare drops it). Post-fix: row returned. Asserts the canonicalization-or-migration path works end-to-end."
  - "**Bug B — Storage-cap warning in `get_recent_work_context`.** In `src/mcp/tools/recent-work-context.ts:138-142`, after the `storage.query(...)` call, detect cap-hit: `events.length === limit * STORAGE_OVERFETCH`. When true, push a warning to `response.warnings` BEFORE returning. Wording: `\"storage cap hit (events.length === limit * STORAGE_OVERFETCH); atoms in window may be silently truncated. Raise limit or narrow (since, until) to retain them.\"` Idempotent — single warning per request."
  - "  - Test in `tests/mcp/tools/recent-work-context.test.ts`: seed storage with > limit*STORAGE_OVERFETCH events in window, query with default limit, assert the warning surfaces verbatim."
  - "  - Test that when events.length < limit*STORAGE_OVERFETCH, the warning does NOT fire."
  - "**Bug C — Trace input filters raw FS noise.** Codex's round-4 measurement: 25h window had 3,827 raw FS events, 117 conversation turns, 26 git commits; storage's newest 1000 rows were 966 raw FS events + 34 conversation turns (96.6% noise). The trace tool's storage budget is being spent on rows the normalizer throws away. Fix: at `src/mcp/tools/recent-work-context.ts` storage-query layer, filter out raw FS-watcher change events (the ones whose `content` parses as `{event_type, path, mtime, size}` with `metadata.surface === 'fs'`). The conversation atoms riding the same `fs:/Users/...` source prefix are NOT raw — they have richer per-extractor metadata. Two paths: (P1) add a `QueryFilter.exclude_metadata_surface?: string[]` field and pass `['fs']` from the trace tool, OR (P2) introduce a `kind: 'meta' | 'data'` discriminator at capture-pipeline level. Pick P1 unless the agent has a strong reason for P2 (smaller diff, less invasive). Document the choice."
  - "  - Test that with a fixture mixing 100 raw fs change events + 5 normalized turn-pair events, the trace tool's storage query returns only the 5 turn-pair events."
  - "  - Smoke validation: live `get_recent_work_context` call with default args returns `source_breakdown` showing >1 source when multiple sources are active in the window. (Pre-fix: 100% claude_code domination on busy days.)"
  - "**Bug D — `search_memories` filter-before-slice.** In `src/mcp/tools/search-memories.ts:85-95`, the current order is: `storage.query → sortDesc → slice(overfetch) → content filter`. Move the content filter BEFORE the slice, so substring matches outside the recency overfetch are still found. New order (when `query` is provided): `storage.query (no upstream limit) → sortDesc → content filter → slice(limitApplied)`. **DO NOT** pass `limit: MAX_OVERFETCH` into `storage.query` on the content-bearing path — that just relocates the same filter-before-slice bug into the storage layer (still drops candidates whose substring lives outside the newest 200 rows). The recency-only path (`query` is `undefined`) MAY pass `limit: limitApplied` to storage as an optimization, since no content predicate runs after. The proper long-term fix to push the substring filter into `storage.query` itself (server-side `WHERE content LIKE ?`) is a separate item — flagged in Out of Scope."
  - "  - Test: seed 30 events where the 25th-newest matches a unique substring; query with `limit=5`. Pre-fix: 0 returned (filter ran on top-20 only). Post-fix: 1 returned. Assert exact match."
  - "**Bug E — `search_memories` description clarification.** In `src/mcp/tools/search-memories.ts:5`, the description says `\"by free-text query\"` which AI clients reasonably read as semantic search. Add explicit text: `\"Free-text query is matched as a case-insensitive literal substring against the event content; this is NOT a semantic / KNN search. Use exact tokens (file paths, SHAs, error codes) rather than paraphrased questions.\"` Existing text about source_prefix and time-range is fine; just add the substring-semantic clarification."
  - "**Bug F — `hasTzMarker` regex broadening.** In `src/mcp/tools/recent-work-context.ts:97`, current regex `/Z$|[+-]\\d{2}:\\d{2}$/` misses ISO 8601 forms like `+0700` (no colon) and `+07` (hour-only). Broaden to `/Z$|[+-]\\d{2}(?::?\\d{2})?$/`. Test with all four legal forms (`Z`, `+07:00`, `+0700`, `+07`)."
  - "Tests overall:"
  - "  - `tests/capture/pipeline.test.ts` (extend or new): canonicalization happens at the chokepoint; all surface inputs covered."
  - "  - `tests/storage/migrate.test.ts` (new): idempotent migration; row count integrity; pre/post timestamp form check."
  - "  - `tests/storage/sqlite.test.ts` (extend): mixed-form window query test."
  - "  - `tests/mcp/tools/recent-work-context.test.ts` (extend): storage-cap warning + raw-FS filter cases."
  - "  - `tests/mcp/tools/search-memories.test.ts` (extend): filter-before-slice case + description regex check."
  - "  - `tests/trace/build.test.ts` and existing trace tests must remain passing — this item does not change trace algorithm semantics."
  - "Smoke test (`tools/mcp-integration-smoke.sh`) extended: assert that calling `get_recent_work_context` over a 24h window with a forced `\"-07:00\"` git event present returns the git event in the response (post-canonicalization OR post-migration)."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean."
  - "Run log appended to `raw/internal/agent-runs/2026-05-08-2026-05-08-022-v15-2-trace-retrieval-reliability.md` with: capture-surface audit table, chokepoint choice rationale, P1-vs-P2 raw-FS-filter choice rationale, migration row-count diff."
files_to_modify:
  - src/capture/pipeline.ts
  - src/capture/gate.ts
  - src/capture/surfaces/git-watcher.ts
  - src/storage/migrate.ts
  - src/storage/sqlite.ts
  - src/storage/interface.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/tools/search-memories.ts
  - tests/capture/pipeline.test.ts
  - tests/storage/migrate.test.ts
  - tests/storage/sqlite.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - tests/mcp/tools/search-memories.test.ts
  - tools/mcp-integration-smoke.sh
---

# V1.5.2 trace + retrieval reliability — close the cross-source bias and silent-failure bugs

## What

Six related fixes to the trace + retrieval surfaces, surfaced by round-4 dogfooding (2026-05-07 trace-layer journal entries from 00:30 PDT onward) and an independent code review by Codex (00:46 PDT entry). Each fix is small in isolation; bundled because they all degrade the same use case — the V1 hotkey overlay's "what is anyone working on, where did I leave off" cross-source query — and share test infrastructure.

| Bug | Surface | Severity |
|---|---|---|
| **A** | Storage stores mixed timestamp forms (`Z` and `-07:00`); WHERE clause does string compare → silently drops git events from time windows | P0 |
| **A-mig** | All 152 existing stored git rows are in `-07:00` form; forward fix doesn't repair them | P0 |
| **B** | Trace tool's storage query has a silent cap-hit failure mode; consumer sees "complete" response that's actually 91% truncated | P0 |
| **C** | Raw fs-watcher change events dominate storage's newest 1000 (96.6% noise per Codex's measurement); trace query budget is wasted on rows the normalizer throws away → cross-source representation collapses | P0 |
| **D** | `search_memories` slices to recency overfetch BEFORE applying the content filter → literal matches outside the overfetch window vanish silently | P0 |
| **E** | `search_memories` description over-promises semantic search when implementation is plain substring match → AI clients send paraphrased queries and get 0 | P1 |
| **F** | `hasTzMarker` regex misses `+0700` (no-colon) and `+07` (hour-only) ISO 8601 forms | P2 |

## Why all in one item

The first four bugs interact: B's silent failure is partly *caused* by C (storage cap is hit on noise, not real atoms); A causes git events to vanish from cross-source queries (worsening the apparent C symptom); D is the same class of "filter happens after slice" bug that surfaces a different way. Splitting them risks fixing one without the others and re-doing the dogfooding cycle for each. One spec, one dogfooding window, one wiki-promotion pass.

E and F are smaller polish items in the same modules; bundling avoids three separate visits to the same files.

## Why these are P0

The V1 hotkey overlay's primary query is "show me what's hanging across my tools." On a busy day:

- **Without A:** git events are silently invisible in time windows (Codex measured: 3 git events surfaced via text-compare vs 16 via chronological compare in the same window).
- **Without C:** even when git events ARE visible, raw fs-watcher noise consumes the storage cap, leaving 0 git in the trace input.
- **Without B:** the consumer can't even tell the response is incomplete.
- **Without D:** when the founder searches for a SHA prefix or error token they remember, the result depends on whether the matching event happens to be in the most recent overfetch window.

Together, these bugs make the substrate's cross-source promise structurally false on real founder workflows. They were masked during shipping items 019/020/021 because each item's verification used controlled fixtures, not live storage. Round-4 dogfooding broke that mask.

## Bug A — Centralize timestamp canonicalization

### Why centralized at ingestion (Codex's refinement)

Two earlier patches considered per-source fixes (e.g. `git-watcher.ts` only emits `Z`). Codex's review at 00:53 PDT correctly pushed back: a per-source fix means every NEW capture surface has to remember the convention. **A single capture-pipeline chokepoint canonicalizes every event regardless of surface — future-proof, one place to test.**

### Recommended chokepoint

```ts
// src/capture/pipeline.ts:30 (current line numbers)
const id = await storage.append({
  ...validated,
  timestamp: new Date(validated.timestamp).toISOString(),  // ← canonicalization here
});
```

`Date.toISOString()` always returns `Z` form regardless of input offset. Three lines including the comment.

If the gate (`src/capture/gate.ts`) is a more natural fail-loud point (e.g., reject malformed timestamps before storage), put it there instead. Run-log decision required.

### Naive timestamp policy

Open question to resolve in the run log: when the input timestamp has NO timezone marker (e.g., `2026-05-08T07:00:00`), should the canonicalizer assume UTC or reject? Per the existing `hasTzMarker` warning logic at the trace tool, naive input is *valid but warned-about*. The capture-side policy should either:

- **(N1)** Assume UTC at capture (consistent with `Date.parse` Node behavior on naive strings — actually Node parses naive as LOCAL — so this requires explicit `+ "Z"` or `Date.UTC` math); document loud
- **(N2)** Reject naive input at the gate with a structured error (loudest signal)

**Recommend N1** — capture should be permissive; the trace tool's warning still fires for AI clients who pass naive *queries*. Capture surfaces today don't emit naive timestamps anyway (git emits `-07:00`, JSONL extractors emit `Z`), so N1 is effectively a defensive stance for future surfaces.

## Bug A migration — Rewrite existing `-07:00` rows

152 git rows currently in storage are all `-07:00`. Migration shape (in Node, NOT pure SQL):

```ts
// src/storage/migrate.ts (sketch)
const rows = db.prepare(
  "SELECT id, timestamp FROM events WHERE timestamp NOT LIKE '%Z'"
).all() as { id: number; timestamp: string }[];

const update = db.prepare("UPDATE events SET timestamp = ? WHERE id = ?");
const tx = db.transaction((rs: typeof rows) => {
  for (const r of rs) {
    update.run(new Date(r.timestamp).toISOString(), r.id);
  }
});
tx(rows);
```

**Why not pure SQL.** The seemingly-equivalent `UPDATE events SET timestamp = strftime('%Y-%m-%dT%H:%M:%fZ', datetime(timestamp)) WHERE timestamp NOT LIKE '%Z';` is **not acceptable** — SQLite's `datetime()` parses the offset-bearing string into a UTC moment but loses millisecond precision before `strftime` reads it (e.g. `2026-05-08T00:18:26.123-07:00` becomes `2026-05-08T07:18:26.000Z`). `Date.prototype.toISOString()` in Node always emits `.fffZ` and preserves all milliseconds the original timestamp carried.

Idempotent because the `WHERE` clause excludes already-canonicalized rows on a re-run. Test fixture: 5 mixed-form rows including at least one with non-zero milliseconds (e.g. `2026-05-08T00:18:26.123-07:00`); run migration twice; assert no double-conversion, post-state has zero non-`Z` rows, AND post-state preserves the `.123` ms from the fixture row.

Run automatically on daemon startup OR exposed as `npm run migrate:timestamps` for manual runs. Either works; pick the cheaper integration. (Recommend daemon startup so the founder doesn't have to run anything by hand — the migration is idempotent and fast at 152 rows.)

## Bug B — Storage-cap warning

```ts
// src/mcp/tools/recent-work-context.ts, after line 142
if (events.length === limit * STORAGE_OVERFETCH) {
  response.warnings.push(
    'storage cap hit (events.length === limit * STORAGE_OVERFETCH); ' +
    'atoms in window may be silently truncated. ' +
    'Raise limit or narrow (since, until) to retain them.',
  );
}
```

Note: `response` doesn't exist yet at line 142 — the `buildRecentWorkContext` call is line 155. The warning push needs to happen on the response object after that call, similar to the existing TZ warning logic at lines 161-169.

## Bug C — Filter raw FS noise from trace input

Codex's measurement: in a busy 25h window, raw fs-watcher change events (`{event_type, path, mtime, size}` with `metadata.surface === "fs"`) made up 96.6% of storage's newest 1000 rows. The trace tool's storage query is wasting its budget on these — the per-source claude-code/codex extractors normalize from the FILE itself, not from these change events; the change events normalize to `null`.

**Two implementation options:**

- **P1 (recommended): `QueryFilter.exclude_metadata_surface`.** Add a string-array field to `QueryFilter`; the storage query SQL adds `AND COALESCE(json_extract(metadata, '$.surface'), '') NOT IN (...)`. Trace tool passes `['fs']`. Search_memories does NOT pass this — those raw change events are still searchable by source/content for forensic purposes. Smaller diff, more flexible.
- **P2: `kind: 'meta' | 'data'` discriminator at capture-pipeline level.** Adds a column to events table, requires migration, more invasive. Better long-term taxonomy but larger blast radius.

Pick P1 unless the agent has a strong reason for P2. Document the choice and rationale in the run log.

## Bug D — `search_memories` filter-before-slice

```ts
// src/mcp/tools/search-memories.ts, current order (lines 85-95):
const all = await storage.query(filter);
const sorted = sortDesc(all);
const overfetch = Math.min(limitApplied * 4, MAX_OVERFETCH);
let candidates = sorted.slice(0, overfetch);  // ← slice TOO EARLY
if (query !== undefined) {
  const q = query.toLowerCase();
  candidates = candidates.filter((e) => e.content.toLowerCase().includes(q));
}
const top = candidates.slice(0, limitApplied);
```

```ts
// Fixed order:
const filterWithLimit: QueryFilter = {
  ...filter,
  // Only safe to upstream-limit when no content filter runs after.
  ...(query === undefined ? { limit: limitApplied } : {}),
};
const all = await storage.query(filterWithLimit);
const sorted = sortDesc(all);
let candidates = sorted;
if (query !== undefined) {
  const q = query.toLowerCase();
  candidates = candidates.filter((e) => e.content.toLowerCase().includes(q));
}
const top = candidates.slice(0, limitApplied);
```

**Why no upstream limit on the content-bearing path.** The original 014 follow-up suggested wiring `limit: MAX_OVERFETCH` into `storage.query` as a memory guard. That sounds safe but reintroduces the same bug at a higher cap: if storage caps at 200 newest rows and the matching substring lives in row 201, the result is still empty. For V1.5.2 we accept the load-then-filter memory cost (the dataset is small enough to fit) and leave server-side substring filtering for a later item once a real content-filter contract is added to `QueryFilter`. The memory exposure is bounded by the existing per-source / time-range filters in the MCP tool's `QueryFilter`.

The recency-only path (no `query`) keeps the upstream limit because no post-storage filter can drop rows.

This closes the original 014 follow-up's "wire limit into storage.query" intent in the only direction that's correct.

## Bug E — Description clarification

Append to `SEARCH_MEMORIES_DESCRIPTION` at `src/mcp/tools/search-memories.ts:5`:

> "Free-text query is matched as a case-insensitive literal substring against the event content; this is NOT a semantic / KNN search. Use exact tokens (file paths, SHAs, error codes) rather than paraphrased questions."

## Bug F — `hasTzMarker` regex broadening

Replace `/Z$|[+-]\d{2}:\d{2}$/` with `/Z$|[+-]\d{2}(?::?\d{2})?$/`. Matches `Z`, `+07:00`, `+0700`, and `+07`. Single-line change + 4 test cases.

## Out of Scope (Don't Drift)

- **Item 020's R1 calibration / hand-score work.** Independent founder task; not affected by this patch.
- **Wiki promotion for 019/020/021.** Strategist task post-merge; not in this item.
- **Chokidar lifecycle flake** — separate item (`023`); same root cause, different module, different fix shape.
- **Semantic search / KNN for `search_memories`.** Bug E only clarifies that the current implementation is substring; building an actual semantic index is V2 territory.
- **`search_memories` returning normalized atoms (item 017's old scope).** Out of scope.
- **Per-source quota at storage query.** P2 alternative to P1 for Bug C; only if P1 has a real problem.
- **Storage `count(filter)` method.** Could provide a more precise "did the cap hit" signal than `events.length === cap`. V1.5.3 territory if the heuristic proves noisy.
- **Server-side substring filter in `QueryFilter` (e.g. `content_contains?: string`).** The clean long-term fix for Bug D's load-then-filter memory cost. Deferred so this item stays focused on the silent-failure correctness fix; tackle once dataset scale makes the load cost actually bite.
- **Re-clustering or trace-algorithm changes.** Trace algorithm is correct; the bugs are at the data-input + retrieval-wrapper layers.
- **Capture pipeline restructure.** Only the timestamp canonicalization line changes; rest of `pipeline.ts` is untouched.
- **`metadata` schema migration.** P1 for Bug C uses existing `metadata.surface` as a query-time filter; no schema change.
- **Raising `STORAGE_OVERFETCH` from 10x.** Tuning belongs in a separate measurement-driven item.
- **Date.parse local-vs-UTC behavior at the trace tool.** The TZ-warning logic at recent-work-context.ts already addresses query-side ambiguity; capture-side is where Bug A lives.

## After Completion (Strategist Notes)

1. **Update the dogfooding journal** with first observations post-022:
   - Did `get_recent_work_context` over a 24h window now show non-zero `git` and `codex` in `source_breakdown` on a busy claude_code day?
   - Did the storage-cap warning surface on a low-`limit` query?
   - Did `search_memories(query="<known SHA>")` find git events outside the recency overfetch?
2. **Wiki promotion bundles 019 + 020 + 021 + 022.** Four items' worth of architecture/work-trace.md and surfaces/mcp-recent-work-context.md updates land together. Add a new section to wiki/architecture/ on timestamp canonicalization at capture (Codex's centralization decision is wiki-worthy).
3. **Watch for Bug C false-positives.** P1's `metadata.surface = 'fs'` filter should never affect actual conversation atoms (which have richer per-extractor metadata, not `surface: 'fs'`). If the validation pass shows a real conversation atom got filtered, surface immediately — the discriminator was wrong.
4. **Migration row-count check.** First daemon boot post-merge runs the migration. The agent's run log should document the count of converted rows. Founder reads the log to verify (152 expected today, more if backfill captured more git activity in the meantime).

## Acceptance Criteria

- [ ] **Bug A:** Capture-pipeline canonicalization at one chokepoint; all surfaces' timestamp form audited; canonicalizer test covers `Z`, `+07:00`, `-07:00`, naive cases.
- [ ] **Bug A migration:** Idempotent script in `src/storage/migrate.ts`; tested on mixed-form fixture; verifies post-state has 0 non-`Z` rows.
- [ ] **Bug A regression test:** `tests/storage/sqlite.test.ts` mixed-form window query case.
- [ ] **Bug B:** Storage-cap warning in `recent-work-context.ts` with exact wording; tests for cap-hit + cap-not-hit.
- [ ] **Bug C:** Trace tool's storage query filters raw fs-watcher change events; smoke test asserts cross-source representation; agent picks P1 or P2 with run-log rationale.
- [ ] **Bug D:** `search_memories` filter-before-slice; test seeds an out-of-overfetch match; pre/post behavior asserted.
- [ ] **Bug E:** Description appended with the substring-semantic clarification.
- [ ] **Bug F:** `hasTzMarker` regex broadened; 4-form test.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean.
- [ ] Run log at `raw/internal/agent-runs/2026-05-08-2026-05-08-022-v15-2-trace-retrieval-reliability.md` with all four required tables/rationales (surface audit, chokepoint choice, P1/P2 choice, migration count).
