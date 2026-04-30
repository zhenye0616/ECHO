---
topic: Architecture
subtopic: Storage
aliases:
  - Capture Allowlist
  - CAPTURED_SOURCES
---

# Capture Allowlist

## Definition

The capture allowlist is the single canonical declaration of *what ECHO is allowed to observe*. It lives at `src/capture/sources.ts` as the constant `CAPTURED_SOURCES`, organized into four categories: `apps`, `domains`, `fs_paths`, `apis`. Every capture surface ECHO ships — browser extension, Accessibility shim, file watchers, API connectors — consults this file to know what is in-scope. The [[capture-gate]] is the runtime chokepoint that enforces it.

## The Four Categories

| Category | Match | Example |
|---|---|---|
| `apps` | Exact bundle ID | `com.todesktop.230313mzl4w4u92` (Cursor) |
| `domains` | Exact host (no subdomain wildcarding for V1) | `app.slack.com` |
| `fs_paths` | Prefix match after `~` expansion on both sides | `~/Library/Application Support/Cursor/User/workspaceStorage/` |
| `apis` | Exact name | `github` |

Each category is paired with a typed predicate (`isAllowedApp`, `isAllowedDomain`, `isAllowedPath`, `isAllowedApi`) that the gate calls. Predicates accept `unknown` and runtime-guard against malformed inputs — the boundary is defended at the type *and* runtime layers.

## The Empty-Initial Commitment

`CAPTURED_SOURCES` ships with all four categories empty. Adding a source — *any* source — is a deliberate, code-reviewed action. Each per-source decision lands in its own backlog item alongside the capture surface that consumes it.

This is a forcing function: the substrate becomes useful only when paired with explicit per-source items. There is no remote config, no feature flag, no runtime mutation path. A change to the allowlist requires a commit, which is reviewable. Neither agents nor the founder can sneak sources in via a config edit.

## Why This Shape

Three properties matter:

1. **Auditability.** The audit page (Layer 5, V1 minimal) renders this file's contents verbatim. Users don't take our word for "what does ECHO see?" — they read the file. One source of truth, no divergence.
2. **Type safety.** `CAPTURED_SOURCES` is declared `as const`, so `Source` is a discriminated union derived from the constant's literal keys. Adding an entry to `apps` extends the union automatically; misspelling a bundle ID at a callsite is a compile error.
3. **Reviewability.** Allowlist changes appear in `git log` and PR diffs alongside the integration that needs them. The blast radius of a single commit equals the surface it adds, never more.

## What the Allowlist Is Not

- **Not a permissions UI.** The audit page surfaces the contents read-only; per-source consent toggles ("user disables Slack temporarily") are a separate later item.
- **Not user-configurable at runtime.** No JSON load, no env-var override. The constant is the contract.
- **Not pattern-based.** No subdomain wildcarding, no globs, no regex. Exact / prefix only for V1. Adds clarity at the cost of verbosity — a reasonable trade in a security-critical chokepoint.
- **Not per-user.** Single allowlist for all users in V1. Persona / per-user allowlists are V1.5+.

## Related

- [[sandboxed-capture]] — the broader principle this implements
- [[capture-gate]] — the runtime enforcer
- [[storage]] — accepts only events that pass the gate
- [[audit-page]] — renders this file for users
- [[drift-prevention]] — empty-initial is itself a drift safeguard
