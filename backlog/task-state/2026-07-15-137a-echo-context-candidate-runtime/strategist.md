## current_thesis

The candidate runtime remains in `proposed/`. Epoch-2 R6 found actionable buildability issues, but its legacy daemon wrappers emitted malformed v1-shaped responses.
Preserve R6 as failed protocol evidence, apply the findings, and start epoch 3 full with pinned-v2 response capture. No target bytes exist.

## locked_decisions

- Predecessor is echo-context `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`,
  tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`; remote readback and source verification gate branching.
- Candidate version is `0.1.0-dev.137a.1`.
- All bytes stay under one caller-created root with immutable `stage`, writable precreated `work`, 127.0.0.1, and port 0.
- Main `SqliteStorage` admits only identity-tracked 0600 WAL/SHM sidecars; the writer lease remains DELETE mode.
- Runtime has exactly eight existing tools, one SQLite storage, bearer auth, capture disabled, and authority false.
- One exclusive SQLite transaction is the writer lease; a loser touches neither main DB nor listener, and crash releases it.
- Fixture lookup is ID-only; one O_NOFOLLOW descriptor supplies the bounded hash/parse/validate/insert buffer with no reopen.
- Config bytes, ready records, stage inventory, proof evidence, and driver result are schema-validated at producer and consumer boundaries before mutation, acceptance, or member trust.
- Exact stage/proof/seed/probe/outer/inner/runtime command forms close argv, cwd, env, roles, and FDs; outer, inner, and runtime retain non-inherited record writers for life.
- Producer-phase timeout alone may settle its owned child PGID. After the
  driver irreversibly enters proof, no actor signals another PID or calls
  `ChildProcess.kill`; exactly two AST-checked sites may self-SIGKILL.
- EOF chain is proof runner → outer → inner → runtime. Outer self-SIGKILL after ready and armed inner self-SIGKILL before runtime START prove bounded absence without retry or restart.
- Direct and inherited-grandchild sandbox probes are a strict pre-seed gate; both must pass while seed DB/lease/listener state remains absent.
- Item 136's source mode verifies only predecessor B. A new closed
  candidate-stage wrapper/orchestrator serializes npm ci, source checks, exact
  command 1, final readback, setup-home removal, quarantine, direct command-2
  parenting/liveness, evidence custody, and cleanup; stage independently
  reauthenticates hidden-lock/extraneous state and copied descriptors.
- Stage contains emitted runtime, proof tools, immutable profile, and regular lock-matching dependencies; inventory+digest bind exact members. Host Node v22.22.1 is pinned, not bundled.
- `sandbox-exec -p` consumes the one verified profile buffer. Sandboxed outer
  descendants inherit stage/system reads, work writes, loopback bind/accept,
  exact Node/sysctl exec, and no outbound/source/package-manager access; the
  proof runner owns HTTP and observers.
- Pinned x86_64 Node may use Rosetta; mode/files are bound, while class-wide `sysctl-read`/`mach-lookup` grants are explicitly disclaimed.
- Raw Host/auth validation precedes every application body consumer; the claim excludes bytes buffered below Node's application boundary.
- The authenticated service roster is five committed read routes plus capture; its sole exception is pre-body `403 capture_disabled`.
- The v2 source inventory checker and manifest are in scope: it binds the new
  tools, runtime tsconfig, package scripts/hash, and lock hash; v1 is immutable.
- Records, responses, observers, output, and 4/7/10/14/60/600-second nested
  phases have exact caps/deadlines. Durable phase/failure evidence fsyncs;
  timeout preserves the root and says cleanup is unproven.
- Authoritative absence is direct EOF/close → ps → path-lsof → lease reacquire
  (when created) → exact-port rebind; finite nettop/lsof are capped diagnostics.
- Command 2 remains alive during subtree absence, then exits with fsynced
  evidence; the reviewed driver streams the exact summary, proves command 2
  absent, atomically cleanup-quarantines/deletes, then emits its bound result.
- If command 2 ignores liveness EOF, the driver signal-freely closes only its
  own pipes, detaches/unrefs the unresolved handle, retains the full proof
  parent, reports failure, and exits 124 within the aggregate deadline.
- Diagnostic inventory says installable/installed/portable closure/authority
  are all false. It is not a release or authorization carrier.
- Fresh builder and different reviewer own exact target/Project heads;
  staged and full `J0..J` closure scans precede the sole Project feature-ref push;
  coordinator uses review `A_r→R`, target `A_t`, then Project import
  `A_p→M`, evidence `A_e→P`, and completion `A_c→C` authorizations with absolute-Git
  literal-URL CAS; each binds both authority decisions, canonical preflight,
  old-ref backup/rollback generation, restore proof, and recovery entry;
  completed frontmatter names
  non-self-referential evidence commit `P`, never completion commit `C`.
- R5 seal `6c0b6772730bcde9165a6f1a8dac53a2b085b60e` / ready hash `6373024e742cdf5dd03546baa2f7ddd77c00d936b31797fb4610091ee7cba9e5` is superseded history, not amendment authority.

## open_questions

- Epoch-3 full reviewers must falsify the repaired producer/profile/proof-runner,
  nested cleanup, absence, CAS, exact-route, and translated-Node claims.
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
