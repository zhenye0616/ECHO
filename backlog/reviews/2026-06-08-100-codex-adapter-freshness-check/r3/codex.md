---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 3
reviewer: "codex"
artifact_sha: "5074a697e77951e2098ca4345d7fa6a573afeafa"
completed_at: '2026-06-09T17:40:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-100-codex-adapter-freshness-check.md:AC3"
    finding: "AC3 requires doctor to populate `staleSkills: string[]` from the installer subprocess, but AC1 only specifies human drift lines as `skill name + short reason` and does not define a machine-readable output grammar. Patch the spec to define exact `--check` drift output parsing rules, or add a `--check --json` contract, and require the doctor test to parse that contract rather than guessing from free-form stdout."
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-100-codex-adapter-freshness-check.md:AC1 / AC5"
    finding: "AC1 says `--check` reads the sentinel's recorded `source` path, while AC3/AC5 require doctor to work from an arbitrary non-repo cwd. If existing sentinels record repo-relative sources, `--check` can resolve them relative to the caller cwd and falsely report missing sources. Patch AC1 to require recorded relative sources be resolved from the installer/repo root, not cwd, and add a test that runs `--check` from a non-repo cwd against a managed install whose sentinel source is relative."
---

## Findings

The spec is implementable after the two contract patches above. Both are mechanical but important because doctor is the consumer of a shell-out boundary: it needs stable subprocess output and cwd-independent source resolution to avoid false degraded results.
