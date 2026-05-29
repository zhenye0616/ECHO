---
item_id: "2026-05-29-082-retrieval-quality-eval-harness"
round: 1
reviewer: "codex-ops"
artifact_sha: "a6ba1c72676f634659c8c329c33fdc5efa1d851e"
completed_at: '2026-05-29T22:49:31Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:102-104,127-137,141-148; src/mcp/internal/cluster-engine.ts:180-188; src/mcp/tools/find-clusters.ts:191-195 at a6ba1c7"
    finding: >-
      AC2/AC4 let case `time_window` and relative intents exist without pinning a runner clock. In CI mode the runner calls existing handler recipes; `findClusters` / `getRecentWorkContext` default to `new Date()` when no `since`/`until` is passed, and cases like `what-shipped-today-needs-artifacts` or no-args resume depend on that reference instant. Once the fixture dates age out, or when launchd/CI runs under a different host clock, the eval can return empty or wrong clusters before retrieval quality is actually measured. Patch the schema/runner to require a per-case `reference_now` or explicit `since`/`until` derived from `time_window`, inject that clock into direct handler calls, and add a test proving a no-args recipe is stable when the host clock moves.
  - severity: "high"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:102,118-123,141-150; src/mcp/util/source-app.ts:17-24; src/mcp/util/repo-path.ts:35-38; src/mcp/tools/search-memories.ts:181-187,208-224 at a6ba1c7"
    finding: >-
      The spec seeds committed fixtures from founder JSONL but does not require normalizing host-specific absolute paths before CI. Retrieval matches `source_app` via prefixes built from the current runner's `os.homedir()`, and `repo_path` by exact `metadata.repo_root` string equality. A fixture preserving `/Users/zhenye/...` source or repo metadata will work on the founder machine but silently miss under launchd/CI on another checkout/home, breaking source coverage and cross-tool cases before the harness measures retrieval quality. Patch AC2/AC3/AC4 to define canonical eval source/repo rewriting, or forbid source-app/repo filters unless the runner rewrites fixture metadata to the current test root, with a regression fixture whose original provenance path differs from the test process home.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:121-135,196-198; src/storage/memory.ts:39-43,120-126 at a6ba1c7"
    finding: >-
      Stable fixture refs do not make result ordering stable. `MemoryStorage.append` assigns random UUIDs, and `query()` breaks equal timestamps by random id; raw session JSONL commonly has same-second or duplicated timestamps. If two labeled or noise events tie on timestamp, search order, top-rank scoring, and JSON snapshots can flip across test runs even after atom IDs are normalized back to fixture refs. Patch the runner/schema to reject duplicate timestamps in scored ordering buckets, inject deterministic IDs/order for eval storage, or sort post-query by fixture_ref before scoring, with a regression test containing same-timestamp fixture events.
---

# codex-ops review

Verdict: `pushback`.

The spec needs a few operational contracts before a builder implements it. As written, the deterministic CI harness can still depend on the host clock, the host checkout/home path, and random storage IDs, which means a failing or passing suite could reflect runtime environment drift instead of retrieval quality.
