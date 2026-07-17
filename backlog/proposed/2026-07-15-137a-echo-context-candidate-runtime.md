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
  - /Users/zhenye/Desktop/echo-context/README.md # candidate-only operator contract and explicit non-installable posture
  - /Users/zhenye/Desktop/echo-context/CHANGELOG.md # candidate milestone
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-runtime-config.v1.schema.json # NEW closed disposable-root config
  - /Users/zhenye/Desktop/echo-context/schemas/candidate-ready.v1.schema.json # NEW private ready-FD record
  - /Users/zhenye/Desktop/echo-context/src/runtime/** # NEW candidate config/auth/composition/fixture/serve entrypoints
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # authorization and capture-off transport seams only
  - /Users/zhenye/Desktop/echo-context/fixtures/synthetic-v1.json # NEW bounded source-bound synthetic fixture
  - /Users/zhenye/Desktop/echo-context/provenance/candidate-runtime.v1.json # NEW diagnostic, explicitly non-installable stage identity
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

Add candidate version `0.1.0-dev.137a.1` and one closed runtime config. It
requires a caller-created absolute disposable root that is a current-user 0700
non-link directory. Every runtime, state, database, lease, token, fixture,
temporary, and log path resolves beneath that root. The only network values
are `host:"127.0.0.1"` and `port:0`; the only authority values are
`authority:false`, `accept_capture:false`, and `capture_workers:[]`.
Unknown keys, root/sudo, inherited `ECHO_*` configuration, environment or
home-directory defaults, symlinked path components, traversal, foreign
ownership, wrong modes/types, fixed ports, labels, GUI domains, plist paths,
and real-user roots fail before SQLite or listener access.

The production composition owns exactly one `SqliteStorage` and the existing
generic service semantics. It imports no capture pipeline, Project_echo
onboarding/default paths, task-state Git implementation, coordination code,
installer, launchd adapter, status/doctor surface, or authority controller.
A dedicated SQLite lease database is opened first and held in an exclusive
transaction for process lifetime; a concurrent loser exits before opening the
main database or binding a socket. Crash/SIGKILL releases the lease.

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
checks before any request body is read.

Every `/mcp`, `/mcp/recent-calls`, `/ready`, and `/v1/*` data route is
authenticated. `/live` is unauthenticated and fixed. Authenticated
`/ready` reports candidate version, PID/start identity, run ID, exact roster,
storage ready, `capture:false`, and `authority:false`. Authenticated
`POST /v1/capture` returns typed `403 capture_disabled` before consuming
the body. Credential bytes never enter Git, argv, environment, stdout/stderr,
logs, JSON evidence, inventory, process-title state, or errors.

### AC3 — Seed one synthetic fixture from one verified descriptor buffer

The stopped-candidate seed entrypoint accepts only an absolute
`--candidate-root` and `--fixture-id synthetic-v1`; callers cannot supply a
fixture path or digest. A source-bound catalog maps that ID to the staged
member and SHA-256. The seed path acquires the same exclusive writer lease
before main-database access.

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

`tools/stage-candidate-runtime.mjs` emits an explicitly non-installable
directory containing emitted runtime JavaScript, required schemas and SQLite
migrations, the synthetic fixture, package metadata, and regular non-symlink
production dependency files copied from the exact lockfile-matching prepared
workspace. Its diagnostic inventory binds target SHA/tree, version, lock hash,
Node/npm versions, Node ABI, member paths/modes/hashes, and
`installable:false`. It is not a release manifest, authorization carrier, or
portable dependency proof.

The stage excludes `.git`, TypeScript source, tests, dev tools, caches,
credentials, state, source maps with absolute paths, Project_echo, sibling
repositories, install/lifecycle/status/doctor/authority code, and symlink
members. Execution uses exactly host Node `v22.22.1` with the reviewed ABI;
the smoke rejects another version/ABI or an unloadable native addon. It does
not bundle or download Node, install packages, acquire the network, consult
`NODE_PATH`, or fall back to any repository at runtime.

The smoke copies the stage into a separately created 0700 disposable root and
runs it with source checkout absent from cwd, argv, module resolution, config,
and state, and with repository, package-manager, credential, `NODE_PATH`,
and `ECHO_*` environment removed. It spawns one non-detached child with a
private ready FD and a separate parent-liveness FD, bounded captured
stdout/stderr, and no retry loop. The ready FD emits exactly one schema-valid
`{pid,start_time,port,run_id,version}` record plus LF only after storage and
loopback bind. Parent-FD EOF, SIGTERM, or SIGINT initiates bounded shutdown of
HTTP, SQLite, and lease.

Normal stop closes the liveness writer and proves the child, listener, main
database handles, and lease are gone. Killing the harness with SIGKILL must
close the inherited writer and cause the same absence within the deadline.
Restart creates a new child, ready pipe, liveness pipe, PID/start identity, and
run ID; stale ready records are rejected. There is no launchd, supervisor,
detached process group, persistent lifecycle command, shared ready path, or
second restart authority.

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
5. prove auth negatives and capture-disabled-before-body;
6. stop/restart and prove state persists;
7. kill the harness and prove orphan cleanup;
8. prove the disposable stage/state roots are the only mutated paths;
9. prove no connection or mutation involving ports 39478, 38478, or 38479;
10. remove disposable roots only after all absence checks.

The Project_echo evidence binds canonical target SHA/tree, candidate version,
lock hash, diagnostic stage hash, Node/npm/ABI identity, tests, roster,
capture/authority values, and states exactly:
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
  symlink, `NODE_PATH`, cwd, source map, or package fallback. The stage
  inventory and repo-free syscall/path assertions fail closed on any escape.
- Authorization can occur after body parsing if the existing server seam is
  placed too deep. Raw-header and slow/infinite-body tests prove rejection
  before consumption.
- Fixture hashing followed by path reopen recreates the R8 TOCTOU. The
  same-descriptor bounded buffer is the only parse/insert input.
- A liveness descriptor inherited by the child or helper can prevent EOF.
  Descriptor-inventory and harness-SIGKILL tests prove the runtime is the sole
  reader and the harness the sole writer.
- A diagnostic stage can be mistaken for an installable artifact. Schema,
  docs, evidence, filenames, and absence of install/bootstrap surfaces all
  state and enforce the negative capability.
- The local target checkout is stale. Only authenticated canonical remote
  readback of the exact item-136 SHA/tree permits the builder to branch.

## Tests

- `tests/runtime/config.test.ts` proves the closed constants, root
  containment, ownership/mode/type rules, symlink/traversal/default rejection,
  poisoned-environment rejection, and zero prevalidation mutation.
- `tests/runtime/auth.test.ts` proves disk/wire grammar, decoded
  constant-time comparison, raw duplicate-header handling, Host defense,
  rejection before body read, capture-off ordering, and secret non-disclosure.
- `tests/runtime/composition.test.ts` proves one storage instance, exact
  roster, exclusive SQLite lease, concurrent-loser ordering, crash release,
  forbidden-import closure, and bounded shutdown.
- `tests/runtime/seed-fixture.test.ts` proves ID-only lookup,
  same-descriptor read/hash/parse, transaction ordering, exact replay,
  mismatch/multiplicity refusal, all four path races, and unchanged DB on
  failure.
- `tests/candidate/stage.test.ts` proves the emitted-JS-only inventory,
  regular copied dependency closure, excluded source/dev/repo/install members,
  wrong Node/ABI/native-load refusal, and explicit non-installable identity.
- `tests/candidate/lifecycle.test.ts` proves ready/liveness FD ownership,
  stale-run rejection, restart identity, normal shutdown, harness-SIGKILL
  orphan cleanup, early loader failure capture, and no retry.
- `tests/candidate/repo-free.test.ts` proves scrubbed environment/cwd/argv/
  module paths and no repository or network access during execution.
- `tests/candidate/smoke.test.ts` proves the complete seed/start/auth/
  eight-tool/retrieval/capture-off/restart/kill/cleanup slice and fixed-port
  sentinels.
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
