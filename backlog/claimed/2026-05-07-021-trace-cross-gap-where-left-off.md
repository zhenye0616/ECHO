---
id: 2026-05-07-021-trace-cross-gap-where-left-off
title: V1.5 trace patch — make "where did I leave off" work across >4h gaps
status: claimed
priority: HIGH
estimate: 1-2d
created: 2026-05-07
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-08T06:30:00Z"
branch: "agent/trace-cross-gap-where-left-off"
spec_refs:
  - src/storage/sqlite.ts
  - src/storage/interface.ts
  - src/storage/memory.ts
  - src/trace/cluster.ts
  - src/trace/index.ts
  - src/mcp/tools/recent-work-context.ts
  - backlog/complete/2026-05-06-018-recent-work-context-tool.md
  - backlog/complete/2026-05-07-019-trace-edge-filter-and-format.md
  - raw/internal/dogfooding/2026-05-07-trace-layer.md
blocked_by: []
acceptance:
  - "**Bug A — Storage keep-newest semantics.** `Storage.query(filter)` interface (in `src/storage/interface.ts`) extended with optional `order?: 'asc' | 'desc'` field on `QueryFilter`. Default behavior **changes to `'desc'`** (newest-first) — preserves backwards compatibility on filter shape but flips the sort. Justification: every existing caller's intent is \"give me the recent N events\"; ASC + LIMIT silently drops newest. Callers that genuinely want oldest-first can now opt in explicitly."
  - "  - `src/storage/sqlite.ts:106` SQL changed to `ORDER BY timestamp ${order === 'asc' ? 'ASC' : 'DESC'} ${limitClause}` (parameterized via the new field, not string interpolation if avoidable — use prepared-statement variants if `better-sqlite3` supports it; otherwise the two-statement cache approach is acceptable since `order` is a finite enum)."
  - "  - `src/storage/memory.ts` `MemoryStorage.query` mirrors the same semantic."
  - "  - Existing call sites that depend on ASC ordering (search via existing tests) audited; if any genuinely need ASC for downstream logic (e.g., conversation turn-pair reconstruction), they pass `order: 'asc'` explicitly."
  - "  - `buildRecentWorkContext` in `src/trace/index.ts` re-sorts atoms ascending (`a.time.occurred_at`) after fetching, since the trace layer assumes ascending order for window filtering and cluster determinism. The DESC fetch + in-memory ASC sort is two passes but the fetch is bounded by `limit * STORAGE_OVERFETCH`, so cost is bounded."
  - "**Bug B — Expose `window_hours` in MCP tool + raise default.** `src/mcp/tools/recent-work-context.ts` input schema gains optional `window_hours: z.number().min(0.1).max(168).optional()`. When omitted, default behavior is **inferred from `(since, until)` span**: if span > 4h, `window_hours = min(span_hours, 24)`; otherwise `window_hours = span_hours`. The 4h hardcoded constant `DEFAULT_WINDOW_HOURS` stays as a fallback when neither span nor explicit value is computable, but is no longer the active default for typical queries. Echoed in `response.query.window_hours`."
  - "  - `QueryEcho` (in `src/trace/types.ts`) gains `window_hours: number` field reflecting the actual value used (after inference)."
  - "  - Tool description updated to mention `window_hours` and the inference rule. One-sentence callout that for \"where did I leave off after a break\" queries, the consumer can pass a span-equal `window_hours` or rely on the inference."
  - "**Independent C — Naive timestamp guardrail.** Tool description for both `since` and `until` adds a one-line note: \"Always include explicit timezone (`Z` for UTC or `+HH:MM` offset). Naive ISO strings like `2026-05-07T22:00:00` are accepted but parsed as local server time, which is rarely what you want.\" The regex stays permissive (no breaking change); the description warns."
  - "  - `getRecentWorkContext` emits a one-time warning into `response.warnings` when an input timestamp lacks a TZ specifier. Suggested format: `\"input.since (or input.until) lacks a TZ specifier and was parsed as local time; pass an explicit Z or +HH:MM to avoid ambiguity\"`. Idempotent — single warning per request even if both inputs are naive."
  - "Tests in `tests/storage/sqlite.test.ts` (extend) and `tests/storage/memory.test.ts` (extend if exists, else create):"
  - "  - `query() with no order param returns newest-first (DESC) by default`"
  - "  - `query({order: 'asc'}) returns oldest-first as before`"
  - "  - `query({limit: N}) on a window with >N events returns the newest N (with default DESC), not the oldest`"
  - "Tests in `tests/trace/build.test.ts` (extend):"
  - "  - `atoms returned to the trace builder are re-sorted ascending after DESC fetch (cluster determinism preserved)`"
  - "  - `query.window_hours echo defaults to span-inferred value when not passed; equals span when span ≤ 4h; min(span, 24) when span > 4h`"
  - "  - `explicit window_hours in input is echoed verbatim`"
  - "  - `cluster spans the full (since, until) window when window_hours = span (atoms 5h apart in same project DO cluster together)`"
  - "Tests in `tests/mcp/tools/recent-work-context.test.ts` (extend):"
  - "  - `naive ISO timestamps produce a one-line warning in response.warnings`"
  - "  - `Z-suffixed ISO timestamps produce no warning`"
  - "  - `default behavior on a 24h since/until span uses inferred window_hours = 24, not 4`"
  - "Smoke test (`tools/mcp-integration-smoke.sh`) extended: assert that calling `get_recent_work_context` with a 24h `(since, until)` span over live data returns at least one cluster whose `time_range` spans more than 4h. (Sentinel: pre-021 this was structurally impossible.)"
  - "Backwards-compat audit: search the codebase for `storage.query(` and confirm no caller relies on ascending order without the new explicit `order: 'asc'` opt-in. List any flips in the run-log."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean."
  - "Run log appended to `raw/internal/agent-runs/2026-05-07-2026-05-07-021-trace-cross-gap-where-left-off.md`."
