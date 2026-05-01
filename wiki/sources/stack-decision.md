---
topic: Architecture
subtopic: Substrate
aliases:
  - Stack Decision
  - Daemon Stack
  - Runtime Choice
---

# Stack Decision

## Definition

ECHO's local daemon is built in **TypeScript on Node.js**. The Swift Accessibility shim — originally sketched as a co-equal half of the substrate — is **deferred** out of V1 along with the rest of the Accessibility-API capture path. This page records why TS/Node won, what alternatives were weighed, and which costs the team is consciously paying.

## The Decision

| | Choice |
|---|---|
| Daemon runtime | **TypeScript + Node.js** |
| Module format | ESM (`"type": "module"`, NodeNext resolution) |
| TypeScript mode | Strict — `strict: true`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` |
| Test runner | Vitest |
| MCP transport | `@modelcontextprotocol/sdk` (Node, first-party) |
| Storage | `better-sqlite3` (synchronous, in-process) |
| FS watching | `chokidar` |
| Swift shim | **Deferred** — re-opens when Accessibility-driven cross-app capture re-enters scope |

Locked at item `2026-04-30-001-repo-bootstrap` and unchanged through items 002–015.

## Alternatives Considered

- **Rust.** Best capability fit on paper — predictable memory, fearless concurrency, single-binary distribution. Ruled out on founder fluency: a 10-week wedge-validation V1 cannot afford the iteration-speed tax of a language the founder writes weekly-not-daily.
- **Go.** Same shape of trade as Rust — better runtime properties, slower founder iteration. Same verdict.
- **Swift everywhere.** Accessibility-native, would have collapsed the Swift-shim seam entirely. Ruled out on two counts: (1) `@modelcontextprotocol/sdk` has no first-party Swift implementation — going Swift means rolling MCP transport ourselves; (2) Swift's mac-first posture cuts off the Linux/Windows portability we'll need for a v2-era cross-platform daemon.
- **Pure-TS web service (no daemon).** Ruled out by the [[ambient-form-factor]] commitment: ECHO must live invisibly on the user's machine, observe local files and apps, and respond under 100ms. A cloud service can't watch `~/.claude/projects/`.

## Rationale

Three reasons compound:

1. **Velocity bet.** The founder writes TypeScript daily (the shipped Chrome extension is TS). Iteration speed in V1 outweighs runtime efficiency — we are validating whether ECHO is wanted, not whether it can serve a million users. Runtime swaps are cheaper than missed product-market fit.
2. **First-party MCP SDK.** `@modelcontextprotocol/sdk` is Node-first. Picking any non-Node runtime means writing the MCP transport layer ourselves and tracking spec drift in our own code. That's a tax we'd pay every week of V1.
3. **Type-sharing with the extension.** The browser extension is already TS. Sharing `Source`, `CaptureEvent`, and gate types across daemon + extension is a free win.

## Costs Accepted

The team is paying these costs deliberately, not by oversight.

- **Long-lived daemon discipline.** Node processes that run for days need explicit lifecycle management — no implicit cleanup, no GC magic for things like file watchers and DB handles. Item 009's chokidar teardown was the first place this bit us; the followups ledger (`backlog/_followups.md`) tracks the residue.
- **Distribution requires bundling Node.** V1 ships from source via `npm run daemon` — fine for the founder and the first 20 indie AI builders. A real installer (signed binary, Node embedded, launchd plist) is a V1.5 problem, not a V1 problem.
- **No first-class Accessibility access.** Node can't talk to `AXUIElementCopyAttributeValue` directly. When cross-app capture beyond FS-readable surfaces re-enters scope, a Swift shim becomes necessary — but only then, not preemptively.

## Shipped Reality

Pinned dependencies as of items 001–015 (see `package.json`):

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "better-sqlite3": "^12.9.0",
    "chokidar": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

Five npm scripts gate every commit: `test`, `lint`, `format:check`, `typecheck`, plus `daemon` for local runs via `vite-node`.

## What This Is Not

- **Not a permanent commitment to Node.** The decision is V1-scoped. If wedge validates and the daemon needs to chase the cross-platform tier, a Rust rewrite is on the table — paid for by validated demand, not speculation.
- **Not an opinion about Swift's merits.** The Swift shim is deferred, not rejected. The day Accessibility-API capture is the next bottleneck, the shim ships.
- **Not a stance on language religion.** The bet is "founder velocity in V1" — that's a window-of-time argument, not a forever-truth.

## Related

- [[v1-spec]] — the 10-week wedge this stack serves
- [[local-daemon]] — the entity this stack runs as
- [[mcp-server]] — why first-party SDK availability mattered
