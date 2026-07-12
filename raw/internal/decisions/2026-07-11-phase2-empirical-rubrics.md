# Phase 2 predeclared empirical rubrics

**Date:** 2026-07-11
**Status:** rubrics only; no live probe is authorized by this document
**Purpose:** close A2/V2 and prepare deployment evidence without changing product code or mutating founder/client state

## Shared rules

- Record the exact source SHA, package version/checksum where applicable, runtime versions, start/end time, and operator.
- Use a new scratch home, database, port, label, logs, credentials/config, and checkpoints. Never point a probe at the founder's normal `~/.echo` or daemon.
- Do not commit meeting text, names, titles, note IDs, credentials, or raw model output. Commit only counts, structural verdicts, redacted errors, and grader conclusions.
- Stop on any sign that the probe is reading/writing the founder's normal state, polling an unbounded workspace history, changing real CLI authentication, or booting/stopping a non-scratch launchd job.
- A rubric is not a result. Each executed probe gets a separate dated result document and an independent grader where named.
- None of these probes advances product maturity. FOUNDER LIVE requires the separately pinned, versioned, isolated candidate-package contract.

## A2 - Cold-database extraction comparison

**Question.** Can the retrieval-less meeting-to-brief path form a useful brief from meeting material alone, without the founder's months-deep database?

**Input.** One founder-owned real meeting for which processing/assessment is permitted. Select it operator-locally; do not record its title or note ID. Export exactly the meeting summary/transcript needed for the test into the scratch environment. Do not point a fresh worker at the populated Granola workspace, because today's oldest-first/no-cutoff behavior could trigger an unbounded billed backfill.

**Isolation.** New scratch `HOME`, `ECHO_HOME`, data directory, database, state directory, port, and logs. No daemon scheduler. Load exactly one meeting into the scratch store. The warm comparison uses an existing founder-regime result for the same meeting if available; otherwise run a separate isolated warm-context comparison and identify it only by an operator-local reference.

**Procedure.** Predeclare the selected meeting and comparison reference locally; verify the scratch store has zero unrelated atoms; ingest the one meeting; run the current extraction/brief path once; retain raw output only in the operator-local scratch directory; grade the cold and warm outputs blind to which is which where practical.

**Hard pass.** The cold output has zero fabricated claims; every stated decision/action/rationale is traceable to the selected meeting; it contains the meeting's required decision/action set without needing unrelated context; it is usable as a post-meeting brief; and failures are loud rather than silently empty. The independent grader records `pass` with a short structural reason.

**Blocker.** Any fabricated critical claim, omission that makes the brief materially misleading, dependency on unrelated founder context, unbounded historical extraction, credential/state crossover, or silent empty output.

**Accepted-risk candidate.** Only a noncritical presentation/ordering difference that leaves the brief accurate and useful. The founder must explicitly accept it; the operator cannot self-disposition it.

**Timeout.** 10 minutes after the one meeting is durably available in scratch state, excluding known upstream Granola publication latency because the input is already selected.

**Recovery.** Stop all scratch processes, delete the scratch state after the redacted result is written, and confirm the founder daemon/home were unchanged.

**Grader.** One non-operator reviewer plus founder usefulness verdict.

## V2 - Unattended Contract A auth-expiry behavior

**Question.** What does today's CLI-auth brain binding do when no valid vendor login exists in an unattended isolated environment?

**Boundary.** This measures the current Contract A CLI behavior only. It cannot validate the future API-key product binding and must not be cited as evidence for it.

**Input and isolation.** Scratch `HOME` and `ECHO_HOME`, no copied auth files, one synthetic/redacted extraction fixture, no founder database, no production daemon, and a bounded subprocess timeout. Do not run `codex logout`, alter Claude/Codex login state, or rename real credential directories.

**Procedure.** Confirm the scratch home contains no vendor auth; invoke the current brain path exactly once through its normal subprocess boundary; capture exit status, elapsed time, redacted diagnostic category, checkpoint behavior, and health/operator evidence.

**Hard pass.** The call exits nonzero within 60 seconds; names authentication/setup as the failure class without printing a credential; leaves the target work retryable; does not advance a success checkpoint; and produces durable operator-visible failure evidence.

**Blocker.** Hang beyond timeout, silent success/empty result, success checkpoint advancement, retry spin, secret output, or mutation outside scratch paths.

**Accepted-risk candidate.** A bounded nonzero failure with an imprecise diagnostic may be accepted only for Contract A, with Rank 3 still required to define the API-key product behavior.

**Recovery.** Kill only the scratch process tree, delete scratch state, and confirm real auth/state mtimes are unchanged.

**Grader.** QA operator plus independent log reviewer.

## Current-contract clean-machine deploy rehearsal

**Question.** What breaks when today's broad ECHO package is installed, upgraded, restarted, and rolled back on a non-founder macOS environment?

**Timing.** Diagnostic only, scheduled after the Jul 24 demo window unless the founder explicitly moves it. It is not the product-only qualification run.

**Environment.** Clean macOS VM or scratch user with supported Node, no repo checkout after the tarball is produced, new ECHO paths/port/label/logs, and no founder credentials or data.

**Artifact.** One tarball built from a pinned main ancestor, with version and SHA-256 recorded before transfer. Reuse the same bytes for install and rollback testing; never rebuild on the target environment.

**Procedure.** Install Contract A; initialize documented prerequisites; start/restart/stop the launchd job; run doctor/selftest; exercise one redacted/synthetic meeting-shaped path where possible; upgrade to a second deliberately selected package; verify state; roll back; verify health and data preservation; uninstall; inventory residual files.

**Hard pass for diagnostic completeness.** Every step has command/result evidence; no repo or founder identity is required; all paths/labels are isolated; restart loads intended config; rollback restores health without deleting state; and deviations from the current install contract are listed. This does not make the candidate QUALIFIED.

**Blocker.** Any founder-state dependency, unbounded live-data access, destructive rollback, unrecoverable migration, hidden service, or inability to identify installed bytes.

**Timeout.** Two hours total; stop after the first unrecoverable state mutation and preserve the VM snapshot.

**Recovery.** VM/scratch-user snapshot rollback plus explicit uninstall/residual inventory.

**Grader.** Non-author clean-machine operator.

## G3 - Demo freeze rehearsal

**Question.** Can the chosen demo state be recreated or rolled back exactly after Jul 18 without silently changing what the video claims?

**Precondition.** Founder has chosen YC submit/defer, demo Option A/B where applicable, and old-scene-1 disposition. No freeze can be sealed against an unresolved demo shape.

**Input.** The template in `2026-07-11-phase2-g3-freeze-template.md`, a pinned source SHA, one tarball/checksum, a database snapshot stored outside git, redacted plist/env inventory, smoke result, rollback artifact, and named emergency owner.

**Hard pass.** Every required field is filled; hashes verify; the smoke runs from the pinned artifact; rollback restores the pre-smoke state; secrets/content are not committed; and a non-operator can follow the record without guessing.

**Blocker.** Missing checksum/snapshot/rollback, mismatch between claimed and running SHA, unredacted secret/client content, or no emergency-change owner.

**After sealing.** The record is append-only. Any emergency mutation creates a new signed addendum naming reason, operator, before/after hashes, smoke result, and rollback result. It never edits the sealed facts in place.
