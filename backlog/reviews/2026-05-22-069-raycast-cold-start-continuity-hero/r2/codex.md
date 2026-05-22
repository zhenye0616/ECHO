---
item_id: "2026-05-22-069-raycast-cold-start-continuity-hero"
round: 2
reviewer: "codex"
artifact_sha: "656cce1a42a18110d2cbb8edf2f54d6735ac33d7"
completed_at: '2026-05-22T20:21:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:83"
    finding: >-
      The V1 contract says the hero evaluates the rank-0 cluster from an 18h `findClusters` lookback, but the spec does not add `tools/raycast-echo/src/lib/mcp.ts` to `files_to_modify` or require a test that the Raycast client sends an explicit 18h `since`. Current `findClusters()` always posts only `{ view: "compact" }`, so the daemon's no-args path uses a 4h default and only conditionally auto-expands to 24h. That can hide a valid 16h continuity cluster, or let an older auto-expanded rank-0 cluster suppress a fresher eligible cluster. Patch AC2/tests to parameterize the Raycast client with an explicit 18h lookback and assert the request arguments.
  - severity: "medium"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:159"
    finding: >-
      AC1 defines `code_session_anchor` as three substrate predicates: repo/file/commit artifact, atom with `source.app === 'git'`, or >=3 source apps. AC3 only tests the >=3-source branch plus a negative case. The two r1-corrected, code-grounded branches are therefore unpinned, so an implementation could use the wrong artifact field or skip git-source anchoring and still satisfy the listed tests. Add rank tests for a repo/file/commit artifact and for a git-source atom.
  - severity: "low"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:73"
    finding: >-
      The summary bullets still say `code_session_anchor` includes a linked session via `cluster_id` and that the hero title may use a newest USER preview. Later AC1/AC2 correctly move linked-session anchoring to Raycast-side `pickHero` and make the fallback literal `Untitled work`. Clean up the stale summary text so builders do not follow the obsolete r1 shape.
---

# Codex Review — Round 2

Verdict: `proceed_after_patches`.

## Findings

1. **MEDIUM — Explicit 18h lookback is not actually specified for the Raycast MCP call.** The contract says the hero uses rank 0 from `findClusters({since: -18h})`, but the current Raycast client sends only `{ view: "compact" }`. Because the daemon's no-args behavior starts at 4h and only conditionally expands to 24h, the hero can miss the intended 18h cold-start window or be blocked by the wrong rank-0 cluster. Add `tools/raycast-echo/src/lib/mcp.ts` to the implementation scope, pass an explicit 18h `since` from the landing surface, and pin the request arguments in `tools/raycast-echo/test/mcp.test.ts` or the new hero test.

2. **MEDIUM — `code_session_anchor` tests do not cover the two corrected code-grounded branches.** AC1 relies on artifact `type in {repo,file,commit}` and atom `source.app === "git"`, but AC3 only exercises the `source_breakdown` count branch and the negative case. Add targeted `tests/trace/rank.test.ts` cases for artifact anchoring and git-source anchoring so the r1 field-name corrections are enforced by tests.

3. **LOW — Stale summary bullets conflict with patched ACs.** Lines 73-77 still describe linked-session anchoring as part of `code_session_anchor` and mention a newest USER preview fallback. Later ACs correctly reject both. Update the summary to match AC1/AC2.
