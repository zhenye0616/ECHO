## current_thesis

Extract the internal orchestration protocol into a local source-independent `echo-loop` repository while leaving the active Project_echo loop untouched. Prove the loop on disposable fixture repos before any installation or authority transfer.

## locked_decisions

- `echo-loop` means agent skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling.
- Source input is `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; final target `/Users/zhenye/Desktop/echo-loop` is published only from verified same-filesystem staging under an atomic lock.
- The target is local Git on a migration branch with no remote or publication.
- Copy protocol implementation and templates, not Project_echo's historical backlog/archive/reviews/wiki/raw corpus.
- Split loop-owned coord/task-state APIs from context retrieval MCP; no retrieval tools ship in echo-loop.
- Loop coordination uses private SQLite WAL at `ECHO_LOOP_HOME/state/coord.sqlite`, transactionally preserving append order, idempotency, and deadline races; it never reads echo-context state.
- Canonical skills remain vendor-neutral; client adapters are derived and drift-checked.
- Preserve proposed-review, ready seals, atomic claim, worktree isolation, reviewer independence, fresh eyes, and founder checkpoints.
- Tests mutate only disposable local fixture repositories and local bare remotes.
- Fixture Git runs with isolated HOME/config/hooks/credentials and validates every bare remote remains beneath its scratch root.
- Node `22.22.1` and npm `10.9.4` are hard preflights; source materialization reads committed objects only.
- Process-scoped source denial and a clean local-HEAD/hash handoff gate independent review.
- No global install, launchd change, sibling repo dependency, or authority transfer occurs.

## open_questions

- R3 by independent `codex` and `codex-ops` bindings must verify lifecycle, SQLite concurrency, fixture isolation, and local review handoff.
- Later cutover will decide how each repository installs/consumes echo-loop and where its own backlog state lives.

## dont_touch

- Do not change the active Project_echo loop, review launchd jobs, or user-level skill adapters.
- Do not include product logic, capture/retrieval context logic, or historical project corpus.
- Do not touch `/Users/zhenye/Desktop/echo-brain`, `/Users/zhenye/Desktop/echo-context`, real remotes, wiki, or holdout-131.

## canonical_anchors

- spec: backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
