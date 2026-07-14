# Independent AC8 remediation review — echo-context (item 2026-07-13-135)

**Verdict: REJECT.** The remediated target behavior and the AC2/AC3/AC6/AC8
proof batteries pass, but the accepted reviewer contract is not reproducible
from an independent private clone. The byte-bound ESLint configuration embedded
in the migration record imports both TypeScript ESLint modules from the clean,
read-only shared target's absent `node_modules/`. Exact-config lint therefore
exits 2 unless a reviewer performs the forbidden mutation of the accepted
target. A relocatable equivalent config linted the same source with zero
findings, so this is a proof/independence defect rather than a code lint defect.

Passing evidence below still proves only a local DEV split. It grants no
installation, publication, authority transfer, release, or maturity advance:
`authority:false`, `installed:false`, maturity remains **DEV**, and
Project_echo remains authoritative.

## Reviewer identity and independence

- Judgment and mechanical execution: `codex-ops`, in a fresh independent
  reviewer session. The remediation builder was `codex-builder-135`; this
  reviewer did not build the target or its migration record.
- No task-state pointer was read or written. No ECHO MCP call was made. No live
  database, credential, daemon, MCP endpoint, user config, Keychain, install,
  authority, maturity, wiki, sibling repository, or item 133/134 state was read
  or changed.
- The shared target, main checkout, and builder worktree were strictly
  read-only. All dependency installation, native build, synthetic state,
  mutation fixtures, and service processes lived under the reviewer's private
  scratch and config-isolated private clone.
- The only Project_echo write is this review record in a fresh detached
  reviewer worktree at the immutable builder head. Publication is an explicit
  one-path child pushed with an exact expected-old lease.

## Immutable bindings

- Item: `2026-07-13-135-local-echo-context-source-extraction`
- Reviewed main intake HEAD: `e113592c199058f32621c06551bcaab18227d603`
- Pending-review item blob / SHA-256:
  `0a286ed27154fba6c096427a3a45f633825ffd0e` /
  `9a3c8b73a953e4a62ab697e6e4e1aa2328a82e98237ddc85bfc2d0e134abeaf3`
- Redo sidecar blob / SHA-256:
  `db72ed751de91f503218da212e5761091910a922` /
  `cadd2b88357ec0a7c584123f048f89a9da162c3e6bdb04b5963378f2d746dba1`
- Reviewed proposal promotion/spec commit:
  `294a05093ccfc760ea49f25091ddefd72139953f`
- `ready_content_sha`:
  `aa9fa9d89c30b2ba2823d6b3eecdc32e389120bb9f3bc46538b9335a301c8392`
- Pinned source commit: `2971310441b69735cbe759293abd8c4d044bf347`
- Immutable remediation builder head:
  `caf4bdde2dc852357410264f00d5ccef20708a11`
- Builder parent / tree:
  `7b58ebf04068b13e24b1c0187eaacb3bce4b6226` /
  `9f587f620788d6a52241d8aa54ad2de604f1af47`
- Builder delta: exactly
  `raw/internal/migrations/2026-07-13-135-echo-context.md`
- Migration-record blob / SHA-256:
  `2ebdb48977df70b25c0ceb09adb0bf74d2f85e0a` /
  `81f8ad89ba42f04d03ba517a31046cddee23b4874505a2944692d24719bb9359`
- Accepted target: `/Users/zhenye/Desktop/echo-context`
- Target HEAD / tree:
  `c3882ec057d1f19dd729977730a87ac6e76e5714` /
  `14ccf48df9155462efbbf798662cce7fd0f68b53`
- Target parent: `022864ce33a77e5a0f7fb5f1930b59c498acec46`
- Target sole branch: `migration/2026-07-13-135`
- Target remote: none
- Review endpoint / full ref:
  `https://github.com/zhenye0616/ECHO.git` /
  `refs/heads/agent/135-echo-context`
- Expected-old remote OID before publication:
  `caf4bdde2dc852357410264f00d5ccef20708a11`

## Independent verification results

