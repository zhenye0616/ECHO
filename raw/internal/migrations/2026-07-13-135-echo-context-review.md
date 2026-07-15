# Independent R5 remediation review — echo-context (item 2026-07-13-135)

**Verdict: APPROVE — merge as-is.** The R5 remediation closes both findings in
the prior immutable rejection: the exact byte-bound ESLint configuration is now
relocatable and resolves only from the reviewer's private clone, and the target
README names the independently reproduced AC3 aggregate. The target, full proof
matrix, native lifecycle, and real service-child ceremony all pass from a fresh
config-isolated clone.

This approval proves only a local standalone split at **DEV**. It grants no
installation, publication, release, maturity advance, or authority transfer:
`authority:false`, `installed:false`, and Project_echo remains authoritative.

## Reviewer identity and independence

- Judgment and mechanical execution: `codex-ops`, fresh independent session
  `/root/fresh_review_135_r2`. The remediation builder was the distinct session
  `/root/remediate_135_r2` / persona `codex-builder-135`.
- No task-state pointer was read or written. No ECHO MCP call was made. No live
  database, daemon, MCP endpoint, user configuration, installation, wiki,
  sibling target, or item 133/134 state was read or changed. No credential
  value was inspected or copied; opaque existing GitHub authentication was used
  only for the exact-leased review-ref publication.
- The shared target, main checkout, and builder worktree were read-only. All
  installs, native builds, test state, scratch configs, and service processes
  lived under `/private/tmp/echo-review-135-r6.g4Bu94/` in a fresh private clone.
- The only Project_echo content write is this review record in a fresh detached
  worktree at the immutable builder head. Publication is a one-path child with
  the builder head as sole parent and an exact expected-old lease.

## Immutable bindings

- Item: `2026-07-13-135-local-echo-context-source-extraction`
- Reviewed main intake HEAD: `5b122b0c82053e4814508ed1fa7abdbcfe97a384`
- Pending-review item blob / SHA-256:
  `de481acca10903ff9599e155c174a8c83c6ea076` /
  `5712ed5ff726a594df87295dda44420775938db2569ee16eb4548b6b19fc1bca`
- Rejection sidecar blob / SHA-256:
  `a9e8bab89d53e56bca2040fa19029919e06c6b52` /
  `067747cc2da122d9808a9aa43544ccf5830fdf22be35392c9fac8505983a3cc3`
- Reviewed proposal promotion/spec commit:
  `294a05093ccfc760ea49f25091ddefd72139953f`
- `ready_content_sha`:
  `aa9fa9d89c30b2ba2823d6b3eecdc32e389120bb9f3bc46538b9335a301c8392`
- Pinned source commit: `2971310441b69735cbe759293abd8c4d044bf347`
- Immutable R5 builder head / parent / tree:
  `2956e1391b8b8708fbbd4c47fd9d12a1d7a28635` /
  `ebad1fc944103b00fb8064b8bf545cf715ecf721` /
  `50d50157f6b0e6227561c471df1e364b6afbde9b`
- Builder delta: exactly
  `raw/internal/migrations/2026-07-13-135-echo-context.md`
- Migration-record blob / SHA-256:
  `c5083bff4fbb15903022af66d3d080076a20b9b9` /
  `eed83d4ad6d6706a3b2b1a454716f4344016481ba6108257b9f46f9055b0cc28`
- Accepted target HEAD / tree / parent:
  `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` /
  `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05` /
  `c3882ec057d1f19dd729977730a87ac6e76e5714`
- Target delta: exactly `README.md`, one stale-to-current aggregate substitution.
- Target sole branch: `migration/2026-07-13-135`; target remote: none.
- Review endpoint / full ref:
  `https://github.com/zhenye0616/ECHO.git` /
  `refs/heads/agent/135-echo-context`
- Expected-old remote OID before publication:
  `2956e1391b8b8708fbbd4c47fd9d12a1d7a28635`

## Independent acceptance results

