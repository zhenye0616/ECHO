## current_thesis

Verify the exact item-136 canonical tuple, land a reviewed descendant runtime in echo-context, build one local four-asset installation bundle from the read-back target main SHA, and install those exact bytes as an authenticated capture-off shadow. Project_echo remains authoritative at 38478; hosted release and cutover work stay outside item 137.

## locked_decisions

- The predecessor is echo-context commit `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`, tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`, version `0.1.0-dev.136.1`, source-archive SHA-256 `3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef`, lock hash `13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b`, and manifest hash `6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01`; rebuild and verify it from a fresh canonical clone before branching.
- The target remote is `https://github.com/zhenye0616/echo-context.git`; local target refs are not authority.
- Runtime version is `0.1.0-dev.137.1`; final bytes build once from a fresh detached clone of the independently reviewed, landed, and read-back target SHA.
- The local installation bundle has exactly four typed assets: runtime tgz, canonical manifest, SBOM, and POSIX bootstrap. The manifest binds all other assets; a separate delegated installation record binds the manifest hash and every asset hash.
- Tags, GitHub Releases, hosted/private prereleases, uploads, hosted artifact downloads, publication/cache reconciliation, release-set manifests, release FSMs, and approval-file challenges are excluded and remain item 140 work. The only network build input is the official Node 22.22.1 Darwin x64 archive at its fixed nodejs.org URL and SHA-256.
- Production uses a new closed composition root with one SQLite instance, the existing generic service API, exactly eight MCP tools, and one process-lifetime `flock(2)` writer lock.
- Shadow identity is `com.echo.context` at `127.0.0.1:39478` with `/Users/zhenye/.echo-context-shadow`, `authority:false`, `accept_capture:false`, and `capture_workers:[]`.
- The authority projection contains only state/generation, exact runtime identities, and capture-worker/secret references. Item 137 creates no authority record and cannot activate one.
- Every data-bearing route requires one bearer credential encoded as exactly 43 unpadded base64url characters plus LF in a current-user 0600 file beneath a current-user 0700 resolver-selected secret root. Token bytes never enter process state, artifacts, Git, output, logs, or evidence.
- Capture-off fixture data enters only through an idempotent manifest-bound offline seed command while the service is stopped and both lifecycle/writer locks are held; online capture remains typed 403 before body read.
- Candidate proof uses a disposable root, port `0`, one foreground process group, a private ready FD, and `--no-launchd`; it leaves no persistent candidate job or real-user-path mutation.
- Real launchd owns the runtime directly. There is no supervisor, stable shim, purge, `prepare-final`, last-exit record, owner sidecar, refusal record, or competing restart authority.
- One exclusive lifecycle lock serializes install/start/stop/restart/uninstall/offline-seed; status and doctor take its shared form across complete observations. A durable intent and ownership receipt make installation recoverable and constrain removal to owned paths.
- No `disable` command or launchctl persistent-override mutation exists; a pre-existing disabled label is a collision refusal.
- Plist stdout/stderr are `/dev/null`; the runtime opens its bounded startup/application sink before other fallible startup work. Logger-open failure suppresses restart and remains independently doctor-visible.
- Status and doctor have named closed schemas, canonical JSON plus one LF, bounded probes, shared-lock busy truth, redacted stderr, and exit precedence 2 usage, 3 not installed, 5 internal, 4 timeout, 1 unhealthy, 0 healthy. Doctor never repairs.
- No Project-specific consumer graph or speculative coordination/residual operation is sealed here. Item 138 must consume actual landed runtime outputs.
- Before target-main mutation and real installation, the persistent coordinator commits, pushes, and reads back a fresh exact-operation authorization. The coordinator verifies bootstrap+manifest against that external record before execution and passes the authorized manifest digest into the bootstrap. Builders never inherit that authority.
- The real shadow receives only synthetic fixture state, changes no client configuration, and remains healthy, capture-off, and non-authoritative after proof while Project_echo stays healthy at 38478.

## open_questions

- Protocol-v2 reviewers must test whether the smaller contract is implementable from the current echo-context tree and whether every required failure mode has a concrete test without reintroducing hosted release or cutover machinery.
- The final target SHA, runtime/SBOM/manifest/bootstrap hashes, and operation nonces are intentionally unknown until independent implementation review and canonical landing.

## dont_touch

- Do not read or migrate live Project_echo state, enable capture, rewire clients, bind 38478/38479, disable the current daemon, transfer authority, rotate credentials, or deprecate Project_echo.
- Do not add hosted release surfaces, a supervisor, cutover/residual interfaces, new MCP semantics, wiki/product work, echo-brain/echo-loop installation, or Team-product maturity claims.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md
- predecessor evidence: raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md
- delegated authority: raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md
- cross-repo protocol: raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md
- reviews: backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/
