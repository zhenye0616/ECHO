---
status: shipped
topic: Architecture
subtopic: Observability
aliases:
  - MCP Request Log Shutdown Flush
  - Graceful Shutdown Flush
---

# MCP Request Log Shutdown Flush

## Definition

The MCP request log shutdown flush is the daemon-side mechanism that persists the in-process MCP tool-call ring buffer to a structured forensic artifact during graceful SIGTERM / SIGINT. Before this primitive, the request log at `src/mcp/request-log.ts` was an in-process ring buffer only: every entry — completed or still pending — disappeared when the process exited. After 067 (shipped 2026-05-21 as item [[2026-05-21-067-mcp-request-log-shutdown-flush|067]]), the daemon's onShutdown hook synchronously writes the current ring to `<dataDir>/mcp-shutdown.jsonl` as JSONL, rewriting any still-`pending` entry to `killed_during_shutdown` so the dying process leaves an explicit operator-readable record of what it was serving when it died.

This closes the daemon-side durable-artifact half of the harness's **P2 — in-flight observability across restart** primitive for the graceful-shutdown case. The next-boot operator-awareness banner (in `tools/tail-mcp.sh`) was deliberately split into sibling spec `2026-05-21-068-tail-mcp-shutdown-banner` so 067 stays narrow.

## Why JSONL, not coord_emit

The strategist considered emitting these records as [[coord-substrate-and-observability|`coord_emit`]] events. The right test is consumer-driven: `coord_emit` is the right mechanism when one actor needs to hand typed state to another actor across a restart (e.g., `merge_paused` / `merge_blocked`). The MCP shutdown log has a different consumer — an operator investigating what the daemon served before it died. JSONL-on-disk keeps the artifact local, inspectable with shell tools, bounded by the existing 1000-entry ring, and independent of the coord substrate. If a future workflow needs agents to consume shutdown records as coordination events, that is a new P10-facing spec, not hidden scope in 067.

## The `killed_during_shutdown` status

Before 067, `RecentMcpCallStatus` was `'pending' | 'ok' | 'error'`. The flush adds `'killed_during_shutdown'` as the fourth value. The semantics:

- Entries that completed before shutdown preserve their `ok` / `error` status verbatim.
- Entries still `pending` at flush time are rewritten **in place** to `killed_during_shutdown` and receive a `duration_ms = Math.max(0, now - entry.ts)` measured from the entry's original start time to the flush time.
- Subsequent reads via `readRecentMcpCalls()` see the in-place killed status — the rewrite is durable in process memory as well as in the flushed JSONL.

The `/mcp/recent-calls?status=killed_during_shutdown` filter at `src/mcp/server.ts` accepts the new status as a valid query parameter, so a connected operator who happens to inspect the live ring during the brief window before the process exits can filter on the new status.

## JSONL forensic artifact

`flushRecentMcpCallLog(path: string, now = Date.now()): void` writes one `JSON.stringify(publicClone(entry))` line per ring entry, joined by `'\n'` with a trailing newline. An empty ring writes `''` (zero-byte file). The write uses `writeFileSync` intentionally — graceful shutdown may drain the event loop immediately after the hook returns, so async I/O can be lost.

The write is **atomic via tmp-then-rename**: `writeFileSync(path + '.tmp', body); renameSync(path + '.tmp', path)`. POSIX `rename(2)` is atomic, so any consumer reading `<dataDir>/mcp-shutdown.jsonl` sees either the prior complete file or the new complete file — never an empty or truncated file produced by a SIGKILL during the write. Best-effort cleanup of the `.tmp` sibling on error; leaking the tmp file is acceptable, destroying the prior breadcrumb is not.

The daemon wires the flush in `src/daemon/index.ts`'s onShutdown closure, ordered exactly between `mcp.stop()` and `cursorExtractor.stop()`:

```ts
await mcp.stop();
try {
  flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl'));
} catch (err) {
  process.stderr.write(`[daemon] mcp-shutdown-flush failed: ${(err as Error).message}\n`);
}
await cursorExtractor.stop();
```

