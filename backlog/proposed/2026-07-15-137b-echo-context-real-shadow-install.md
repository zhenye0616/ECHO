---
id: 2026-07-15-137b-echo-context-real-shadow-install
title: "Exact-artifact per-user echo-context real shadow install"
status: proposed
priority: HIGH
estimate: 4d
created: 2026-07-15
blocked_by:
  - 2026-07-15-137a-echo-context-candidate-runtime
task_state_ref: 2026-07-15-137b-echo-context-real-shadow-install
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/package.json # installed-runtime scripts and 0.1.0-dev.137.1 identity
  - /Users/zhenye/Desktop/echo-context/package-lock.json # exact portable/native dependency closure
  - /Users/zhenye/Desktop/echo-context/README.md # capture-off real-shadow operator contract
  - /Users/zhenye/Desktop/echo-context/CHANGELOG.md # installed-shadow milestone
  - /Users/zhenye/Desktop/echo-context/src/runtime/** # refine completed candidate for installed logging/readiness/shutdown
  - /Users/zhenye/Desktop/echo-context/src/cli/** # NEW install/lifecycle/status/doctor/uninstall commands
  - /Users/zhenye/Desktop/echo-context/src/install/** # NEW bundle/layout/transaction/launchd/ownership logic
  - /Users/zhenye/Desktop/echo-context/schemas/** # installed config/artifact/status/doctor/receipt/intent schemas
  - /Users/zhenye/Desktop/echo-context/provenance/** # installed-runtime inventory and 137a linkage
  - /Users/zhenye/Desktop/echo-context/tools/** # portable build/verify and authorized real-shadow smoke
  - /Users/zhenye/Desktop/echo-context/tests/runtime/** # installed startup/logging/writer tests
  - /Users/zhenye/Desktop/echo-context/tests/cli/** # lifecycle/status/doctor truth tests
  - /Users/zhenye/Desktop/echo-context/tests/install/** # artifact/layout/transaction/launchd/authorization tests
  - /Users/zhenye/Desktop/echo-context/tests/security/** # secret, portable-closure, and path fences
  - /Users/zhenye/Desktop/echo-context/tests/integration/** # candidate regression and exact real-shadow proof
  - "/Users/zhenye/Library/Application Support/echo-context/**" # exact authorized immutable releases/config/secrets/install state
  - /Users/zhenye/Library/LaunchAgents/com.echo.context.plist # exact authorized capture-off shadow service
  - /Users/zhenye/Library/Logs/echo-context/** # exact authorized bounded logs
  - /Users/zhenye/.echo-context-shadow/** # exact authorized isolated synthetic state
  - raw/internal/migrations/2026-07-15-137b-echo-context-real-shadow-install-*-delegated-approval.md # separate target-main and install authorizations
  - raw/internal/migrations/2026-07-15-137b-echo-context-real-shadow-install.md # NEW landing/build/install/rollback evidence
  - raw/internal/agent-runs/** # workflow-owned run log
  - backlog/task-state/2026-07-15-137b-echo-context-real-shadow-install/** # workflow continuity pointers
  - backlog/proposed/2026-07-15-137b-echo-context-real-shadow-install.md # proposal and evidence-driven revisions
  - backlog/ready/2026-07-15-137b-echo-context-real-shadow-install.md # watcher-owned promotion target
  - backlog/claimed/2026-07-15-137b-echo-context-real-shadow-install.md # workflow claim target
  - backlog/pending_review/2026-07-15-137b-echo-context-real-shadow-install.md # workflow handoff target
  - backlog/complete/2026-07-15-137b-echo-context-real-shadow-install.md # coordinator-owned completion move
  - docs/BACKLOG.md # generated stage-derived index
spec_refs:
  - backlog/complete/2026-07-15-137a-echo-context-candidate-runtime.md # exact landed runtime and observed candidate evidence; must exist before review
  - raw/internal/migrations/2026-07-15-137a-echo-context-candidate-runtime.md # exact target tuple, stage identity, and limitations
  - backlog/complete/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # source-chain root
  - backlog/complete/2026-07-15-137-echo-context-installable-shadow-runtime.md # cancelled parent risk history
  - backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/r8/combined.md # recurring install/lifecycle families
  - raw/internal/decisions/2026-07-17-echo-context-137-two-pass-scope-reset.md # founder-locked pass boundary
  - raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md # real-shadow execute protocol
  - raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md # separate target/install authorization records
  - raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md # hosted release surfaces remain deferred
  - backlog/inbox/2026-07-16-140-echo-context-hosted-ci-and-release-governance.md # parked owner of hosted release governance
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # shadow proof does not advance maturity
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # context remains internal infrastructure
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
target_repo: "/Users/zhenye/Desktop/echo-context"
target_remote: "https://github.com/zhenye0616/echo-context.git"
target_branch: ""
target_worktree: ""
target_head_sha: ""
target_pr_url: ""
target_landed_sha: ""
project_landed_sha: ""
---

## Why this spec exists

Item 137a first proves the runtime slice in a disposable root without making an
installation or portability claim. This second pass begins only after 137a is
complete and rewrites this proposal against its exact canonical target
SHA/tree, candidate inventory, test evidence, and observed limitations.

The pass then closes the boundaries intentionally cut from 137a: portable
dependency acquisition, exact four-asset packaging, transactional per-user
installation, direct launchd ownership, coherent status/doctor observations,
pre-listener diagnostics, exact authorization-to-artifact handoff, and
real-shadow rollback. The result runs at `127.0.0.1:39478` with synthetic
state, capture disabled, and authority false while Project_echo remains
healthy and authoritative at 38478. It does not cut over any client or data.

## Acceptance Criteria

### AC1 — Reconcile completed 137a and freeze the installed-runtime contract

Before review starts, replace every provisional predecessor reference in this
spec with the completed 137a canonical target SHA/tree, version, lock hash,
diagnostic stage hash, Node/npm/ABI tuple, roster, lifecycle evidence, and
Project_echo evidence SHA. Rebuild and rerun 137a from a fresh authenticated
clone. Any mismatch blocks 137b; no stale local checkout or copied candidate
stage is authority.

Preserve the proven composition, eight-tool roster, bearer grammar,
same-descriptor fixture buffer, capture-off-before-body behavior, and
single-writer semantics. Freeze installed identity as version
`0.1.0-dev.137.1`, host `127.0.0.1`, port `39478`, label
`com.echo.context`, state home `/Users/zhenye/.echo-context-shadow`,
`authority:false`, `accept_capture:false`, and `capture_workers:[]`.
No item-137b command can create or activate an authority record.

Every serve path accepts only absolute manifest-resolved config and log paths.
Before native-module, secret, lease, SQLite, or listener work, it opens a
current-user 0600 non-link bounded startup sink beneath the validated
current-user 0700 log root. Deterministic persistent pre-listener failures
write one typed credential-redacted record and exit without a launchd retry
storm; transient contention is separately typed and retryable; unexpected
crashes remain nonzero. The exact mapping and cleared/persistent failure
behavior are frozen in the refined spec and tests after 137a evidence exists.

### AC2 — Build one verified four-asset portable bundle from landed source

After independent implementation review, separate target-main authorization,
target landing, and canonical readback, build once from a fresh detached clone
of the landed target SHA. The local, non-published result contains exactly:
runtime tgz, canonical runtime manifest, SBOM, and self-contained POSIX
bootstrap. A separate install authorization binds the manifest's own SHA-256
and each typed asset name, size, mode, and SHA-256.

The manifest binds the complete 136→137a→137b source chain; target
SHA/tree/version/archive/lock identity; exact member inventory; entrypoint;
Darwin x64 architecture; Node/npm/ABI and native-addon hashes; dependency
URL/integrity closure; licenses; SBOM; bootstrap; toolchain; and
`authority_capable:true`, `authority_active:false`. It excludes source,
tests, dev tools, cache, credentials, state, config, logs, absolute repository
paths, sibling repositories, and workflow/coordination code.

Assembly starts with empty npm and Node caches. The refined spec must enumerate
the complete deny-by-default HTTPS acquisition set, immutable Node archive
hash, lockfile integrity rules, redirect policy, native rebuild inputs, compiler
tuple, Mach-O/`otool`/rpath checks, and runtime load probes observed from
137a. No host-Node, cache, prebuilt-addon, Git/GitHub, unlocked URL, mutable
worktree, alternate output, or unreviewed fallback is accepted. Nothing is
tagged, uploaded, downloaded as a release asset, or published.

### AC3 — Install transactionally through one descriptor-bound authorization handoff

One layout resolver owns every support, immutable-release, config, secret,
state, log, plist, label, port, lock, intent, and receipt path. Refuse
root/sudo, symlink/traversal, foreign ownership, wrong types/modes, disabled
launchd override, label/port/path collision, incompatible architecture, and
existing unowned content before mutation.

The installer takes one exclusive current-user 0600 lifecycle lock. The only
pre-intent write is validated creation of an otherwise empty 0700 support root
and lock. Before any other real-path mutation, it durably writes an intent
enumerating every owned path; stages verified bytes; atomically commits an
immutable release, config, secret reference, and ownership receipt; then
bootstraps the job. Kill-point replay adopts an exact committed state, removes
only enumerated owned partial state, or refuses. Uninstall bootouts first,
removes only receipt-owned install bytes, preserves the secret and synthetic
state, and proves restoration through a separately recorded backup/rollback
contract.

The external authorization runner opens every authorization, manifest, asset,
plan, backup, and rollback object as a current-user regular non-link file,
copies it to an immediately unlinked descriptor snapshot, verifies all hashes
and exact destination identities from those snapshots, and executes/consumes
only the snapshot descriptors. Coherent rename, in-place rewrite, and
swap-restore races must not change the bytes executed or installed. Any
identity drift makes the single-use authorization stale and stops before
mutation.

### AC4 — Let launchd own the runtime directly and make observation incarnation-coherent

The plist directly invokes the bundled Node/runtime with absolute config and
log paths, `RunAtLoad:true`, `KeepAlive:{SuccessfulExit:false}`,
`ThrottleInterval:10`, and stdout/stderr at `/dev/null`. There is no
supervisor, shim, second restart authority, launchctl enable/disable/kickstart/
kill, or persistent candidate process.

Mutating lifecycle uses only `launchctl bootstrap gui/$UID <plist>` and
`bootout gui/$UID/com.echo.context`; `print` and `print-disabled` are
read-only. One closed source-owned exit map distinguishes absent, collision,
permission, disabled override, transient, and unknown results. Start/restart
cannot succeed without authenticated readiness matching PID, start time,
generation, artifact, config, exact roster, capture false, and authority false.

Mutating commands hold the exclusive lifecycle lock through recovery and
convergence. `status --json` and `doctor --json` hold its shared form and
capture launchd plus authenticated runtime identities before and after every
probe. They accept a verdict only when PID/start/generation/artifact identities
are unchanged and agree with listener/lease evidence; otherwise they discard
all observations and retry within one bounded budget, then emit canonical
`busy:true` with exit 4. Absent support root/lock reports not-installed
without creating either. Doctor is read-only, redacted, schema-valid, and has
deterministic combined-failure exit precedence. Pre-Node failures remain
observable through independently verified filesystem/log evidence without
inventing a historical cause.

### AC5 — Authorize, execute, rollback-prove, and leave a healthy non-authoritative shadow

After the target is landed and the four assets are built once, the coordinator
creates, commits, pushes, and reads back a fresh installation authorization
binding every identity required by the sequential delegation: exact spec/ready
seal, both canonical repository SHAs/trees, version, manifest and all asset
hashes, repository/ref identities, builder/reviewer verdict, plan, backup,
restore proof, rollback state/generation, destination paths, coordinator,
timestamp, nonce, idempotency state, and ambiguous-outcome response.

Preflight proves Project_echo healthy/authoritative at 38478; 39478 and the
real-shadow paths/label are unowned; capture is off; the exact backup restores
the entire authorized before-image; and architecture, bundle, runner, secret,
and rollback objects match authorization. The operator then installs, starts,
seeds only the manifest-bound synthetic fixture while stopped, restarts, and
proves authenticated readiness, exactly eight tools, synthetic retrieval,
capture disabled before body read, authority false, bounded logs, coherent
status/doctor, restart recovery, and reboot-equivalent launchd convergence.

The proof includes one authorized uninstall/restore and a fresh reinstall from
the same immutable four assets, showing no unowned path mutation and exact
before-image recovery. The final state is installed, healthy, capture-off, and
non-authoritative at 39478. Project_echo remains healthy and authoritative at
38478; no client config, live data, credentials, capture worker, or authority
record changes. Evidence is secret-free and binds the final receipt, launchd
identity, runtime identities, artifact tuple, backup/rollback proof, and exact
mutated-path allowlist.

## Out of Scope (Don't Drift)

- Any build, review, target landing, bundle, authorization, or real-path
  mutation before completed 137a evidence is reconciled into this spec.
- Live Project_echo state migration, client rewiring, capture enablement,
  authority activation, old-daemon disablement, port 38478/38479 mutation,
  cutover, rollback of authority, or recutover.
- Hosted CI, tags, releases, uploads/downloads, public/private publication, or
  a general release manager; item 140 owns those surfaces.
- New MCP tools or semantics, Project-specific consumer graphs, coordination
  producers, echo-brain/echo-loop install, wiki work, or maturity claims.

## Risks

- 137a evidence may invalidate a packaging or locking assumption. Reconcile
  the observed tuple and revise/review this spec instead of preserving a
  predicted mechanism.
- Portable native closure can silently depend on host cache/toolchain. Empty
  caches, a closed acquisition set, explicit rebuild, architecture inspection,
  and bundled-node load probes make that fail closed.
- Authorization bytes can change after verification. Descriptor snapshots
  make the exact verified bytes the only execution input.
- Lifecycle probes can mix launchd incarnations. Shared-lock, before/after
  identity sandwich, discard-and-retry, and busy timeout prevent mixed truth.
- Launchd can discard diagnostics before Node starts. The direct plist plus
  pre-listener sink ordering and independent path checks retain typed evidence
  without a retry storm.
- Install interruption can leave ambiguous ownership. Durable intent,
  immutable receipt, exact owned-path enumeration, kill-point tests, and
  before-image restore constrain recovery.

## Tests

- `tests/install/artifact.test.ts` proves the exact four assets, complete
  source chain, empty-cache closed acquisition, lock integrity, toolchain/ABI/
  Mach-O closure, load probes, exclusions, manifest/SBOM/bootstrap hashes, and
  build-once identity.
- `tests/install/authorization.test.ts` proves single-use exact identity,
  descriptor snapshots, runner/manifest/asset/plan/backup/rollback binding,
  rename/in-place/swap races, stale authorization, and pre-mutation refusal.
- `tests/install/layout.test.ts` proves canonical real paths, ownership/mode/
  type/no-link rules, collision/architecture/disabled-override rejection, and
  zero mutation on preflight failure.
- `tests/install/transaction.test.ts` injects kills at every intent/stage/
  release/config/secret/receipt/bootstrap boundary and proves adopt/remove/
  refuse replay, lifecycle serialization, owned-only uninstall, and exact
  restore.
- `tests/install/launchd.test.ts` proves the direct plist, complete launchctl
  map, absent/collision/failure handling, fatal startup mapping, bounded logs,
  restart/reboot-equivalent convergence, and absence of forbidden controls.
- `tests/cli/status-doctor.test.ts` proves schemas, absent-lock behavior,
  shared-lock observation sandwich, incarnation churn retry/busy exit,
  listener/lease/readiness mismatches, startup evidence truth, redaction,
  deterministic exits, and read-only behavior.
- `tests/integration/shadow-install.test.ts` proves exact install/start/
  stopped seed/restart/eight-tool retrieval/capture-off/authority-false,
  uninstall/restore, same-artifact reinstall, allowlisted mutations, and
  Project_echo continuity.
- All completed 137a tests, existing source artifact/inventory/parity checks,
  typecheck, lint, full CI, secret scan, and `git diff --check` remain green.

## After Completion (Strategist Notes)

- Do not update the wiki or maturity stage; this is an internal,
  non-authoritative shadow.
- Rewrite item 138 against the exact completed runtime manifest, receipt,
  status/doctor schemas, lifecycle behavior, and real-shadow evidence before
  restarting its review.
- Keep historical item 139 frozen. The two authorized successors are created
  only after 138 completes.