| Contract | Result | Independent observation |
|---|---|---|
| Ground truth and lineage | **PASS** | Literal-endpoint feature ref, builder head, parent, tree, migration-only delta, target HEAD/tree, and target README-only delta all matched before work. The builder is a sole-parent child of the prior immutable rejection record. |
| AC1 repository invariants | **PASS** | The reviewer correctly did not rerun builder-only absence/mkdir/init. Shared target has one branch, no remote/tag/reflog/alternate/promisor/replace/shallow/graft state, no symlink/gitlink, clean status, and clean fsck. |
| AC2 runtime closure | **PASS** | Direct checker reproduced `6 entrypoints, 92 module-visits, 236 edges, 3 script CLIs`; all six committed AC2 tests passed. |
| AC3 raw-source parity | **PASS** | Raw pinned source and target real stdio peers reproduced all ten ordered envelopes at aggregate `6569b0472372ad666404aa22bcf5b1e0e0c716b573dec35c4b9212864420bba2`; all seven AC3 tests passed. README now names this exact aggregate. |
| AC4 isolated state | **PASS** | Tests and direct service used scratch homes only; `ECHO_CONTEXT_HOME` / `~/.echo-context` behavior passed and no live state was accessed. |
| AC5 Granola boundary | **PASS for local DEV** | The generic duplicate remains hash-bound as `duplicated`; product-owned post-meeting behavior remains excluded. |
| AC6 source closure | **PASS** | Inventory reproduced 217 paths (110 source, 107 test), SHA-256 `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`; partition `144/7/1/65`; direct audit and parity CLIs plus all fourteen tests passed. |
| AC7 private-clone lifecycle | **PASS** | Fresh no-local/no-hardlinks detached clone, offline script-disabled install, isolated native rebuild, network denial, exact config replay, full suite, object closure, cleanup, and fsck all passed. The previous non-relocatable lint failure is closed. |
| AC8 service and handoff | **PASS** | Nine committed integration tests and an independent direct six-request child ceremony passed. This review child is the required independent handoff record. |

## R5 rejection closure

### R5-F1 — exact relocatable lint proof: closed

- Exact scratch tsconfig: 472 bytes, SHA-256
  `7164ed9356aa3bd1d9108283eee164053bc6f251418d0aa1dc4d4b02726bf78f`.
- Exact scratch ESLint flat config: 449 bytes, SHA-256
  `45231febc2b3edcb250844f00741590b55c52bc994e3c3ac680a7285d9b90827`.
- The config uses bare ESM imports. Placed at the private-clone root, Node
  resolved them to:
  - `/private/tmp/echo-review-135-r6.g4Bu94/clone/node_modules/@typescript-eslint/parser/dist/index.js`
  - `/private/tmp/echo-review-135-r6.g4Bu94/clone/node_modules/@typescript-eslint/eslint-plugin/dist/index.js`
- Exact-config TypeScript produced zero errors. Exact-config ESLint produced
  zero findings. `/Users/zhenye/Desktop/echo-context/node_modules` was absent
  before and after the checks. No shared-target dependency path was read.

### R5-F2 — README AC3 aggregate: closed

Target commit `0cf7b006…` changes only `README.md`, replacing stale
`2f0b28f6…` with independently reproduced `6569b047…`. The accepted README blob
is `4c8ebfd3d6fdba768735f8fdc002593ac204308f`, SHA-256
`9fea2b1886cca66fcfbc8dcf241a287075b6bee68328af16300eeee196df138f`.
Both source and target aggregate fields in committed parity evidence equal the
README value.

## Offline native lifecycle

- Script-disabled cache fill was separate from acceptance install: target 291
  packages and pinned-source 299 packages.
- Under `/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)'`,
  `npm ci --offline --ignore-scripts --no-audit --no-fund` exited 0 and left the
  native artifact absent.
- Before CI, after CI, and after rebuild, loopback accepted outside the profile
  and failed `EPERM` inside it; DNS and HTTPS failed `ENOTFOUND`; direct-IP TCP
  failed `EPERM`.
- The sole permitted rebuild,
  `npm rebuild better-sqlite3 --offline --foreground-scripts --build-from-source`,
  used `npm_config_nodedir=/usr/local/Cellar/node@22/22.22.1_1` and exited 0.
