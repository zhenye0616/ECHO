---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 10
reviewer: "codex"
artifact_sha: "8327efe7b05c67edce34078a13272b20c0e40f14"
completed_at: '2026-07-14T01:01:03Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 and AC2 — source-universe Git invocation"
    finding: "AC2 prescribes `git -C <explicit-source> ls-tree ...`, contradicting AC1's requirement that every source and target Git command use the pinned absolute executable under `env -i`. Replace this and the audit/clone examples with one exact sanitized invocation contract, and assert the executable and environment in tests."
  - severity: "medium"
    where: "AC2 — deterministic dependency resolver"
    finding: "The resolver can silently omit dependencies because its edge grammar excludes Python local imports despite Python roots, CommonJS `require`/`require.resolve`, shell-executed script operands, Node child-process/worker paths, and static filesystem paths. Define supported parsers or fail-closed detection for every applicable construct, classify external interpreters explicitly, and add positive and negative fixtures for each edge class."
  - severity: "medium"
    where: "AC2 — source-plan.v1.json and source-extraction.v1.json"
    finding: "The text refers to AC2's schema without defining schema paths, required fields, path normalization, allowed dispositions, mapping cardinality, or representation of generated target-only files. Add committed JSON schemas and canonicalization rules, then require schema validation before reconciliation and cover malformed, ambiguous, one-to-many, and target-only entries."
  - severity: "medium"
    where: "AC3 and AC7 — parity oracle and mutation proof"
    finding: "The oracle commands use relative runner and vector paths without defining which immutable copy owns them, while the named auditor is also target-resident. A target mutation can alter or remove detecting vectors alongside behavior, allowing both executions to use the weakened vector set. Seal and hash one absolute vector set and oracle/audit harness outside the mutable target before comparison, use those exact paths for source and target runs, and make independent review reject target-supplied replacements."
  - severity: "medium"
    where: "files_to_modify and AC8 — backlog handoff"
    finding: "AC8 requires the normal stage-derived backlog handoff, but `files_to_modify` permits the lifecycle item paths while omitting generated `docs/BACKLOG.md`. Add that generated index to the allowed files so claim/handoff regeneration can comply with repository workflow without scope violation."
---