| Contract | Result | Independent observation |
|---|---|---|
| Ground truth and feature lineage | **PASS** | Main, builder, target, target tree, and literal-endpoint feature ref matched their expected OIDs before work. Builder is a sole-parent child of the historical review child and changes only the refreshed migration record. |
| AC1 accepted-repository invariants | **PASS** | Reviewer correctly did not rerun builder-only absence/mkdir/init. Shared target has one branch, no remote/tag/reflog/alternate/promisor/replace/shallow/graft state, clean status and fsck, and no symlink or gitlink. Raw-object audit uses pinned Git 2.37.3 with isolated config. |
| AC2 recursive runtime closure | **PASS** | Direct final-object checker: `6 entrypoints, 92 module-visits, 236 edges, 3 script CLIs`. Six committed tests passed, including omission of every edge class, unknown/omitted entrypoints, computed and aliased reads/imports/launches, textual spoofing, tsx traversal, and missing transitive integrity. |
| AC3 raw-pinned stdio parity | **PASS** | Source install/rebuild and both real stdio peers ran from scratch. Source roster 15 with 7 classified ignores projected to target roster 8; 10 ordered full JSON-RPC envelopes matched at aggregate `6569b0472372ad666404aa22bcf5b1e0e0c716b573dec35c4b9212864420bba2`. Source and target clock hashes both reproduced `26610e85f551bfb275ce8133384a2ec5de4ef44f481eca3ed7b9a47dfe53c29d`. All 7 AC3 tests and protocol/evidence/fixture mutations passed. |
| AC4 isolated state | **PASS** | Synthetic tests and direct service state used scratch homes only. `ECHO_CONTEXT_HOME` / `~/.echo-context` behavior passed; no live state was accessed. |
| AC5 Granola overlap | **PASS for local DEV** | The deliberate generic duplicate remains distinct and is bound as `duplicated`; product-owned post-meeting behavior remains excluded. |
| AC6 source closure and dispositions | **PASS** | Canonical inventory reproduced 217 paths (110 source, 107 tests), SHA-256 `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`; partition `144/7/1/65`. Both real CLIs passed. All same-path source OIDs/hashes, ready seal, policy digest, seven replay patches, eight target OIDs, exclusions, and negative mutation fixtures passed. |
| AC7 private clone and native lifecycle | **REJECT** | Clone, offline install, network denial, native artifact, typecheck, full tests, and closure all passed. The exact embedded ESLint config is not independently runnable from the clone; details in RR4-F1 below. |
| AC8 service behavior | **PASS** | Nine integration tests passed: strict request/response schemas, body/result/ID/deadline bounds, cancellation, poisoned-env/non-loopback rejection, readiness-failure cleanup, forced teardown rejection, and graceful process-group cleanup. Direct child ceremony also passed. Overall handoff remains rejected because AC7/AC8 requires a reproducible independent reviewer record. |

## Repository, object, and filesystem closure

Shared target and private clone reproduced the same values before verification:

- HEAD/tree:
  `c3882ec057d1f19dd729977730a87ac6e76e5714` /
  `14ccf48df9155462efbbf798662cce7fd0f68b53`
- all objects / sole-branch reachable objects: `507 / 507`
- both sorted object-list SHA-256 values:
  `6c9bf63de3f88386a392d5b30f2935133837bdf61db8c85e430f823d36c4a165`
- tracked paths / no-follow filesystem files: `190 / 190`
- both sorted path-list SHA-256 values:
  `cb0516ae7a7b638925fee349464d74cccf5ab1c1ca3c03bc97701d72896ea64b`
- tracked partition: `190 = 38 target-only + 152 source-derived`
- source-derived partition: `152 = 144 ported + 7 rewritten + 1 duplicated`

After removing private `node_modules` and reviewer scratch configs, the private
clone again had zero status bytes, the same 507-object and 190-file closures,
clean fsck, no remote, and exact HEAD/tree. Shared-target post-audit also stayed
clean at the same HEAD/tree with no `node_modules`.

All 33 SHA-256 bindings parsed from the remediation record matched the exact
target files. All eight rewritten/duplicated target Git blob OIDs matched both
the record and `HEAD:path`.

## Offline native lifecycle

