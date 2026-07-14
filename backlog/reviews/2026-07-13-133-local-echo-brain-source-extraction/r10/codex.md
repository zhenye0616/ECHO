---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 10
reviewer: "codex"
artifact_sha: "8327efe7b05c67edce34078a13272b20c0e40f14"
completed_at: '2026-07-14T00:53:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md: AC3, AC6, and AC7"
    finding: "The parity proof is self-authorizing: the builder chooses each rewritten test and its substitution list, while the operator audit only replays that declared list. Arbitrary behavioral test edits can therefore pass, and overlapping rows in source-extraction.v1.json and test-parity.v1.json need not agree. Pin the permitted source-to-replacement pairs or narrowly enumerated mechanical rewrite classes, reject every other test rewrite, and require cross-manifest equality for source identity, destination, disposition, substitutions, and hashes."
  - severity: "high"
    where: "backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md: AC5 and AC8"
    finding: "The receipt lifecycle is internally inconsistent: after advancing from NOT_ACCEPTED to checks_passed/handoff_pending, a push failure cannot remain NOT_ACCEPTED without a forbidden rollback, and a crash after the push but before handoff_published strands the attempt while automatic repair is forbidden. Define the exact receipt path and schema, separate monotonic phase from acceptance, identify the single writer and atomic expected-state update, bind publication to the exact pushed commit/ref, and specify a founder-owned idempotent reconciliation for the push-success/final-write crash window."
  - severity: "medium"
    where: "backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md: AC7 environment contract"
    finding: "The env -i contract removes PATH while requiring npm run and package-script executables; invoking npm by an absolute path does not make child env-node shebangs or bare .bin commands resolve to the pinned Node. Prescribe an exact per-phase invocation matrix using the absolute Node plus npm-cli.js and either a deterministic allowlisted PATH containing only the pinned Node and required .bin directories or direct absolute JavaScript entrypoints, then probe and record the resolved executables."
  - severity: "medium"
    where: "backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md: AC7 phase 1 and phase 2"
    finding: "Registry fetch and cache sealing remain underspecified: no exact phase-1 command, registry/config flags, cache path, or immutable cache handoff is defined, and npm may mutate cache metadata during the offline install. Specify both commands with explicit --cache paths and flags, retain and hash an immutable phase-1 seed, derive a separate writable phase-2 cache from it, and compare the seed manifest before and after the offline phase."
---
