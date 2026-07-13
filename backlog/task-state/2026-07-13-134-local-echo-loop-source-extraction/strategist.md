## current_thesis

Extract the internal orchestration protocol into a local source-independent `echo-loop` repository while leaving the active Project_echo loop untouched. Use one attended deterministic run and prove behavior on disposable fixture repos before installation or authority transfer.

## locked_decisions

- `echo-loop` owns agent skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling.
- Source is pinned to `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; target is `/Users/zhenye/Desktop/echo-loop` on a local migration branch with no remote.
- Lifecycle is `ABSENT -> RUNNING -> PUBLISHED | FAILED`; automatic resume, stale-owner takeover, quarantine tokens, checkpoint reuse, and later-process signaling are forbidden.
- A fully initialized/fsynced run directory is RENAME_EXCL-elected into the fixed claim; durable state and a launch gate bind child PID/PGID/start/executable before work. Only the active supervisor cleans its group.
- `discard` refuses a final target or exact live process and atomically renames the whole claim to an archive; PID reuse is quiescent and never signaled.
- No-replace target publication defines PUBLISHED with committed candidate identity. The Project_echo record is a separate post-publish, expected-parent CAS evidence commit.
- Copy protocol implementation and installable templates, not Project_echo history, product/context code, raw corpus, or completed queue state.
- Split loop-owned coordination/task-state APIs from retrieval MCP; no context tools ship in echo-loop.
- Coordination idempotency accepts strict ASCII caller/key formats and covers only effects in the same SQLite transaction; external actions are forbidden and outbox intent is not exactly-once delivery.
- Store initialization intent and every terminal open/migration failure leave collision-safe, fsynced diagnostics with stderr fallback.
- Preserve proposed-review, ready seals, atomic claim, worktree isolation, reviewer independence, fresh eyes, and founder checkpoints.
- Source closure classifies imports, literal/computed reads, shell/shebang edges, package scripts, PATH lookups, and child executables; undeclared host reads/exec fail closed.
- Tests mutate only disposable local fixture repositories with isolated Git config, hooks, credentials, and fixture-owned file remotes.
- Node `22.22.1` and npm `10.9.4` are hard preflights; source bytes come only from pinned commit objects.
- Acquisition uses env-i, run-owned config/HOME, scrubbed secrets, and a credential-denying filesystem sandbox. Candidate work uses an integrity-manifested cache offline under a validated executable/runtime-read closure.
- `verify-handoff` derives canonical paths, validates original control blobs, and accepts only the control HEAD or one exact record-only child commit.
- No global install, launchd change, sibling dependency, remote, or authority transfer occurs.

## open_questions

- R7 by independent `codex` and `codex-ops` bindings must confirm atomic discard/target publication, gated processes, runtime closure, strict transactional idempotency, live-vs-stale initialization, record CAS, and handoff.
- A later cutover decides how repositories install/consume echo-loop and where each repository's queue state lives.

## dont_touch

- Do not change the active Project_echo loop, review launchd jobs, or user-level skill adapters.
- Do not include product logic, capture/retrieval context logic, or historical project corpus.
- Do not touch sibling targets, real remotes, wiki, or holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
