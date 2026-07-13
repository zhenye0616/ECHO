## current_thesis

Extract the internal orchestration protocol into a local source-independent `echo-loop` repository while leaving the active Project_echo loop untouched. Prove the loop on disposable fixture repos before any installation or authority transfer.

## locked_decisions

- `echo-loop` means agent skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling.
- Source input is `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; target is absent `/Users/zhenye/Desktop/echo-loop`.
- The target is local Git on a migration branch with no remote or publication.
- Copy protocol implementation and templates, not Project_echo's historical backlog/archive/reviews/wiki/raw corpus.
- Split loop-owned coord/task-state APIs from context retrieval MCP; no retrieval tools ship in echo-loop.
- If storage is required, echo-loop owns a minimal private store/schema and does not read echo-context state.
- Canonical skills remain vendor-neutral; client adapters are derived and drift-checked.
- Preserve proposed-review, ready seals, atomic claim, worktree isolation, reviewer independence, fresh eyes, and founder checkpoints.
- Tests mutate only disposable local fixture repositories and local bare remotes.
- No global install, launchd change, sibling repo dependency, or authority transfer occurs.

## open_questions

- Reviewers must validate the exact split of shared MCP/server/storage utilities into loop-owned copies versus rejected retrieval code.
- Later cutover will decide how each repository installs/consumes echo-loop and where its own backlog state lives.

## dont_touch

- Do not change the active Project_echo loop, review launchd jobs, or user-level skill adapters.
- Do not include product logic, capture/retrieval context logic, or historical project corpus.
- Do not touch `/Users/zhenye/Desktop/echo-brain`, `/Users/zhenye/Desktop/echo-context`, real remotes, wiki, or holdout-131.

## canonical_anchors

- spec: backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
