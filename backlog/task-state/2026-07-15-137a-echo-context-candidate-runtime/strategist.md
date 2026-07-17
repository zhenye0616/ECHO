## current_thesis

The candidate runtime is reopened in `proposed/` after a clean pre-build audit
found contradictions in the R5 seal. No target bytes exist; epoch 2 must start
full, reach a new exact-SHA seal, and receive a fresh atomic claim.

## locked_decisions

- Predecessor is echo-context `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`,
  tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`; remote readback and source verification gate branching.
- Candidate version is `0.1.0-dev.137a.1`.
- All bytes stay under one caller-created root with immutable `stage`, writable
  precreated `work`, 127.0.0.1, and port 0.
- Main `SqliteStorage` admits only identity-tracked 0600 WAL/SHM sidecars; the writer lease remains DELETE mode.
- Runtime has exactly eight existing tools, one SQLite storage, bearer auth,
  capture disabled, and authority false.
- One exclusive SQLite transaction is the writer lease; a loser touches neither main DB nor listener, and crash releases it.
- Fixture lookup is ID-only; one O_NOFOLLOW descriptor supplies the bounded hash/parse/validate/insert buffer with no reopen.
- Exactly five candidate top-level launches close argv/cwd/env/roles/FDs; outer, inner, and runtime keep non-inherited record writers for life.
- No actor signals a recorded PID or calls `ChildProcess.kill`. Private phase-checked bytes arm only self-SIGKILL; PID/ps/start strings are diagnostic.
- EOF chain is proof runner → outer → inner → runtime. Outer self-SIGKILL after ready and armed inner self-SIGKILL before runtime START prove bounded absence without retry or restart.
- Stage contains emitted runtime and regular lock-matching production dependencies; inventory+digest bind clean head and exact members. Host Node v22.22.1 is pinned, not bundled.
- Sandbox uses positive env, stage/system reads, work writes, loopback bind/accept, and no outbound/source/package-manager access.
- Pinned x86_64 Node may use Rosetta; mode/files are bound, while class-wide `sysctl-read`/`mach-lookup` grants are explicitly disclaimed.
- Raw Host/auth validation precedes every application body consumer; the claim
  deliberately excludes bytes buffered below Node's application boundary.
- The authenticated service roster is exactly five committed read routes plus
  capture, whose sole candidate exception is pre-body `403 capture_disabled`.
- The v2 source inventory checker and manifest are in scope: it binds the new
  tools, runtime tsconfig, package scripts/hash, and lock hash; v1 is immutable.
- Output pipes drain into capped rings while outer lives; before self-kill it
  relays rings, then child EPIPE handlers bound shutdown. Tracked sockets close before DB/lease.
- Diagnostic inventory says installable/installed/portable closure/authority
  are all false. It is not a release or authorization carrier.
- Fresh builder and different reviewer own exact target/Project heads; coordinator authorizes target-main landing.
- R5 seal `6c0b6772730bcde9165a6f1a8dac53a2b085b60e` / ready hash `6373024e742cdf5dd03546baa2f7ddd77c00d936b31797fb4610091ee7cba9e5` is superseded history, not amendment authority.

## open_questions

- Reviewers must falsify inventory, WAL topology, stage ownership, private self-fault controls, exact routes, and translated-Node sandbox claims.
- After a new seal, a fresh builder may refine listed runtime paths but may not add install, launchd, status/doctor, or real-path scope.

## dont_touch

- No Application Support, LaunchAgents, Library Logs, home dot-directory,
  com.echo.context label, port 39478, or persistent process.
- No bundled Node, SBOM, final four-asset bundle, bootstrap, install runner,
  status/doctor, lifecycle CLI, authority record, capture, client rewrite, or
  hosted release.
- Do not use the stale primary echo-context checkout as the branch base.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-137a-echo-context-candidate-runtime.md
- reviews: backlog/reviews/2026-07-15-137a-echo-context-candidate-runtime/