- `better_sqlite3.node`: 1,985,384 bytes, x86_64 Mach-O bundle, SHA-256
  `289ac2671fc501b275af7ce170ea2ef84e07be7e2a4a403aaa055cef02018557`;
  an in-memory SQLite smoke passed under network denial.

## Test and direct-tool results

- Focused remediation battery: **4 files / 36 passed** — AC2 6, AC3 7, AC6
  14, AC8 9.
- Full config-isolated suite: **72/72 files passed; 987 passed, 17 intentionally
  skipped, 0 failed (1,004 total)**.
- Exact-config typecheck: 0 errors. Exact-config lint: 0 findings.
- Six of six `tools/*.mjs` passed `node --check`; target and feature
  `diff-tree --check` passed.
- Direct runtime inventory: `6 entrypoints, 92 module-visits, 236 edges,
  3 script CLIs`.
- Direct operator audit: 217 paths, split 110/107, inventory SHA-256
  `8b028066…`, partition `144/7/1/65`.
- Direct parity: 217 source-evidence rows; `ported=144`, `rewritten=7`,
  `duplicated=1`, `excluded=65`.
- All **33/33** target-file SHA-256 rows parsed from the migration record match
  the accepted target bytes; both scratch-config hashes also match.

## Direct AC8 child ceremony

The reviewer launched the adjudicated real child using `node --import tsx` as a
detached process-group leader on a fresh synthetic home.

- FD3 emitted exactly one canonical 46-byte JSON-LF readiness record with keys
  `host,port,pid`, host `127.0.0.1`, valid ephemeral port, and `pid == child.pid`.
- Ping, capture, search, atoms, clusters, and wait returned **6/6 HTTP 200**;
  search and atoms returned the synthetic capture, and wait timed out exactly.
- Child stdout/stderr were zero bytes.
- SIGTERM exited `0` with no signal within five seconds; a negative group probe
  returned `ESRCH` afterward. No descendant survived.

## Repository, object, and filesystem closure

Shared target and cleaned private clone both reproduced:

- HEAD/tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` /
  `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- All objects / sole-branch reachable objects: `510 / 510`.
- Sorted object-list SHA-256:
  `d92d3f614807907ac694e7c163dbba190c2f1fbef8198ab32c5b1f23abc6c1ee`.
- Tracked paths / no-follow filesystem files: `190 / 190`.
- Sorted path-list SHA-256:
  `cb0516ae7a7b638925fee349464d74cccf5ab1c1ca3c03bc97701d72896ea64b`.
- Zero status bytes, clean full fsck, zero symlinks/gitlinks, no remote,
  no private-clone alternate/promisor/replace state, and no `node_modules` or
  scratch-config residue. The shared feature worktree remained clean at the
  immutable builder head.

## Design judgments and deferred risks

- **Stand:** the bare-import scratch lint config is the minimal relocatable
  repair. It preserves the exact recommended rule set and proves dependency
  resolution from the current clone without expanding the sealed tracked set.
- **Stand:** correcting README in one ordinary descendant commit preserves all
  previously reviewed target behavior and creates an auditable one-line delta.
- **Stand:** the founder-adjudicated `tsx` service child, raw-source registrar,
  timeout mapping, and `ECHO_CONTEXT_HOME` rewrite remain mechanically bound and
  green.
- **Deferred, non-blocking for local DEV:** residual onboarding/task-state,
  coordination/product vocabulary and Project_echo default-path semantics must
  be removed or explicitly adjudicated before qualification. Loopback exposure
  and authentication policy also remain later product/release work.

## Merge-conflict preview and fixups

- Legacy `git merge-tree` against reviewed main intake `5b122b0c…` produced no
  conflict markers. The feature contribution is confined to the migration
  record and this review record.
- Preserve current-main backlog, run-log, generated-index, journal, task-state,
  and sidecar state during the no-ff merge; apparent two-dot reversions from
  older feature ancestry are not merge inputs.
- **Pre-merge fixups: none. Merge as-is.**

## Authority and next gate

`authority:false`. `installed:false`. Maturity remains **DEV**.

The exact target and immutable handoff are independently approved for repository
merge only. Founder merge/main-push checkpoints remain required, and neither
checkpoint authorizes install, release, authority transfer, or graduation.
