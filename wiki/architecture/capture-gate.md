---
status: shipped
topic: Architecture
subtopic: Storage
aliases:
  - Capture Gate
  - Gate
  - Sandboxed Capture Chokepoint
---

# Capture Gate

## Definition

The capture gate (`src/capture/gate.ts`) is the single runtime chokepoint through which every captured event must pass to be persisted. It is a pure function: input → `GateResult`, with one observable side-effect (a structured log line per call). The gate consults the [[capture-allowlist]] and decides accept or reject. It does **not** write to storage — that's the caller's job.

## Public Contract

```ts
gate(event: unknown): GateResult

type GateResult =
  | { accepted: true; reason: 'allowlisted' }
  | { accepted: false; reason: RejectionReason };

type RejectionReason =
  | 'unknown_app'
  | 'unknown_domain'
  | 'unknown_path'
  | 'unknown_api'
  | 'unknown_repo'
  | 'malformed_event';
```

The `event` parameter is `unknown` — the gate is the validation boundary and never trusts callers.

## The Source String Convention

Every event carries a `source` field formatted as `<kind>:<id>`:

| Source | Means | Routes to |
|---|---|---|
| `app:com.todesktop.230313mzl4w4u92` | Native app, by bundle ID | `isAllowedApp` |
| `domain:app.slack.com` | Web surface, by host | `isAllowedDomain` |
| `fs:/Users/foo/Library/.../workspaceStorage/x.db` | File-system path | `isAllowedPath` |
| `api:github` | API connector | `isAllowedApi` |
| `git:/Users/foo/Desktop/Project_echo` | Git repository, by absolute path | `isAllowedRepo` |

The gate parses with `indexOf(':')` (not `split`) so IDs may contain colons (file paths, URLs with ports). Empty / leading-colon / trailing-colon sources are `malformed_event`.

## Stable Rejection Reason Codes

Audit-page consumers can rely on these strings being permanent:

| Reason | Cause |
|---|---|
| `unknown_app` | Well-formed `app:` source, bundle ID not in allowlist |
| `unknown_domain` | Well-formed `domain:` source, host not in allowlist |
| `unknown_path` | Well-formed `fs:` source, path doesn't prefix-match any allowed entry |
| `unknown_api` | Well-formed `api:` source, name not in allowlist |
| `unknown_repo` | Well-formed `git:` source, repo path doesn't match any allowed entry (added by [[git-capture]]) |
| `malformed_event` | Wrong shape, wrong types, missing fields, unknown kind prefix, etc. |

## The Purity Claim

The gate is pure aside from one effect: it emits exactly one structured log line per call (`info` for accept, `warn` for reject) via `createLogger('capture.gate')`. No other I/O, no internal state, no exceptions thrown — *any* input returns a `GateResult`.

Three concrete benefits flow from this:

1. **Trivial testing.** No mocks, no async setup. Construct an event, call the gate, assert the result. The shipped test suite has 28 cases covering every accept path, every reject path, and 17 malformed inputs.
2. **Tight audit.** Every reject decision lands in the log with its reason code. The audit page can render counts ("ECHO blocked 47 events from non-allowlisted sources today") as proof the gate is working, not just claimed to work.
3. **Storage decoupling.** The gate doesn't know SQLite from `MemoryStorage`. The future capture-pipeline item wires accept-results into whatever store is configured. Swapping [[storage]] doesn't touch gate logic.

## What the Gate Doesn't Do

By design — these are out-of-scope and live elsewhere:

- **Doesn't write to storage.** Returns a `GateResult`; the caller decides what to do with an accepted event.
- **Doesn't capture.** Capture surfaces (Accessibility shim, FS watcher, extension bridge, API connectors) sit upstream of the gate.
- **Doesn't rate-limit, dedup, or hash content.** All deferred.
- **Doesn't mutate the allowlist.** Read-only against [[capture-allowlist]]; allowlist changes are separate code edits.
- **Doesn't throw.** The gate is a total function. Defensive at the boundary; no unhappy paths for the caller to handle.

## Related

- [[capture-allowlist]] — the source of truth the gate consults
- [[sandboxed-capture]] — the architectural principle the gate enforces
- [[storage]] — the persistence layer the gate is upstream of
- [[audit-page]] — consumer of stable rejection reason codes
- [[local-daemon]] — host process for the gate
- [[git-capture]] — introduced the `git:` source kind and the `unknown_repo` rejection