- Reviewer cache fill was script-disabled and separate from acceptance install:
  target lock 291 packages; pinned-source lock 299 packages.
- Private target install under
  `sandbox-exec '(version 1) (allow default) (deny network*)'`:
  `npm ci --offline --ignore-scripts --no-audit --no-fund`, exit 0, 291 packages.
  `better_sqlite3.node` was absent immediately afterward.
- Immediately before/after install and rebuild, DNS and HTTPS failed
  `ENOTFOUND`, direct-IP TCP failed `EPERM`, and loopback accepted outside the
  profile but failed `EPERM` inside it.
- Exact rebuild under the same profile:
  `npm rebuild better-sqlite3 --offline --foreground-scripts --build-from-source`
  with `npm_config_nodedir=/usr/local/Cellar/node@22/22.22.1_1`, exit 0.
- Native artifact: 1,985,384 bytes, x86_64 Mach-O bundle, SHA-256
  `289ac2671fc501b275af7ce170ea2ef84e07be7e2a4a403aaa055cef02018557`;
  in-memory SQLite smoke passed under network denial.
- Secondary-download install fixture failed at the socket with
  `SECONDARY_DENIED:ENOTFOUND`, exit 42, and produced no accepted observation.
- AC3 independently repeated the pinned-source offline install/rebuild and
  reproduced its bound source native lifecycle.

## AC8 direct child ceremony

The reviewer launched the adjudicated real child with `node --import tsx`,
detached as process-group leader, on a fresh synthetic home:

- FD3 readiness was one canonical 46-byte JSON-LF record, exact keys
  `host,port,pid`, host `127.0.0.1`, and `pid == child.pid`; no extra FD3 bytes.
- Direct ping, capture, search, atoms, clusters, and wait requests each returned
  HTTP 200; search and atoms returned the synthetic capture and wait timed out
  as specified.
- Child stdout/stderr were both zero bytes.
- SIGTERM produced exit `0` with no signal inside the five-second bound; the
  negative process-group probe returned `ESRCH` afterward.
- The committed 9-test AC8 battery separately proved schema violations, body
  and result limits, the five-second slow-body deadline, inherited-environment
  and non-loopback rejection, readiness-failure cleanup, uncooperative-group
  SIGKILL fallback with rejected success, and graceful-only success.

## RR4-F1 — blocking: byte-bound lint config depends on the clean shared target

The migration record binds these exact scratch configurations:

- tsconfig SHA-256:
  `7164ed9356aa3bd1d9108283eee164053bc6f251418d0aa1dc4d4b02726bf78f`
- ESLint config SHA-256:
  `df912afc56372010d08414de6421d28fee931b908cdbbf0fd742ecf20e605bba`

The exact tsconfig, placed at the private-clone root, produced zero TypeScript
errors. The exact ESLint config contains:

```js
import tsParser from '/Users/zhenye/Desktop/echo-context/node_modules/@typescript-eslint/parser/dist/index.js';
import tsPlugin from '/Users/zhenye/Desktop/echo-context/node_modules/@typescript-eslint/eslint-plugin/dist/index.js';
```

The redo contract requires `/Users/zhenye/Desktop/echo-context/node_modules` to
be absent, and the reviewer confirmed it was absent before lint. Therefore this
exact command from the private clone:

```text
/usr/local/bin/node node_modules/eslint/bin/eslint.js \
  --config .reviewer-eslint.config.mjs 'src/**/*.ts' 'tests/**/*.ts'
```

