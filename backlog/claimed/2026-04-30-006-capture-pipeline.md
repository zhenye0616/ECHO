---
id: 2026-04-30-006-capture-pipeline
title: Capture pipeline (gate → storage wire-up)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-04-30
spec_refs:
  - wiki/entities/capture-gate.md
  - wiki/entities/storage.md
blocked_by: []
acceptance:
  - "`processCandidate(event, storage)` exported from `src/capture/pipeline.ts`"
  - "Returns `PipelineResult`: `{ accepted: true; id }` or `{ accepted: false; reason }`"
  - "Rejection reasons reuse gate's `RejectionReason` type (no new strings)"
  - "On accept: calls `storage.append(event_minus_id)`; returns the EventId in the result"
  - "On reject: storage is untouched (asserted via `count()` before/after)"
  - "Storage is dependency-injected (function parameter); no module-level singleton"
  - "Tests cover: accept-path lands in storage; reject-path leaves storage at count 0; malformed event returns `malformed_event` and storage untouched"
  - "Tests use `MemoryStorage` as the fixture"
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/capture/pipeline.ts
  - tests/capture/pipeline.test.ts

claimed_by: "Mac.attlocal.net-zhenye"
claimed_at: "2026-04-30T21:14:52Z"
branch: "agent/006-capture-pipeline"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Capture pipeline (gate → storage wire-up)

## What

The single function that wires the [[capture-gate]] and the [[storage]] interface together. It is the first place in the codebase where gate + storage actually talk to each other.

```ts
// src/capture/pipeline.ts
import { gate, type RejectionReason } from './gate.js';
import type { Storage, EventId } from '../storage/interface.js';

export type PipelineResult =
  | { accepted: true;  id: EventId }
  | { accepted: false; reason: RejectionReason };

export async function processCandidate(
  event: unknown,
  storage: Storage,
): Promise<PipelineResult>;
```

Behavior:

- Calls `gate(event)` first.
- If `gate` rejects: return `{ accepted: false, reason }` immediately. Do **not** touch storage.
- If `gate` accepts: cast the now-validated event to the storage shape (drop any `id` if present; storage assigns one), call `storage.append(...)`, return `{ accepted: true, id }`.

The function is dependency-injected: the caller hands in the `Storage` instance. No module-level singleton, no global. This makes the pipeline testable with `MemoryStorage` and trivially compatible with any future `Storage` impl (SQLite, etc.).

## Why

Item 004 shipped the gate as a pure decision function — it returns `{ accepted, reason }` but does NOT write to storage by design. Item 005 shipped the `Storage` interface but no caller. The pipeline is the seam that joins them: the first place an "accepted by the gate → persisted" relationship is enforced in code.

This item is small on purpose. The pipeline's only logical content is "if accepted, append; if rejected, don't." Keeping it tiny lets future capture surfaces (FS watcher, browser extension bridge, etc.) all funnel through one shared seam, and lets the daemon (item 007) wire up just one thing instead of N.

The function's purity property is preserved up to the side effects it inherits: gate's one log line, storage's append. No new effects added by the pipeline.

## Acceptance Criteria

- [ ] `src/capture/pipeline.ts` exports `processCandidate(event, storage)` and `PipelineResult`
- [ ] `PipelineResult` reuses gate's `RejectionReason` type — no new rejection strings introduced
- [ ] On gate accept: `storage.append` is called with the (typed-narrowed) event, and the resolved `EventId` flows into the returned `PipelineResult`
- [ ] On gate reject: `storage.append` is NOT called (test asserts via `count()` before vs. after — must remain unchanged)
- [ ] Storage is a function parameter, not a module-level singleton
- [ ] Tests in `tests/capture/pipeline.test.ts` cover:
  - Accept-path: candidate with allowlisted source (use a temporary allowlist fixture or any well-formed event after future allowlist entries land — see note below) → `accepted: true`, returns id, storage count += 1
  - Reject-path: well-formed event with non-allowlisted source → `accepted: false, reason: 'unknown_<kind>'`, storage count unchanged
  - Malformed event: `null`, `{}`, or other malformed input → `accepted: false, reason: 'malformed_event'`, storage count unchanged
- [ ] Tests use `MemoryStorage` (no SQLite dependency in this item)
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` all clean

**Note on the accept-path test:** the live allowlist (`CAPTURED_SOURCES`) is empty. Tests can either (a) construct a parameterized allowlist fixture using the `_isAllowed*In` helpers in `sources.ts` and inject through a shimmed predicate, or (b) wait for item 009 to add real entries and rely on those. For simplicity in 006, prefer (a): write a small test-only helper that exercises `processCandidate` against a constructed-allowlist scenario without modifying production `sources.ts`.

## Out of Scope (Don't Drift)

- **Capture surfaces** (FS watcher, extension bridge, API connectors, Swift shim) — separate items; the pipeline has no input source of its own
- **Daemon hosting** — item 007; pipeline is just a function
- **Storage implementation** — uses the interface only; SQLite is item 008
- **Rate limiting, throttling, deduplication** — defer; no need for V1
- **Batching multiple events into one append** — append is per-event for V1
- **Embedding generation** — separate later item; storage's `embedding` field stays nullable
- **Retries on storage failure** — propagate the error to the caller; the caller decides
- **Modifying `sources.ts` or `gate.ts`** — no changes to the gate or allowlist in this item
- **Adding any new dependency** — pure code, uses existing types only

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Update `wiki/entities/capture-gate.md` to mention the pipeline as the canonical caller — gate.ts itself stays unchanged; the wiki page just gains a "Called by" cross-reference
2. Create `wiki/entities/capture-pipeline.md` documenting the seam:
   - The `processCandidate(event, storage)` contract
   - The dependency-injection pattern (storage as parameter)
   - The "purity-up-to-inherited-side-effects" claim
   - Cross-references to [[capture-gate]] and [[storage]]
3. Update `wiki/concepts/sandboxed-capture.md` to mention the pipeline as part of the chokepoint architecture (gate + pipeline = the runtime expression of sandboxed-capture)
4. Update manifest + index for the new entity page
