---
status: shipped
topic: Architecture
subtopic: System Architecture
aliases:
  - NormalizedContextEvent
  - Normalized Context Event
  - Atom
  - Normalized Atom
---

# `NormalizedContextEvent` (the atom shape)

## Definition

`NormalizedContextEvent` is the joinable contract every read-path consumer in ECHO speaks. It is the output of the [[normalization|read-time normalizer]] and the input of the [[work-trace|trace layer]], the future Resume-Packet assembler, and any later "atoms-flavored" MCP tool. It lives at `src/normalize/types.ts` and ships with `schema_version: 1` as a frozen V1 contract.

The atom is **observation, not interpretation**. It records what happened, who acted, what artifacts were touched, and observable hints about open loops. It does not decide whether a loop is open, what the work was, or which atoms belong together — those are downstream concerns.

## The Schema

```ts
interface NormalizedContextEvent {
  schema_version: 1;
  id: EventId;                   // = CaptureEvent.id (1:1)
  time: TimeRef;                 // when it happened / when ECHO observed it
  source: SourceRef;             // where it came from
  actors: ActorRef[];            // who/what acted; ≥1
  action: ActionRef;             // what happened (open vocab)
  artifacts: ArtifactRef[];      // observable join keys (open vocab)
  context?: ContextRef;          // what surrounded the action
  state?: ObservedState;         // either snapshot OR delta, never both
  conversation?: ConversationRef;
  open_loop_hints?: string[];    // observable signals only
  provenance: ProvenanceRef;     // never-lose-the-source audit trail
  warnings?: string[];           // non-fatal parse anomalies
}

interface TimeRef {
  occurred_at: string;           // ISO 8601 UTC
  observed_at?: string;          // ISO 8601 UTC; set only when ≠ occurred_at
  duration_ms?: number;          // span events; rare in V1
}

interface SourceRef {
  app: string;                   // 'claude_code' | 'cursor' | 'codex' | 'git' | ...
  surface?: string;              // 'jsonl' | 'composer' | 'commit'
  account?: string;              // workspace/tenant if known
  raw_pointer: string;           // CaptureEvent.source verbatim — audit pointer
}

interface ActorRef {
  role: string;                  // open vocab — 'user' | 'assistant' | 'tool' | 'system'
  name?: string;
  model?: string;                // 'claude-sonnet-4-5', 'gpt-4o', ...
  provider?: string;             // 'anthropic' | 'openai' | 'cursor' | 'local' | ...
}

interface ActionRef {
  kind: string;                  // open vocab — 'message' | 'edit' | 'commit' | 'run_tool' | ...
  verb?: string;                 // human-readable variant
  input?: string;                // user message / command / query (inline)
  output?: string;               // assistant reply / stdout / diff (inline)
  status?: string;               // 'completed' | 'failed' | 'pending' | ...
}

interface ArtifactRef {
  type: string;                  // open vocab — 'file' | 'repo' | 'conversation' | ...
  provider: string;              // open vocab — 'local_fs' | 'github' | 'claude_code' | ...
  id: string;                    // canonical identity per the [[artifact-identity]] policy
  label?: string;                // human-readable display label
  locator?: string;              // mechanical handle when distinct from `id`
}

interface ContextRef {
  visible?: string[];            // what was on-screen / open
  selected?: string;             // selection text
  ambient?: Record<string, string>; // free-form, adapter-defined
}

type ObservedState =
  | { snapshot: SnapshotRef; delta?: never }
  | { delta: DeltaRef; snapshot?: never };

interface SnapshotRef { artifact_id: string; hash?: string; summary?: string; }
interface DeltaRef    { artifact_id: string; kind: string; detail?: string; }

interface ConversationRef {
  provider: string;              // 'claude_code' | 'cursor' | 'codex' | ...
  session_id: string;
  turn_index?: number;
  parent_event_id?: EventId;     // ledger-internal; must terminate
}

interface ProvenanceRef {
  source_event_id: EventId;      // = CaptureEvent.id; lets consumers fetch raw
  raw_payload_hash: string;      // sha256(CaptureEvent.content) hex
  extractor_version: string;     // 'claude-code@1' | 'cursor@1' | ...
  redacted_fields?: string[];
  parse_warnings?: string[];
}
```

