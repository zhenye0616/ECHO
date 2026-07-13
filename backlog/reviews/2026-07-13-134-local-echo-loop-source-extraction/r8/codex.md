---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 8
reviewer: "codex"
artifact_sha: "0f4063700b43a79b7f6f1b6375a5502bcd186bc3"
completed_at: '2026-07-13T23:57:03Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1, AC2 provenance/source-plan.v1.json, and AC7 provenance/source-extraction.v1.json"
    finding: >-
      The provenance contract lacks a closed, independently verifiable universe and conflicts with AC1's claim that all source bytes come from the pinned commit: rewrites plus newly authored README, package, templates, tests, and provenance files cannot satisfy that literal rule. Define both manifest schemas, the independently derived source universe, path normalization, hash algorithm, uniqueness rules, nullable fields, self-referential manifest exclusions, and copied/relocated/rewritten/excluded/authored/generated dispositions. Require verification to derive coverage from the pinned Git tree rather than trusting the manifests it checks.
  - severity: "medium"
    where: "AC2 — orchestration ownership and AC3 — src/api and private loop state"
    finding: >-
      Capability categories do not lock the actual Project_echo source roots, exported API contracts, or persistence ownership, leaving the builder to decide the core product/loop boundary. Add a pinned root inventory mapping each required source entry point to its destination or exclusion, specify exported commands/functions and allowed child executables, and pin ECHO_LOOP_HOME validation plus the SQLite filename/schema/migration behavior. Closure tests must fail when a required root is absent or a forbidden product/context root remains reachable.
  - severity: "medium"
    where: "AC3, AC5, AC6, and AC7 — parity commands and test oracle"
    finding: >-
      The artifact requires exact parity commands but names none, while all target tests are authored during the extraction and can therefore self-certify changed behavior. Specify the required package-script names and invocations, identify pinned source tests or golden vectors for transaction ordering, retries, deadlines, review publication, and workflow outcomes, and require target results to match those independent vectors. Provide one fail-closed exported-HEAD verification entry point that runs the complete named matrix and propagates every nonzero exit.
  - severity: "medium"
    where: "AC7 — exported-HEAD installation and sandbox verification"
    finding: >-
      Installation occurs before the stated network and filesystem sandbox, so npm lifecycle code could read Project_echo, siblings, credentials, or live state and seed artifacts that later sandboxed tests consume. Require npm installation itself to run under the filesystem-denial profile with scratch HOME/cache/config and external writes denied; either use --ignore-scripts or explicitly sandbox lifecycle scripts. State whether registry network is allowed during install, fail closed when the macOS sandbox cannot be applied, and run hostile-sentinel assertions across both install and verification phases.
  - severity: "medium"
    where: "AC1 — absent-target creation and interrupted-run ownership"
    finding: >-
      The attended single-lane rule does not make target acquisition atomic: an absence check followed by initialization can race, and the actor authorized to archive an incomplete target is unspecified. Require exclusive creation with a non-recursive mkdir that aborts on EEXIST, reject symlinked target components, and assign pre-run inspection/archive to the named human or orchestrator before the builder lane starts. The builder must never archive, delete, resume, or repair an existing target.
---
