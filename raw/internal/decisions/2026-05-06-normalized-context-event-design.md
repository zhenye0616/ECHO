# Normalized Context Event — design reasoning

**Date:** 2026-05-06
**Status:** committed (spec lives in `backlog/ready/2026-05-06-016-read-time-normalizer.md`)
**Participants:** founder, Claude Code (this Claude), Codex CLI (founder's other AI session)

## Problem

The substrate today exposes a string-typed envelope: `CaptureEvent { id, source, timestamp, content: string, metadata }`. Each extractor invents its own `content` shape and `metadata` keys. That is the correct V1 storage primitive — append-only, source-prefix-typed, no premature ontology. But the consumer side (MCP retrieval, future trace viewer, future Resume Packet) needs a richer joinable contract.

The question: what is that contract, and where does it live?

## Alternatives considered

**(A) Replace storage primitive.** Add structured columns or store `NormalizedContextEvent` JSON in `content`. Migrate existing extractors. Touch every adapter. *Right answer if storage-as-substrate should be joinable at rest. Wrong answer for V1: only 2 adapters have run against a candidate shape, locking the at-rest format on an unproven schema is the most expensive way to learn the schema is wrong.*

**(B) Read-time normalizer / wire format.** Storage stays as today. A normalizer runs at read time: `CaptureEvent → NormalizedContextEvent | null`. MCP/trace/UI consume normalized events. Raw events remain the audit log. *Cheapest, most reversible. Storage is bet on once; the schema can be reshaped without touching storage.*

**(C) Dual-column / dual-track.** Store today's `CaptureEvent` and a normalized JSON blob alongside. Adapters fill both during transition. *Hedged but expensive in disk + adapter complexity.*

**(D) Vocabulary, not wire format.** Schema is a shared mental model that adapters/consumers reach for *informally* but no single object literally carries the shape. *Cheapest of all but doesn't solve the consumer-side join problem.*

**Decision: (B).** Reasons:
- Only 2 adapters have stress-tested the candidate shape. Locking storage now is premature.
- "Evidence atoms, not truth" stays honest because raw events stay raw on disk.
- If the schema turns out wrong, deleting `src/normalize/` is the rollback. No data migration required.
- (A) becomes the right answer once 4+ adapters have validated the shape across distinct workflow domains. Defer until then.

## Layering

The brainstorm produced this layering, which is sharper than what either side started with:

```
Atom (NormalizedContextEvent)
  observed evidence — concrete artifacts, time, actor, action, raw payloads
        │
        ▼
WorkTrace (V1.5+)
  inferred clusters — links atoms by inferred shared work-object
        │
        ▼
Resume Packet (V2)
  product surface — answers "where was I, what's open, what's next?"
```

Important corrections made mid-conversation:

1. **Codex's "Work Object" ≠ atom-level `artifacts[]`.** A "deal" or "matter" or "research question" is not a single observable artifact — it's a cluster inferred from many artifacts (CRM record + email thread + person + Slack channel). The atom carries the concrete per-source handles; the WorkTrace builds the work object out of them. Conflating these would have leaked V2 entity-resolution work into V1.
2. **Open loops live at the trace layer, not the atom.** "Is this an unanswered question?" is a property of how the conversation evolved, not of the atom in isolation. Atoms emit *observable hints* (`ends_with_question`, `contains_todo`); the trace layer resolves them.
3. **Resume Packet is a query response, not a substrate primitive.** Naming it sharpens the V1 substrate target ("the atom must support what Resume Packet eventually needs") but doesn't change a single substrate decision.

## Generalizability

The founder explicitly required: V1 implements only dev-tools adapters, but the substrate must work for non-dev workflows without redesign. Stress-tested the shape against three V2 cohorts:

- **Salesperson moving a deal** (Salesforce + Gmail + Claude.ai + email): the "ACME deal" appears in 4 different artifact forms — atom-level identity does not exist for it; only per-source handles do. → confirms work-object lives at WorkTrace, not atom.
- **Lawyer on a legal matter** (Preview + ChatGPT + Word + Slack): same pattern. The matter is inferred from co-occurrence, never observed atomically.
- **Researcher on a question** (browser + arXiv + Notion + Claude): same pattern, sometimes spanning weeks with reactivation.

This forced two corrections to defaults that had been floated:

- **Closed enums for `action.kind` and `artifact.type` rejected.** A `crm_record`, `patient_record`, `lesson_plan` artifact type is V2+; can't enumerate now. Open string with documented recommended vocabularies is the substrate-correct call.
- **`provider` namespacing on artifact IDs is load-bearing.** A Salesforce `account_id` and a HubSpot `account_id` with the same value are different artifacts. Every `ArtifactRef` carries `{ type, provider, id }` minimum.

## Defaults locked (open to redline at spec review)

| | Default | Reason |
|---|---|---|
| Raw payload | Inline copy in `action.input/output` | MCP responses must be self-contained |
| `null` semantics | "No adapter matched"; malformed throws | Separates routing from data failures |
| `parent_event_id` chasing | Inside ECHO's ledger only | The ledger is the audit substrate |
| Tool calls inside a turn | Don't split into separate atoms in V1 | Avoid changing shipped extractor |
| `time.observed_at` | Only set when meaningfully different from `occurred_at` | Avoid noise on the common path |
| Schema versioning | Per-event `schema_version: 1`; bump on breaking change | Cheap, no migration registry needed in V1 |
| Adapter dispatch | Registry of `(matches, adapter)`, first-match-wins | Simplest correct routing |
| Artifact identity | See `backlog/ready/2026-05-06-016-…` artifact-identity table | The most-fought-over part of the design |
| Open vocabulary | Yes for `action.kind` and `artifact.type` | Generalizability requires this |

All listed in the backlog item as `(default — open to redline)`. If the founder redlines any during review, append a "Redlines applied" section here capturing why.

## What this item ships

`src/normalize/` with types, dispatch, artifact-identity utilities, and adapters for **claude-code, codex, cursor, git** (the four sources currently producing CaptureEvents). Pure functions, no I/O, no clock. Tests are golden-fixture-based using anonymized real captures. (The codex extractor was added in a wave-3 follow-up; the spec was originally scoped against three adapters but updated to four during the spec-writing self-review pass after grepping the live `src/capture/extractors/` directory.)

What it does NOT ship: WorkTrace builder, Resume Packet, MCP integration (separate follow-up), storage changes, embedding, any new adapter beyond the three that already produce events.

## What we'll learn from V1

- Whether the open-vocabulary discipline survives 3+ adapters without colliding terms.
- Whether the artifact-identity policy correctly joins events that *should* join in real workflows (founder's own daily use; the killer demo).
- Whether the `provenance.raw_payload_hash` ever flags drift between raw and normalized (i.e., whether a normalized event ever gets stale relative to its source `CaptureEvent`).
- Whether `null`-on-no-match generates noise (suggesting we missed an adapter or a source) or stays quiet (suggesting the dispatch is right).

V1.5 decisions to defer: WorkTrace shape, open-loop resolution rules, Resume Packet structure, file-rename lineage chasing, tool-call atom splitting.

## Redlines applied during pre-claim review

After the initial spec was written, codex returned a redline pass against the schema. Four of seven changes were applied; five were rejected. Reasoning:

**Applied:**

1. `actor.role` opened from closed enum to `string`. Reason: consistent with the open-vocabulary discipline already locked for `action.kind` and `artifact.type`. V2 cohorts will have roles like `coworker`, `customer`, `automation` that we can't enumerate.
2. Renamed singular `actor: ActorRef[]` → plural `actors: ActorRef[]`. Reason: it was always an array; English naming should reflect cardinality.
3. Added `action.status?: string` (e.g., `'completed' | 'failed' | 'pending'`). Reason: useful for V2 events with outcome semantics; cost is one optional field; breaking change to add later.
4. Added `artifact.locator?: string` distinct from `label` and `id`. Reason: real distinction — `id` is canonical (`<repo_id>::<rel_path>`), `label` is display ("main.ts in echo"), `locator` is mechanical handle for navigation (absolute path; full URL). The trace viewer needs all three.

**Rejected:**

1. `time.position?: { turn?, message?, tool_call?, version? }`. Reason: solves a problem no V1 adapter has. Conversation turn ordering is already covered by `conversation.turn_index` (correctly coupled to `session_id` for scope); git uses `time.occurred_at`; no source has document versioning. YAGNI — add when an adapter actually needs ordering beyond what conversation provides.
2. `context.visible: string` (codex's single string) — kept as `string[]`. Reason: visible context is plural by nature (multiple files open, tabs visible). Single string would force ad-hoc serialization.
3. `context.ambient: string` (codex's single string) — kept as `Record<string, string>`. Reason: per-adapter notes already mandate structured keys (`{ had_tool_use: 'true', cursor_position: '42' }`). String would lose structure.
4. `state: { kind: 'snapshot' | 'delta'; value: unknown }` — kept as discriminated union with typed `SnapshotRef`/`DeltaRef`. Reason: type-safe, gives consumers something to grip on. `value: unknown` defeats the schema's reason for existing.
5. Make `provenance.raw_payload_hash` and `extractor_version` optional — kept required. Reason: the audit trail. Hash detects drift between raw and normalized; extractor_version pins which adapter produced the atom. Both cheap to compute and load-bearing for debugging.

The redlines did not surface any change to the V1/V1.5/V2 layering, the artifact-identity policy, or the closed list of V1 adapters (claude-code + codex + cursor + git, with codex added during the spec self-review pass).

## Conversation artifacts referenced

- This Claude Code session, 2026-05-06.
- Codex CLI session (founder's other AI), 2026-05-06: produced the first sketch of `NormalizedContextEvent`, the over-modeled before/after/delta triple that we trimmed, the artifact identity primer, and the post-spec redline pass summarized above.
- Generalizability stress-test: salesperson + lawyer + researcher walk-throughs that surfaced the closed-enum rejection and the provider-namespacing requirement.
