---
item_id: "2026-05-25-070-echo-global-home-scaffold"
round: 1
reviewer: "codex-ops"
artifact_sha: "d4c0ad79428ef4d330c3cb61646804a494040156"
completed_at: '2026-05-25T22:40:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157"
    finding: "AC2 specifies a check-then-write absent-only state-file path, and AC4 only tests sequential calls plus a preexisting hand-edited file. At runtime that does not protect the load-bearing invariant under concurrent daemon/CLI reuse or interruption during first boot: two processes sharing ECHO_HOME but using different daemon data dirs can both pass the missing-file check, and an interrupted write can leave a partial JSON file that future starts preserve forever because existence means do not read, validate, or rewrite. Tighten AC2 to require an atomic absent-only create strategy for each state file, for example temp-in-same-dir plus atomic link/rename guarded against EEXIST, and add a test that simulates an existing partial file or concurrent first-create race so a 03:00 restart cannot strand corrupted onboarding/projects state with only downstream parser failures."
---

# Operational Review

Verdict: proceed_after_patches.

## Findings

1. [medium] `backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157` — AC2 specifies a check-then-write absent-only state-file path, and AC4 only tests sequential calls plus a preexisting hand-edited file. At runtime that does not protect the load-bearing invariant under concurrent daemon/CLI reuse or interruption during first boot: two processes sharing `ECHO_HOME` but using different daemon data dirs can both pass the missing-file check, and an interrupted write can leave a partial JSON file that future starts preserve forever because existence means do not read, validate, or rewrite. Tighten AC2 to require an atomic absent-only create strategy for each state file, for example temp-in-same-dir plus atomic link/rename guarded against `EEXIST`, and add a test that simulates an existing partial file or concurrent first-create race so a 03:00 restart cannot strand corrupted onboarding/projects state with only downstream parser failures.

## Ops Notes

The daemon integration ordering is otherwise operationally sound for this spec: `ensureEchoHome()` runs after the existing daemon PID lock and before extractors/MCP startup, failure is downgraded to a dedicated `daemon.echo-home` log event, and `mkdirSync(..., { recursive: true })` is fine for the empty directory scaffold. The remaining production risk is concentrated in first-create durability for the two state files, because later specs will treat those files as durable wizard progress and known-project state.
