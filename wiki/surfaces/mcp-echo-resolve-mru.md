---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - echo_resolve_mru
  - MCP echo_resolve_mru tool
  - Echo Resolve MRU
  - MRU Resolver
---

# MCP `echo_resolve_mru` Tool

## Definition

`echo_resolve_mru` is the **MRU resolver** primitive in the V1.6 atomic MCP toolkit. It resolves the most-recently-active source under one or more predicates (source-app + optional repo_path) and returns a **search_memories-ready descriptor** per resolved source. It does NOT fetch atom bodies — it returns IDs/source/filter only, so callers compose with [[mcp-search-memories|`search_memories`]] (or [[mcp-wait-for-new-turns|`wait_for_new_turns`]]) for the actual data. Lives at `src/mcp/tools/echo-resolve-mru.ts`. Shipped 2026-05-12 as item [[2026-05-11-038-mcp-toolkit-atomicity-refactor|038]] (V1.6 RC2 — replaces compound `tail_session` modes with the atomic-primitive composition pattern).

## Why It Exists

V1.5's `tail_session` (killed in item 038) bundled two purposes into one tool: (1) resolve "newest source per app under repo_path scoping" and (2) tail N atoms from that source. The cross-project bleed bug and the M1-1 sub-gap C live-fires (2026-05-10 22:11 / 22:25 / 22:45 PDT) demonstrated that bundling the resolver and the tail in one tool prevented callers from caching descriptors, made Cursor's legacy-composer Phase 2 fallback ad-hoc, and forced bare-source paths through the wire (which the storage layer then had to handle as a special case).

`echo_resolve_mru` splits the resolver out as an atomic primitive. The descriptor it returns is `search_memories`-ready by construction — `{source, filter: {metadata_match?, repo_path?}, phase?}` — so the canonical compose is one extra MCP call, but the resolver result is cacheable, the filter scoping is explicit, and the cross-project bleed for Cursor is structurally impossible (the descriptor carries `repo_path` OR `metadata_match.composer_id` through to the search).

## Public Contract

**Tool name:** `echo_resolve_mru`

**Input schema** (zod):

```ts
{
  sources:    string[],       // REQUIRED. Non-empty, ≤ 8. Mixed entry types accepted:
                              //   - source-app name (cursor | claude_code | codex | git) → PREFIX MATCH on canonical app prefix
                              //   - literal source path (fs:/Users/.../session.jsonl, git:/Users/.../repo) → EXACT match
  repo_path?: string,         // optional absolute repo root. When set, only sources whose newest non-fs atom
                              // matches the repo are eligible. Source-app filtering rules (see below).
}
```

**Output envelope:**

```ts
{
  sources: { [requestedSource: string]: ResolvedSourceDescriptor | null },
  repo_path?: string,
  warnings: string[],
}

interface ResolvedSourceDescriptor {
  source:  string,            // canonical source path (the actual jsonl / vscdb / git ref)
  filter:  {
    metadata_match?: { [key: string]: string },   // e.g., {composer_id: '1c0493dd-...'} for Cursor Phase 2
    repo_path?:      string,                       // for claude_code / codex / git (Phase 1 metadata.repo_root)
  },
  phase?:  'cursor_legacy',   // present only when Cursor Phase 2 (legacy composer↔workspace registry) fired
}
```

## Repo Filtering by Source-App Kind

When `repo_path` is set, eligibility checks differ per source-app:

| source-app | Phase 1 (preferred) | Phase 2 fallback |
|---|---|---|
| `claude_code` | `metadata.repo_root === repo_path` | n/a |
| `codex` | `metadata.repo_root === repo_path` | n/a |
| `cursor` | `metadata.repo_root === repo_path` (post-037 capture writes this on new composers) | legacy composer↔workspace resolver — returns descriptor with `metadata_match: {composer_id: <resolved>}` (NOT `repo_path`, because legacy atoms predate the repo_root capture write); descriptor encodes `phase: 'cursor_legacy'` |
| `git` | two-path OR: `metadata.repo_root === repo_path` OR `source === git:<repo_path>` (recovers legacy git atoms by source path) | n/a |

