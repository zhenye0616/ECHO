# Echo-context item 137 is decomposed into candidate and real-shadow passes

Date: 2026-07-17
Status: founder-locked
Authority source: founder direction in the persistent Codex program-coordinator session
Reconciliation baseline: `18e9d713c9bb50cb193b7e1305fbebaefd2aa5c7`

## Decision

The founder directed the persistent coordinator to proceed in full-auto mode
with the proposed two-pass approach after item 137 stopped at optimized review
R8. The stopped proposal and all R1–R8 review artifacts remain immutable
historical evidence. It is cancelled, not patched or resumed.

Two fresh sibling items jointly replace step 2 of the sequential program:

1. `2026-07-15-137a-echo-context-candidate-runtime` — build and prove a
   repository-free, disposable, capture-off candidate at port 0 with no
   installation, launchd, real user paths, or fixed service identity.
2. `2026-07-15-137b-echo-context-real-shadow-install` — refine from completed
   137a evidence, then build once, install, and prove the non-authoritative real
   shadow at port 39478 under the existing external-execute protocol.

The covered order is therefore:

`136 -> 137a -> 137b -> 138 -> live-cutover successor -> seven-day successor`.

Items 137a and 137b jointly occupy the original item-137 slot. They do not
consume either of the two post-138 successor slots that replace historical item
139. Item 138 now depends on completed 137b evidence. Historical item 139 and
all existing 137/138 review artifacts remain byte-for-byte risk evidence.

## Scope and authority reconciliation

This decision narrowly supersedes references to “item 137” and “items 136–138”
in the 2026-07-15 cross-repository decision and 2026-07-16 sequential
delegation: those references now include both 137a and 137b in the order above.
All exact-identity, fresh-builder, independent-review, authorization,
canonical-readback, build-once, backup, rollback, fail-closed, and one-active-
item invariants remain binding.

The founder's direction authorizes the coordinator to commit and push the
coordination-only reconciliation after publishing and reading back its
single-use delegated authorization. It does not itself authorize target-source
landing or installation:

- 137a requires a fresh single-use authorization before its independently
  reviewed target head may land on echo-context main.
- 137b requires a different fresh authorization before its target head may
  land, then a separate exact-version/manifest/all-assets/backup/rollback-bound
  authorization before any real shadow installation or service mutation.
- No authorization may be amended, reused across passes, or inferred from this
  decision.

Each pass uses a fresh implementation builder and a different implementation
reviewer. The persistent coordinator may disposition spec-review findings,
repair failed gates, merge, push, and execute only through the delegated
protocol. Builders do not inherit that authority.

## Why decomposition is the structural fix

R8 left six recurring mechanisms open: status/doctor lifecycle ABA,
no-launchd orphan cleanup, fixture read/verify identity, authorization-runner
trust, pre-Node launchd diagnostics, and closed dependency acquisition. Trying
to solve candidate execution, portable packaging, launchd installation, and
real-path recovery in one specification kept those mechanisms coupled.

137a cuts every real-install mechanism and keeps only the runtime vertical
slice plus the candidate-specific proofs that can be settled in an ephemeral
root. 137b is not reviewed against predictions: it is refined after 137a lands
and consumes its exact canonical SHA, stage evidence, and observed limitations.
This preserves the safety gates while converting the old static review
contract into two evidence-bounded contracts.

## Terminal boundaries

137a completion proves only a non-installable candidate. It cannot justify
installation, fixed-port use, launchd, portable dependency closure, runtime or
state authority, client rewiring, capture, cutover, or product maturity.

137b completion proves only an installed, capture-off, non-authoritative shadow
while Project_echo remains authoritative. Item 138 still owns cutover
substrate and isolated rehearsal; the later successors alone own live
authority change and seven real accepted days.
