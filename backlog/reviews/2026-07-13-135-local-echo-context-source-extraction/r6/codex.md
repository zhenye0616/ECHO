---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 6
reviewer: "codex"
artifact_sha: "780fb99a7384626e89be7b293f444e776d712e45"
completed_at: '2026-07-13T23:06:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — Split retrieval MCP from loop coordination tools"
    finding: "The source-tool snapshot records canonical fixture outputs, but no acceptance criterion explicitly replays those identical fixtures against the extracted candidate and compares per-case output digests. Registry/schema checks and independently authored target tests can pass despite ordering, truncation, or error-semantic drift. Require a pre-publication candidate replay under the same isolated environment, exact fixture corpus, and canonicalization rules, with per-case and aggregate equality to the pinned source snapshot; add a test that mutates a target handler result without changing its manifest or registry and proves verification fails."
  - severity: "medium"
    where: "AC3 and AC7 — source snapshot and candidate offline-install phases"
    finding: "Only cache acquisition has a concrete npm command. The later source and candidate phases say offline install but do not bind the required flags and cache path, so npm may consult network metadata or a host cache and produce environment-dependent behavior. Specify the exact post-acquisition command contract, including `npm ci --offline --no-audit --no-fund --cache <run>/npm-cache` plus the intended lifecycle-script policy, and test that every later npm invocation uses the recorded run cache with an empty or poisoned host cache and denied network."
---
