---
backlog_item: 2026-05-20-064-mcp-compact-view-projection
agent_run_started: 2026-05-20T22:47:41Z
agent_run_ended: 2026-05-20T23:19:27Z
status: pending_review
test_status: passed
branch: agent/mcp-compact-view-projection
head_sha: e42d2467d4f451dbfe84172e60bc09a1ec860646
---

# Agent Run: MCP Compact View Projection

## What I Implemented

Implemented item 064 on branch `agent/mcp-compact-view-projection`.

The branch adds opt-in `view: "compact"` projection to `find_clusters` and `get_atoms` while keeping rich/default output byte-identical. Compact cluster projection drops `query`/`result_caps`, rank noise, and UUID fallback labels; compact atom projection runs after the existing `match.ts` caps and keeps the source-specific human-readable metadata called out in the spec.

Raycast now requests compact for `findClusters()` and `getAtoms()`, and the cluster type accepts optional `rank`/`rank_reason` plus `label: null`. I also removed the rendered cluster-id HTML comment.

## Files Modified

- Branch: `agent/mcp-compact-view-projection`
- Head SHA: `e42d2467d4f451dbfe84172e60bc09a1ec860646`
- `src/mcp/wire-shape/compact.ts` - new shared compact projector.
- `src/mcp/tools/find-clusters.ts` - `view` parameter, compact envelope, output-schema widening, post-compact response trim.
- `src/mcp/tools/get-atoms.ts` - `view` parameter, compact atom projection, post-compact prefix-drop sizing, `fields[]` composition.
- `tools/raycast-echo/src/lib/mcp.ts` - Raycast requests `view: "compact"` and relaxed compact-compatible cluster type.
- `tools/raycast-echo/src/echo.tsx` - removed cluster debug HTML comment and made rank_reason read null-safe.
- `tools/raycast-echo/src/components/EmptyState.tsx` - one-line null-safe `rank_reason` read required by the relaxed Raycast cluster type.
- `tests/mcp/wire-shape/compact.test.ts` - compact projector unit tests.
- `tests/mcp/find-clusters.test.ts`, `tests/mcp/get-atoms.test.ts`, `tests/mcp/server.test.ts` - compact/rich parity, budget, schema, and AC7 coverage.
- `tools/raycast-echo/test/mcp.test.ts` - Raycast request-body coverage.
- `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md` - AC8 live compact probe entry.

## Acceptance Criteria Status

- [x] AC1 - `find_clusters` and `get_atoms` accept `view?: "compact" | "rich"` with validation.
- [x] AC2 - default and `view: "rich"` remain byte-identical in tool tests.
- [x] AC3 - shared compact projector added and composed after `match.ts`.
- [x] AC4 - compact cluster contract, schema widening, server-level validation test.
- [x] AC5 - compact atom contract, post-compact byte accounting, 50-tool-call size assertion.
- [x] AC6 - Raycast requests compact, relaxed types, and debug HTML comment removed.
- [x] AC7 - UUID fallback cluster labels emit `null` only under compact.
- [x] AC8 - journal entry written for live Raycast-client compact probe; stale resident daemon miss also recorded.

## Tests Run

```text
$ npm run typecheck
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
# exit 0
```

```text
$ cd tools/raycast-echo && npm run typecheck
> echo-context@0.2.0 typecheck
> tsc --noEmit
# exit 0
```

```text
$ npx vitest run tests/mcp/wire-shape/compact.test.ts tests/mcp/find-clusters.test.ts tests/mcp/get-atoms.test.ts tests/mcp/server.test.ts
Test Files  4 passed (4)
Tests  65 passed (65)
```

```text
$ cd tools/raycast-echo && npm test -- --run test/mcp.test.ts
Test Files  1 passed (1)
Tests  2 passed (2)
```

```text
$ git diff --check
# no output; exit 0
```

```text
$ python3 tools/task-state/lint.py backlog/task-state/2026-05-20-064-mcp-compact-view-projection/builder.md
# no output; exit 0
```

## Live Probe

- Direct `find_clusters({view:"compact"})` against the already-running daemon on `127.0.0.1:38478` returned rich shape, confirming that resident process had not picked up this branch.
- A short-lived feature-branch MCP server was started on an ephemeral loopback port and called through Raycast's `findClusters()` client function with fetch redirected to that daemon. Recorded request args were `{view:"compact"}`; returned shape omitted `query` and `result_caps`, kept compact cluster keys, and nulled the UUID fallback label.
- Journaled in `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md`.

## Open Questions

None.

## Drift Events Caught

- Did not add compact mode to `search_memories` or `get_atom`.
- Did not change wire cap values.
- Did not migrate agent consumers to compact or change rich/default behavior.
- Did not add Raycast UI/layout redesign work.
- Did not edit wiki pages or broader product docs.
- Scope note: `tools/raycast-echo/src/components/EmptyState.tsx` is outside the listed `files_to_modify`, but the spec-required `rank_reason?: string[]` type relaxation made its existing open-loop filter a type error. The change is a one-line null-safe read with no UI behavior change.
