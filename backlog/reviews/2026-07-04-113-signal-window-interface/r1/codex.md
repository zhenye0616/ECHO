---
item_id: "2026-07-04-113-signal-window-interface"
round: 1
reviewer: "codex"
artifact_sha: "a39efaf1355c448da134ca3d1c77319c4d8b7011"
completed_at: '2026-07-04T19:21:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 / AC3"
    finding: "The output ordering and cursor semantics are under-specified. `getSignalWindow` accepts both event-time bounds and `cursor.sinceSeq`, returns one ordered list, and AC3 says half-open `sinceSeq` semantics, but the spec never defines the exact predicate (`sequence_id >= sinceSeq` vs `> sinceSeq`), whether `cursor` intersects with `since`/`until`, or the sort/tie-break order for event-time vs append-order reads. Patch the contract with exact predicates, composition rules, and deterministic sort keys before implementation."
  - severity: "medium"
    where: "AC3 / AC4"
    finding: "AC4 depends on taking watermark W before appending late atom A, but AC3 only asks for an iterator and does not specify a storage API for obtaining that watermark or next sequence. Add a concrete method or return contract, and define how Memory and SQLite expose it, so the late-arrival test is implementable without backend-specific probes."
  - severity: "medium"
    where: "AC1 / AC6 / files_to_modify"
    finding: "The spec requires normalized raw events while also forbidding `src/mcp/internal` wire-cap imports, yet it does not name where cap-free normalization logic lives or allow modifying the current cluster-engine module to extract it. Patch `files_to_modify` and AC1/AC6 to identify the shared cap-free normalization module or explicitly require an independent implementation in `src/trace/signal-window.ts` with no `src/mcp/internal` imports."
  - severity: "medium"
    where: "Tests"
    finding: "The artifact has no `## Tests` section and only directory-level test targets (`tests/storage/`, `tests/trace/`). Add concrete test file paths and commands/assertions for backend parity, coord-seam non-regression, late-arrival behavior, determinism, scope mapping, and the no-wire-cap/import-closure check so the acceptance criteria are falsifiable."
---
