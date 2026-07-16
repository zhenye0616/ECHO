# Echo-context sequential program has persistent Codex delegated authority

Date: 2026-07-16
Status: founder-locked
Authority source: founder direction in the persistent Codex program-coordinator session
Reconciliation baseline: `5d4f118036035a2b9348711f6921d9c0cb38dba2`

## Decision

The founder delegates end-to-end decision and execution authority for the echo-context sequential transition program to the persistent Codex program coordinator. This decision becomes effective only after the commit containing this record and the corresponding operating-instruction reconciliation has been pushed to, and read back from, `origin/main`. The founder's direction directly authorizes that reconciliation push.

This delegation applies only to this ordered program:

1. item 136 — canonical source repository and deterministic source artifact;
2. item 137 — installable, non-authoritative shadow runtime;
3. item 138 — cutover substrate and full isolated rehearsal;
4. exactly two successor items replacing item 139, created with the next valid backlog IDs only after item 138 completes:
   - live cutover, rollback, and fresh recutover;
   - seven-day acceptance and deprecation decision.

Item 139 and its existing review lineage remain immutable historical risk evidence. They are not silently renamed, deleted, or treated as either successor. The successor IDs and their relationship to item 139 must be recorded after item 138's exit gate and before either successor is reviewed or claimed.

Ordinary founder gates and external-write restrictions remain unchanged for every other item, repository, product, machine, and operation.

## What the delegation changes

Within the named program, the coordinator may resolve architecture choices and reviewer disagreements; disposition specification findings; make necessary scope corrections; create the authorized item-139 successor split; assign builders and reviewers; repair failed gates; resolve merge conflicts; merge and push to canonical main branches; configure repository controls; create tags, releases, and artifacts; install on the founder Mac; modify the item-authorized LaunchAgent and service paths; perform backup, migration, client rewiring, cutover, rollback, and recutover; and record acceptance and deprecation decisions.

A repository instruction or reviewed specification that says "founder approval," "founder execute," "founder-only," "pause for founder," or "founder green-light" is satisfied inside this program only by the persistent coordinator following this decision and recording the applicable authorization described below. No new founder response is required. The delegation replaces the approval actor and pause, not the gate.

Builders do not inherit this authority. A builder still stops at its item boundary and hands uncertainty or failed evidence to the coordinator. The coordinator repairs or dispositions the cause, obtains any required fresh review, and resumes the sequential program.

## Invariants that are not delegated away

- Exactly one covered item is active at a time.
- Every specification converges at one exact SHA before a fresh ready seal and promotion.
- Each implementation is authored by a fresh independent builder.
- A different independent reviewer reviews the exact implementation heads and all applicable repositories and artifacts.
- The coordinator never reviews its own implementation bytes. If the coordinator authors implementation or merge-resolution bytes, a different agent must review those bytes before merge.
- Every substantive high- or medium-severity finding is resolved and the relevant verification is rerun.
- Failed mandatory evidence is repaired; it is never waived, hidden, or downgraded.
- Canonical remote readback, exact identities, build-once rules, private-visibility boundaries, fail-closed behavior, backup, restore, rollback, and recovery remain mandatory where specified.
- Builders never merge or push their own implementation to either main branch.
- Secrets, credentials, raw private content, and unrelated user or agent work never enter commits or evidence.
- Seven accepted operating days means seven consecutive, uninterrupted, real, complete calendar days. It cannot be compressed, simulated, backfilled, or assembled across a gap.

## Delegated operation authorization record

Before any irreversible operation that would ordinarily require founder approval—including a target/main merge or push, release/publication, installation, service mutation, migration, client rewiring, authority transfer, rollback, or recutover—the coordinator must create an immutable, single-use authorization record at:

`raw/internal/migrations/<item-id>-<operation>-<approval-id>-delegated-approval.md`

The record must be committed, pushed, and read back from `origin/main` before the operation begins. A create-only push whose sole program change is a new authorization record is authorized directly by this already-landed delegation; it cannot carry implementation, merge, release, installation, or live-mutation bytes. That bootstrap rule prevents the authorization record from needing to authorize its own publication. The record's bytes are never amended after use; execution and readback results go in the item's separate migration/evidence record. If an item defines a stricter machine-readable or protected-runtime approval artifact, that artifact is also required and the repository record binds its identity and SHA-256. The repository record is a superset gate, never a substitute for the reviewed item contract.

The record must contain:

- this decision path and its landed commit SHA;
- active item ID, exact reviewed specification SHA, and ready-content seal;
- Project_echo canonical source SHA and tree;
- echo-context canonical target SHA and tree;
- version;
- manifest identity and SHA-256;
- every artifact as a typed name/path plus SHA-256, never one ambiguous aggregate hash;
- the exact intended operation, mode, destination repositories/refs/IDs/paths, and authority boundary;
- repository stable ID, immutable tag-object OID, and deterministic release/tag/asset names; any platform-assigned release or asset ID already in existence and addressed by the operation must also be bound;
- independent builder and reviewer identities, reviewed heads, verdict, and gate-evidence references;
- preflight and execution-plan identity/hash;
- backup identity/hash and restore-proof identity;
- rollback artifact/state/generation identity/hash and recovery entry point;
- coordinator identity, approval timestamp, and a unique single-use nonce;
- the resumable/idempotency state and the fail-closed response to an ambiguous outcome.

For an operation that is not artifact-bound, artifact-only fields may be explicitly `not-applicable` with a reason. For release, installation, migration, client rewiring, service activation, authority transfer, rollback, or recutover, the exact version, manifest, artifacts, backup, and rollback fields are mandatory and may not be `not-applicable`.

An authorization becomes stale if any bound identity, reviewed byte, gate result, destination, plan, backup, rollback object, or authority boundary changes. The coordinator must stop that operation, create fresh reviewed evidence as required, and issue a new single-use authorization rather than editing or reusing the old record.

For create-only publication, a platform-assigned release or asset ID that does not exist before the authorized write is explicitly marked `pending allocation by this operation`; it is never guessed. The separate post-operation authenticated readback evidence must bind every returned release/asset ID to the pre-authorized deterministic name, bytes, digest, and destination. Any later mutation of an existing release or asset must bind its already-known ID in a fresh pre-operation authorization.

## Sequential execution and terminal state

After each item, the coordinator records the landed Project_echo and echo-context SHAs, version, manifests, artifact identities, authority boundary, implementation-review evidence, and concrete deliverable result before revising the next specification against those actual outputs. Predicted future interfaces are not sufficient.

The program continues through specification, build, independent review, merge, concrete execution, rollback proof, recutover, seven consecutive uninterrupted complete accepted days, and the final deprecation decision. It may stop early only for an external impossibility outside delegated authority, such as unavailable credentials, an unreachable required service, hardware failure, or a non-delegable platform restriction. Such a stop records the exact missing capability and preserves resumable, secret-free state.
