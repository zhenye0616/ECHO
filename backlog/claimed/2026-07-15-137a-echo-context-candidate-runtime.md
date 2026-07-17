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
ready_content_sha: 6373024e742cdf5dd03546baa2f7ddd77c00d936b31797fb4610091ee7cba9e5
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/package.json # candidate scripts and 0.1.0-dev.137a.1 identity
  - /Users/zhenye/Desktop/echo-context/package-lock.json # synchronized root identity; no unlocked dependency
  - /Users/zhenye/Desktop/echo-context/tsconfig.runtime.json # NEW emitted runtime-only import closure
  - /Users/zhenye/Desktop/echo-context/README.md # candidate-only operator contract and explicit non-installable posture
  - /Users/zhenye/Desktop/echo-context/CHANGELOG.md # candidate milestone
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-runtime-config.v1.schema.json # NEW closed disposable-root config
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-ready.v1.schema.json # NEW private ready-FD record
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-stage-inventory.v1.schema.json # NEW generated-stage inventory schema
  - /Users/zhenye/Desktop/echo-context/src/runtime/** # NEW candidate config/auth/composition/fixture/serve entrypoints
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # authorization and capture-off transport seams only
  - /Users/zhenye/Desktop/echo-context/fixtures/synthetic-v1.json # NEW bounded source-bound synthetic fixture
  - /Users/zhenye/Desktop/echo-context/tools/stage-candidate-runtime.mjs # NEW runtime-only staging and inventory
  - /Users/zhenye/Desktop/echo-context/tools/candidate-smoke.mjs # NEW repo-free parent-owned lifecycle proof
  - /Users/zhenye/Desktop/echo-context/tests/runtime/** # NEW config/auth/composition/fixture/lease tests
  - /Users/zhenye/Desktop/echo-context/tests/candidate/** # NEW stage/lifecycle/repo-free/smoke tests
  - /Users/zhenye/Desktop/echo-context/tests/security/candidate-scope.test.ts # NEW real-path/install/coordination closure fence
  - raw/internal/migrations/2026-07-15-137a-echo-context-candidate-runtime-*-delegated-approval.md # coordinator-only target-main authorization
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
claimed_by: "codex-137a-builder-20260717-a"
claimed_at: "2026-07-17T21:54:15Z"
branch: "agent/echo-context-candidate-runtime"
worktree: "/private/tmp/echo-137a-builder-project-worktree"
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

Add candidate version `0.1.0-dev.137a.1` and exactly one caller-created
current-user 0700 absolute non-link `<run-root>`. Its closed topology is:
`<run-root>/stage` for immutable executed bytes,
`<run-root>/work/config/candidate.json`,
`work/secrets/mcp-bearer-token`, `work/state/context.sqlite`,
`work/state/writer-lease.sqlite`, `work/logs/`, `work/tmp/`,
`work/home/`, `work/xdg-cache/`, and `work/evidence/`. No second stage
or state root exists. The stage publisher alone may create a private sibling
`<run-root>/.stage.<nonce>` and must atomically rename it to `stage` only
after complete verification. Final stage directories/executables are 0500 and
data files are 0400; `work` directories are 0700 and files are 0600.
Cleanup removes this one root only after process/listener/lease absence, and
refuses any member whose current identity differs from the recorded topology.

The config lives only at the path above, names `run_root`, and contains no
independently supplied child paths. The resolver derives every member from the
validated root. The only network values are `host:"127.0.0.1"` and
`port:0`; the only authority values are `authority:false`,
`accept_capture:false`, and `capture_workers:[]`. Unknown keys, root/sudo,
inherited configuration, environment or home-directory defaults, symlinked
components, traversal, foreign ownership, wrong modes/types, fixed ports,
labels, GUI domains, plist paths, and real-user roots fail before the lease,
main SQLite, or listener is opened.

The production composition owns exactly one `SqliteStorage` and the existing
generic service semantics. It imports no capture pipeline, Project_echo
onboarding/default paths, task-state Git implementation, coordination code,
installer, launchd adapter, status/doctor surface, or authority controller.
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

The harness creates 32 random bytes and writes their canonical 43-character
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
authenticated. `/live` is unauthenticated and fixed. Authenticated
`/ready` reports candidate version, PID/start identity, run ID, exact roster,
storage ready, `capture:false`, and `authority:false`. Authenticated
`POST /v1/capture` returns typed `403 capture_disabled` without attaching
or invoking any application body consumer. Rejections send
`Connection: close` within the bounded header-response deadline even when a
raw client withholds the declared body or streams without end; an
application-consumption counter remains zero. Credential bytes never enter
Git, argv, environment, stdout/stderr,
logs, JSON evidence, inventory, process-title state, or errors.

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

`tools/stage-candidate-runtime.mjs` runs only from an exact clean target
checkout: `HEAD` must be a full commit, `git status --porcelain` must be
empty, and the derived tree must match `HEAD^{tree}`. It publishes directly
through AC1's temporary-to-final rename and never tracks a head-bound inventory
in source. The final stage contains emitted runtime JavaScript, required
schemas and SQLite migrations, the synthetic fixture, package metadata, and
regular non-symlink production dependency files copied from the exact
lockfile-matching prepared workspace.

Inside the stage, canonical `candidate-runtime.v1.json` lists and hashes every
other member except itself and `candidate-runtime.v1.sha256`, and binds the
source SHA/tree, version, package-lock hash, resolved Node executable
path/hash, Node/npm versions, ABI, member paths/modes/hashes,
`installable:false`, and every negative authority flag from AC5. The adjacent
digest file contains exactly the inventory SHA-256 plus LF. Verification first
checks that digest, then requires the complete directory member set to equal
the inventory plus those two metadata files. It repeats no-follow type,
ownership, mode, size, and hash verification immediately before every
execution. This is a diagnostic inventory, not a release manifest,
authorization carrier, or portable dependency proof.

The stage excludes `.git`, TypeScript source, tests, dev tools, caches,
credentials, writable state, absolute-path source maps, Project_echo, sibling
repositories, install/lifecycle/status/doctor/authority code, and symlink or
hardlink members. The caller resolves `process.execPath` to one absolute
regular executable before staging, hashes it, and rechecks that same path,
hash, `v22.22.1`, ABI, and native-addon load immediately before each
shell-free spawn. No PATH lookup, shell, alternate interpreter, bundled or
downloaded Node, package install, network acquisition, `NODE_OPTIONS`,
`NODE_PATH`, or repository fallback is permitted.

The entire executable surface and arguments are closed:

1. stage — `<node-abs> <source>/tools/stage-candidate-runtime.mjs --run-root
   <run-root>`;
2. seed — `/usr/bin/sandbox-exec -f
   <run-root>/work/evidence/candidate.sb <node-abs>
   <run-root>/stage/bin/candidate-runtime.mjs seed --run-root <run-root>
   --fixture-id synthetic-v1`;
3. smoke outer controller — `<node-abs>
   <run-root>/stage/bin/candidate-smoke.mjs --run-root <run-root> --mode
   full --observer-fd 3`;
4. the outer alone spawns its inner lifecycle owner — `<node-abs>
   <run-root>/stage/bin/candidate-smoke.mjs --inner-owner --run-root
   <run-root> --control-fd 3 --outer-liveness-fd 4`; and
5. the inner alone spawns the runtime — `/usr/bin/sandbox-exec -f
   <run-root>/work/evidence/candidate.sb <node-abs>
   <run-root>/stage/bin/candidate-runtime.mjs serve --run-root <run-root>
   --ready-fd 3 --parent-fd 4`.

No other flag, positional argument, environment override, or executable
entrypoint or private role discriminator is accepted. All five launches are
shell-free with cwd exactly `<run-root>/work`, umask 077, the positive
environment below, and only these FD maps: stage and seed receive fd 0 from
`/dev/null` and separate fd 1/2 pipes continuously drained by the proof
runner; the outer receives the same fd 0/1/2 map plus record-writer fd 3; the
inner receives fd 0 from `/dev/null`, separate fd 1/2 writers drained by the
outer, control-writer fd 3, and outer-liveness-reader fd 4; the runtime
receives fd 0 from `/dev/null`, inherits only those inner fd 1/2 writers, and
receives ready-writer fd 3 plus runtime-liveness-reader fd 4. Every other
descriptor is close-on-exec at each boundary. The generated sandbox profile
is written and fsynced 0600 under the named evidence path, its hash is bound
before seed/serve, and `sandbox-exec` itself receives no other option.
Exit 0 means completed success/no-op; 64 means
argument/config/path contract failure; 65 fixture identity/refusal; 66
stage/inventory/source mismatch; 69 Node/ABI/native-load failure; 70 malformed
ready/internal protocol; 75 immediate writer contention; 124 bounded shutdown
or cleanup timeout; all unexpected failures exit 1. Contract, stage, and Node
checks precede token, lease, main SQLite, or listener mutation as applicable.

Every spawned process receives a positive environment allowlist only:
`LC_ALL=C`, `LANG=C`, `TZ=UTC`, and `HOME`, `TMPDIR`,
`XDG_CACHE_HOME` rooted at the AC1 work members. PATH, `NODE_OPTIONS`,
`NODE_PATH`, npm/yarn/pnpm variables, proxies, `DYLD_*`, `ECHO_*`,
repository variables, credentials, and every unlisted inherited name are
absent. Tests poison each excluded variable and prove it neither changes
pre-entry execution nor survives in the candidate.

The staged smoke outer is the lifecycle observer, not a restart authority. A
third proof runner owns the read end of outer fd 3 and receives bounded
`inner_spawned`, `runtime_spawned`, `ready`, and `exited` records so it
can test outer death; it never owns either liveness writer. The outer spawns
one inner: inner fd 3 is the write-only control pipe whose sole reader is the
outer, and inner fd 4 is the read-only outer-liveness pipe whose sole writer is
the outer. The outer continuously drains inherited stdout/stderr and relays
each identity record to the third runner before any readiness wait.

The inner alone spawns one non-detached runtime through exact command 5:
runtime fd 3 is the write-only ready pipe whose sole reader is the inner, and
runtime fd 4 is the read-only runtime-liveness pipe whose sole writer is the
inner. Runtime stdout/stderr inherit only the inner's corresponding pipe
writers while the outer holds the sole readers; all other descriptors at both
boundaries are close-on-exec. Immediately after spawn, before waiting for
readiness, the inner captures PID plus Darwin start identity twice consistently
through `/bin/ps -p <pid> -o lstart=` under `LC_ALL=C` and sends one
`runtime_spawned` record; the outer durably relays it to the third runner.
The inner then validates exactly one
`{pid,start_time,port,run_id,version}` ready record plus LF, requires its PID
and start identity to match the spawned record, and relays it. Multiple,
malformed, stale, or mismatched records are exit 70 and identity-bound cleanup.

Both runtime output pipes are drained until EOF regardless of volume into
separate 1 MiB capped ring buffers; bytes beyond the cap are discarded while
draining continues, and evidence records `truncated:true` without including
credentials. Every pre-ready timeout, malformed/multiple record, failed
assertion, signal, and normal exit runs exact-identity cleanup: close the
liveness writer, wait two seconds, TERM the still-matching PID, wait one
second, KILL the still-matching PID, then prove process/start identity,
listener, main-database handles, and lease absence within five total seconds.
The redacted evidence records which escalation occurred and whether every
absence check passed.

Runtime shutdown tracks every accepted socket. On parent-fd EOF, SIGTERM, or
SIGINT it stops intake, calls server close, allows at most two seconds for
requests, destroys every remaining keep-alive/partial-body socket, then closes
main SQLite and the lease and exits within the five-second total deadline. An
authenticated partial request cannot retain the process or lease.

Repo-free execution uses a fresh verification clone whose source path is made
absent after staging. The inner/runtime process boundary is
`/usr/bin/sandbox-exec`; continuous process-scoped socket observation uses
`/usr/bin/nettop`, and identity/descriptor snapshots use `/bin/ps` and
`/usr/sbin/lsof`. Absence of any absolute tool or failure of a same-profile
direct and grandchild deny-probe blocks the proof with no fallback. A
generated, evidence-hashed profile permits read/execute only for the recorded
Node/system runtime/stage closure, read/write only under `work`, loopback
bind/accept only, and denies outbound network,
DNS, non-loopback, package-manager execution, and source/sibling access for the
candidate and descendants. The observer remains outside the sandbox so it can
connect only to the ready-record port. From the spawned identity it starts and
continuously drains `/usr/bin/nettop -L 0 -n -p <runtime-pid>`, and it
captures `/usr/sbin/lsof -nP -a -p <runtime-pid> -i` at readiness and
shutdown. Same-profile probes must fail source/sibling reads, outside-work
writes, DNS, non-loopback, package-manager execution, unexpected descendant
exec, and connects to 39478, 38478, and 38479. The runtime evidence may contain
only its selected 127.0.0.1 listener and outer-observer client flow. The
sandbox denial is authoritative; continuously drained nettop/lsof records the
allowed process-scoped flow without attributing unrelated host traffic.

Normal stop closes the inner's liveness writer and proves absence. The orphan
case has the outer SIGKILL only the identity-matched inner; kernel closure of
the sole writer triggers runtime EOF, while the surviving outer performs the
bounded absence checks and cleanup evidence. Only the third proof runner may
start another exact command-3 outer after complete prior absence; that fresh
outer creates a new inner, runtime, pipes, PID/start identity, and run ID, and
old control/ready records are rejected. There is no
launchd, supervisor, detached group, persistent lifecycle command, automatic
retry, shared ready path, or second restart authority.

Outer death is a second EOF chain, not a second owner: EOF on inner fd 4 makes
the inner immediately close the runtime-liveness writer and run the same
bounded exact-identity cleanup before exiting. Third-runner tests wait for the
relayed identities, then (a) SIGKILL the outer after ready and prove inner,
runtime, listener, database handles, and lease disappear, and (b) SIGKILL the
inner after `runtime_spawned` but before ready and prove the outer observes
the same absence. If an inner dies before a spawn record exists, runtime
liveness EOF plus descendant/lease/listener absence is required and no unknown
PID is signaled. Neither path retries or restarts.

### AC5 — Independently review, land, and record the non-installable handoff

The builder runs the complete candidate proof from its exact target head and
hands off both repository heads without merging either. A different reviewer
reviews the exact target and Project_echo heads, all changed paths, full tests,
the stage inventory, and secret/real-path fences.

After approval, the coordinator publishes and reads back a fresh single-use
target-main authorization bound to the exact reviewed spec/ready seal,
Project_echo and target heads/trees, version, plan, reviewer verdict, and
fail-closed recovery; artifact/install/backup fields may be explicitly
not-applicable because no installation or portable artifact exists. The
coordinator then lands the target head, reads back canonical target main, and
from a fresh detached clone reruns source verification and the full candidate
smoke:

1. seed `synthetic-v1`;
2. start on the kernel-selected port;
3. authenticate and list exactly eight tools;
4. retrieve the synthetic event;
5. prove auth negatives and capture-disabled with zero application body consumption;
6. stop, prove complete absence, have the third proof runner launch a fresh
   exact command-3 outer lifecycle, and prove state persists;
7. through the third proof runner, exercise both AC4 EOF chains without retry
   or restart:
   a. after relayed `ready`, SIGKILL the outer and prove the inner and runtime
      identities, listener, main-database handles, and writer lease disappear
      within AC4's bound;
   b. only after complete absence, launch a fresh exact command-3 outer, wait
      for relayed `runtime_spawned` and no relayed `ready`, SIGKILL that inner,
      and prove the surviving outer observes the inner/runtime identities,
      listener, main-database handles, and writer lease disappear within the
      same bound;
8. prove the one disposable run root is the only mutated path;
9. validate the sandbox and process-scoped socket evidence, including no
   candidate bind/connect involving 39478, 38478, or 38479;
10. remove that run root only after every identity and absence check.

The Project_echo evidence binds canonical target SHA/tree, candidate version,
lock hash, diagnostic stage hash, Node/npm/ABI identity, tests, roster, both
post-landing liveness-case absence/no-retry results, capture/authority values,
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

- A staged dependency can silently escape to the source tree through a
  symlink, pre-entry Node option, cwd, source map, or package fallback. Clean
  source binding, two-file stage inventory, absolute Node identity, positive
  environment allowlist, absent source path, and the sandbox fail closed.
- Authorization can occur after body parsing if the existing server seam is
  placed too deep. Raw-header and withheld/infinite-body tests prove immediate
  rejection with no application consumer or storage work.
- Fixture hashing followed by path reopen recreates the R8 TOCTOU. The
  same-descriptor bounded buffer is the only parse/insert input.
- A liveness descriptor inherited by the observer or helper can prevent EOF.
  The explicit two-level FD map, close-on-exec inventory, sole outer-to-inner
  and inner-to-runtime writers, pre-ready identity relay, and third-runner
  outer/inner SIGKILL tests prove closure without signaling an unknown PID.
- A partial request or full output pipe can deadlock shutdown. Socket
  destruction deadlines and always-draining capped rings bound both paths.
- A diagnostic stage can be mistaken for an installable artifact. Schema,
  docs, evidence, filenames, and absence of install/bootstrap surfaces all
  state and enforce the negative capability.
- The local target checkout is stale. Only authenticated canonical remote
  readback of the exact item-136 SHA/tree permits the builder to branch.

## Tests

- `tests/runtime/config.test.ts` proves the closed constants, root
  topology, derived member paths, immutable-stage/writable-work ownership and
  modes, symlink/traversal/default rejection, poisoned-environment rejection,
  cleanup identity refusal, and zero prevalidation mutation.
- `tests/runtime/auth.test.ts` proves disk/wire grammar, decoded
  constant-time comparison, the exact raw Host grammar, duplicate-header
  handling, no application body consumer/storage work, withheld and unbounded
  raw-body immediate rejection, capture-off ordering, and secret
  non-disclosure.
- `tests/runtime/composition.test.ts` proves one storage instance, exact
  roster, exact zero-timeout SQLite lease pragmas/BEGIN ordering, immediate
  typed loser exit with no delayed resume, crash release, forbidden-import
  closure, tracked-socket graceful/forced shutdown, and partial-body deadline.
- `tests/runtime/seed-fixture.test.ts` proves ID-only lookup,
  same-descriptor read/hash/parse, transaction ordering, exact replay,
  mismatch/multiplicity refusal, all four path races, and unchanged DB on
  failure.
- `tests/candidate/stage.test.ts` proves the emitted-JS-only inventory,
  clean-head/tree binding, inventory-plus-digest non-self-reference, exact
  member/mode/hash verification immediately before spawn, atomic publication,
  regular copied dependency closure, excluded source/dev/repo/install members,
  dirty/mismatched source and wrong Node-path/hash/version/ABI/native-load
  refusal, and explicit non-installable identity.
- `tests/candidate/lifecycle.test.ts` proves ready/liveness FD ownership,
  outer/inner/runtime inheritance map, the outer-to-inner and
  inner-to-runtime EOF chain, `runtime_spawned` identity relay before ready,
  authoritative start identity, stale-run rejection, restart identity, normal
  shutdown, third-runner outer-SIGKILL after ready, inner-SIGKILL before
  ready, no unknown-PID signal before the spawn record, active
  keep-alive/partial-body forced close, continuously drained over-cap output
  with truncation evidence, every pre-ready failure cleanup/escalation path,
  early loader failure capture, and no retry.
- `tests/candidate/repo-free.test.ts` poisons every excluded environment
  variable, proves absolute shell-free Node execution and source absence, then
  validates the `sandbox-exec` direct/grandchild deny probes, descendant
  profile, process tree, allowed filesystem writes, continuously drained
  `nettop` plus lsof evidence, selected listener/client flow, and denied
  outbound/DNS/non-loopback/package-manager/sentinel-port operations.
- `tests/candidate/smoke.test.ts` proves the complete seed/start/auth/
  eight-tool/retrieval/capture-off/restart/inner-kill/outer-observe/cleanup
  slice, the exact five shell-free commands and role discriminators, cwd,
  positive environment, flags, FD maps, observed argv, rejection of every
  extra mode, exit map/stdout-stderr caps, one-root mutation set, and
  fixed-port sentinels. Its `--mode full` path executes both AC5 7(a) and 7(b),
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