files_to_modify:
  - src/storage/interface.ts
  - src/storage/sqlite.ts
  - src/storage/memory.ts
  - src/trace/types.ts
  - src/trace/index.ts
  - src/mcp/tools/recent-work-context.ts
  - tests/storage/sqlite.test.ts
  - tests/storage/memory.test.ts
  - tests/trace/build.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - tools/mcp-integration-smoke.sh
---

# V1.5 trace patch — make "where did I leave off" work across >4h gaps

## What

Two independent bugs jointly break the trace layer's "where did I leave off" use case (the V1 hotkey overlay's primary query, and the most natural way for any AI client to recover overnight context). Both surfaced by forensic investigation on 2026-05-07 22:50 PDT after a symptom — the founder's design conversation at 22:37 PDT failed to cluster with morning commits — was initially mis-attributed to item 019's edge filter.

The actual root causes:

1. **Storage `query()` returns the *oldest* N events when limit is hit, not the newest.** `src/storage/sqlite.ts:106` runs `ORDER BY timestamp ASC LIMIT N`. With `STORAGE_OVERFETCH=10` and default `limit=100`, the cap is 2,000 rows. On 2026-05-07, the live window had 3,107 events; row 2000 was at 22:37 PDT, exactly the boundary where the design atom landed. The atom was in storage; storage silently dropped it for being one row too late.

2. **`buildGraph` enforces a 4h temporal cap on edges, and the cap isn't exposed via MCP.** Even if Bug A were fixed and the design atom reached the trace pipeline, it sits 21h after the morning commits. The 4h `windowMs` constraint in `src/trace/cluster.ts:75-78` prevents *any* edge from forming between atoms >4h apart, so `connectedComponents` splits them. The MCP tool's input schema (`src/mcp/tools/recent-work-context.ts:134-140`) doesn't expose `window_hours`; it's pinned at `DEFAULT_WINDOW_HOURS=4`.

This patch fixes both. It also adds a guardrail for a related (but independent) timestamp-parsing footgun observed in the same investigation.

## Why C3-attribution matters (don't repeat the misdiagnosis)

The 22:40 PDT journal entry conjectured the symptom was 019's edge filter dropping scope-only edges. **That conjecture was wrong.** 019 explicitly runs the filter *after* `connectedComponents` (per its spec acceptance), so cluster membership is unaffected — `cluster.atom_ids[]` still includes all atoms joined by any artifact, including scope. The 22:50 PDT investigation read the code to verify, then queried live data with a tight 1h Z-suffixed window: the design atom DID join 7 other Project_echo atoms via the `repo` scope artifact, exactly as 019 designed.

The lesson encoded in this spec: **read the suspect code paths before specifying a fix.** The original C3 misdiagnosis would have produced an incorrect backlog item that touched 019's filter — a regression risk for the dogfooding gain that 019 just delivered.

## Why now

