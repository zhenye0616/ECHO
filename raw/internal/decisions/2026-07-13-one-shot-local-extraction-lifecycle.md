# One-shot lifecycle for the three local source extractions

Date: 2026-07-13
Status: locked for proposal R6
Applies to: items 133 (`echo-brain`), 134 (`echo-loop`), and 135 (`echo-context`)

## Decision

Each local repository extraction is one attended, deterministic operation with lifecycle:

`ABSENT -> RUNNING -> PUBLISHED | FAILED`

There is no automatic crash resume, stale-owner takeover, quarantine token, nonce rotation, checkpoint reuse, or later invocation that signals a recorded process. If a run fails before publication, the operator first proves its processes/resources are quiescent, uses an explicit `discard` command to archive all run material without deletion, and begins a fresh extraction from the pinned source commit.

Publication remains no-replace and evidence-bound: publish the deterministic migration record, then publish the verified staged repository. The final target, byte-identical record, and committed candidate identity are the durable `PUBLISHED` fact. Read-only `status` and `verify-handoff` derive that state even if the active process dies immediately after the target rename.

## Why

R3-R5 repeatedly found correctness gaps in the recovery control plane: ownership transfer, process-group identity, token replay, lock serialization, artifact reuse, and reconcile semantics. An independent Claude Fable structural investigation found these mechanisms were accidental scope for a three-run, founder-attended local migration. They increased concurrency and recovery risk without improving the product boundary or parity proof.

The safer engineering shape is to remove automatic recovery rather than continue hardening a temporary distributed lifecycle. The cost is rerunning an interrupted extraction. That is acceptable for three bounded local migrations and is made cheaper by preserving archived evidence and integrity-verified dependency cache material.

## Invariants retained

- Three disjoint target lanes and target-specific state paths.
- Exact source pin `2971310441b69735cbe759293abd8c4d044bf347`; source bytes come from committed objects, never the dirty checkout.
- No target remotes, source mutation, live-state migration, installation, cutover, or authority transfer.
- Deterministic provenance, dependency, parity, migration-record, and handoff evidence.
- Sanitized environment, offline candidate execution, OS sandbox, and source/sibling independence tests.
- No-replace target/record publication and canonical-path handoff verification.
- Project_echo remains migration source, backup, and authority until a later founder checkpoint.

## Removed mechanisms

- Resume commands and reusable checkpoints.
- Stale-lock quarantine, takeover, owner nonces, one-use tokens, and fcntl takeover guards.
- Artifact-specific recovery locks.
- Parent-child takeover handshakes and signaling by a later process.
- Reconcile code that mutates an incomplete run; only read-only derivation of an already-published result remains.

## Review and build consequence

R6 verifies that the removal is complete and that retained invariants remain testable. Builders implement only the one-shot lifecycle. Any pre-publication failure ends the lane until the operator explicitly archives it and starts a fresh run.
