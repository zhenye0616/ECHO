---
item_id: "2026-05-29-082-retrieval-quality-eval-harness"
round: 1
reviewer: "codex"
artifact_sha: "a6ba1c72676f634659c8c329c33fdc5efa1d851e"
completed_at: '2026-05-29T22:48:41Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:94"
    finding: >-
      AC1 makes the suite gate require every P0 case to pass, but AC5 deliberately seeds P0 cases that are known to fail under today's retrieval behavior, and AC7 forbids changing query expansion, ranking, storage, MCP wire shapes, source extraction, or result caps to make them pass. The conflict is concrete for `signal-vs-noise-alias`: the spec says founder wording `signal vs noise` currently misses the intended May 29 thread, while the current `search_memories` contract is case-insensitive literal substring only (`src/mcp/tools/search-memories.ts:19-20`). A builder cannot both keep production retrieval unchanged and deliver an all-P0-pass suite. Patch the acceptance contract so item 082 accepts a harness that accurately reports initial failing gates (exit 1 plus documented `agent_notes`), or add an explicit expected-fail/baseline-fail state for known current-behavior gaps until follow-on retrieval fixes ship.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:104"
    finding: >-
      The case schema requires `query_variants[]` plus `tool_recipe[]` params, and AC4 says the runner hydrates candidate atoms, but the spec never defines the binding language between variants, discovery outputs, and hydration inputs. Static JSON cannot know `get_atoms.atom_ids`: `MemoryStorage.append` assigns random IDs at runtime (`src/storage/memory.ts:39-42`), and `getAtoms` requires a non-empty runtime `atom_ids` array (`src/mcp/tools/get-atoms.ts:240-251`). Without a prescribed placeholder/fan-out contract, each builder can invent incompatible recipes and top-rank scoring rules. Define how `$query` variants are substituted, how prior-step outputs such as `searchMemories.matches[*].id` or `findClusters.clusters[0].atom_ids` feed hydration, whether scoring is per variant or aggregated, and which discovery response determines `top_rank_success`.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:137"
    finding: >-
      AC4 requires deterministic isolated CI, while AC5 includes time-sensitive cases such as `what-shipped-today-needs-artifacts` and `resume-after-clear-newest-first`, but the schema only names `time_window` and does not require a fixed runner clock. The direct `findClusters` API defaults `now` to `new Date()` (`src/mcp/tools/find-clusters.ts:191-195`), so any no-args resume or relative "today" recipe will drift as wall-clock time moves away from the May 29 fixtures. Patch AC2/AC4 to require either absolute `since`/`until` params for every committed recipe or a per-case fixed `now` that the runner passes into `findClusters`, with tests proving committed cases never depend on the ambient clock.
---

# Codex Review

Verdict: `pushback`.

## Findings

1. **HIGH - P0 suite-pass gate conflicts with measurement-only scope** (`backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:94`)

   AC1 requires every P0 case to pass. AC5 then seeds P0 cases that intentionally represent known current failures, especially `signal-vs-noise-alias`, and AC7 says failing cases are acceptable while forbidding production retrieval changes. The current `search_memories` implementation is literal substring search, so there is no legal path for a builder to make `signal vs noise` recover `signal-to-noise` evidence without drifting into query expansion or ranking work. Clarify that this item ships the harness and baseline failures, or add an explicit expected-fail/baseline-fail state for known gaps.

2. **MEDIUM - recipe schema has no binding semantics for variants or hydration** (`backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:104`)

   The runner is supposed to execute `query_variants[]`, discovery steps, and `get_atoms` hydration, but static case JSON cannot predeclare the storage-generated atom IDs. The spec needs a concrete recipe language: how `$query` is substituted, how previous step outputs feed later params, whether variants fan out into separate scored runs, and which discovery result is used for top-rank metrics.

3. **MEDIUM - deterministic CI needs an explicit clock rule** (`backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:137`)

   Time-sensitive cases like "what shipped today" and resume-after-clear can drift if the runner calls `findClusters` with its default `new Date()` clock. Require absolute committed recipe windows or a fixed per-case `now` passed into `findClusters`, and test that committed cases do not depend on ambient wall-clock time.
