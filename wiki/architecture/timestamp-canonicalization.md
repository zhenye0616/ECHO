---
status: shipped
topic: Architecture
subtopic: Storage
aliases:
  - Timestamp Canonicalization
  - UTC Z form
  - Timestamp Migration
  - canonicalizeTimestamps
---

# Timestamp Canonicalization

## Definition

Every `CaptureEvent.timestamp` row in [[storage]] is an ISO 8601 UTC string in canonical `Z` form (`YYYY-MM-DDTHH:MM:SS.sssZ`). Two mechanisms guarantee this invariant: the [[capture-pipeline|capture pipeline]] canonicalizes every event at the chokepoint before `storage.append`, and a one-time migration on daemon startup rewrites any pre-existing non-`Z` row.

The single-form invariant exists because storage's `query()` does lexicographic compare on the `timestamp` column. With mixed-form rows, the lex compare silently drops events from time windows — `2026-05-08T00:18:26-07:00` lex-compares as **before** `2026-05-08T07:00:00.000Z` (its own UTC equivalent), so the offset-bearing row vanishes from a `since: 2026-05-08T05:00:00Z .. until: 2026-05-08T09:00:00Z` window even though it occurred inside it.

## Why Centralized at the Capture Chokepoint

The bug surfaced during round-4 dogfooding (item 022): the git-watcher emitted `±HH:MM` offset-bearing strings via `commit.author_iso`, while the JSONL extractors emitted `Z` form. On a busy day Codex measured 16 git events present chronologically vs. only 3 surfaced via the WHERE clause — the other 13 silently dropped.

Two earlier shapes of the fix were considered and rejected:

- **Per-source patches.** Make `git-watcher.ts` emit `Z` form. Works today, but every NEW capture surface has to remember the convention. The next adapter that emits `+0000` or a naive string re-introduces the same class of bug.
- **Storage-side normalization on `append`.** Equivalent in effect, but layers the responsibility wrong — storage takes whatever it's handed; the contract should be enforced *before* storage sees the event.

Codex's correction during the item 022 brainstorm: a single canonicalization point at the [[capture-pipeline|capture pipeline]] makes the invariant structural — every event reaching [[storage]] is in canonical form, regardless of which surface produced it. One place to test, one place to maintain.

The implementation is one line, run immediately before `storage.append`:

```ts
// src/capture/pipeline.ts
const id = await storage.append({
  ...validated,
  timestamp: new Date(validated.timestamp).toISOString(),
});
```

`Date.prototype.toISOString()` always returns the `YYYY-MM-DDTHH:MM:SS.sssZ` form regardless of input offset, preserving millisecond precision. The cost is sub-microsecond per event.

## Naive Timestamp Policy (N1)

When the input timestamp lacks any TZ marker (e.g., `2026-05-08T07:00:00`), the canonicalizer parses it as UTC. This is the **N1** policy — defensive permissiveness — chosen over **N2** (reject naive at the gate with a structured error).

Rationale:

- Capture surfaces today don't emit naive timestamps (git emits `-07:00`, JSONL extractors emit `Z`). The policy is a defensive stance for future surfaces.
- A future adapter that accidentally emits naive timestamps gets correctness-by-default rather than a hard rejection that surfaces only in production traffic.
- The trace tool's TZ warning (see [[mcp-recent-work-context]]) still fires for AI clients passing naive *queries*, surfacing the ambiguity at the read path.

Note that `Date.parse` on a naive string in Node treats it as **local time**, not UTC. `new Date(naive).toISOString()` therefore TZ-shifts naive input. A future tightening (explicit "naive-as-UTC" math via `Date.UTC(...)`) is queued; the V1.5.2 implementation accepts the local-shift footgun on the read path because no current capture surface emits naive.

## Migration on Daemon Startup

`src/storage/migrate.ts` exposes `canonicalizeTimestamps(db)`, called from the [[storage|`SqliteStorage`]] constructor at every daemon boot. The migration:

1. Selects rows where `timestamp NOT LIKE '%Z'`.
2. For each, rewrites `timestamp` to `new Date(row.timestamp).toISOString()`.
3. Runs the entire batch inside a single transaction.
4. Verifies before exit that `SELECT COUNT(*) FROM events WHERE timestamp NOT LIKE '%Z'` returns 0.
5. Logs `{message: 'canonicalized_timestamps', payload: {converted: N}}` when N > 0.

The migration is **idempotent** — the `WHERE` clause excludes already-`Z` rows, so re-running on a clean DB is a no-op. Running it twice on dirty data is also safe; the second run finds 0 rows.

### Why Node, not pure SQL

The seemingly-equivalent SQL form is **not acceptable**:

```sql
UPDATE events
SET timestamp = strftime('%Y-%m-%dT%H:%M:%fZ', datetime(timestamp))
WHERE timestamp NOT LIKE '%Z';
```

SQLite's `datetime()` parses the offset-bearing string into a UTC moment but **drops millisecond precision** before `strftime` reads it. A row with `2026-05-08T00:18:26.123-07:00` becomes `2026-05-08T07:18:26.000Z` — the `.123` ms vanishes. `Date.prototype.toISOString()` in Node always emits `.fffZ` and preserves all milliseconds the original timestamp carried.

Test fixture for the migration includes at least one row with non-zero milliseconds (e.g., `2026-05-08T00:18:26.123-07:00`); the post-migration assertion checks both that the row is now `Z` form and that `.123` survived.

## Read-Side Guardrails (Items 021 and 022)

Two related guardrails live at the trace tool, not at capture:

- **Naive-input warning** ([[mcp-recent-work-context|`get_recent_work_context`]] item 021). When a caller's `since` or `until` lacks an explicit TZ marker, the response surfaces a one-line warning: `"input.since (or input.until) lacks a TZ specifier and was parsed as local time; pass an explicit Z or +HH:MM to avoid ambiguity"`. Idempotent per request even if both inputs are naive. The detector regex was broadened in item 022 to recognize `+0700` (no colon) and `+07` (hour-only) forms in addition to `Z` and `+HH:MM`.
- **Storage-cap warning** (item 022). When the storage query returns exactly `limit * STORAGE_OVERFETCH` rows, `response.warnings[]` surfaces a verbatim message that atoms outside the slice may have been silently truncated. This is a separate concern from canonicalization, but bundled in the same dogfooding-driven patch.

## What This Doesn't Do

- **Doesn't validate timestamps at the gate.** The [[capture-gate|gate]] is a policy boundary, not a format normalizer. The pipeline normalizes after gate-accept.
- **Doesn't reject naive input.** N1 over N2; surfaces fall through with `Date`-default behavior.
- **Doesn't touch read-time atom timestamps** (`NormalizedContextEvent.time.occurred_at`). Normalizers handle their own per-source time fields; the canonicalization is on the raw `CaptureEvent.timestamp` column only.
- **Doesn't migrate other tables.** Only the `events` table's `timestamp` column. No other column carries timestamps in V1.
- **Doesn't add a schema column.** The migration rewrites in place; no `pre_migration_timestamp` shadow column or audit trail. The migration is forward-only.
- **Doesn't run on `MemoryStorage`.** That backend is volatile; canonicalization at the pipeline already covers everything that lands in it.

## Related

- [[capture-pipeline]] — the chokepoint where canonicalization is applied
- [[storage]] — the consumer of the invariant; the `WHERE timestamp >= ?` lex-compare correctness depends on it
- [[mcp-recent-work-context]] — read-side TZ warnings that surface ambiguity to AI clients
- [[git-capture]] — the V1 capture surface that historically emitted offset-bearing strings
