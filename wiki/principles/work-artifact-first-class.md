---
status: shipped
topic: Architecture
subtopic: Retrieval Discipline
aliases:
  - Work Artifact First Class
  - work-artifact-first-class
  - Repo Scoping as Retrieval Predicate
---

# Work Artifact First Class

## Definition

The work artifact a user is engaged with (today: the git repo they're working in) is a **first-class retrieval predicate** at the ECHO substrate. The user's productive intelligence is scoped to projects, not to chat sessions or app windows; the substrate must expose that scoping uniformly across capture, storage, and retrieval. Anything that surfaces context from a different project than the user is currently in is — by default — wrong.

## How It Manifests

**Capture-side:** every connected app's extractor writes `metadata.repo_root` on each atom, derived from whatever signal the app itself provides about the active project (cwd, workspace binding, file references). See [[cursor-extractor]], [[claude-code-extractor]], [[codex-extractor]].

**Storage-side:** `repo_root` is in the `METADATA_MATCH_KEY_WHITELIST` (alongside `workspace_id`, `composer_id`, `session_id`). The storage layer accepts repo-scoped queries as a first-class predicate, not a post-filter on retrieved rows. See [[storage]].

**Retrieval-side:** every MCP retrieval tool that returns project-scoped data accepts a `repo_path` parameter. As of item [[2026-05-11-037-work-artifact-repo-scoping|037]] this is uniform across:

- [[mcp-search-memories|`search_memories`]]
- [[mcp-find-clusters|`find_clusters`]]
- [[mcp-wait-for-new-turns|`wait_for_new_turns`]]
- [[mcp-echo-resolve-mru|`echo_resolve_mru`]] (the MRU resolver)

## Why This Matters

Without first-class work-artifact scoping, **cross-project bleed is the default failure mode**. A user working in Project A whose AI client queries ECHO can — and routinely did — get matched context from Project B that they touched 10 minutes earlier in another window. The 2026-05-11 14:46–16:00 PDT 3-way root-cause investigation (CC + Codex + Cursor) collapsed seven distinct retrieval-side failures to just two root causes: **RC1 (this principle: work-artifact scoping missing from retrieval) and RC2 (toolkit atomicity).** Six of the seven user-facing failures were RC1.

The principle is the failure mode named in its positive form. Make the substrate accept repo scope as a structural parameter, and the bleed is structurally impossible — not just preventable by convention.

## What This Commits the Team To

- **Every new capture surface writes `metadata.repo_root` from day one.** If a source's app-level signal makes repo-derivation impossible, that's a known degraded surface; flag explicitly and queue a recovery item.
- **Every new MCP retrieval tool accepts `repo_path` if it returns project-scoped data.** Tools that intentionally return cross-project results (e.g., diagnostics) document the explicit choice.
- **`repo_root` stays in the storage whitelist.** Adding new metadata-match keys requires a deliberate decision; removing `repo_root` requires a deliberate decision; nothing about the substrate is implicit.
- **Legacy atoms without `repo_root` are recovered, not stranded.** Pre-037 atoms lack `metadata.repo_root`; the Cursor Phase 2 legacy resolver in `echo_resolve_mru` recovers them via the workspace-hash chain so historical context is still reachable.

## Product-Decision Test

When evaluating any feature that touches retrieval, ask:

- *"Does this respect the user's current work artifact?"* → if yes, ship.
- *"Could this return context from another project the user touched recently?"* → fix the scoping before shipping.
- *"Is the work artifact derivable from this surface?"* → if no, document the degraded-surface gap; do not silently ship cross-project bleed.

## Strategic Significance

This principle is the substrate-side expression of [[felt-not-seen]]: the user should never have to *tell* ECHO which project they're in — the substrate already knows because each app's extractor wrote that fact at capture time, and the retrieval surface honors it. Felt-not-seen means context that respects what the user is actually doing; work-artifact-first-class is what makes that mechanically true rather than promised.

## Related

- [[felt-not-seen]] — why the user shouldn't need to specify project context
- [[capture-gate]] — chokepoint that enforces capture-side `repo_root` writes
- [[storage]] — `METADATA_MATCH_KEY_WHITELIST` admission point
- [[mcp-echo-resolve-mru]] — the resolver primitive that normalizes repo scoping across source-apps
- [[2026-05-11-037-work-artifact-repo-scoping|item 037]] — the spec that landed this principle
- [[atomic-primitives-compose]] — the sibling principle from item 038
