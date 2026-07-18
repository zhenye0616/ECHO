---
id: 2026-07-15-137a-echo-context-candidate-runtime
title: "Repository-free disposable echo-context candidate runtime"
status: proposed
priority: HIGH
estimate: 3d
created: 2026-07-15
blocked_by:
  - 2026-07-15-136-echo-context-canonical-repository-release-substrate
task_state_ref: 2026-07-15-137a-echo-context-candidate-runtime
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/package.json # candidate scripts and 0.1.0-dev.137a.1 identity
  - /Users/zhenye/Desktop/echo-context/package-lock.json # synchronized root identity; no unlocked dependency
  - /Users/zhenye/Desktop/echo-context/tsconfig.runtime.json # NEW emitted runtime-only import closure
  - /Users/zhenye/Desktop/echo-context/tools/check-runtime-inventory.mjs # bind the runtime compiler config into executable-source provenance
  - /Users/zhenye/Desktop/echo-context/provenance/runtime-inventory.v2.json # regenerate successor closure after package/tool/config changes; v1 stays immutable
  - /Users/zhenye/Desktop/echo-context/README.md # candidate-only operator contract and explicit non-installable posture
  - /Users/zhenye/Desktop/echo-context/CHANGELOG.md # candidate milestone
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-runtime-config.v1.schema.json # NEW closed disposable-root config
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-ready.v1.schema.json # NEW private ready-FD record
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-stage-inventory.v1.schema.json # NEW generated-stage inventory schema
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-proof-evidence.v1.schema.json # NEW durable bounded proof/failure summary
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-proof-driver-result.v1.schema.json # NEW bounded secret-free outer-driver result carrier
  - /Users/zhenye/Desktop/echo-context/src/runtime/** # NEW candidate config/auth/composition/fixture/serve entrypoints
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # authorization and capture-off transport seams only
  - /Users/zhenye/Desktop/echo-context/fixtures/synthetic-v1.json # NEW bounded source-bound synthetic fixture
  - /Users/zhenye/Desktop/echo-context/tools/candidate-stage-acceptance.sh # NEW scrubbed absolute-path candidate dependency/stage producer wrapper
  - /Users/zhenye/Desktop/echo-context/tools/candidate-stage-acceptance.mjs # NEW long-lived candidate-head producer, proof driver, evidence captor, and caller cleanup owner
  - /Users/zhenye/Desktop/echo-context/tools/stage-candidate-runtime.mjs # NEW runtime-only staging and inventory
  - /Users/zhenye/Desktop/echo-context/tools/candidate-proof.mjs # NEW staged repo-free proof runner
  - /Users/zhenye/Desktop/echo-context/tools/candidate-smoke.mjs # NEW repo-free parent-owned lifecycle proof
  - /Users/zhenye/Desktop/echo-context/tools/candidate-sandbox-probe.mjs # NEW staged fixed direct/grandchild deny probe
  - /Users/zhenye/Desktop/echo-context/tests/runtime/** # NEW config/auth/composition/fixture/lease tests
  - /Users/zhenye/Desktop/echo-context/tests/candidate/** # NEW stage/lifecycle/repo-free/smoke tests
  - /Users/zhenye/Desktop/echo-context/tests/security/candidate-scope.test.ts # NEW real-path/install/coordination closure fence
  - raw/internal/migrations/2026-07-15-137a-echo-context-candidate-runtime-*-delegated-approval.md # coordinator-only review/target/evidence/completion authorizations
  - raw/internal/migrations/2026-07-15-137a-echo-context-implementation-review.md # NEW independent review of exact target and Project heads
  - raw/internal/migrations/2026-07-15-137a-echo-context-candidate-runtime.md # NEW exact target landing and candidate evidence
  - raw/internal/agent-runs/** # workflow-owned run log
  - backlog/task-state/2026-07-15-137a-echo-context-candidate-runtime/** # workflow continuity pointers
  - backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md # proposal and review revisions
  - backlog/ready/2026-07-15-137a-echo-context-candidate-runtime.md # watcher-owned promotion target
  - backlog/claimed/2026-07-15-137a-echo-context-candidate-runtime.md # workflow claim target
  - backlog/pending_review/2026-07-15-137a-echo-context-candidate-runtime.md # workflow handoff target
  - backlog/complete/2026-07-15-137a-echo-context-candidate-runtime.md # coordinator-owned completion move
  - docs/BACKLOG.md # generated stage-derived index
spec_refs:
  - backlog/complete/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # exact canonical predecessor and target tuple
  - raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md # six-field source readback evidence
  - raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-target-main-landing-d7189a6f-813b-40d1-ae03-bb19eedf816a-delegated-approval.md # literal target CAS and consumed-authorization pattern
  - raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-migration-record-publication-aa41b29f-24a1-446b-b4b0-5513d1afdd12-delegated-approval.md # record-only A_e then deterministic evidence P pattern
  - raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-completion-d39627d1-d036-45f9-be6b-0d09d48d627e-delegated-approval.md # record-only A_c then deterministic completion C pattern
  - backlog/complete/2026-07-13-135-local-echo-context-source-extraction.md # exact eight-tool and source-independence contract
  - backlog/complete/2026-07-15-137-echo-context-installable-shadow-runtime.md # cancelled parent and risk history
  - backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/r8/combined.md # six recurring families driving this cut
  - backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/r8/codex.md # candidate runtime and identity risks
  - backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/r8/codex-ops.md # lifecycle and operating risks
  - raw/internal/decisions/2026-07-17-echo-context-137-two-pass-scope-reset.md # founder-locked two-pass boundary
  - raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md # cross-repository landing protocol
  - raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md # single-use target-main authorization
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # candidate does not advance maturity
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # context remains internal infrastructure
  - /Users/zhenye/Desktop/echo-context/schemas/service-api.v1.json # generic service contract preserved
  - /Users/zhenye/Desktop/echo-context/tools/verify-service-parity.mjs # current test-only composition and roster parity
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # current loopback server and registrations
  - /Users/zhenye/Desktop/echo-context/package-lock.json # exact prepared dependency closure
  - /Users/zhenye/Desktop/echo-context/provenance/runtime-inventory.v2.json # runtime-allowed source inventory
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

Item 136 made echo-context canonical at commit
`78bf523e87c8b9986d31ba28fdf987cf6ea66c29`, tree
`3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`, version
`0.1.0-dev.136.1`, source archive
`3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef`,
lock hash `13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b`,
and manifest hash
`6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01`.
The local primary checkout is not authority; a fresh authenticated remote
readback must resolve that exact tuple before work begins.

The cancelled parent tried to prove runtime, portable packaging, launchd,
transactional installation, and real-path recovery in one contract. This pass
keeps only the vertical runtime slice: an authenticated, capture-off process
staged and run outside its repository, with synthetic state inside an
ephemeral root and a kernel-selected port. It deliberately makes no install,
portable-artifact, fixed-service, or authority claim. Its exact landed evidence
is the input used to refine 137b.

## Acceptance Criteria

### AC1 — Start from the exact predecessor and enforce one closed candidate root

Before creating a target branch, fetch the authenticated canonical target
remote into a fresh isolated clone and require `main` to equal the item-136
commit and tree above. Rebuild and verify the complete item-136 source tuple
using its committed verifier. A missing remote object, stale local ref, altered
tuple, copied artifact, or verification failure blocks the item.

Add candidate version `0.1.0-dev.137a.1` and exactly one candidate-owned,
caller-created current-user 0700 absolute non-link `<run-root>`. The proof
harness parent and quarantined clone in AC4 are caller setup, never candidate
state or an alternate runtime root. The run root's closed topology is:
`<run-root>/stage` for immutable executed bytes,
`<run-root>/work/config/candidate.json`,
`work/secrets/mcp-bearer-token`, `work/state/context.sqlite`,
`work/state/context.sqlite-wal`, `work/state/context.sqlite-shm`,
`work/state/writer-lease.sqlite`, `work/logs/`, `work/tmp/`,
`work/home/`, `work/xdg-cache/`, and `work/evidence/`. No second stage
or state root exists. The stage publisher alone may create a private sibling
`<run-root>/.stage.<nonce>` and must atomically rename it to `stage` only
after complete verification. Final stage directories/executables are 0500 and
data files are 0400; `work` directories are 0700 and files are 0600.
The staged proof runner never removes the root that contains its own executable,
cwd, or evidence. After command 2 has written its final summary and directly
closed, the reviewed outer driver opens that summary once with
`O_RDONLY|O_NOFOLLOW`, verifies
its schema/hash and recorded topology, proves command 2 itself absent, and only
then removes the one root through the reviewed outer driver's identity-bound
cleanup. A failed or
unproven run before the cleanup commit preserves the root. After the atomic
cleanup-quarantine rename, failure retains and reports whatever quarantined
remainder exists; cleanup never claims transactional restoration. Preflight
refuses any member whose current identity differs from the recorded topology.

Before command 1, the caller creates the 0700 run root and the
complete empty writable directory skeleton: `work/config`, `work/secrets`,
`work/state`, `work/logs`, `work/tmp`, `work/home`, `work/xdg-cache`, and
`work/evidence`. The stage command starts with cwd exactly `work`, validates
that skeleton without opening a database or listener, and alone creates
`.stage.<nonce>` and atomically publishes `stage`. The staged proof runner
creates the config and token later at their fixed derived paths before
seed/serve.
`context.sqlite-wal` and `context.sqlite-shm` are the only
permitted transient main-database sidecars: when present they are current-user
0600 regular non-links derived from the one `SqliteStorage`, their identities
join lifecycle and cleanup evidence, and no other database sidecar is allowed.
The separate writer-lease database remains `journal_mode=DELETE` and creates
no WAL/SHM pair.

The config lives only at the path above, names `run_root`, and contains no
independently supplied child paths. The resolver derives every member from the
validated root. The only network values are `host:"127.0.0.1"` and
`port:0`; the only authority values are `authority:false`,
`accept_capture:false`, and `capture_workers:[]`. Unknown keys, root/sudo,
inherited configuration, environment or home-directory defaults, symlinked
components, traversal, foreign ownership, wrong modes/types, fixed ports,
labels, GUI domains, plist paths, and real-user roots fail before the lease,
main SQLite, or listener is opened.
The proof runner validates the exact canonical config bytes against staged
`candidate-runtime-config.v1.schema.json` before descriptor-safe publication.
Every seed/serve entrypoint then opens that file once with
`O_RDONLY|O_NOFOLLOW`, validates the same bounded buffer against that same
inventory-bound schema, and resolves paths only from that validated buffer.
Schema compilation, parse, or validation failure is a pre-mutation contract
failure: no token read, lease, main database, listener, or fallback parser is
permitted.

The production composition owns exactly one `SqliteStorage` and the exact
generic read-service semantics enumerated in AC2. It imports no capture
pipeline, Project_echo onboarding/default paths, task-state Git implementation,
coordination code, installer, launchd adapter, status/doctor surface, or
authority controller.
A dedicated SQLite lease database is opened first through `better-sqlite3`
with `timeout:0`; startup executes `PRAGMA busy_timeout=0`,
`PRAGMA journal_mode=DELETE`, and then exactly `BEGIN EXCLUSIVE` before any
main-database or socket operation. The connection and transaction remain open
for process lifetime. `SQLITE_BUSY` is typed contention exit 75, never
retried; the losing process closes and exits, so it cannot resume after the
winner releases. Every other lease failure is a contract/internal failure
under the closed exit map in AC4. Crash/SIGKILL kernel cleanup releases the
lease.

### AC2 — Serve exactly eight authenticated tools with capture disabled

Refactor `src/mcp/server.ts` only through an authorization/transport seam.
The candidate exposes exactly `echo_ping`, `echo_resolve_mru`,
`find_clusters`, `get_atom`, `get_atoms`,
`get_recent_work_context`, `search_memories`, and
`wait_for_new_turns`, with no descriptor, response, or semantic change.

The proof runner creates 32 random bytes and writes their canonical 43-character
unpadded-base64url encoding plus one LF to a current-user 0600 regular
non-link file below the candidate root. The runtime reads it once, requires
that exact disk grammar, decodes exactly 32 bytes, and constant-time compares
decoded request bytes. Exactly one `Authorization: Bearer <43 characters>`
header is accepted. Missing, duplicate, malformed, padded, query, cookie,
wrong, or whitespace-bearing credentials fail together with Host/DNS-rebinding
checks before application code consumes a body byte. The only accepted raw
Host field is one occurrence whose ASCII value is exactly
`127.0.0.1:<kernel-selected-port>`; comma-joined, absolute-form authority,
userinfo, alternate numeric spelling, IPv6, missing-port, whitespace, and
duplicate raw Host fields fail. Before Host and raw Authorization validation,
the server attaches no `data`/`readable` listener, invokes no body parser,
async iterator, pipe, or storage work, and never calls `read()`/resume on the
request. Kernel/Node buffering below the application boundary is explicitly
not claimed as body consumption.

Every `/mcp`, `/mcp/recent-calls`, `/ready`, and `/v1/*` data route is
authenticated. The complete `/v1/*` roster is exactly `GET /v1/ping`,
`POST /v1/search`, `POST /v1/clusters`, `POST /v1/atoms`, `POST /v1/wait`,
and `POST /v1/capture`; no other `/v1/*` route exists. The first five preserve
the committed `schemas/service-api.v1.json` request/response limits and
semantics. Capture is the sole semantic exception and always returns the typed
`403 capture_disabled` rejection below before body consumption. `/live` is
unauthenticated and fixed. Authenticated
`/ready` reports candidate version, PID, run ID, exact roster,
storage ready, `capture:false`, and `authority:false`. Authenticated
`POST /v1/capture` returns typed `403 capture_disabled` without attaching
or invoking any application body consumer. The server caps inbound headers at
16 KiB. Every Host/auth rejection and the capture-disabled response has at
most 2 KiB of fixed response headers and a 1 KiB body, flushes headers within
1,000 ms after the complete inbound `\r\n\r\n`, sends `Connection: close`,
and closes the response/socket within 2,000 ms, even when a raw client
withholds the declared body or streams without end. Late, oversized, or
incomplete rejection is a test failure; an application-consumption counter
remains zero. Credential bytes never enter
Git, argv, environment, stdout/stderr,
logs, JSON evidence, inventory, process-title state, or errors.
The runtime validates the exact ready object against staged
`candidate-ready.v1.schema.json` before serializing its sole fd-3 record; the
inner, outer, and proof runner validate the received bounded line against that
same inventory-bound schema before accepting, changing phase, or relaying it. A schema failure is
exit 70 and cannot be converted into readiness by a parent-generated record.

### AC3 — Seed one synthetic fixture from one verified descriptor buffer

The stopped-candidate seed entrypoint accepts only
`seed --run-root <absolute-root> --fixture-id synthetic-v1`; callers cannot
supply a config, database, fixture path, or digest. It resolves the one config
and all paths from the topology in AC1. A source-bound catalog maps that ID to
`stage/fixtures/synthetic-v1.json` and its SHA-256. The seed path acquires the
same exclusive writer lease before main-database access.

It validates every root-to-member component as current-user owned and
non-link, opens the fixture once with `O_RDONLY|O_NOFOLLOW`, requires a
bounded regular file, reads one bounded buffer from that same descriptor, and
hashes, parses, validates, and inserts only that buffer without reopening the
path. It opens the main database only after identity validation succeeds and
inserts one event in one transaction. Exact replay is a no-op; mismatch or
multiplicity is a typed refusal. Rename, symlink, in-place rewrite, and
swap-restore races prove that no unverified byte reaches storage and a failed
identity check leaves the database absent or byte-identical.

### AC4 — Stage and run repo-free with one parent-owned lifecycle

The outer driver's third clean/HEAD boundary proves command 1 runs only from
an exact clean target checkout: `HEAD` is the full candidate commit, status is
empty, and the derived tree equals the reviewed tree. It directly spawns
`tools/stage-candidate-runtime.mjs` with the bound source identities and no
intervening caller/handoff. The stage independently reauthenticates every
executable input described below and publishes directly
through AC1's temporary-to-final rename and never tracks a head-bound inventory
in source. The final stage contains emitted runtime JavaScript, required
schemas and SQLite migrations, the synthetic fixture, package metadata, and
regular non-symlink production dependency files copied from the exact
candidate-stage producer below.

Item 136's committed `fresh-clone-acceptance.sh` source mode is predecessor
verification only: its hard-coded `0.1.0-dev.136.1` source-artifact plan is
never invoked at the candidate head. Add one candidate-specific producer,
`tools/candidate-stage-acceptance.sh` plus its fixed sibling orchestrator. The
wrapper inherits item 136's canonical absolute wrapper/cwd/tool authentication
and `env -i` discipline, but accepts only the closed common Node/npm/Git
identity prefix followed by `--mode=candidate-stage --source-sha
<candidate-head> --run-root <run-root>`. Its `--sandbox-home` is the fixed
caller-created 0700 `<proof-parent>/setup-home` with a precreated 0700 `tmp`;
it is setup-only, outside the run root, inaccessible to the sandboxed
candidate, and identity-safely removed by the orchestrator immediately after
its final producer readback and before source quarantine or command 2. The
role-typed outer caller invokes only this canonical wrapper from physical cwd
`source`; it never invokes the `.mjs` sibling or commands 1/2 directly.

The candidate orchestrator is both the sole dependency/stage producer and the
reviewed long-lived outer proof driver. In the same private clone it first
executes one fixed serialized child
plan: exact Node/npm/Git version probes; clean-status/full-HEAD boundary;
exact `npm ci`; a second clean/HEAD
boundary; `typecheck`, `lint`, `test:ci`, `verify:inventory`,
`verify:authority`, and `git fsck --full --strict`; a third
clean/HEAD boundary immediately before exact stage command 1 as its direct
final build child; then published-stage inventory readback and one fourth
clean/HEAD boundary. It has the committed candidate version
`0.1.0-dev.137a.1`, no source-artifact build/verify step, no 136-prefixed path,
and no caller-selected command. Its existing item-136-class deadlines,
process-group settlement, positive environment, four clean/HEAD boundaries,
and no-retry behavior are literal independent test oracles. A failure retains
the private proof-parent path, records any partial setup cleanup truthfully, and
never launches command 2.

Producer limits are fixed: 30 seconds for each version/status/HEAD child, 600
seconds for `npm ci`, 900 seconds for `test:ci`, 300 seconds for every other
check and command 1, and 4,000 seconds aggregate with the final 120 seconds
reserved for the last clean/HEAD boundary and terminal child/stream settlement.
No child starts if its class deadline would consume that reserve. After the
producer boundary, setup-home removal gets 60 seconds; command 2/full proof gets
600 seconds; exact-summary streaming and cleanup preflight get 30 seconds; and
cleanup-quarantine deletion gets 300 seconds. The complete wrapper/driver
aggregate is 5,000 seconds. Every late phase is failure, never success by
eventual completion.

`scan:secrets` is deliberately not a producer child: its item-136 contract
requires an exhaustive advertised-ref snapshot and a digest-pinned gitleaks
binary that do not belong in the candidate proof root. Before implementation
approval, the independent reviewer runs that existing config-isolated
prefetch/gitleaks protocol against exact `H`; the implementation-review payload
binds its advertised-ref manifest hash, scanner path/version/hash, exact argv,
zero-finding result, and cleanup. A missing or stale scan blocks `A_r`.

The item-136-class TERM/KILL process-group settlement is a producer-phase-only
exception: it may address only the currently owned direct producer child group
on timeout/cancellation before proof. After the fourth clean/HEAD boundary the
driver requires no live producer child/PGID or stream, disposes those signal
handlers, irreversibly enters `driver_phase=proof`, and from then through exit
may not invoke any signal or `ChildProcess.kill` path. Command 2 and every
sandboxed actor are created only in that signal-free phase.

After that final boundary, the driver removes `setup-home`, changes cwd to
`run/work`, atomically renames its own `source` directory to
`source.quarantined`, and requires the original path absent. Before the rename
it has eagerly loaded/authenticated its complete built-in-only driver closure;
afterward it performs no dynamic import, source-map load, module resolution,
or byte read/execute beneath either source path before proof close. It directly
launches staged command 2 with the exact cwd/env/FD map below, including the
driver-liveness pipe, drains its stdio, waits for direct-child close,
descriptor-validates and retains the fsynced summary, and proves command 2
absent. The summary is canonical single-line secret-free JSON plus LF, at most
1 MiB; the driver writes those exact bytes as stdout record 1 and waits for
backpressure/drain completion so the coordinator retains the independently
verifiable preimage before any cleanup mutation. It also reads, hashes, and
compiles the staged driver-result schema into memory before cleanup; no schema
path reopen occurs afterward.

The driver then performs a complete no-follow identity/member preflight,
changes cwd to the validated parent of `<proof-parent>`, and atomically renames
the whole proof parent to the previously absent fixed
`<proof-parent>.cleanup-quarantine`. That rename is the cleanup commit point.
Before it, every final-cleanup failure preserves the then-current proof-parent
tree byte-for-byte.
After it, no-follow metadata/enumeration beneath the quarantined source and run
root is allowed only for cleanup: descriptor-bound stage directories transition
from recorded 0500 to 0700 with `fchmod`, then exact recorded members are
unlinked bottom-up without following links. A post-commit identity/I/O failure
leaves and reports the remaining partial cleanup-quarantine path, emits no
success record, and makes no preservation claim. Success requires both the
original and cleanup-quarantine paths `ENOENT`.

Only after successful cleanup, the still-live driver emits stdout record 2:
exactly one LF-terminated, secret-free JSON record of at most 4,096 bytes
validated against staged
`schemas/candidate-proof-driver-result.v1.schema.json`, then exits 0. It binds
schema identity `candidate-proof-driver-result.v1`, source SHA/tree, version,
producer Node/npm/Git paths/hashes/versions and four boundary results,
stage-inventory digest, proof-summary SHA-256 and redacted result fields,
`command_2_absent:true`, `run_root_removed:true`,
`proof_parent_removed:true`, `cleanup_quarantine_absent:true`, and all negative authority flags. Driver stderr is
a separately drained 64 KiB ring; every producer/proof child output remains in
its own bounded ring and never contaminates the result carrier. The
coordinator treats only direct driver close + stdout EOF + exactly those two
schema-valid records, with its own summary hash matching record 2, as
post-landing proof; it owns no filesystem cleanup authority.

Immediately before publishing, command 1 independently reauthenticates its
`process.execPath` as Node `v22.22.1` plus the exact npm path/hash supplied in
its closed argv, their regular-nonsymlink identities, npm `10.9.4` from the
authenticated npm package metadata, candidate source SHA/tree against the
committed v2 source inventory and driver-supplied reviewed identities, the
exact committed lock hash, and root
`node_modules/.package-lock.json`; package rows must equal the committed lock.
The top-level `node_modules` member set may contain only that hidden lock, the
lock-derived package roots/scope containers, and npm's canonical `.bin` links;
the `.bin` names/targets must equal lock-declared bins and are never copied or
executed by stage. Any unlisted package root or other top-level entry fails.
Every compiler/runtime/native member selected for the stage must be a
current-user regular nonsymlink with link count one, expected package-root
containment, and a successful native-addon load where applicable. It loads the
lock-authorized TypeScript compiler in-process, emits only
`tsconfig.runtime.json`'s closure into `.stage.<nonce>`, and resolves the
production runtime/native import closure from those emitted entrypoints. For
every copied dependency it retains the source descriptor, identity, size, and
SHA-256 in memory, copies from that descriptor, and repeats source identity/hash
plus destination hash before atomic publication. Thus npm's exit is an explicit
reauthentication boundary, not a same-process trust claim; no mutable producer
manifest or caller-selected prepared workspace is trusted. After the
orchestrator's final readback, the private clone becomes source-quarantined
before any candidate execution.

Extend the committed v2 source-inventory checker so `tsconfig.runtime.json`
is an executable-source input alongside the existing compiler/test configs.
After the final package, lock, tool, and compiler-config bytes are committed,
regenerate `provenance/runtime-inventory.v2.json` from that commit and require
`npm run verify:inventory` to pass at the exact reviewed target head. The v2
inventory must bind all six candidate tools (candidate-stage wrapper and
orchestrator, stage, proof, smoke, and sandbox probe), all five new candidate
schemas, the synthetic fixture, `tsconfig.runtime.json`, the complete package
scripts/package JSON hash, and the lock hash.
`provenance/runtime-inventory.v1.json` remains byte-identical historical
evidence. This committed source provenance is distinct from the generated
staged-candidate inventory below.

Inside the stage, canonical `candidate-runtime.v1.json` lists and hashes every
other member except itself and `candidate-runtime.v1.sha256`, and binds the
source SHA/tree, version, package-lock hash, resolved Node/npm executable paths,
hashes, and versions, resolved sysctl path/hash, Node ABI,
process/native architecture, translation
mode and resolved Rosetta runtime closure when present, member paths/modes/hashes,
`installable:false`, and every negative authority flag from AC5. The adjacent
digest file contains exactly the inventory SHA-256 plus LF. Verification first
checks that digest, then requires the complete directory member set to equal
the inventory plus those two metadata files. It repeats no-follow type,
ownership, mode, size, and hash verification immediately before every
execution. This is a diagnostic inventory, not a release manifest,
authorization carrier, or portable dependency proof.
Before publishing `.stage.<nonce>`, command 1 validates the constructed
inventory object against
`schemas/candidate-stage-inventory.v1.schema.json`, serializes only that
validated object canonically, writes its adjacent digest, and repeats schema
validation from the descriptor-read published bytes. On every later readback,
the orchestrator, driver, and proof runner verify the digest first, validate
that same bounded inventory buffer against the staged schema second, and only
then enumerate or trust a member row. Digest, schema, or member-set failure is
exit 66 and no candidate entrypoint launches.

The stage excludes `.git`, TypeScript source, tests, dev tools, caches,
credentials, writable state, absolute-path source maps, Project_echo, sibling
repositories, persistent install/launchd/status/doctor/authority code, and symlink or
hardlink members. The outer driver resolves `process.execPath` to one absolute
regular executable before staging, hashes it, and rechecks that same path,
hash, `v22.22.1`, ABI, and native-addon load immediately before each
shell-free spawn. After the explicit pre-publication dependency producer, no
PATH lookup, shell, alternate interpreter, bundled/downloaded Node, package
install, network acquisition, `NODE_OPTIONS`, `NODE_PATH`, or repository
fallback is permitted.

This host-bound candidate explicitly permits the pinned x86_64 Node to run
under Rosetta on Apple Silicon. Staging records `process.arch`, the native
architecture capability, and `/usr/sbin/sysctl -in sysctl.proc_translated`;
each process that owns a later Node spawn runs that same fixed helper
immediately before the spawn. The stage also binds the Node Mach-O architecture
and executable hash; each child checks its local `process.arch` before reading
any control byte or mutating candidate state, and mismatch exits 69. The
parent-side helper + exact executable identity is the pre-START attestation;
no child report or ready record is required. The helper is shell-free with
fd 0 `/dev/null`, drained/capped stdout 64 bytes and stderr 1 KiB, a one-second
close deadline, and exactly `0` or `1` plus LF. Runtime owns no later spawn and
runs no helper child. When
translated, the inventory and profile bind the resolved Node/dylib/Rosetta
filesystem closure. The profile may allow the `sysctl-read` and `mach-lookup`
operation classes required for that pinned interpreter bootstrap. Evidence
records them as class-wide grants, and this candidate makes no finer-grained
sandbox claim over those operations. Filesystem access outside the
recorded runtime/stage closure and every outbound network operation remain
denied and tested. No other Node architecture, translation mode, or fallback
is accepted.

The proof harness uses one caller-owned 0700 `<proof-parent>` with fixed
siblings `source`, `run` (the one `<run-root>`), `source.quarantined`, transient
`setup-home`, a regular 0600 `outside-sentinel`, and an always-absent
`outside-write-probe`; the fixed sibling `<proof-parent>.cleanup-quarantine`
must also be absent. The authorized outer caller creates and records that empty setup,
clones the exact reviewed head at `source`, then invokes only the canonical
candidate-stage wrapper. Its long-lived driver runs command 1, removes
`setup-home`, changes cwd, quarantines its own source path, directly owns
command 2, captures evidence, and performs successful cleanup exactly as
defined above; no ad hoc or inline coordinator executable performs any of
those transitions.

“Outer caller” is role-typed: the builder creates the same disposable setup and
invokes the same wrapper for pre-landing proof at `H`; after review, only the
coordinator may create the post-landing setup and invoke it at canonical `T`.
Neither role may replace, bypass, or extend the reviewed wrapper/driver, and
builder proof conveys no landing authority.
The staged proof runner accepts only the run root, derives those fixed sibling
paths, creates config/token, and owns probes, seed, lifecycle scenarios, HTTP,
system observers, evidence, and final absence checks. It executes no source or
quarantined byte.

The canonical wrapper plus the orchestrator's serialized producer phase and
long-lived proof-driver phase are closed above. Apart from the producer
children and the fixed pre-spawn
`/usr/sbin/sysctl -in sysctl.proc_translated` identity helper above, the
complete candidate/proof executable/argv surface is the nine commands below.
The fixed system observers in the later evidence paragraph are diagnostics,
not candidate entrypoints:

1. stage — `<node-abs> <source>/tools/stage-candidate-runtime.mjs --run-root
   <run-root> --source-sha <candidate-head> --source-tree <candidate-tree>
   --npm-bin <npm-abs> --npm-sha256 <npm-sha256>`;
2. proof runner — `<node-abs>
   <run-root>/stage/bin/candidate-proof.mjs --run-root <run-root> --mode full
   --driver-liveness-fd 3`;
3. seed — `/usr/bin/sandbox-exec -p <verified-profile-buffer> <node-abs>
   <run-root>/stage/bin/candidate-runtime.mjs seed --run-root <run-root>
   --fixture-id synthetic-v1`;
4. direct deny probe — `/usr/bin/sandbox-exec -p <verified-profile-buffer>
   <node-abs> <run-root>/stage/bin/candidate-sandbox-probe.mjs --run-root
   <run-root> --role direct --result-fd 3`;
5. grandchild-probe parent — `/usr/bin/sandbox-exec -p
   <verified-profile-buffer> <node-abs>
   <run-root>/stage/bin/candidate-sandbox-probe.mjs --run-root <run-root>
   --role parent --result-fd 3`;
6. that parent alone spawns its inherited-sandbox child — `<node-abs>
   <run-root>/stage/bin/candidate-sandbox-probe.mjs --run-root <run-root>
   --role grandchild --result-fd 3`;
7. outer lifecycle owner — `/usr/bin/sandbox-exec -p
   <verified-profile-buffer> <node-abs>
   <run-root>/stage/bin/candidate-smoke.mjs --outer-owner --run-root
   <run-root> --record-fd 3 --proof-control-fd 4`;
8. the outer alone spawns its inherited-sandbox inner — `<node-abs>
   <run-root>/stage/bin/candidate-smoke.mjs --inner-owner --run-root
   <run-root> --record-fd 3 --outer-control-fd 4`; and
9. the inner alone spawns the inherited-sandbox runtime — `<node-abs>
   <run-root>/stage/bin/candidate-runtime.mjs serve --run-root <run-root>
   --ready-fd 3 --parent-control-fd 4`.

No other flag, positional argument, environment override, entrypoint, or role
is accepted by commands 1–9. All nine launches are shell-free with cwd exactly `<run-root>/work`,
umask 077, and the positive environment below. Stage and seed receive fd 0
from `/dev/null` and separate fd 1/2 pipes continuously drained by their caller.
Proof receives that fd 0/1/2 map plus read-only driver-liveness fd 3 whose sole
writer belongs to the outer driver; it inherits no fd 4. A probe receives fd 0
from `/dev/null`, runner-drained fd 1/2, and its
sole result writer at fd 3; the probe parent alone owns and relays the
grandchild's fd 3. The outer receives fd 0 from `/dev/null`, separate fd 1/2
pipes drained by the proof runner, lifecycle-record writer fd 3, and
proof-control reader fd 4 whose sole writer belongs to the proof runner. The
inner receives fd 0 from `/dev/null`, outer-drained fd 1/2, record writer fd 3,
and outer-control/liveness reader fd 4. The runtime receives fd 0 from
`/dev/null`, inherits only the inner fd 1/2 writers, and receives ready writer
fd 3 plus START/parent-liveness reader fd 4. Every other descriptor is
close-on-exec at each boundary.

The outer driver keeps the sole command-2 fd 3 writer open without writing a
byte until command 2 directly closes. EOF on that reader—whether from driver
death or an explicit driver failure transition—prevents every new scenario,
closes the proof runner's current outer-control writer exactly once, runs the
same reserved resource/absence cleanup, writes `driver_lost:true` and
`cleanup_proven` truthfully in durable evidence, and exits nonzero. Driver-loss
tests cover before probes, before ready, and after ready. Stdout/stderr reader
loss is never treated as liveness authority.

If command 2 exceeds its 600-second deadline, the driver closes that sole fd-3
writer exactly once and reserves fourteen seconds for the child to perform its
EOF cleanup, close, and deliver stdout/stderr EOF. If any direct-child close or
stream EOF is still missing, the driver does not signal, wait indefinitely,
read a summary, or enter cleanup preflight: it closes only its own pipe ends,
detaches and `unref()`s the unresolved child handle, emits one capped redacted
stderr failure record naming the exact unresolved handle/streams and retained
proof-parent path, and exits 124 before the 5,000-second aggregate deadline.
The run root and proof parent remain in place and no success stdout record is
emitted. A clock-injected fake command 2 that ignores liveness EOF is the
literal oracle for this signal-free bounded-detach path.

The stage publisher generates the bounded profile at
`stage/policy/candidate.sb`, before the stage becomes immutable, from the one
canonical run root and the inventory-bound runtime/system closure. It is a
regular 0400 inventory member no larger than 16 KiB and contains no secret.
Before each sandbox launch the proof runner opens it once with
`O_RDONLY|O_NOFOLLOW`, reads one bounded buffer from that descriptor, verifies
that same buffer against the stage inventory, and supplies the exact bytes as
the single `sandbox-exec -p` argument. No child reopens a profile pathname, so
rename, replacement, or in-place mutation after the descriptor read cannot
change the consumed policy; tests exercise all three races.

Outer, inner, and runtime each keep their own fd 3 record writer open for their
full lifetime, and no child or sibling inherits it: the proof runner owns the
outer reader, the outer owns the inner reader, and the inner owns the runtime
reader. Every lifecycle, ready, and probe message is exactly one LF-terminated
JSON record of at most 4,096 bytes including LF. A non-ready phase record is
due within 3,000 ms of its transition and ready is due within 15,000 ms of
START. Oversized, unterminated, multiple, or late records are exit 70 and enter
EOF cleanup. After bounded records are drained, nonblocking `EAGAIN` means the
writer is open; only EOF plus the creating parent's direct `ChildProcess` close
event proves that process instance exited.

After `driver_phase=proof`, no candidate or proof actor may signal a recorded, child, sibling, or other
non-self PID; execute `kill`, `pkill`, or `killall`; or call
`ChildProcess.kill`. Abrupt candidate faults are selected only through private
fixed-byte control pipes, and the sole signal exceptions are exactly two
phase-gated lexical calls to `process.kill(process.pid, "SIGKILL")`: inner ARM
after relaying `runtime_spawned` and before START, and outer
OUTER_SELF_KILL after relaying ready. An AST/source test over runtime, proof,
smoke, and probe sources requires exactly those calls and rejects every other
`.kill`, `process.kill`, numeric-PID signal path, or signal utility execution.
PID, `/bin/ps`, start strings, and relayed records are diagnostic only.

Proof-runner→outer accepts exactly: `0x01` RUN as the first byte, `0x02`
OUTER_SELF_KILL only after ready in a RUN lifecycle, or `0x03`
ARM_INNER_PRE_READY_FAULT as the first byte. Outer→inner accepts exactly `0x11`
RUN or `0x12` ARM_PRE_READY_FAULT as its first byte. Inner→runtime accepts
exactly `0x21` START; EOF before START exits without token/lease/main-DB/listener
mutation, while EOF after START begins shutdown. Every duplicate, unknown, or
out-of-phase byte is exit 70.

The outer waits at most 3,000 ms for its first proof-control byte before
spawning. RUN causes
the inner to spawn the runtime and send START. ARM causes the inner to spawn
the runtime but withhold START, emit `runtime_spawned`, then call
`process.kill(process.pid, "SIGKILL")`; because the caller is the live process
itself, PID reuse is impossible. OUTER_SELF_KILL likewise calls self-SIGKILL
only after ready. Proof-control EOF before the first byte exits 70 without an
inner/token/database/listener mutation. EOF after RUN makes the outer close its
sole inner-control writer and enter its bounded cleanup. Because the proof
runner may no longer exist to persist the outcome, the outer atomically writes,
fsyncs, renames, and directory-fsyncs a redacted
`work/evidence/outer-orphan.v1.json` before exiting; timeout records unresolved
resources and exits 124. Tests kill the runner before RUN, before ready, and
after ready and require these phase-safe results with no retry.

Exit 0 means completed success/no-op; 64 means
argument/config/path contract failure; 65 fixture identity/refusal; 66
stage/inventory/source mismatch; 69 Node/ABI/native-load failure; 70 malformed
ready/internal protocol; 75 immediate writer contention; 124 bounded shutdown
or cleanup timeout; all unexpected failures exit 1. Contract, stage, and Node
checks precede token, lease, main SQLite, or listener mutation as applicable.

Every command 1–9 process and fixed sysctl/observer child receives a positive
environment allowlist only:
`LC_ALL=C`, `LANG=C`, `TZ=UTC`, and `HOME`, `TMPDIR`,
`XDG_CACHE_HOME` rooted at the AC1 work members. PATH, `NODE_OPTIONS`,
`NODE_PATH`, npm/yarn/pnpm variables, proxies, `DYLD_*`, `ECHO_*`,
repository variables, credentials, and every unlisted inherited name are
absent. Tests poison each excluded variable and prove it neither changes
pre-entry execution nor survives in the candidate.

The staged smoke outer is the lifecycle owner, not a restart authority. The
proof runner owns the read end of outer fd 3 and the sole outer fd 4 writer,
and receives bounded
`inner_spawned`, `runtime_spawned`, `ready`, and `exited` records so it
can test outer death; it owns no inner→runtime control/liveness writer. The outer spawns
one inner: inner fd 3 is the write-only lifecycle-record pipe whose sole reader
is the outer, and inner fd 4 is the read-only outer-control/liveness pipe whose
sole writer is the outer. The outer continuously drains inherited stdout/stderr
and relays each lifecycle record to the proof runner before any readiness wait.

The inner alone spawns one non-detached runtime through exact command 9:
runtime fd 3 is the write-only ready pipe whose sole reader is the inner, and
runtime fd 4 is the read-only runtime-start/liveness pipe whose sole writer is the
inner. Runtime stdout/stderr inherit only the inner's corresponding pipe
writers while the outer holds the sole readers; all other descriptors at both
boundaries are close-on-exec. Inner and runtime keep those fd 1/2 writers open,
unrebound, unduplicated, and untransferred for their complete process lifetime;
no other process inherits them. Immediately after spawn, before waiting for
readiness, the inner sends one `runtime_spawned` record containing the PID from
its direct `ChildProcess` handle; the outer durably relays it to the proof
runner. The runtime may complete only contract/stage/Node checks before reading
fd 4; it opens no token, lease, main database, or listener and emits no ready
record until it reads exactly one START byte. EOF-before-START exits without
those mutations. After START, the runtime writes exactly one
`{pid,port,run_id,version}` ready record plus LF and keeps its fd 3 writer open
until process exit. The inner
requires the ready PID to equal the handle PID and relays it. Multiple,
malformed, stale, or mismatched records are exit 70 and instance-capability
cleanup. PID and run ID remain evidence and request-correlation fields, not
signal authority.

While the outer is alive, all inner/runtime output pipes are drained until EOF
regardless of volume into separate 1 MiB capped ring buffers; bytes beyond the
cap are discarded while draining continues, and evidence records
`truncated:true` without credentials. Before OUTER_SELF_KILL, the outer relays
the current capped rings and marks that the sole drain owner is about to die.
Its death closes the read ends, so inner/runtime install EPIPE-safe output
handlers and make no post-outer-death output-capture claim; closed readers
cannot block shutdown. Evidence records `drain_owner_lost:true` and
`post_owner_output_unavailable:true`, while the surviving proof runner proves
resource absence without treating missing post-death bytes as success or
failure.

Deadlines are monotonic, fixed, and strictly nested. Runtime shutdown gets four
seconds total: two seconds for graceful intake close, then socket destruction,
main-DB close, and lease close by second four. Inner cleanup gets seven seconds
from closing runtime fd 4; outer cleanup gets ten seconds from closing inner fd
4; and proof-runner cleanup plus authoritative absence probes gets fourteen
seconds from closing outer fd 4. Each HTTP exchange gets five seconds, each
fixed observer gets five seconds, seed gets 30 seconds, each complete
direct/grandchild probe command gets 30 seconds with a two-second operation
subdeadline, one lifecycle scenario gets 60 seconds, and the complete full
proof gets 600 seconds with the final fourteen seconds
reserved and nonborrowable; no new phase starts once it would consume that
reserve. Stage/seed completion, first control, `inner_spawned`,
`runtime_spawned`, ready, observer close, and every API phase have explicit
deadlines in the implementation constants and clock-injected tests. A silent
child, late record, hung finite observer, or missing EOF is exit 124; no parent
borrows its child's entire budget. There is no external candidate TERM/KILL
escalation. Timeout preserves the run root, names every unresolved direct
handle/resource, sets `cleanup_proven:false`, and never guesses at a PID or
claims absence.

Before every irreversible control byte the proof runner appends and fsyncs a
bounded redacted JSONL phase record under `work/evidence`. Every handled
success or failure appends `{phase,reason,deadline,unresolved_resources,
observer_state,cleanup_proven}`, closes its owned control writer exactly once,
runs the reserved cleanup, then writes the closed
`candidate-proof-evidence.v1` summary through temp-file fsync, atomic rename,
and evidence-directory fsync. The schema caps arrays/strings and excludes
credentials. No fresh outer starts until prior outer fd 3 EOF and its direct
child close event plus the authoritative absence sequence all succeed.

Command 2 owns candidate-resource cleanup and authoritative absence, but never
removes or renames `<run-root>` or `<proof-parent>` because its executable and
cwd remain inside that root. After the final absence sequence it fsyncs the
phase journal, atomically publishes the schema-valid final summary, closes
every owned descriptor, and exits. The reviewed outer driver waits for the
command-2 child close event and fd 1/2 EOF, then opens
`work/evidence/candidate-proof-evidence.v1.json` once with
`O_RDONLY|O_NOFOLLOW`, reads at most 1 MiB from that descriptor, validates the
schema, requires exit 0, `cleanup_proven:true`, and an empty
`unresolved_resources`, then rechecks descriptor identity/hash and retains the
exact summary SHA-256 and redacted bound fields for Project evidence. Only
then may that driver prove command 2 absent, stream the exact summary, and enter
the atomic cleanup-quarantine protocol. Missing, malformed, oversized, changed, unresolved, or
non-success evidence preserves the root. Durable means fsync-safe through
driver/coordinator consumption and Project evidence capture, not survival of successful
disposable-root cleanup.

Runtime shutdown tracks every accepted socket. On parent-fd EOF, SIGTERM, or
SIGINT it stops intake, calls server close, allows at most two seconds for
requests, destroys every remaining keep-alive/partial-body socket, then closes
main SQLite and the lease within its four-second total deadline. An
authenticated partial request cannot retain the process or lease.

Repo-free execution uses the source-quarantine transition above. Command 7 is
the sandbox boundary: outer, inner, and runtime inherit the same profile; seed
and both probe parents enter the same profile separately. It permits
read/execute only for the inventory-bound Node/system/stage closure, read/write
only under `work`, process-exec only of the pinned Node and inventory-bound
`/usr/sbin/sysctl`, and loopback
bind/accept. It denies outbound connect, DNS, and non-loopback; process-exec of
the package manager and every executable other than those two;
source/quarantine/sibling access; and writes outside `work`. The proof runner
remains outside the sandbox, owns every HTTP client and
fixed observer, and never executes quarantined bytes. Outer and inner execute
only the exact sysctl identity helper before their one Node child and no other
observer; runtime executes no descendant. Exact role/argv closure is a
source/observed-argv claim because the macOS profile constrains executable
paths, not Node script arguments. The profile likewise cannot constrain
sysctl argv, so source scans and observed argv—not the sandbox—own that exact
argument claim.

The direct and grandchild probes run the same non-caller-selectable roster:
read `source.quarantined/package.json`, read `outside-sentinel`, write beside
that sentinel only at exact absent `outside-write-probe`, send one fixed
12-byte DNS-shaped UDP datagram to `192.0.2.53:53`, connect to
`192.0.2.1:9`, connect to
127.0.0.1 ports 39478/38478/38479, execute the inventory-recorded authenticated
npm entry, and execute `/usr/bin/true`. Direct performs the operations itself. Parent may
spawn only exact command 6, whose grandchild performs them and returns one
bounded fd 3 result that parent relays. Every operation must fail with the
accepted sandbox-denial result; `ENOENT`, `ENOTFOUND`, or `ECONNREFUSED` is not
denial evidence. Filesystem/process probes require `EPERM`/`EACCES`; the UDP
and TCP socket operations likewise require an immediate `EPERM`/`EACCES`
callback before their deadline. Any success, ambiguous error, late/oversized result, extra
descendant, or altered argv fails the proof before seed.
Both the direct and inherited-grandchild probe records must be schema/argv/
deadline-valid before command 3 is first launched. Until both pass,
`context.sqlite`, its sidecars, `writer-lease.sqlite`, every seed phase record,
and every candidate listener remain absent; failure retains the root and proves
that complete no-seed/no-database/no-listener state before command 2 exits.

The only system observations are shell-free, fd-0-null children of the proof
runner. It takes `/bin/ps -ww -axo pid=,ppid=,command=` snapshots, a network
`/usr/sbin/lsof -nP -a -p <runtime-pid> -iTCP` snapshot at readiness, and two
finite `/usr/bin/nettop -L 1 -n -p <runtime-pid>` samples: immediately after
ready and after API traffic but before shutdown. Each finite observer must
close within five seconds. Each nettop stdout ring is 4 MiB and stderr 64 KiB;
each ps/lsof stdout ring is 1 MiB and stderr 64 KiB. Draining continues after a
cap, records total/retained bytes, truncation, and incremental SHA-256, then
fails because truncated evidence is insufficient. A hung observer is recorded
and fsynced as an unresolved exact PID/argv/handle, its pipes are closed and
handle explicitly unrefed without a signal, the proof exits 124, preserves the
root, and sets `cleanup_proven:false`; it is never silently treated as reaped.
Sandbox
denial is authoritative; these PID-selected snapshots are corroborating only
and may show only the selected loopback listener and proof-runner client flow.

After each lifecycle close, authoritative absence is checked in this order:
(1) outer fd 3 EOF plus its direct child close event; (2) the diagnostic ps
snapshot contains exactly one command-2 row for this run root whose PID equals
the live proof runner's `process.pid` and whose argv equals exact command 2,
while no command 3–9 row for this run root exists; the expected command-2 row
is excluded from the candidate-subtree absence predicate; (3) no-follow lstat
each of context DB, WAL, SHM, and lease against its expected identity/state.
For each existing regular path separately, run exact non-network-filtered
`/usr/sbin/lsof -nP -w -Fpcfn -- <one-existing-path>` and require exit 1 with
both stdout and stderr empty, followed by the same identity readback. Exit 0
with any `p` record, a missing/swapped input, nonempty stderr, combined-path
invocation, or any other result is observer failure. An expected-absent path is
never passed to lsof; it must be `ENOENT` both before and after the per-existing
checks. If START never occurred, every path must equal its scenario-start
state: absent stays absent, while a preexisting regular file retains identity
and byte hash. No absence probe may create a missing lease; if the lease file
preexisted, or after a ready lifecycle, the proof runner validates that path,
opens it through `better-sqlite3` with `timeout:0`, sets `busy_timeout=0`,
executes `BEGIN EXCLUSIVE; ROLLBACK`, and closes it. Finally
if a ready record existed it binds and closes a temporary proof-runner server
on that prior exact 127.0.0.1 port. A pre-START scenario has no port to rebind
and instead requires no listener record plus the process/FD baseline above.
Only the applicable complete sequence proves database-handle, lease, and
listener release.

Before the mutation baseline, the proof runner has verified immutable stage,
created and fsynced `work/config/candidate.json` and
`work/secrets/mcp-bearer-token`, created empty 0600
`work/evidence/candidate-proof-phases.v1.jsonl`, verified `setup-home` and the
original source path absent, and bound the quarantine and outside sentinel. At
that point `outside-write-probe` is absent and `work/state`, `work/logs`, `work/tmp`, `work/home`, and
`work/xdg-cache` are empty.

The complete post-baseline writable roster is closed: append-only
`work/evidence/candidate-proof-phases.v1.jsonl`, capped at 1 MiB;
`work/state/context.sqlite` and `work/state/writer-lease.sqlite`; transient
`work/state/context.sqlite-wal` and `work/state/context.sqlite-shm` only while
the main database is open and absent at every final checkpoint; fixed atomic
temp `work/evidence/.candidate-proof-evidence.v1.json.tmp`, followed only by
final `work/evidence/candidate-proof-evidence.v1.json`; and, only after proof
runner loss, fixed atomic temp `work/evidence/.outer-orphan.v1.json.tmp`,
followed only by `work/evidence/outer-orphan.v1.json`. Atomic temps are
current-user 0600 regular non-links created exclusively with no-follow
semantics and absent after handled publication; residue sets
`cleanup_proven:false` and preserves the root. `logs`, `tmp`, `home`, and
`xdg-cache` remain empty; stdout/stderr and observer bytes stay in bounded
memory rings and only redacted counts, hashes, and truncation state enter
evidence.

A successful full proof ends with exactly config, token, phase journal, final
summary, main database, and lease database—no WAL/SHM, orphan, temp, log,
cache, or extra member. Runner-loss evidence permits the orphan final instead
of a final summary according to its phase and is never cleanup-success
evidence. A no-follow snapshot binds every stage member, each pre-baseline work
member, original-source/setup-home absence, and quarantine/sentinel identities.
Completion requires unchanged stage/config/token/quarantine/sentinel bytes and
continued `outside-write-probe` absence plus the exact phase-conditioned roster
above; every extra member fails. Clone,
dependency, stage setup, source quarantine/final deletion, kernel socket state, and
OS observer metadata remain outside this bounded watched set. This is not a
host-global “only mutation” claim.

Normal stop closes the inner's runtime control/liveness writer and proves
absence. In the armed pre-ready fault, the inner self-SIGKILL closes that sole
writer and the runtime receives EOF before START. Inner and runtime fd 1/2 are
exact process-lifetime capabilities: neither process may close, duplicate,
rebind, or transfer them, and no other process inherits them; the outer retains
their sole readers until EOF. The outer first requires inner fd 3 EOF plus its
direct `ChildProcess` close event, then requires EOF on both shared stdout and
stderr readers. With the inner closed and no other inheritor, those EOFs prove
the exact spawned runtime relinquished its only outer-visible lifetime
capabilities. Only then may the outer relay `inner_fault_observed`. This is
descendant-close evidence, not process/resource absence; only the proof
runner's ordered ps/path-lsof/lease/listener sequence is authoritative and may
permit another exact command-7 outer. That fresh
outer creates a new inner, runtime, pipes, PID, and run ID, and
old control/ready records are rejected. There is no
launchd, supervisor, detached group, persistent lifecycle command, automatic
retry, shared ready path, or second restart authority.

Outer death is a second EOF chain, not a second owner: EOF on inner fd 4 makes
the inner immediately close the runtime-liveness writer and run the same
bounded child cleanup before exiting. Proof-runner tests wait for
the relayed lifecycle records, then (a) send OUTER_SELF_KILL after ready so the
outer self-SIGKILLs and prove candidate inner/runtime commands, listener,
database handles, and lease disappear; and (b) on a fresh outer send
ARM_INNER_PRE_READY_FAULT as its first byte, require relayed
`runtime_spawned` with no possible START/ready, observe the inner's self-SIGKILL
through record-pipe EOF/child close, and prove the same absence. The outer
relays `inner_fault_armed` before spawn and `inner_fault_observed` only after
inner record EOF plus its direct child close; that relay is not database,
lease, listener, or descendant-absence authority. The proof runner then executes
the exact ordered absence sequence above. If an inner dies before a spawn
record exists, runtime EOF-before-START, both shared output-capability EOFs,
and the same final absence sequence are required. Neither path retries or
restarts.

### AC5 — Independently review, land, and record the non-installable handoff

The builder runs the complete candidate proof from its exact target head and
hands off both repository heads without merging either. A different reviewer
reviews the exact target and Project_echo heads, all changed paths, full tests,
the stage inventory, and secret/real-path fences.

Every record-only `A_r`, `A_p`, `A_t`, `A_e`, and `A_c` is an immutable
single-use superset of both the delegated-authorization decision at
`raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`
landed as `02e4568ff10cade430bc1c39e0e78749ed5ee291` and the founder-locked
two-pass scope reset at
`raw/internal/decisions/2026-07-17-echo-context-137-two-pass-scope-reset.md`
landed as `de3c249f8a586b2723616f010d6aab2586629744`. Each binds item ID;
exact reviewed spec SHA and ready-content seal; then-current canonical Project
and target SHAs/trees; version; diagnostic stage/proof identities; exact
operation, mode, destination owner/repository/ref/IDs/paths, and authority
boundary; builder/reviewer identities, reviewed heads, verdict, and evidence;
an embedded canonical preflight and execution-plan identity/bytes/SHA-256 plus
their exact inputs and results; coordinator,
timestamp, approval ID, nonce, unused/consumed state, and fail-closed ambiguous
outcome policy. Each record embeds a canonical pre-authorization Git-backup
manifest and SHA-256 over the exact then-current Project and target
repository/ref/commit/tree tuples. For its later operation, it defines the
record's own containing Project commit `A_x` symbolically and uniquely by the
bound sole-parent/only-authorization-path recipe; `A_x` plus the unchanged
target tuple is the operation backup/rollback generation and is never
self-hashed inside its own bytes. After create-only publication/readback and
before the authorized operation, the coordinator freezes exact `A_x/A_x^{tree}`
in a separate bounded execution/restore transcript and proves it from a fresh
config-isolated fetch, `cat-file` commit/tree checks, detached tree
materialization, and `git fsck --full --strict`. The transcript must match the
symbolic recipe and is retained with the operation/readback evidence; mismatch
consumes the record without execution. Recovery enters at that exact `A_x`,
the target backup tuple, and the fixed read-only old/new-ref reconciliation
recipe followed by a fresh reviewed authorization. Retained Git objects are
evidence/backup generations, never authority for automatic reversal, which
remains forbidden. Because this item has no portable
artifact, release, tag, asset, installation, or migration, only those
artifact/manifest/release/install/migration typed fields are explicitly
`not-applicable` with that reason. Backup, restore proof, rollback generation,
preflight, plan, and recovery fields are never `not-applicable`. No
operation-specific paragraph below narrows this mandatory set.

Let `Q_r/Q_r^{tree}` be current canonical Project main. Freeze independent
implementation-review payload `V`: its exact path, bytes,
length, SHA-256, and Git blob bind unequal builder/reviewer identities, exact
`H/H^{tree}`, reviewed Project feature head `J/J^{tree}`, its reviewed linear
builder base `J0/J0^{tree}`, every changed path, full
tests, stage/proof-driver records, and the item-136 exhaustive advertised-ref
secret scan at `H`, plus a Project terminal-blob secret/path-policy scan over
the exact `J0..J` changed set and deterministic `Q_r` plus terminal-patch
candidate tree. Later record-only authorization paths are outside that builder
tree and each receive their own exact-path secret/policy scan in the record's
bound canonical preflight.
Before each local Project feature commit, the builder runs the bound staged-byte
secret/private-path policy scan and refuses the commit on any finding. Before
the first and only remote Project feature-ref publication, it freezes a complete
`J0..J` commit/tree/blob closure manifest—including every intermediate,
deleted, and transient blob—and runs the item-136-class digest-pinned exhaustive
scanner plus private-path policy over that entire closure. Only a zero-finding
result permits the exact feature ref to be pushed. `V` binds the manifest,
scanner path/version/hash/argv/result, feature-ref name, exact `J`, one-row
publication/readback, and the truth that no intermediate Project ref or tag was
published. The independent reviewer repeats that closure scan before approval;
missing, stale, or nonzero evidence blocks `A_r`. The safe feature ref remains
at exact `J` until a separately authorized cleanup; its presence/absence is
recorded truthfully and never treated as main authority.
Create record-only `A_r`, sole parent `Q_r`, adding only its authorization path
while `V` is absent; it binds the universal fields, exact `V` identities,
fixed metadata/message/timestamp, and deterministic one-child recipe. Publish
and read back `A_r` once under the create-only delegation. Then construct `R`,
sole parent `A_r`, with exactly `V` as its one changed path; validate its
blob/tree/message/metadata, no `gpgsig`, clean status, and full-strict fsck;
CAS `A_r→R` once through the literal Project vector below and read back exact
`R/tree/V`. This review publication carries no implementation bytes and cannot
authorize a target write.

Define `Q_t=R` only after that review-publication readback. Let
`Q_t/Q_t^{tree}` therefore be exact `R/R^{tree}`, `B/B^{tree}` canonical
target main, and `H/H^{tree}` the exact reviewed target head. Require `B` an
ancestor of `H`, both reviewed worktrees
clean, and authenticated reads fixed to owner `zhenye0616` / ID `73834646`;
target `zhenye0616/echo-context` / ID `1302541575` / node
`R_kgDOTaM1Bw` / private / default `main`; and Project `zhenye0616/ECHO` /
ID `1225417447` / node `R_kgDOSQpi5w` / public / default `main`. The
coordinator creates the target authorization as
record-only Project commit `A_t`: sole parent `Q_t`, only one new authorization
path, fixed coordinator metadata, and no implementation, proof, evidence, or
completion byte. A commit cannot name itself, so the record binds `Q_t`, both
reviewed heads/trees, `B/H`, repository and tool identities, literal fully
substituted argv, retry/adopt/rewrite/cleanup false, and defines `A_t` as its
containing commit. The standing sequential delegation directly authorizes only
this create-only record publication. A one-attempt Project CAS and authenticated
readback must prove main=`A_t`, sole parent `Q_t`, and exact record
path/blob/tree before any target write.

All repository writes use one authenticated absolute Git binary with its
path/hash/version bound; `GIT_CONFIG_NOSYSTEM=1`,
`GIT_CONFIG_GLOBAL=/dev/null`, `GIT_TERMINAL_PROMPT=0`; proxy/rewrite and all
other inherited Git variables absent; a fresh config-isolated clone; hooks
disabled; and Git spawned directly without caller shell/eval (the one fixed
`gh auth git-credential` helper string is separately bound). Immediately before the target write, Project main
must still equal `A_t` and target main `B/B^{tree}`. The sole target mutation is
one direct argv vector with literal 40-hex values:
`[<git-abs>,"-c","core.hooksPath=/dev/null","-c",
"http.followRedirects=false","-c","credential.helper=","-c",
"credential.helper=!/usr/local/bin/gh auth git-credential","push",
"--porcelain","--no-verify","--no-follow-tags",
"--force-with-lease=refs/heads/main:<B>",
"https://github.com/zhenye0616/echo-context.git",
"<H>:refs/heads/main"]`. Exactly one structurally parsed fast-forward row for
main must succeed. Authenticated API plus isolated fetch/readback then require
main=`H`, tree=`H^{tree}`, unchanged repository identity/visibility/default
branch, and no other ref change. Only that readback defines canonical target
`T=H`. A missing, extra, malformed, redirected, non-fast-forward, ambiguous,
or failed result consumes `A_t` and permits read-only reconciliation only—no
rebase, merge, autostash, amend, cherry-pick, retry, adoption, cleanup, or
replacement write without a new reviewed authorization.

Every Project authorization publication and child CAS in this item uses the
identical direct prefix; the applicable record binds exactly
`[<git-abs>,"-c","core.hooksPath=/dev/null",
"-c","http.followRedirects=false","-c","credential.helper=","-c",
"credential.helper=!/usr/local/bin/gh auth git-credential","push",
"--porcelain","--no-verify","--no-follow-tags",
"--force-with-lease=refs/heads/main:<OLD>",
"https://github.com/zhenye0616/ECHO.git","<NEW>:refs/heads/main"]`.
Because a record-only authorization cannot name itself or its recursively
derived child, its bytes bind the symbolic containing-parent/one-child recipe;
after those commits exist, the coordinator validates that recipe and replaces
`<OLD>/<NEW>` with literal full SHAs in the direct spawn vector and retained
operation evidence. No placeholder, shell expansion, remote name, ref
discovery, or implicit lease reaches Git.
Every attempt must yield exactly one structurally parsed fast-forward porcelain
row for `refs/heads/main` and exact authenticated readback of the expected
commit/tree/path set. A missing, extra, malformed, redirected, rejected,
non-fast-forward, ambiguous, or failed result consumes the applicable
authorization and permits read-only reconciliation only—no retry, adoption,
rewrite, cleanup mutation, or replacement push.

Only after target readback defines `T=H`, revalidate the Project feature record
against that exact landing. Require `J0=Q_r` exactly and the builder path
`J0..J` to be linear and merge-free. Revalidate without amendment the exact
name-status patch, binary patch bytes/SHA-256, changed-path list, per-path
terminal blobs/deletions, full commit/tree/blob closure manifest and exhaustive
zero-finding scan, terminal-blob/tree scan, and feature-ref `J` readback already
frozen in `V`;
those paths must be disjoint from `V`, `A_r`, `A_t`, and the next
authorization path. This exact-base equality forbids a stale builder blob from
overwriting any canonical `J0..Q_r` change; any inequality requires a fresh
builder/review rather than a three-way resolution. Create record-only `A_p`,
sole parent `A_t`, adding only its Project-feature-import authorization and
binding the universal fields plus `J0/J`, `T/tree`, the exact patch/blob set,
the Project full-closure and terminal-blob scans, exact feature-ref disposition,
and deterministic single-parent child recipe.
Publish/read back `A_p` once under the create-only delegation. Then construct
squash-import child `M`, sole parent `A_p`: relative to `A_p`, its tree applies exactly the reviewed
`J0..J` patch, every imported path has exactly the reviewed terminal
blob/deletion, and every other path equals `A_p`. No conflict resolution,
renormalization, rename inference, generated byte, or coordinator-authored
implementation is allowed; any non-clean exact application requires a fresh
builder/review/authorization. `J` remains evidence-only and is not a parent, so
none of its intermediate commits, trees, or deleted/transient blobs becomes
reachable from Project main. Validate the sole parent, tree, message/metadata, no
`gpgsig`, clean status, and full-strict fsck. Invoke the canonical literal
Project vector exactly with `OLD=A_p` and `NEW=M`; exactly one parsed
fast-forward `main` row plus authenticated readback is required, and every
ambiguous/failing result consumes `A_p` under the global no-retry rule. Readback
must prove exact `M/tree`, sole parent `A_p`, `V`, all authorization blobs, target
still `T/tree`, and every imported path. At `M`, exactly one 137a spec exists
across `backlog/{proposed,ready,claimed,pending_review,complete}/`, and it is
the reviewed copy under `pending_review/`.

After the post-landing proof, freeze and independently audit exact evidence
payload `E`: path, bytes, length, SHA-256, and Git blob. `E` binds `T/tree`,
`A_t/A_p/M`, review identities, and embeds the exact schema-valid stdout-record-1
proof-summary preimage plus its length/SHA-256 and exact stdout-record-2 driver
result plus its length/SHA-256. It also binds direct driver close/stdout EOF,
toolchain/results, cleanup booleans, and the false authority flags below, but
never its own Project publication SHA. Let `Q_e` be
exact current Project main and require `Q_e=M`; any intervening Project
movement requires fresh reconciliation/review rather than incorporation. Create
record-only authorization `A_e`, sole parent
`Q_e`, adding only its new authorization path while `E` remains absent. It
binds `Q_e/tree`, every `E` identity, one UTC timestamp, fixed metadata/message,
the deterministic containing-parent/one-child recipe, and the canonical
Project-CAS template whose old/new literals are validated only after both
commits exist. Publish/read back
`A_e` once under the direct create-only delegation. Only then construct child
`P`, sole parent `A_e`, with exactly `E` as its one changed path. Require exact
blob/hash/length/tree/message/metadata, no `gpgsig`, clean status, and
`git fsck --full --strict`; push `A_e→P` once with the same direct isolated
argv and canonical `https://github.com/zhenye0616/ECHO.git`, exact lease, and
one parsed fast-forward row. Readback must prove exact `P/tree/E` while target
remains `T/tree`.

Completion is a separate two-commit authorization pair. Freeze and
independently audit payload bytes rooted at exact `P`; they move only this item
from pending review to complete, finalize its pointer/run log/index, preserve
`V/A_r/R/A_t/A_p/M/A_e/E`, and set `target_landed_sha:T` plus the deliberately
non-self-referential `project_landed_sha:P`. Create record-only `A_c`, sole
parent `P`, adding only its authorization path and binding exact path sets,
bytes/hashes/blobs, binary-patch SHA-256, fixed metadata/message/timestamp, and
deterministic child recipe. Publish/read back `A_c` once, then construct child
`C`, sole parent `A_c`, containing only that exact completion payload. Validate
its diff, blobs/tree/message/metadata, absence of `gpgsig`, clean status,
full-strict fsck, and exactly one 137a spec across
`backlog/{proposed,ready,claimed,pending_review,complete}/`, under `complete/`;
CAS `A_c→C` once and read back exact `C/tree` with `E` and all authorization
blobs unchanged and target still `T/tree`. `C` is recorded only after readback
and is never named inside itself. No `A_r/R/A_t/A_p/M/A_e/P/A_c/C` push may be
combined, retried, rebased, or performed through mutable `origin` or
`push-with-retry`.

After target readback, the coordinator creates the fixed proof-parent topology,
fresh-clones canonical target main at `source`, and invokes the canonical
candidate-stage wrapper once with its exact common prefix and candidate-stage
arguments. The wrapper execs the reviewed long-lived driver; that driver alone
produces dependencies, runs command 1, removes `setup-home`, quarantines source,
directly owns command 2, captures its evidence, and performs successful cleanup.
The coordinator never invokes either `.mjs` entrypoint or item 136's source mode
at the candidate head. The staged
runner executes:

1. run and accept the exact direct and inherited-grandchild denial probes,
   proving seed/main DB/lease/listener absence after each and launching no seed
   command until both pass;
2. seed `synthetic-v1`;
3. start on the kernel-selected port;
4. authenticate and list exactly eight tools;
5. retrieve the synthetic event;
6. prove auth negatives and capture-disabled with zero application body consumption;
7. stop, prove complete absence, launch a fresh exact command-7 outer lifecycle,
   and prove state persists;
8. exercise both AC4 EOF chains without retry
   or restart:
   a. after initial RUN and relayed `ready`, send OUTER_SELF_KILL, observe the
      outer's self-SIGKILL through record-pipe EOF/child close, and prove the
      candidate inner/runtime command instances, listener, main-database
      handles, and writer lease disappear within AC4's bound;
   b. only after complete absence, launch a fresh exact command-7 outer and
      send ARM_INNER_PRE_READY_FAULT as its first control byte, then require
      relayed `runtime_spawned` with no START/ready, observe the inner's
      self-SIGKILL, require the surviving outer's `inner_fault_observed`, and
      prove inner/runtime command, listener,
      main-database-handle, and writer-lease absence within the same bound;
9. prove the exact post-baseline watched-set and proof-owned write boundary;
10. validate the already-gating sandbox records and process-scoped socket
    evidence, including no
   candidate bind/connect involving 39478, 38478, or 38479;
11. fsync the final summary and exit without deleting the run root; after
    command 2's direct close and stdio EOF, the outer driver descriptor-verifies
    and captures that summary, proves command 2 absent, removes only the
    identity-bound run/quarantine/setup parent on a successful closed result,
    and emits the driver-result carrier after the already-streamed exact summary.
    The coordinator accepts only those two bound records plus direct driver
    close/stdout EOF.

The Project_echo evidence binds canonical target SHA/tree, candidate version,
lock hash, diagnostic stage hash, Node/npm/ABI/translation identity, tests,
roster, the exact proof-summary and driver-result preimages/lengths/hashes,
direct driver close/stdout EOF, command-2 and cleanup-quarantine absence, both
post-landing liveness-case absence/no-retry results,
capture/authority values,
and states exactly:
`installable:false`, `installed:false`, `launchd_exercised:false`,
`portable_dependency_closure:false`, `runtime_authority:false`, and
`state_authority:false`. Completion advances neither Team-product maturity
nor context authority.

## Out of Scope (Don't Drift)

- Application Support, LaunchAgents, Library Logs, home dot-directories, or any
  other persistent user path.
- `com.echo.context`, port 39478, launchctl, plists, KeepAlive, status,
  doctor, install/start/stop/restart/uninstall CLI, lifecycle locks, receipts,
  intents, or recovery FSMs.
- Bundled Node, SBOM, portable/native dependency-closure hardening,
  deterministic release assets, bootstrap, descriptor-protected execution,
  install authorization, tags, releases, uploads, or hosted CI.
- Authority records/activation, live state, online capture, capture workers,
  client rewiring, Project_echo credentials, cutover, rollback, or recutover.
- Wiki changes, product surfaces, or product-maturity claims.

## Risks

- Package/tool/config changes can leave committed source provenance stale.
  The extended checker binds every new executable input, v2 is regenerated,
  and verification runs at the reviewed head while v1 remains immutable.
- `SqliteStorage` can create WAL/SHM files that a falsely closed topology would
  reject or ignore. Exactly those two transient members are derived,
  identity-tracked, and proved absent after close; the lease stays DELETE mode.
- A staged dependency can silently escape to the source tree through a
  symlink, ignored-file injection, pre-entry Node option, cwd, source map, or
  package fallback. The candidate-stage orchestrator, removed setup home,
  hidden-lock/extraneous scan, explicit post-npm reauthentication boundary,
  descriptor/hash copy, two-file stage inventory, positive environment,
  absent source path, and inherited sandbox fail closed.
- A checked profile pathname can change before `sandbox-exec -f` reopens it.
  The immutable staged profile is read once from one descriptor and those exact
  inventory-verified bytes are passed through `-p`; no policy path is reopened.
- Authorization can occur after body parsing if the existing server seam is
  placed too deep. Raw-header and withheld/infinite-body tests prove immediate
  rejection with no application consumer or storage work.
- Fixture hashing followed by path reopen recreates the R8 TOCTOU. The
  same-descriptor bounded buffer is the only parse/insert input.
- A liveness descriptor inherited by the observer or helper can prevent EOF.
  The explicit FD map, close-on-exec inventory, one lifetime record writer per
  outer/inner/runtime process, sole parent-liveness writers, and private
  self-fault tests prove
  closure without signaling an unknown PID.
- The proof runner can disappear while its outer still owns a live subtree.
  Phase-defined proof-control EOF, nested budgets, outer-orphan fsynced evidence,
  and runner-loss tests before RUN/before ready/after ready make this fail closed.
- The long-lived driver can disappear or cleanup can fail after deletion begins.
  Driver-liveness fd EOF forces command-2 cleanup; exact summary bytes stream
  before the atomic cleanup commit; and postcommit failure reports the remaining
  cleanup-quarantine without claiming restoration or successful evidence.
- A PID/start-time string can alias a reused process. It is never authority:
  no actor signals a recorded PID or calls `ChildProcess.kill`; only the live
  process may self-SIGKILL after a phase-checked private control byte.
- A genuinely wedged child may not honor EOF. The proof exits 124, preserves
  the disposable root, and reports unresolved resources instead of sending an
  unsafe external signal or claiming cleanup.
- Network-only lsof output cannot prove SQLite handles or lease release. The
  ordered path-lsof, zero-timeout exclusive-lease reacquisition, and exact-port
  rebind sequence owns the absence claim after direct-child EOF/close.
- Rosetta can add hidden bootstrap access. Translation mode and runtime files
  are bound and rechecked, while the evidence explicitly disclaims
  service-level restriction inside allowed `sysctl-read`/`mach-lookup` classes.
- A partial request or full output pipe can deadlock shutdown. Socket
  destruction deadlines, strictly nested parent budgets, live-outer capped
  drains, and finite capped observer samples bound normal/inner-fault paths;
  outer death closes readers and EPIPE-safe writers cannot block.
- A diagnostic stage can be mistaken for an installable artifact. Schema,
  docs, evidence, filenames, and absence of install/bootstrap surfaces all
  state and enforce the negative capability.
- The local target checkout is stale. Only authenticated canonical remote
  readback of the exact item-136 SHA/tree permits the builder to branch.
- Either remote main can advance after review. Exact expected-old/new refs,
  one explicit-lease compare-and-swap attempt, and canonical SHA/tree readback
  consume the authorization on any movement; no rebase or push retry is allowed.

## Tests

- `tests/runtime/config.test.ts` proves the closed constants, root
  topology, derived member paths, immutable-stage/writable-work ownership and
  modes, the caller-created empty work skeleton, exact WAL/SHM transient
  sidecars with DELETE-mode lease isolation, symlink/traversal/default
  rejection, canonical config-schema validation at proof-runner production and
  seed/serve descriptor-buffer consumption, poisoned-environment rejection,
  cleanup identity refusal, and zero prevalidation mutation.
- `tests/runtime/auth.test.ts` proves disk/wire grammar, decoded
  constant-time comparison, the exact raw Host grammar, duplicate-header
  handling, no application body consumer/storage work, withheld and unbounded
  raw-body immediate rejection, the 16 KiB/2 KiB/1 KiB caps and 1,000/2,000 ms
  flush/close bounds, capture-off ordering, and secret non-disclosure.
- `tests/runtime/composition.test.ts` proves one storage instance, exact
  eight-tool and six-route `/v1/*` rosters with the five committed read-route
  semantics plus capture-disabled exception, exact zero-timeout SQLite lease
  pragmas/BEGIN ordering, immediate
  typed loser exit with no delayed resume, crash release, forbidden-import
  closure, tracked-socket graceful/forced shutdown, and partial-body deadline.
- `tests/runtime/seed-fixture.test.ts` proves ID-only lookup,
  same-descriptor read/hash/parse, transaction ordering, exact replay,
  mismatch/multiplicity refusal, all four path races, and unchanged DB on
  failure.
- `tests/candidate/stage.test.ts` proves the emitted-JS-only inventory,
  exact candidate-stage wrapper/orchestrator and serialized child plan,
  four clean/HEAD boundaries, producer-only process-group settlement followed
  by irreversible signal-free proof phase, setup-home removal, hidden-lock equality,
  extraneous-file refusal, explicit
  post-npm descriptor/identity/hash reauthentication, clean-head/tree binding,
  inventory-plus-digest non-self-reference, exact
  member/mode/hash verification immediately before spawn, atomic publication,
  regular copied dependency closure, excluded source/dev/repo/install members,
  dirty/mismatched source and wrong Node/npm path/hash/version, Node ABI, native-load
  refusal, architecture/translation-mode recheck plus bound Rosetta runtime
  closure, explicit non-installable identity, and the distinct regenerated
  source `runtime-inventory.v2.json` binding of all six candidate tools,
  all five new schemas, the fixture, `tsconfig.runtime.json`, package
  JSON/scripts, and lock hash while v1 remains
  byte-identical. It validates the constructed and descriptor-read stage
  inventory against `candidate-stage-inventory.v1` before member enumeration
  and rejects digest-valid/schema-invalid inventories. It also swaps,
  replaces, and rewrites the profile after its
  descriptor read and proves `sandbox-exec -p` consumes only the verified
  inventory-bound buffer.
- `tests/candidate/lifecycle.test.ts` proves ready/liveness FD ownership,
  outer/inner/runtime inheritance map, the outer-to-inner and
  inner-to-runtime EOF chain, one non-inherited lifetime record writer per
  process, ready-schema validation before runtime emission and at each
  acceptance/relay boundary, fd 1/2 as non-closeable/non-rebindable lifetime capabilities with no
  other inheritor, armed-inner relay only after direct inner close plus both
  shared-output EOFs, drained-pipe `EAGAIN`/EOF proof, 4,096-byte record caps/deadlines,
  the closed three-pipe byte protocol, exactly two self-PID SIGKILL lexical
  sites, and absence of every other PID signal/`ChildProcess.kill` path. It
  also proves START-before-mutation, deterministic ARM-before-spawn with START
  withheld, `runtime_spawned` relay before the inner self-SIGKILL, stale-run
  rejection, restart identity, normal shutdown, outer self-SIGKILL after
  ready, no unknown-PID signal, active keep-alive/partial-body forced close,
  continuously drained over-cap output while outer lives, pre-self-kill ring
  relay plus `drain_owner_lost`/post-death-unavailable evidence, EPIPE-safe
  child shutdown, runner loss before RUN/before ready/after ready, fsynced
  outer-orphan and proof summaries, driver-liveness EOF before probes/before
  ready/after ready with outer-control closure and no retry, a fake command 2
  that ignores liveness EOF and proves capped failure reporting, signal-free
  pipe/handle detach, exit 124, and root retention, every pre-ready failure cleanup path,
  the 4/7/10/14/60/600-second nested budgets with silent/hung children and
  reserved cleanup, early loader failure capture, and no retry.
- `tests/candidate/repo-free.test.ts` poisons every excluded environment
  variable, proves absolute shell-free Node execution and source absence, then
  validates the fixed direct/grandchild deny roster and denial-error grammar,
  outer-inherited descendant profile, process tree, bounded watched-set writes,
  two finite capped `nettop` samples plus network/path lsof evidence, ordered
  direct-close/ps/per-existing-path lsof with empty stdout/stderr and identity
  reread/lease-reacquire/port-rebind absence, translated-Node
  bootstrap with its explicit `sysctl-read`/`mach-lookup` disclaimer, zero
  runtime descendant exec, and denied outbound/DNS/non-loopback/
  package-manager/sentinel-port operations.
- `tests/candidate/smoke.test.ts` proves the complete seed/start/auth/
  eight-tool/retrieval/capture-off/restart/inner-kill/outer-observe/cleanup
  slice, the exact nine shell-free command forms and role discriminators, cwd,
  positive environment, flags, FD maps, observed argv, strict direct-then-
  grandchild probe acceptance before the first seed command with DB/lease/
  listener absence on either failure, rejection of every
  extra mode, proof-parent source quarantine, durable evidence, observer and
  stdout/stderr caps, post-baseline write set, the exact two-record driver
  stdout grammar and schema/hash binding, direct close/EOF gate, pre-cleanup
  summary custody, 0500-directory descriptor `fchmod`, atomic cleanup-quarantine
  commit, success absence, precommit preservation, and postcommit partial-failure reporting, and
  exact authenticated six-route `/v1/*` roster and fixed-port sentinels. Its
  `--mode full` path executes both AC5 8(a) and 8(b),
  proves bounded absence, and proves no later `inner_spawned` or
  `runtime_spawned` retry record appears.
- `tests/security/candidate-scope.test.ts` rejects runtime literals/imports
  for launchd, fixed ports, real paths, install/bootstrap/status/doctor/
  authority and Project-specific coordination code.
- Existing source-artifact verification, source inventory, roster/service
  parity, typecheck, lint, full CI, secret scan, and `git diff --check` remain
  green.

## After Completion (Strategist Notes)

- Do not update the wiki; this is internal candidate evidence, not a shipped
  commercial surface or maturity transition.
- Refine 137b against the exact completed target SHA/tree, stage inventory,
  lifecycle behavior, dependency observations, and limitations. Do not copy
  predictions from the cancelled parent.
- Keep Project_echo authoritative and 137b/138 blocked until their independent
  specs converge and their own single-use operation authorizations exist.
