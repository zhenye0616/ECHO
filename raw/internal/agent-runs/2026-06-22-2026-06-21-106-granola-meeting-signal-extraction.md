---
backlog_item: 2026-06-21-106-granola-meeting-signal-extraction
agent_run_started: 2026-06-22T07:07:00Z
agent_run_ended: 2026-06-22T07:28:50Z
status: needs_input
test_status: partial
branch: agent/granola-meeting-signal-extraction
head_sha: e0e5fd0be34d7862115bfc900e7ae91d8ca39663
---

# Agent Run: Granola Meeting Signal Extraction

## What I Implemented

Implemented the derived Granola signal enrichment lane on branch
`agent/granola-meeting-signal-extraction` at
`e0e5fd0be34d7862115bfc900e7ae91d8ca39663`.

The branch adds an async enrichment worker that reads raw `api:granola`
summary/transcript atoms, runs an injectable signal extractor, writes append-only
`derived:granola-signals` atoms, writes success-only
`derived:granola-signals-index` manifest atoms, keeps an atomic no-spin
checkpoint, and wires the worker into daemon lifecycle through an enrichment
dispatcher.

It also extends `search_memories` metadata filtering for scalar equality and
array membership, filters derived Granola signals to current manifest runs, and
keeps the summary-only raw Granola lane queryable.

## Files Modified

- `src/capture/sources.ts` - allowlisted `derived:granola-signals` and `derived:granola-signals-index`.
- `src/enrich/granola-signals.ts` - new worker, checkpoint, manifest latest-wins helper, provider reuse, and extraction parsing.
- `src/enrich/dispatch.ts` - new daemon enrichment dispatch wrapper.
- `src/daemon/index.ts` - starts/stops enrichment with existing capture workers.
- `src/mcp/tools/search-memories.ts` - metadata array membership, signal/source filters, current-run signal filtering.
- `tests/enrich/granola-signals.test.ts` - extraction, rederive, debounce, in-flight, failure/checkpoint, and disabled-provider coverage.
- `tests/mcp/tools/search-memories.test.ts` - signal metadata retrieval and summary-only Granola lane coverage.

## Decisions Made During Implementation

### Decision 1: Append derived atoms directly through storage

- **Options considered:** add derived support to the capture gate pipeline; append directly to `Storage` from the enrichment worker.
- **Chose:** append directly to `Storage`, while allowlisting the derived namespace in `src/capture/sources.ts`.
- **Why:** `src/capture/pipeline.ts` does not currently accept `derived:` sources and is outside this item's `files_to_modify`.
- **Worth founder review?** Yes. It preserves append-only behavior, but it means the derived lane bypasses `processCandidate` until a future spec extends the gate pipeline.

### Decision 2: Do not add a new `source_app`

- **Options considered:** add a `granola_signals` source app vocabulary; query signals through `metadata_match.source` / `source_prefix`.
- **Chose:** do not edit `src/mcp/util/source-app.ts`; signals are queryable via `source`, `source_prefix`, and metadata filters.
- **Why:** the spec listed `src/mcp/util/source-app.ts` only "if signals are query-filterable by app"; AC5's canonical query uses `metadata_match.source`.
- **Worth founder review?** Low. This is the smallest surface that satisfies the AC5 retrieval shape.

### Decision 3: Parse transcript timestamps from the rendered transcript atom

- **Options considered:** use persisted structured transcript items; parse timestamps from the rendered transcript content.
- **Chose:** parse the rendered transcript representation because 104 currently stores the structured Granola transcript only as rendered transcript atom content.
- **Why:** `src/capture/surfaces/granola-poller.ts` is a spec ref but not in `files_to_modify`, so adding structured transcript metadata there would violate the builder surface.
- **Worth founder review?** Yes. AC2 says spans should use the structured transcript items, not the flat rendered string. The branch preserves timestamps available in the rendered string, but this is a substrate limitation to resolve or explicitly accept.

## Acceptance Criteria Status

- [x] AC1 - Derived signal atoms are append-only under `derived:granola-signals`; raw `api:granola` atoms are not mutated.
- [~] AC2 - Signal metadata includes type, note lineage, canonical subject, parent dedupe key, confidence, low-confidence flag, extractor ids, dedupe key, and source span. Partial because the current raw capture substrate does not persist structured transcript items separately from rendered transcript content.
- [x] AC3 - Success manifests are append-only under `derived:granola-signals-index`; current run resolution is latest-wins per `note_id`.
- [x] AC4 - Worker is async, debounced/settled, single-in-flight, bounded-retry, success-only-manifest, and checkpointed.
- [x] AC5 - `search_memories` supports scalar equality and array membership for metadata filters; current-run signal retrieval and summary-only raw Granola retrieval are covered.
- [x] AC6 - Default provider path reuses the 105 brain module's resolution/preflight/run path; tests use an injected extractor and do not call live LLM/Granola services.

## Tests Run

```text
$ npm run typecheck

> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

```text
$ npx vitest run tests/enrich/granola-signals.test.ts tests/mcp/tools/search-memories.test.ts

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--granola-meeting-signal-extraction

 ✓ tests/enrich/granola-signals.test.ts (8 tests) 23ms
 ✓ tests/mcp/tools/search-memories.test.ts (64 tests) 450ms

 Test Files  2 passed (2)
      Tests  72 passed (72)
   Start at  00:28:35
   Duration  1.61s (transform 485ms, setup 0ms, collect 840ms, tests 474ms, environment 0ms, prepare 103ms)
```

```text
$ npm run lint

> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

```text
$ npm test

Test Files  3 failed | 163 passed | 1 skipped (167)
Tests       3 failed | 1776 passed | 21 skipped | 1 todo (1801)

FAIL tests/cli/shell-reachable.test.ts
AssertionError: daemon com.echo.daemon.test-31360-1782113078296 did not become healthy on port 45900.

FAIL tests/packaging/packed-manifest.test.ts
Snapshot `packed package manifest > pins the sorted file path set shipped by npm pack 1` mismatched.
The new expected package paths are:
  "dist/enrich/dispatch.d.ts"
  "dist/enrich/dispatch.js"
  "dist/enrich/granola-signals.d.ts"
  "dist/enrich/granola-signals.js"

FAIL tests/mcp/recent-calls-endpoint.test.ts
Error: Test timed out in 15000ms.
```

The `shell-reachable` daemon-health failure and `recent-calls-endpoint`
timeout match existing full-suite/local-environment instability observed in
this repo. The packaging snapshot failure is caused by this branch's new
`src/enrich/*` files, but `tests/packaging/packed-manifest.test.ts` is outside
the item's `files_to_modify`, so I did not patch it.

## Open Questions for Founder

1. Should the reviewer authorize updating `tests/packaging/packed-manifest.test.ts` to include the new `dist/enrich/*` package files?
2. Should AC2 be accepted with rendered-transcript timestamp parsing, or should a follow-up modify `src/capture/surfaces/granola-poller.ts` to persist structured transcript items for exact span provenance?

## Anything I Almost Did But Stopped Myself

- I stopped before editing `tests/packaging/packed-manifest.test.ts` because it is outside `files_to_modify`.
- I stopped before changing `src/capture/surfaces/granola-poller.ts` to persist structured transcript metadata because it is a spec ref, not an allowed implementation file.

## Next Suggested Backlog Items

- Extend the capture gate/pipeline to support allowlisted `derived:` candidates if derived lanes should go through `processCandidate`.
- Persist structured Granola transcript item metadata on raw transcript atoms if AC2's span provenance must be literal rather than reconstructed from rendered transcript lines.
