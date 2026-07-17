## current_thesis

The candidate-only runtime spec sealed at R5 and is ready for a fresh builder.
It proves a capture-off, authenticated eight-tool echo-context process that
stages and runs without repository access in one disposable 0700 root at port
0, while cutting every launchd, real-path, portable-release, and authority
mechanism that prevented the parent from converging.

## locked_decisions

- Canonical predecessor is echo-context commit
  `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`, tree
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`; authenticated remote readback
  and committed source verification are mandatory before branching.
- Candidate version is `0.1.0-dev.137a.1`.
- All stage, secret, state, database, lease, fixture, temp, and log paths stay
  under one disposable caller-created root with immutable `stage` and
  writable `work` siblings; host is 127.0.0.1 and port is 0.
- Runtime has exactly eight existing tools, one SQLite storage, bearer auth,
  capture disabled, and authority false.
- One dedicated SQLite exclusive transaction is the candidate writer lease;
  a loser touches neither the main DB nor listener, and crash releases it.
- Fixture lookup is ID-only. One O_NOFOLLOW descriptor supplies one bounded
  buffer used for hash, parse, validation, and insert; no path reopen exists.
- The executable surface is exactly five shell-free launches: stage, sandboxed
  seed, smoke outer, smoke inner-owner mode, and sandboxed serve. Every argv,
  cwd, positive environment, role discriminator, and FD map is closed.
- EOF architecture is third proof runner → outer observer → inner lifecycle
  owner → runtime. The outer solely owns the inner-liveness writer; the inner
  solely owns the runtime-liveness writer and relays the runtime PID/start
  identity before ready. Third-runner outer/inner SIGKILL tests prove bounded
  absence without an unknown-PID signal or restart authority.
- Post-landing `--mode full` exercises both existing liveness faults through
  the third proof runner: outer SIGKILL after relayed `ready`, then, only after
  complete absence and a fresh outer invocation, inner SIGKILL after relayed
  `runtime_spawned` and before `ready`. Both require bounded identity,
  listener, main-database-handle, and lease absence with no retry or restart.
- Staging copies emitted runtime and regular lock-matching production
  dependencies only. Generated inventory+digest bind the clean head and exact
  executed members without self-reference. Absolute host Node v22.22.1 is
  hashed and pinned for proof but not bundled.
- Runtime descendants execute under a positive environment allowlist and a
  validated sandbox profile: only stage/system reads, work reads/writes,
  loopback bind/accept, and no outbound network/source/package-manager access.
- Raw Host/auth validation precedes every application body consumer; the claim
  deliberately excludes bytes buffered below Node's application boundary.
- Output pipes always drain into capped rings, and tracked sockets are forced
  closed after the graceful deadline before SQLite and lease shutdown.
- Diagnostic inventory says installable/installed/portable closure/authority
  are all false. It is not a release or authorization carrier.
- A fresh builder writes target source; a different reviewer reviews exact
  target and Project_echo heads; coordinator separately authorizes target-main
  landing.
- Protocol-v2 R5 sealed the unchanged spec at
  `6c0b6772730bcde9165a6f1a8dac53a2b085b60e`; watcher promotion stamped
  `ready_content_sha`
  `6373024e742cdf5dd03546baa2f7ddd77c00d936b31797fb4610091ee7cba9e5`.

## open_questions

- None blocking for claim. A fresh implementation builder must start from the
  authenticated remote item-136 tuple and hand off to a different reviewer.
- Builder may refine file decomposition inside the listed runtime paths but
  may not add install, launchd, status/doctor, or real-path surfaces.

## dont_touch

- No Application Support, LaunchAgents, Library Logs, home dot-directory,
  com.echo.context label, port 39478, or persistent process.
- No bundled Node, SBOM, final four-asset bundle, bootstrap, install runner,
  status/doctor, lifecycle CLI, authority record, capture, client rewrite, or
  hosted release.
- Do not use the stale primary echo-context checkout as the branch base.

## canonical_anchors

- spec: backlog/ready/2026-07-15-137a-echo-context-candidate-runtime.md
- reviews: backlog/reviews/2026-07-15-137a-echo-context-candidate-runtime/
