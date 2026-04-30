---
id: 2026-04-30-003-capture-allowlist
title: Capture allowlist (sources.ts) — bounded source-of-truth
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-04-30
spec_refs: []
blocked_by:
  - 2026-04-30-001-repo-bootstrap
acceptance:
  - "`src/capture/sources.ts` exports a typed `CAPTURED_SOURCES` constant"
  - "Constant shape matches: { apps, domains, fs_paths, apis }"
  - "`Source` type is derived from the constant so types update automatically when entries change"
  - "Helper predicates: `isAllowedApp`, `isAllowedDomain`, `isAllowedPath`, `isAllowedApi`"
  - "Initial content is empty for all four categories — adding sources is an explicit, code-reviewed action"
  - "Tests cover positive, negative, and malformed inputs for each predicate"
files_to_modify:
  - src/capture/sources.ts
  - tests/capture/sources.test.ts

claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Capture allowlist (sources.ts) — bounded source-of-truth

## What

The single canonical allowlist file. Defines literally what ECHO is allowed to observe, by category. Every capture surface (browser extension wiring, Swift Accessibility shim, FS watchers, API connectors — all later items) consults this file. The capture gate (item 004) is the runtime chokepoint that enforces it.

Public shape:

```ts
// src/capture/sources.ts
export const CAPTURED_SOURCES = {
  apps: {
    // 'com.todesktop.230313mzl4w4u92': { name: 'Cursor', surfaces: ['native', 'fs'] },
  },
  domains: {
    // 'app.slack.com': { surfaces: ['extension'] },
  },
  fs_paths: [
    // '~/Library/Application Support/Cursor/User/workspaceStorage/',
  ],
  apis: [
    // 'github',
  ],
} as const;

export type Source =
  | { kind: 'app'; bundleId: keyof typeof CAPTURED_SOURCES.apps }
  | { kind: 'domain'; host: keyof typeof CAPTURED_SOURCES.domains }
  | { kind: 'fs'; path: string }
  | { kind: 'api'; name: string };

export function isAllowedApp(bundleId: string): boolean;
export function isAllowedDomain(host: string): boolean;
export function isAllowedPath(path: string): boolean;
export function isAllowedApi(name: string): boolean;
```

Behavior:

- `CAPTURED_SOURCES` is `as const` so TypeScript treats keys as literal types. Adding an entry to `apps` extends the `Source` discriminated union automatically.
- Predicates return `true` only if the input matches an entry. Comparison rules:
  - `isAllowedApp(bundleId)`: exact match against keys of `apps`
  - `isAllowedDomain(host)`: exact match against keys of `domains` (no subdomain wildcarding for V1)
  - `isAllowedPath(path)`: prefix match against entries in `fs_paths` after `~` expansion to the user's home
  - `isAllowedApi(name)`: exact match against entries in `apis`
- Predicates accept `unknown` and return `false` (not throw) for malformed inputs (non-string, empty string, etc.). Defensive boundary.

**Initial content is intentionally empty.** This item is the *mechanism*; adding sources is a separate per-source decision in later items as each capture surface ships.

## Why

Sandboxing is enforced as code, not policy. This file IS the enforcement. The audit page (Layer 5, V1 minimal) will eventually render this file's contents verbatim — single source of truth for "what does ECHO see?" so users don't have to take our word for it.

A change to the allowlist requires a commit, which is reviewable. No remote config, no feature flags, no runtime mutation. This is the architectural commitment behind the sandboxed-capture decision the strategist made earlier in the project.

The empty-initial-content choice is a forcing function: the substrate becomes useful only when paired with explicit per-source items. We don't want anyone — agent or founder — sneaking sources in via a config edit.

## Acceptance Criteria

- [ ] `src/capture/sources.ts` exports `CAPTURED_SOURCES` (typed via `as const`), `Source` (discriminated union), and the four `isAllowed*` predicates
- [ ] Initial allowlist is empty for all four categories (`apps: {}`, `domains: {}`, `fs_paths: []`, `apis: []`)
- [ ] `Source` type is derived from `CAPTURED_SOURCES` such that adding an entry updates the union (assertable in a type-only test)
- [ ] Predicates return `false` (not throw) for non-string inputs, empty strings, and any unknown value
- [ ] `isAllowedPath` expands a leading `~` to `os.homedir()` before comparison
- [ ] Tests in `tests/capture/sources.test.ts` cover:
  - Each predicate returns `false` against an empty allowlist (current state) for any plausible input
  - Each predicate returns `true` after a temporarily-extended fixture (test can construct a fixture allowlist or test the helper logic against a parameterized sample)
  - Malformed inputs (`null`, `undefined`, `42`, `''`, `{}`) return `false` from all predicates
  - `isAllowedPath` correctly handles `~`-prefixed paths
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` all clean

## Out of Scope (Don't Drift)

- **The capture gate function itself** — that's item 004
- **Any actual capture surfaces** (Swift shim, FS watchers, extension bridge, API connectors) — all later, separate items
- **Per-source consent toggles** ("user disables Slack temporarily") — Layer 5 audit-page feature, separate item
- **Persona / per-user allowlists** — V1.5+
- **Loading allowlist from JSON or env** — the constant is the right shape; do not add a config layer
- **Subdomain wildcarding, glob patterns, regex matching** — exact / prefix only for V1
- **Filling the allowlist with the V1 bundle entries** (Cursor bundle ID, slack.com, etc.) — those land per-integration in later items
- **Adding the audit page rendering** — separate item
- **Encryption or signing of the allowlist file** — V2+

## After Completion (Strategist Notes)

Once shipped, the strategist's next task (after this and the gate item both ship) is to:

1. Create `wiki/sources/capture-allowlist.md` documenting:
   - The allowlist as the canonical "what ECHO sees" source of truth
   - The empty-initial design choice and the forcing function it creates
   - The four categories and their semantics
2. Create `wiki/concepts/sandboxed-capture.md` documenting the broader principle:
   - Three layers of sandboxing (hardware / OS / application)
   - Why ECHO uses application-enforced sandboxing for daemon-side capture
   - Defense-in-depth: chokepoint + process privilege separation + tests
   - Honest framing: what's strongly guaranteed (extension `host_permissions`, OAuth scopes) vs. what depends on our discipline (Accessibility, FS)
3. Update manifest + index for both new pages
