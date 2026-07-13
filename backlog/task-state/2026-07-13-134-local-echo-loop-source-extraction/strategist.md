## current_thesis

Extract the internal orchestration protocol into a local source-independent `echo-loop` repository while leaving the active Project_echo loop untouched. Prove the loop on disposable fixture repos before any installation or authority transfer.

## locked_decisions

- `echo-loop` means agent skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling.
- Source input is `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; final target `/Users/zhenye/Desktop/echo-loop` is published only from verified same-filesystem staging under an atomic lock.
- `tools/repository-extraction/echo-loop.mjs` owns bootstrap/control state outside the candidate, no-replace publication, stale-lock quarantine, reconcile-only recovery, and read-only handoff verification.
- Target-keyed lock takeover is fcntl-serialized, returns a one-use resume token, and cannot proceed until the recorded child process group is dead; control revision hashes bind all reuse.
- The target is local Git on a migration branch with no remote or publication.
- Copy protocol implementation and templates, not Project_echo's historical backlog/archive/reviews/wiki/raw corpus.
- Split loop-owned coord/task-state APIs from context retrieval MCP; no retrieval tools ship in echo-loop.
- Loop coordination uses private SQLite WAL; one transaction inserts by caller idempotency key and applies role/deadline projection, while duplicate retry returns the original sequence without reapplying state.
- Canonical skills remain vendor-neutral; client adapters are derived and drift-checked.
- Preserve proposed-review, ready seals, atomic claim, worktree isolation, reviewer independence, fresh eyes, and founder checkpoints.
- Tests mutate only disposable local fixture repositories and local bare remotes.
- Fixture Git runs with isolated HOME/config/hooks/credentials and validates every bare remote remains beneath its scratch root.
- Node `22.22.1` and npm `10.9.4` are hard preflights; source materialization reads committed objects only.
- Source/dependency plans are deterministic and machine-checked; sandbox denies source reads, all network, and external writes.
- Source/dependency closure includes runtime reads, shell sourcing, package executables, and child-process binaries. Verification installs only from an integrity-manifested per-run offline cache.
- Coord idempotency binds key to a canonical operation+payload fingerprint; mismatched reuse fails without projection change and all terminal store failures log durably.
- No global install, launchd change, sibling repo dependency, or authority transfer occurs.

## open_questions

- R5 by independent `codex` and `codex-ops` bindings must verify serialized takeover/PGID cleanup, offline cache, runtime-edge closure, request fingerprints, durable failure logs, and trusted handoff flags.
- Later cutover will decide how each repository installs/consumes echo-loop and where its own backlog state lives.

## dont_touch

- Do not change the active Project_echo loop, review launchd jobs, or user-level skill adapters.
- Do not include product logic, capture/retrieval context logic, or historical project corpus.
- Do not touch `/Users/zhenye/Desktop/echo-brain`, `/Users/zhenye/Desktop/echo-context`, real remotes, wiki, or holdout-131.

## canonical_anchors

- spec: backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
