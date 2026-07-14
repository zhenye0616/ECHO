# Local extraction is an attended build, not a product

Date: 2026-07-13
Status: locked for proposal R16
Applies to: items 133 (`echo-brain`), 134 (`echo-loop`), and 135 (`echo-context`)

## Decision

The three local source splits are one-time, operator-attended repository builds. They will not ship or leave behind a generic extraction CLI, lifecycle state machine, lock/takeover protocol, publication transaction, recovery daemon, committed sandbox profile, or migration-framework tests in Project_echo.

They also do not create a dedicated `.echo-migration-evidence` tree, native evidence publisher, failure capsule, custom descendant supervisor, credential transport, or second Git handoff protocol. Those mechanisms made the proposal harder to implement and review without improving the standalone repositories. Normal Project_echo builder workflow owns claim, run log, commit, feature-branch push, and review publication.

For items 133–135, the founder explicitly overrides the default cross-vendor proposal roster with two independent Codex bindings: `codex` and `codex-ops`. Independence is binding/session separation, not vendor diversity; both responses remain required in every verification round.

Each assigned builder owns one absent, disjoint target path and materializes it directly from pinned Project_echo commit objects. The durable outputs are only:

- the standalone local Git repository;
- its target-local provenance, boundary, dependency, parity, and tests; and
- one Project_echo migration record committed through the normal builder handoff.

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

Builders implement repository contents, not migration infrastructure. Reviewers judge the exact target HEAD/tree and rerun its target-local checks from their own fresh clones. Ordinary command output is summarized in the run and migration records; it is not promoted into a crash-atomic evidence protocol. A failed run costs another attended build and manual archive; it does not justify adding automatic recovery code.
