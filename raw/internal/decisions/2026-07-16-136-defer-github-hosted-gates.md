# Item 136 defers all GitHub-hosted gates and hosted release to a parked follow-up

Date: 2026-07-16
Status: founder decision (direct, this-session)
Authority source: founder direction in the strategist Claude Code session, 2026-07-16 ~07:50 PDT ("can we loosen the requirement for github setup for now since nothing is client facing? lets move all github actions to followup"), following the founder pausing the persistent Codex program coordinator and directing the Claude strategist to drive item 136 to complete.
Relationship to the 2026-07-16 delegation record: this is a direct founder decision, which supersedes coordinator discretion for the covered question. The delegation record's invariants (fresh independent builder, independent reviewer, no self-review, exact-SHA convergence before ready, recorded authorization before irreversible external writes) remain fully in force.

## Context

- Item 136 converged at r14 (spec SHA `f130ba6f`, both reviewers `proceed`, zero findings), was claimed and largely built (echo-context head `145868a6`, 1,025 tests passed, 0 failed), then failed independent implementation review (`77c5e0c3`, "redo before merge") because the converged AC4/AC6 relied on private-repository branch protection and protected-environment required reviewers — features unavailable on the current personal Free GitHub account topology.
- The r15 reframe replaced those gates with a delegated exact-tuple authorization architecture (operation host, launcher/envelope, anonymous-FD askpass, Q/C/A/U/F Project-authority publisher, polling grids, deadline inventories). Rounds r15–r19 grew the spec from 226 to 400 lines while verdicts worsened to dual `pushback` at r19; every r19 finding targets the reframe-era machinery. This matches the documented "patching deeper instead of removing" strategist-drift failure mode.
- Plan-tier facts verified 2026-07-16: branch protection on private repos requires GitHub Pro/Team; environment required reviewers on private repos require GitHub Enterprise. The founder intends to move to an organization account; the plan tier is undecided.
- Nothing in item 136 is client-facing. The Team-product client package is delivered by tarball; no client consumes GitHub Releases or hosted CI.

## Decision

1. **Item 136 makes no GitHub Actions, hosted-CI, branch-protection, protected-environment, check-run-evidence, tag, GitHub Release, or release-asset claim.** All of that scope moves to parked follow-up item `backlog/inbox/2026-07-16-140-echo-context-hosted-ci-and-release-governance.md`, which activates only when the founder fixes the org/plan-tier topology or something echo-context-shaped becomes client-facing.
2. **Cycle two removes the cycle-one `.github/workflows/**` files from the echo-context feature branch.** Unreviewed-but-active workflow files are a liability; item 140 reintroduces them under review.
3. **The 136 quality gate is the AC3 fresh-clone acceptance, run locally**: once by the builder and independently once by the implementation reviewer, both recorded in the implementation-review record.
4. **Landing uses the precedented bootstrap-approval pattern** (as in the two already-landed approvals `e1ec8f74` / `ece86049`): a committed, pushed, read-back delegated-approval Markdown record in Project_echo, then exactly one leased `--porcelain` push of the reviewed merge to echo-context `main`, then authenticated readback. No retry, adoption, or rewrite on any failure or ambiguity.
5. **The source-artifact seal is the recorded content tuple, not a hosted release.** At landed `M`, `build:artifact` runs twice in a fresh clone (determinism proof), and the six-field tuple (source SHA, source tree, version, source-archive SHA-256, lock hash, manifest hash) is recorded in the migration record. Item 137 consumes exact `M` plus the tuple and rebuilds-and-verifies; no artifact bytes are hosted or committed.
6. **The echo-context repository stays private.** Making it public to obtain free protection features was considered and rejected.
7. **The reframe-era machinery is removed from the 136 spec**, not patched: operation host, launcher, envelope, anonymous-FD askpass, owned-root cleanup topology, Q/C/A/U/F authority publisher, execution-purpose approvals, canonical plan/authorization JSON schemas, polling grids, and deadline inventories. Historical designs remain reviewable at spec SHAs `f130ba6f` (r14 GitHub-native) and `98250a76` (r18 delegated-authorization) as evidence for item 140.

## Why

Every r15–r19 review round found real defects in mechanism the previous round's patch added, because the spec was attempting to prove adversary-proof, byte-exact hosted operations on a topology that cannot enforce them server-side — a guarantee nothing currently consumes. Removal is the documented exit (skills/review-queue-watch.md disposition discipline). The parts of 136 that items 137/138 actually consume — canonical repository, provenance, self-testing clean clone, deterministic artifact — were already judged sound by the cycle-one implementation review.

## Consequences

- r19's seven findings are dispositioned `accepted — mechanism dropped`; r20 verifies the slimmed spec.
- The cycle-one implementation at `145868a6` remains the base for cycle two; the repair is mostly deletion plus the migration/review record work.
- Item 140's activation decision (Enterprise vs Team-plus-dispatch-as-approval vs other) is a founder decision recorded at activation time, not now.