## Open Vocabularies

`actor.role`, `action.kind`, `artifact.type`, and `artifact.provider` are open `string`s, not enums. Recommended starter values land in the source code; new adapters add new values without a schema bump.

**Why open, not closed:** the substrate has to generalize beyond V1's dev-tools cohort. V2+ cohorts (sales, legal, medical, PM) have the same shape of work but different work objects. Closed enums would block that.

Recommended starter values for V1:

- `actor.role`: `user | assistant | tool | system`
- `action.kind`: `message | edit | read | search | run_tool | navigate | commit | comment | approve | reject | schedule | summarize | decide | delegate | follow_up`
- `artifact.type`: `file | repo | branch | commit | url | doc | thread | channel | person | conversation | crm_record | email_thread | issue | pr | task | meeting`

Adapters are free to use values outside this list; consumers must tolerate unknown values gracefully.

## `open_loop_hints` — Observable Only

A `string[]` of cheap regex-detected signals (`ends_with_question`, `unresolved_assistant_q`, `contains_todo`, `explicit_followup`). The atom never claims a loop is *actually* open — that's the [[work-trace|trace layer]]'s call. The trace layer enriches these strings into `{atom_id, kind, text, confidence}` per cluster. Resolution stays V2.

## Provenance is Load-Bearing

Every atom carries enough to fetch the raw `CaptureEvent`:

- `provenance.source_event_id` — the storage row id
- `provenance.raw_payload_hash` — detects drift if the raw row changes
- `provenance.extractor_version` — which adapter version produced the atom
- `provenance.redacted_fields[]` — dotted paths into the atom that were redacted (none in V1; reserved)
- `provenance.parse_warnings[]` — non-fatal anomalies the adapter saw

When an AI client wants the raw turn text, it reads `provenance.source_event_id` and queries storage. The atom is not the audit trail — the storage row is. The atom is the *joinable interpretation* of that row.

## What V1 Atoms Don't Do

- **No tool-call splitting** inside a Claude Code / Codex / Cursor turn. The parent turn carries `context.ambient.had_tool_use = 'true'` when applicable; the trace layer reconstructs from there if needed.
- **No file-rename lineage.** `git mv x.ts y.ts` produces two distinct artifact IDs.
- **No cross-tool entity resolution.** "Did this Slack message refer to deal A or deal B?" is V2 NLP work.
- **No `time.observed_at`** unless meaningfully different from `occurred_at` (e.g., backfill scenarios). Avoids noise on the common path.
- **No external `parent_event_id`.** Conversation chasing terminates inside ECHO's ledger.
- **No closed enums.** Adapters can add values; consumers must tolerate them.

## JSON Round-Trip Guarantee

Every emitted atom round-trips through `JSON.parse(JSON.stringify(atom))` without loss. This is the contract MCP responses depend on — atoms travel over the wire as JSON.

## Versioning Discipline

`schema_version: 1` is locked for V1. Any breaking change bumps to `2`. Additive fields (new optional properties) do not bump the version. The MCP tool description (`get_recent_work_context`) and the [[work-trace|trace layer]] response both carry their own `schema_version` for the same reason — atom-level vs response-level versions are independent.

## Related

- [[normalization]] — the read-time layer that produces this shape
- [[artifact-identity]] — the canonical-id policy that makes `artifacts[].id` joinable
- [[work-trace]] — the V1.5 consumer that clusters atoms by shared artifact identity
- [[storage]] — the raw substrate
- [[mcp-recent-work-context]] — first MCP response shape that includes atoms inline
