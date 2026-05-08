---
status: shipped
topic: Architecture
subtopic: Capture
aliases:
  - Capture Pipeline
  - processCandidate
  - Pipeline Seam
---

# Capture Pipeline

## Definition

The capture pipeline (`src/capture/pipeline.ts`) is the thin seam that joins the [[capture-gate]] and [[storage]]. It is a single async function — `processCandidate(event, storage)` — that runs the gate, and on accept calls `storage.append`. Every capture surface (FS watcher, Cursor extractor, Claude Code extractor, git watcher) funnels candidate events through this one function. It is the *only* place in the codebase where "accepted by the gate → persisted" is enforced.

## Public Contract

```ts
type PipelineResult =
  | { accepted: true;  id: EventId }
  | { accepted: false; reason: RejectionReason };

async function processCandidate(
  event: unknown,
  storage: Storage,
): Promise<PipelineResult>;
```

The `event` parameter is `unknown` — the gate is the validation boundary, and the pipeline does not pre-validate. The `RejectionReason` type is reused verbatim from `capture/gate.ts`; the pipeline introduces no new rejection strings.

## Behavior

1. Call `gate(event)`.
2. If the gate rejects: return `{ accepted: false, reason }` immediately. **Storage is not touched.**
3. If the gate accepts: narrow the event to the storage append shape (drops any caller-supplied `id`; storage assigns one), **canonicalize `timestamp` to UTC `Z` form**, call `storage.append(...)`, return `{ accepted: true, id }`.

That's the whole function. No other branches, no other I/O.

### Timestamp canonicalization (item 022)

The pipeline is the single chokepoint where `CaptureEvent.timestamp` is rewritten to canonical UTC. The implementation is one line — `new Date(validated.timestamp).toISOString()` — applied immediately before `storage.append`. `Date.prototype.toISOString()` always returns the `YYYY-MM-DDTHH:MM:SS.sssZ` form regardless of input offset, preserving millisecond precision.

This was specced as Codex's correction during the item 022 brainstorm: a per-source fix (e.g., only patching `git-watcher.ts`) leaves every future capture surface having to remember the convention. Centralizing at the pipeline makes the invariant structural — every capture event landing in [[storage]] is in canonical form, regardless of which surface produced it.

Naive timestamps (no TZ marker) are canonicalized assuming UTC (per Codex's N1 recommendation). Capture surfaces today don't emit naive timestamps; the policy is a defensive stance for future surfaces. The trace tool's TZ warning still fires for AI clients passing naive *queries* (see [[mcp-recent-work-context]]). See [[timestamp-canonicalization]] for the full design and the one-time migration of pre-022 rows.

## Dependency Injection: Storage as Parameter

`storage` is a function parameter, never a module-level singleton. The pipeline does not import a storage instance; the daemon constructs the storage backend at boot and hands it in. Two consequences flow from this choice:

- **Tests use `MemoryStorage` trivially.** No mocks, no module-level state to reset between cases.
- **Backends are swappable.** `MemoryStorage` for tests, `SqliteStorage` in production, future backends without touching pipeline code. The pipeline knows only the [[storage]] interface.

Every capture surface receives the same `storage` reference at startup and threads it through every `processCandidate` call. There is one storage instance per daemon process; the DI is structural, not for runtime swapping.

## The Purity Claim

The pipeline is "pure up to inherited side effects." It introduces no new I/O of its own:

- The gate's one log line per call (info on accept, warn on reject) — inherited from [[capture-gate]].
- The storage's `append` row insert — inherited from [[storage]].
- Timestamp canonicalization (item 022) — pure transformation; reads no clock, no env, no file.

Nothing else. No metrics, no retries, no second log line, no batch buffer. If you want to know what `processCandidate` does observationally, the answer is exactly: gate's log line, plus (on accept) one storage append.

## Why It Exists

The gate ships as a pure decision function — it returns `{ accepted, reason }` and intentionally does not write to storage. The storage interface ships with no caller. The pipeline is the seam that joins them. Three architectural benefits:

1. **One chokepoint, one wiring.** Capture surfaces call `processCandidate` and don't know about gate-vs-storage internally. Adding a fifth surface (e.g., a future Swift Accessibility shim) means calling one function, not wiring two.
2. **No leaked allowlist logic.** Surfaces never need to import `gate` or `sources.ts`. The seam encapsulates the policy boundary.
3. **Single seam to extend.** When V1.5 adds embedding generation, hashing, or dedup, the change lives in one file. Surfaces stay untouched; storage stays untouched.

## What the Pipeline Doesn't Do

By design — these are out-of-scope:

- **Doesn't capture.** Capture surfaces (FS watcher, extractors, git watcher) sit upstream and produce candidates.
- **Doesn't host.** The daemon (`src/daemon/index.ts`) constructs storage and starts surfaces; the pipeline is just a function.
- **Doesn't rate-limit, dedupe, or hash.** All deferred.
- **Doesn't batch.** One event in, one append out. No buffering.
- **Doesn't retry.** Storage errors propagate to the caller; the surface decides.
- **Doesn't generate embeddings.** The `embedding` field stays nullable; an embedding pipeline is a separate later concern.
- **Doesn't introduce new rejection reasons.** Reuses gate's `RejectionReason` exactly.

## Related

- [[capture-gate]] — the decision function the pipeline calls first
- [[storage]] — the persistence layer the pipeline appends to on accept
- [[capture-allowlist]] — what the gate consults; transitively governs the pipeline
- [[sandboxed-capture]] — the architectural principle gate + pipeline together enforce at runtime
- [[timestamp-canonicalization]] — the capture-side guarantee for canonical `Z` timestamps
- [[fs-watcher]], [[cursor-extractor]], [[claude-code-extractor]], [[git-capture]] — the capture surfaces that call `processCandidate`
- [[local-daemon]] — host process that constructs storage and threads it into every surface
