---
status: shipped
topic: Architecture
subtopic: System Architecture
aliases:
  - Normalization
  - Read-Time Normalizer
  - Normalizer
---

# Normalization (Read-Time)

## Definition

The read-time normalizer is a pure, in-process layer that turns raw [[storage|`CaptureEvent`]]s into [[normalized-context-event|`NormalizedContextEvent`]] atoms — the joinable contract every downstream consumer reads. Source code lives at `src/normalize/`. Storage stays raw and append-only; the normalizer never writes back. If the schema turns out wrong, deleting `src/normalize/` is the rollback.

## Why Read-Time, Not Capture-Time

The substrate's storage primitive — `{ id, source, timestamp, content: string, metadata }` — is correct for V1: append-only, source-prefix-typed, no premature ontology. But consumers (MCP retrieval, the [[work-trace|trace layer]], and future Resume-Packet assembly) need a *joinable* contract — canonical artifact identity, structured actors, an explicit conversation reference, etc.

The chosen architecture solves both at once:

```
CaptureEvent (storage, raw, append-only)
        │
        ▼
normalizeEvent  (read-time, pure, dispatched per source)
        │
        ▼
NormalizedContextEvent  (consumer contract)
        │
        ▼
[MCP retrieval]  [trace layer]  [Resume Packet — V2]
```

Storage doesn't bet on the contract; the consumer side gets the joinable shape it needs. Any schema mistake costs only `src/normalize/` — never the ledger.

See `raw/internal/decisions/2026-05-06-normalized-context-event-design.md` for the alternatives considered (storage replacement / dual-column / vocabulary-only) and why read-time normalization won.

## Public API

```ts
// src/normalize/index.ts
export function normalizeEvent(event: CaptureEvent): NormalizedContextEvent | null;
export function normalizeEvents(events: CaptureEvent[]): NormalizedContextEvent[];
```

- `null` from `normalizeEvent` means **no adapter matched** the event's `source`. Callers may drop silently. (Generic `fs:` events from the [[fs-watcher]] are the canonical no-match case.)
- A matched-but-malformed payload throws `NormalizationError` (`src/normalize/errors.ts`), with the original `CaptureEvent` attached as `cause`. This separates routing failures from data failures.
- `normalizeEvents` is the convenience plural — it drops nulls silently.

## Adapter Dispatch

A first-match-wins registry, evaluated in registration order (`src/normalize/dispatch.ts`):

| # | Adapter | Source pattern |
|---|---|---|
| 1 | `claude-code` | `/^fs:.*\/\.claude\/projects\/.*\.jsonl$/` |
| 2 | `codex` | `/^fs:.*\/\.codex\/sessions\/.*\.jsonl$/` |
| 3 | `cursor` | `/^fs:.*\/Cursor\/User\/globalStorage\/state\.vscdb$/` |
| 4 | `git` | `/^git:/` |
| 5 | (fallthrough) | returns `null` — generic `fs:` events |

```ts
interface AdapterRegistration {
  name: string;          // for warn-logs
  version: string;       // copied into provenance.extractor_version
  matches: (source: string) => boolean;
  adapter: (event: CaptureEvent) => NormalizedContextEvent;
}
```

Multiple-match is impossible by construction — first match terminates. New adapters land by appending to the registry; ordering only matters when two patterns could overlap (today they don't).

## Adapter Contract: Pure

Every adapter is a pure function `(CaptureEvent) => NormalizedContextEvent`:

- Same input → same output.
- No `Date.now()`, no filesystem access, no network. `time.observed_at` is sourced from `event.timestamp`, never a clock read.
- No mutation of the input event.

The purity grep run during review:

```bash
grep -RE "Date.now|fs\.|require\('fs'\)|import.*from 'fs'" src/normalize/adapters/
# → zero hits
```

Pure adapters mean tests need no mocking and consumers (including the [[work-trace|trace layer]]) can call `normalizeEvent` repeatedly without side effects.

## Per-Adapter Output Shape

| Adapter | `source.app` | `action.kind` | Conversation? | Open-loop hints? |
|---|---|---|---|---|
| `claude-code` | `claude_code` | `message` | yes (`provider: 'claude_code'`) | yes (cheap regex) |
| `codex` | `codex` | `message` | yes (`provider: 'codex'`) | yes (cheap regex) |
| `cursor` | `cursor` | `message` | yes (`provider: 'cursor'`) | yes (cheap regex) |
| `git` | `git` | `commit` | no | no |

Cross-adapter conventions:

- **One atom per existing storage event** (1:1) for V1. The claude-code, codex, and cursor extractors emit one event per `(user, assistant)` turn pair; the normalizer preserves that. Tool calls inside a turn are not split into separate atoms in V1 (documented limitation; `context.ambient.had_tool_use = 'true'` flags the parent atom).
- **`provenance.source_event_id = event.id`** on every atom. `provenance.raw_payload_hash = sha256_hex(event.content)` so consumers can detect raw drift. `provenance.extractor_version = '<adapter-name>@1'`.
- **Inline-copy raw text** into `action.input` / `action.output`. Atoms are self-contained for MCP responses; no pointer-back to storage.

See [[claude-code-extractor]], [[codex-extractor]], [[cursor-extractor]], and [[git-capture]] for what each extractor emits *into* storage; this page documents what the normalizer emits *out*.

## Open Loop Hints — Observable Signals Only

Adapters emit cheap regex-detected hints. The atom does **not** declare whether a loop is open — that's the [[work-trace|trace layer]]'s job (V1.5+ enriches and resolves).

V1 hint kinds:

- `ends_with_question` — last user message ends with `?`
- `unresolved_assistant_q` — assistant turn ends with a clarifying question
- `contains_todo` — `TODO` or `FIXME` present in input/output
- `explicit_followup` — `/follow up|will do later|come back to/i` present

Resolution (whether the hint became a real open loop) stays V2 territory.

## Schema Versioning

Every emitted atom carries `schema_version: 1`. The shape is treated as a frozen V1 contract. Breaking changes bump the version. No migration registry in V1 because there are no v0 atoms to migrate (storage is raw; all atoms are produced fresh on every read).

## What it does NOT do

- **Modify storage.** The `CaptureEvent` contract is read-only input. No new columns, no new tables.
- **Modify any extractor.** Adapters consume what extractors already write.
- **Wire into MCP tools by itself.** Item 017 (queued) wires normalized atoms into `search_memories`. Item 018 already wires them through the [[work-trace|trace layer]] for `get_recent_work_context`.
- **Resolve open loops.** Atoms emit observable hints; the [[work-trace|trace layer]] decides whether they're real.
- **Track file-rename lineage.** A `git mv x.ts y.ts` produces two distinct artifact IDs in V1. Lineage chasing is V2 and would require git-rename detection at trace-build time.
- **Detect cross-tool entity resolution.** Whether two atoms refer to the same business entity (deal, ticket, person) is V2 NLP work; V1 atoms carry concrete artifact IDs only.
- **Generate embeddings.** Storage's `embedding` column stays untouched.

## Related

- [[normalized-context-event]] — the schema this layer emits
- [[artifact-identity]] — the canonical-id policy that powers cross-source joins
- [[work-trace]] — the V1.5 consumer that clusters normalized atoms into coherent work threads
- [[storage]] — the raw substrate this layer reads
- [[system-architecture]] — where the normalizer sits between storage and consumers
- [[mcp-recent-work-context]] — first MCP tool that returns normalized atoms (via the trace layer)
- [[claude-code-extractor]] / [[codex-extractor]] / [[cursor-extractor]] / [[git-capture]] — the four V1 sources whose output adapters this layer dispatches