The ordering is load-bearing: `mcp.stop()` first closes / rips active MCP connections so the ring's pending entries are stable; the flush then records the coherent snapshot; extractor / watcher teardown follows. The inline try/catch is **failure isolation** — `src/daemon/lifecycle.ts` wraps the entire onShutdown hook in a single try/catch, so an unhandled throw from the flush would short-circuit every subsequent extractor `stop()` / `dispose()` call. An observability flush must not be allowed to leave handles open or storage undisposed; the inline try/catch writes the error to stderr (visible in launchd logs) and continues teardown.

## Operator workflow

After a graceful daemon restart, the file at `<dataDir>/mcp-shutdown.jsonl` contains one JSON object per ring entry, including any `killed_during_shutdown` records. Each shutdown overwrites the prior file (no rotation, intentionally — each shutdown's artifact is the most recent dying-process record, not an audit history). Standard shell tooling reads it:

```bash
jq -r 'select(.status == "killed_during_shutdown") | "\(.ts) \(.tool) \(.duration_ms)ms"' \
  ~/.echo/data/mcp-shutdown.jsonl
```

If the file is empty (zero bytes), the daemon flushed cleanly with no entries in the ring. If the file is missing, either the daemon never started or the prior process did not shut down gracefully (see accepted gaps below).

The next-daemon process does NOT read this JSONL back into the live ring on boot — the next daemon's ring remains live-process state only. Operator awareness via the next-boot banner is the sibling spec `2026-05-21-068-tail-mcp-shutdown-banner`.

## P2 partial closure — accepted gaps

067 deliberately covers only the **graceful** shutdown case. Two gaps remain explicit and unsolved:

### Non-graceful death

The invariant does not cover SIGKILL, OOM kill, process panic before the hook runs, or host power loss. Those cases provide no shutdown execution window, so no synchronous flush can run. A write-on-every-call shadow log is the only mechanism that can close that gap; it is deferred until ops evidence shows the extra latency and surface area are justified. The graceful path covers controllable, common loss windows like daemon restart during development or planned launchd restarts.

### Ring overflow during a long pending call

The request-log ring buffer is bounded at 1000 entries (`MAX_CALLS` at `src/mcp/request-log.ts`). `beginRecentMcpCall` shifts the oldest entry when the ring overflows. A long-running pending call followed by ≥1000 later MCP calls before shutdown loses the pending entry to eviction; the flush has nothing to rewrite for that call, and `mcp-shutdown.jsonl` silently omits it. Closing this gap requires either pinning pending entries against eviction (changes ring semantics; risks unbounded memory on a stuck callback) or the same write-on-every-call shadow log as the previous gap. V1 accepts the eviction loss explicitly: the invariant covers what the ring still holds, not the full lifetime of MCP traffic.

Operators investigating a `mcp-shutdown.jsonl` with no `killed_during_shutdown` entries after a known-stuck call should consider eviction as a possible cause alongside the call having completed cleanly.

## Out of scope (kept narrow)

- Rotating or archiving `mcp-shutdown.jsonl`. Each shutdown overwrites the most recent dying-process artifact.
- Reading the JSONL back into the live ring on next boot. The next daemon's ring is live-process state only.
- A write-on-every-call shadow log for SIGKILL / OOM / panic survival.
- Persisting request-log entries to SQLite. SQLite is the durable atom substrate; making every MCP call a DB write is a separate latency/concurrency design.
- A new `mcp_status` MCP tool. `/mcp/recent-calls` already exposes the live ring.
- Generalizing shutdown flush to extractors / watchers. 067 must not block future extraction, but the second concrete consumer triggers the shared helper (second-occurrence rule).

## Related

- [[coord-substrate-and-observability]] — sibling observability layer; uses `coord_emit` for inter-agent coordination events, contrasted above
- [[mcp-server]] — host that registers tool callbacks the request log instruments
- [[local-daemon]] — process lifecycle that owns the onShutdown hook
- [[logger]] — sibling daemon logging surface
- [[storage]] — separate substrate where atoms (not MCP call traces) durably live