The V1 hotkey overlay (item 020 + a yet-to-be-specced UI item) reads from `cluster.open_loop_hints[]` and `cluster.atom_ids[]`. Its primary use case is "the founder pressed ⌘⇧E in the morning after sleep and wants to know what's hanging." Both bugs in this item make that use case structurally impossible:

- Bug A: yesterday's evening atoms get silently dropped if the day was busy
- Bug B: even when present, atoms across a sleep gap can't cluster

Either bug alone would degrade the overlay; together they break it. Both fixes are small (~50 LOC + tests). The combined patch ships as a single dogfooding cycle.

## Bug A — Storage keep-newest semantics

### Current

```ts
// src/storage/sqlite.ts:106
const sql = `SELECT ... FROM events ${where} ORDER BY timestamp ASC ${limitClause}`;
```

When `limit` is hit, the oldest events survive. Rationale at the time was probably "give me events in chronological order" — but that conflates **ordering of returned events** with **selection of which events to drop**.

### Patch

`QueryFilter` (in `src/storage/interface.ts`) gains an optional `order: 'asc' | 'desc'` field. **Default behavior changes to `'desc'`** (newest-first selection).

```ts
// src/storage/interface.ts
export interface QueryFilter {
  source?: string;
  source_prefix?: string;
  since?: string;
  until?: string;
  limit?: number;
  order?: 'asc' | 'desc';  // NEW; default 'desc' — keeps newest when limit is hit
}
```

```ts
// src/storage/sqlite.ts (around line 106)
const order = filter?.order ?? 'desc';
const orderSql = order === 'asc' ? 'ASC' : 'DESC';
const sql = `SELECT ... FROM events ${where} ORDER BY timestamp ${orderSql} ${limitClause}`;
```

Callers that genuinely need ascending order (e.g., adapters reconstructing turn-pairs from JSONL) pass `order: 'asc'` explicitly.

### Trace layer adjustment

`buildRecentWorkContext` currently assumes ascending input. After the storage flip:

```ts
// src/trace/index.ts (around line 69, before the normalize loop)
const sortedEvents = [...events].sort((a, b) => {
  const ta = ...; const tb = ...;
  return ta - tb;
});
```

Sort is in-memory on at most `limit * STORAGE_OVERFETCH = 2000` events; cost negligible.

## Bug B — Expose `window_hours` and infer from span

### Current

```ts
// src/mcp/tools/recent-work-context.ts:106
const query: Query = {
  ...
  window_hours: DEFAULT_WINDOW_HOURS,  // hardcoded 4
};
```

The MCP tool's `inputSchema` doesn't include `window_hours`. AI clients can't override.

### Patch

Add to input schema and infer from `(since, until)` when not provided:

```ts
// src/mcp/tools/recent-work-context.ts
inputSchema: {
  since: isoString.optional(),
  until: isoString.optional(),
  artifact_hint: artifactHintSchema.optional(),
  limit: z.number().optional(),
  window_hours: z.number().min(0.1).max(168).optional(),  // NEW
  format: formatSchema.optional(),
},
```

Inference rule (in `getRecentWorkContext`):

```ts
function inferWindowHours(
  sinceMs: number,
  untilMs: number,
  explicit: number | undefined,
): number {
  if (explicit !== undefined) return explicit;
  const spanHours = (untilMs - sinceMs) / 3_600_000;
  if (spanHours <= 4) return spanHours;
  return Math.min(spanHours, 24);  // cap at 24h to prevent week-long mega-clusters
}
```

The 24h ceiling is a guardrail, not a hard limit — explicit values up to 168h (1 week) are accepted, but not auto-applied.

### Echoed in response

`QueryEcho.window_hours` is added so consumers can verify what was actually used:

```ts
export interface QueryEcho {
  ...
  window_hours: number;  // NEW
}
```

## Independent C — Naive-timestamp guardrail

