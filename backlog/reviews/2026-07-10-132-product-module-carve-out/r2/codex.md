---
item_id: "2026-07-10-132-product-module-carve-out"
round: 2
reviewer: "codex"
artifact_sha: "a1518ac2f0b6846cfa14e8171ccc5bd0dd49cf08"
completed_at: '2026-07-10T21:18:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "files_to_modify / AC1 / AC5"
    finding: "The acceptance criteria require `git mv` deletes from existing source and test paths, but `files_to_modify` only allows the new `src/product/**` and `tests/product/**` destinations plus config files. Patch the allowlist to include the old move sources named in AC1 (`src/capture/surfaces/granola-poller.ts`, the listed `src/enrich/*` files, `src/surfaces/ceo-slack-responder/**`, `src/cli/commands/brief.ts`) and the old meeting-loop test paths/patterns that will be deleted by the mirrored `tests/product/**` move, or explicitly state that listed moves authorize both source deletion and destination creation."
  - severity: "medium"
    where: "AC2 (module composition root)"
    finding: "AC2 says the product daemon starts `storage open + granola poller + signals worker + intake bridge + decision responder`, then requires the smoke test to assert the registered worker set is exactly the five named above. `storage open` is a setup step, not clearly a registered worker, leaving the test contract off by one. Patch AC2 to name the exact registered worker ids/classes, either four workers plus storage initialization or a concrete fifth lifecycle worker."
  - severity: "medium"
    where: "Context OPEN / AC2 / AC3"
    finding: "The OPEN founder decision allows option (a), bundling a minimal MCP endpoint, but current AC2 hard-requires `no MCP server` and AC3 forbids `src/product/**` from importing `mcp/**`. Patch the OPEN block to say option (a) requires an explicit AC2 and AC3 amendment plus a new review round before promotion, or narrow the allowed founder choice to the retrieval-less mode currently compatible with AC2/AC3."
---