exited 2 with:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/Users/zhenye/Desktop/echo-context/node_modules/@typescript-eslint/parser/dist/index.js'
```

Creating that directory or a symlink would mutate the accepted target, violate
its exact 190-file filesystem closure, and violate this review's strict
read-only target contract. Rewriting the two imports to the private clone made
a diagnostic config with SHA-256
`eebecf37f29b1b5bff7fa7f7a13f3fcdce1524ad039befaf788bd8f3a45d8c76`;
that equivalent lint exited 0 with zero findings. It does not satisfy the
founder-adjudicated requirement to replay the byte-identical recorded config.

**Disposition: blocking.** Replace the embedded ESLint bytes with a relocatable
configuration that resolves dependencies from the reviewer's current clone,
bind the new bytes/hash, and prove the exact config from a clean independent
clone without any accepted-target write.

## RR4-F2 — low: README names a stale AC3 aggregate

Tracked `README.md` says the source/target aggregate is
`2f0b28f6b62d31682db30b63139e21cc42977713500a1655f65213f69d7f427e`.
The real source/target stdio replay, committed provenance, and remediation
record all reproduce
`6569b0472372ad666404aa22bcf5b1e0e0c716b573dec35c4b9212864420bba2`.

This is descriptive drift, not evidence-verifier drift, and is non-blocking by
itself. Correct it in the required redo so the tracked status/evidence summary
does not contradict the accepted proof. Because README is tracked, correcting
it will require a new target HEAD/tree and refreshed target hashes.

## Test counts observed

- Final config-isolated private-clone full suite: **72/72 files passed; 987
  passed, 17 intentionally skipped, 0 failed (1,004 total)**.
- Focused remediation files within that run: **4 files / 36 passed** — AC2 6,
  AC3 7, AC6 14, AC8 9.
- Separate direct AC3 run: **1 file / 7 passed**, including real raw-source and
  target peers plus all mutation/protocol probes.
- TypeScript exact-config check: **0 errors**.
- ESLint exact-config check: **1 command failed, exit 2** (RR4-F1).
- ESLint relocatable-equivalent diagnostic: **exit 0, 0 findings**.
- Tool syntax: **6/6 `tools/*.mjs` passed `node --check`**.
- Commit whitespace check: **pass**.
- Direct runtime/source/parity tools: **3/3 pass** plus the canonical
  217-line inventory digest.
- AC8 direct service endpoints: **6/6 HTTP 200**, clean graceful teardown.

The first full-suite invocation used a valid isolated cache at a nonstandard
scratch path while the committed AC3 test defaults to `$HOME/.npm`; that single
AC3 case correctly rejected the missing path. Pointing the same scratch HOME's
`.npm` at the already script-disabled cache fixed reviewer setup, after which
the final full suite above passed. This was not a candidate failure and is not
included in the final failed-test count.

## Design-choice judgments and deferred risks

- **Accepted:** the identical hash-bound scratch registrar on raw pinned source
  and target is a reasonable implementation of the founder-adjudicated AC3
  mapping because the pinned source server is HTTP-only. Full-roster,
  initialize/tools-list envelopes, ignored IDs, per-case envelopes, virtual
  clock, lifecycle, and aggregate are independently bound.
- **Accepted:** the source-valid `timeout:1` plus exact 1,000 ms virtual advance
  inside the literal 10 ms wall budget is enforced and mutation-tested.
- **Accepted:** the adjudicated pinned-`tsx` real AC8 child preserves FD3,
  loopback, process-group, and forced-teardown semantics.
- **Deferred, not a blocker for local DEV:** residual onboarding/task-state,
  coord/product vocabulary and the byte-ported Project_echo default capture
  path remain qualification risks already dispositioned by the redo sidecar.
  They must be removed or explicitly adjudicated before any qualification or
  authority claim.

## Suggested fixups

1. Make the embedded ESLint configuration relocatable while retaining the same
   rule set; bind its exact new bytes and SHA-256 in the migration record.
2. From a new config-isolated private clone, prove byte-identical typecheck and
   lint without reading or writing shared-target `node_modules`.
3. Correct README's AC3 aggregate to `6569b047…`, creating a new target
   HEAD/tree and refreshing every affected target/hash/object binding.
4. Publish a new immutable builder head and request another fresh independent
   codex-ops child. Do not install, publish, transfer authority, or advance
   maturity during this proof repair.

## Merge-conflict preview

Against current main `e113592c199058f32621c06551bcaab18227d603`, no textual
conflict is expected: main does not contain either item-135 migration record,
and the feature's net contribution is confined to the migration record and this
review record. Preserve current-main backlog, task-state, generated-index,
run-log, journal, and sidecar state; apparent two-dot reversions from the older
feature ancestry are not merge inputs. This rejection is not merge approval.
