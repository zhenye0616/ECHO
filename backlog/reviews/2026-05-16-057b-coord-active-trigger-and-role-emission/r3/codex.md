---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 3
reviewer: "codex"
artifact_sha: "c38f9ddd40d404438fd5a9a8d0d2470a0dd5a726"
completed_at: '2026-05-16T07:25:12Z'
verdict: "proceed_after_patches"
consumed_task_state: false
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:115"
    finding: >-
      AC0 tells the builder to implement `coord_invoke` in `src/mcp/tools/coord-invoke.ts`,
      but also tells that tool to copy 057a's `new URL("../../tools/review-queue/run-${role}-reviewer.sh", import.meta.url)`
      path expression. That expression is only correct from a `src/coord/*` module; from
      `src/mcp/tools/coord-invoke.ts` it resolves to `<repo>/src/tools/review-queue/...`,
      not `<repo>/tools/review-queue/...`. A literal implementation will fail the wrapper
      exists/executable check and disable the active-trigger path. Patch the AC to either
      put the resolver in a module at the same depth as 057a's loader, or use the correct
      `../../../tools/...` / `fileURLToPath` resolution from the MCP tool path, and make
      `coord-invoke-cwd-independent.test.ts` assert the resolved wrapper path.
    cross_ref:
      round: 2
      reviewer: "codex-ops"
      finding_index: 1
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:117,188-189"
    finding: >-
      The patched `correlation_id` validator still does not enforce the UUIDv4 shape the
      AC and tests claim. `^[a-f0-9-]{36}$` accepts values with no canonical dash positions,
      no version nibble, and even strings made entirely of dashes, while AC8 says bad uuid4
      inputs are rejected. A builder following the spec can pass malformed IDs through both
      request.schema.json and coord_invoke. Patch both validators to the canonical dashed
      UUIDv4 regex, e.g. version 4 plus `[89ab]` variant, while keeping `str(uuid.uuid4())`
      as the generated representation.
    cross_ref:
      round: 1
      reviewer: "codex"
      finding_index: 1
  - severity: "low"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:105,205"
    finding: >-
      The boundary text still says 057b "doesn't add MCP tools" or daemon schema fields,
      while the same spec adds the `coord_invoke` MCP tool and the queue request
      `correlation_id` field. Out of Scope later has the correct narrower wording, "NO new
      MCP tools beyond coord_invoke." Patch the motivation sentence so builders do not read
      AC0 as out-of-scope drift; for example, say 057b adds one producer-side MCP tool and
      one request-frontmatter field but does not modify 057a's deadline tracker or
      coord_emit/coord_status substrate.
---

# Codex review - r3

Verdict: proceed_after_patches.

The r2 fixes closed the pinned-mode ordering, detached spawn, and motivation caller-list issues. The remaining blocker is a recent-patch path-resolution detail that will break `coord_invoke` if implemented literally. I also found one validator/test mismatch around UUIDv4 shape and one low-risk boundary wording cleanup.
