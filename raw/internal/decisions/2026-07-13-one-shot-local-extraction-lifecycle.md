# Local extraction is an attended build, not a product

Date: 2026-07-13
Status: locked for proposal R11
Applies to: items 133 (`echo-brain`), 134 (`echo-loop`), and 135 (`echo-context`)

## Decision

The three local source splits are one-time, operator-attended repository builds. They will not ship or leave behind a generic extraction CLI, lifecycle state machine, lock/takeover protocol, publication transaction, recovery daemon, committed sandbox profile, or migration-framework tests in Project_echo.

Each assigned builder owns one absent, disjoint target path and materializes it directly from pinned Project_echo commit objects. The durable outputs are only:

- the standalone local Git repository;
- its target-local provenance, boundary, dependency, parity, and test evidence; and
- one Project_echo migration record committed with the builder handoff.

If a builder is interrupted, the visible target is incomplete and unaccepted. The orchestrator inspects and manually archives it before a fresh assigned run. No agent automatically adopts, deletes, resumes, reconciles, or repairs it.

## Why

R3-R7 repeatedly found correctness gaps in a temporary extraction controller: ownership transfer, process-group identity, crash windows, directory-fsync ordering, record/ref/index coordination, runtime bootstrap trust, and recovery convergence. An independent Claude Fable structural investigation identified the root problem: we were productizing a distributed recovery protocol for three founder-attended local migrations.

That machinery did not improve the actual product boundaries or parity proof. Removing it is the strongest safety move: fewer privileged writes, no stale controller to maintain, no false claim of crash atomicity, and no coupling between the target repository and Project_echo evidence commits.

## Retained invariants

- Three disjoint lanes and accurate names: echo-brain, echo-loop, echo-context.
- Exact source pin `2971310441b69735cbe759293abd8c4d044bf347`; dirty source bytes are excluded.
- Project_echo remains source, backup, active authority, and historical record during migration.
- No target remotes, source deletion/freeze, live-state migration, installation, cutover, or graduation.
- Target-local provenance, dependency, boundary, parity, clean-install, and source-independence tests.
- Sanitized dependency/test environments and synthetic data only.
- Independent review of actual target HEAD/tree and the Project_echo migration record.

## Operational consequence

Builders implement repository contents, not migration infrastructure. Reviewers judge the final repository and reproducible evidence. A failed run costs another attended build; it does not justify adding automatic recovery code.