**The Cursor two-phase behavior is load-bearing.** Composers created before 037's AC1 shipped (2026-05-11) lack `metadata.repo_root` on their atoms — the legacy resolver falls back to the workspace-hash → composer-id chain (the recovery chain item 035 originally shipped). Composers created post-037 resolve via Phase 1 directly. Both behaviors live in `echo_resolve_mru` so callers don't need to handle the asymmetry.

## Canonical Compose Patterns

The descriptor returned by `echo_resolve_mru` is consumed by `search_memories` (or `wait_for_new_turns`) via a spread. The four canonical compose recipes:

**1. Tail (search by source, recency-only) — replaces V1.5 `tail_session`:**

```ts
const r = await echo_resolve_mru({ sources: ['cursor'], repo_path: '/Users/zhenye/Desktop/Project_echo' });
const desc = r.sources['cursor'];
if (desc) {
  const tail = await search_memories({ source: desc.source, ...desc.filter, limit: 5 });
  // tail.matches[] is the 5 most-recent atoms scoped to the right Cursor composer
}
```

**2. Live-watch:** the descriptor's `filter.metadata_match` is NOT a `wait_for_new_turns` parameter — wait_for_new_turns uses sources + repo_path only:

```ts
const r = await echo_resolve_mru({ sources: ['claude_code'], repo_path: '/Users/zhenye/Desktop/Project_echo' });
const desc = r.sources['claude_code'];
if (desc) {
  // Use desc.source + desc.filter.repo_path; ignore metadata_match (legacy Cursor atoms are out of scope
  // for wait — wait is for NEW turns, legacy atoms are already captured)
  const w = await wait_for_new_turns({
    sources: [desc.source],
    repo_path: desc.filter.repo_path,
    since: now,
  });
}
```

**3. Cross-project scoping:** resolving multiple source-apps at once, scoped to one repo:

```ts
const r = await echo_resolve_mru({
  sources: ['cursor', 'codex', 'claude_code'],
  repo_path: '/Users/zhenye/Desktop/Project_echo',
});
// r.sources['cursor'], r.sources['codex'], r.sources['claude_code'] each return correct repo-scoped descriptor
// (or null if no atoms exist for that source-app in this repo).
// Cross-project bleed is structurally impossible — each descriptor carries the scoping filter.
```

**4. Direct exact-source verification:** pass a literal source path to check it's still eligible:

```ts
const r = await echo_resolve_mru({
  sources: ['fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<uuid>.jsonl'],
  repo_path: '/Users/zhenye/Desktop/Project_echo',
});
// r.sources[<that-source>] is non-null iff that exact source has at least one non-fs atom matching the repo.
```

## Cost Contract

- **No atom bodies fetched.** `echo_resolve_mru` is IDs-only / sources-only. Typical response < 2 kB regardless of source count.
- **Hard ceiling on `sources[]`: 8 entries.** Each entry is one bounded SQL probe; total probe count is bounded.
- **Cursor Phase 2 fallback is one extra SQLite query** (workspace.json grep → composerData filter). Still cheap at single-Cursor-install datasets.

## What `echo_resolve_mru` Does NOT Do

- **No atom bodies.** That's [[mcp-search-memories|`search_memories`]] (substring + filters) or [[mcp-get-atoms|`get_atoms`]] (by ID).
- **No subscription / blocking.** That's [[mcp-wait-for-new-turns|`wait_for_new_turns`]].
- **No clustering / discovery.** That's [[mcp-find-clusters|`find_clusters`]].
- **No write surface.** `readOnlyHint: true`.
- **No legacy Cursor atom wait.** Phase 2 (cursor_legacy) returns descriptors for ALREADY-captured atoms only; live-watch on legacy composers is structurally out of scope (wait is for new turns).

## Related

- [[mcp-server]] — the host transport
- [[mcp-search-memories]] — the primary compose target (descriptor → search)
- [[mcp-wait-for-new-turns]] — the live-watch compose target (descriptor.source + repo_path → wait)
- [[2026-05-11-038-mcp-toolkit-atomicity-refactor|item 038]] — the atomicity refactor this tool ships in
- [[2026-05-10-035-tail-session-repo-scoping|item 035]] — the Cursor legacy composer resolver this tool absorbs
- [[2026-05-11-037-work-artifact-repo-scoping|item 037]] — the `repo_path` end-to-end work this tool depends on
- [[work-artifact-first-class]] — the principle (work-artifact scoping as first-class retrieval predicate)