Not a bug per se — the regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` deliberately accepts both `Z`-suffixed and naive forms. But naive ISO strings are silently TZ-shifted by `Date.parse` (treated as local time in Node), producing wrong-window queries when AI clients construct timestamps without thinking about TZ.

Two-line fix:

1. **Tool description note:** "Always include explicit timezone (`Z` for UTC or `+HH:MM` offset)."
2. **Runtime warning:** `getRecentWorkContext` checks `since`/`until` for TZ markers; if either is naive, emit a one-line warning in `response.warnings`. Doesn't fail the request — just surfaces the ambiguity.

```ts
function hasTzMarker(s: string): boolean {
  return /Z$|[+-]\d{2}:\d{2}$/.test(s);
}
```

## Out of Scope (Don't Drift)

- **Touching 019's edge filter or `filterRedundantEdges`.** The investigation explicitly confirmed 019 is doing the right thing. Don't regress.
- **Re-clustering logic, role taxonomy, or `connectedComponents`.** Bug B is fixed by raising the temporal cap, not by changing what counts as an edge.
- **Persisting the query's resolved `window_hours` anywhere.** It's an in-request decoration, not a stored config.
- **Indexing improvements on the events table.** The current `idx_events_timestamp` is fine for both ASC and DESC scans.
- **Search-memories KNN determinism.** Independent observation made during this investigation; needs its own item if it persists.
- **Adapter ASC dependency audit beyond storage callers.** Limit scope to direct `storage.query(...)` callers; adapter-internal sorting is opaque to this patch.
- **Capping `limit * STORAGE_OVERFETCH` more aggressively.** The 10x overfetch stays; it's tuned for the dedup/normalize step.
- **Modifying the normalizer or capture pipeline.** Read-time only.
- **Changing the default `format` to `'minimal'`.** Still 019's deferred follow-up; not in this patch.
- **Adding new MCP tools.** The `search_memories` KNN issue may warrant its own item; not addressed here.
- **Adjusting `DEFAULT_WINDOW_HOURS=4` constant value itself.** The constant stays; the inference rule in `getRecentWorkContext` makes it irrelevant for typical paths but preserves it as a fallback.

## After Completion (Strategist Notes)

1. **Update the dogfooding journal** with the first observation post-021: did "where did I leave off" queries (24h window, no explicit `window_hours`) actually return overnight context as a single coherent cluster? If yes, item 020 (resolution heuristics) becomes the next critical-path piece for the overlay.
2. **Wiki promotion:** `wiki/architecture/work-trace.md` updated to document the new `window_hours` inference rule + the storage `order` semantic. `wiki/surfaces/mcp-recent-work-context.md` updated for the new input parameter and the warning. Wiki edits land **post-merge by strategist** per the operating-model reconciliation pending from item 019.
3. **Reconcile the journal C3 entry.** The 22:40 PDT entry conjectured 019's filter was the cause; the 22:50 PDT entry corrected it. After this patch ships, the strategist should write a meta-note in the journal: "C3 misdiagnosis preserved as evidence — the value of `read code before specifying a fix` is now empirically demonstrated."
4. **Watch for regressions on existing storage callers.** The DESC default flip is the highest-risk change in this patch. The agent's backwards-compat audit (per acceptance) should surface any callers needing explicit `order: 'asc'`. Founder reviews the audit list at merge time.
5. **Independent search_memories KNN issue is a candidate for item 022.** Not part of this patch; not blocking the overlay; surfaces as one of many "search retrieval reliability" observations to revisit at end-of-window.

## Acceptance Criteria

- [ ] **Bug A (storage):** `QueryFilter.order?: 'asc' | 'desc'` added; default behavior is DESC; `MemoryStorage` and `SqliteStorage` both honor it.
- [ ] **Bug A (trace):** `buildRecentWorkContext` re-sorts events ascending in memory after fetch.
- [ ] **Bug A (audit):** All `storage.query(` call sites audited; any depending on ASC pass `order: 'asc'` explicitly. Audit list in run-log.
- [ ] **Bug B (schema):** MCP tool input schema includes `window_hours: z.number().min(0.1).max(168).optional()`.
- [ ] **Bug B (inference):** When omitted, `window_hours` is inferred per the rule; echoed verbatim in `response.query.window_hours`.
- [ ] **Bug B (types):** `QueryEcho` extended with `window_hours: number`.
- [ ] **Bug B (description):** Tool description mentions `window_hours` and the span-inference rule.
- [ ] **Guardrail C (description):** `since`/`until` description includes the explicit-TZ recommendation.
- [ ] **Guardrail C (warning):** Naive ISO inputs produce a single-line `response.warnings` entry; Z-suffixed inputs produce none.
- [ ] **Tests** in `tests/storage/sqlite.test.ts`, `tests/storage/memory.test.ts`, `tests/trace/build.test.ts`, `tests/mcp/tools/recent-work-context.test.ts` per the acceptance list above.
- [ ] **Smoke test** `tools/mcp-integration-smoke.sh` extended: 24h-span query returns ≥1 cluster spanning >4h time range.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean.
- [ ] Run log at `raw/internal/agent-runs/2026-05-07-2026-05-07-021-trace-cross-gap-where-left-off.md` includes the storage-caller audit.
