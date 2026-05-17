---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 2
reviewer: "codex"
artifact_sha: "033867c910afcdbc1f9e42822b6a5fdccefef215"
completed_at: '2026-05-17T08:01:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "frontmatter lines 13 and 17 vs AC3/Tests lines 120-131 and 158-176"
    finding: >-
      The frontmatter still describes the pre-round-2 test contract: it says the coord transport test should add only two cases, looks for a `coord_emit rejected` string, and allows daemon-unreachable stderr to include the existing daemon-down framing. The body now locks a different contract: three new cases, the rejection prefix `coord-emit.sh: daemon rejected`, an HTTP 500 `node:http` fixture, and `expect(r.stderr.toString()).not.toMatch(/coord-emit\.sh:/)` for unreachable. Because builders read `files_to_modify` and `spec_refs` before the body, this stale summary can produce the wrong implementation or tests. Patch the frontmatter comments to name all three AC3 cases and the exact stderr shapes from the body.
---

Review anchored to `033867c910afcdbc1f9e42822b6a5fdccefef215:2026-05-17-059-coord-emit-surface-daemon-rejection` via `backlog/reviews/2026-05-17-059-coord-emit-surface-daemon-rejection/r2/request.md`.
