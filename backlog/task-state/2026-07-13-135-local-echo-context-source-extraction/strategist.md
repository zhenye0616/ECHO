## current_thesis

Materialize capture, normalization, storage, retrieval, and context APIs as a source-independent local `echo-context` repository while leaving live daemon/MCP/state untouched. Judge the final repo and synthetic parity, not migration machinery.

## locked_decisions

- `echo-context` owns generic capture, normalization/identity, append-only storage, clustering/retrieval, permissions/health, and context APIs.
- Source is pinned to `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; dirty checkout bytes are excluded.
- After orchestrator preflight, one builder atomically `mkdir`s absent target `/Users/zhenye/Desktop/echo-context`; siblings never touch it and the builder refuses EEXIST.
- The builder creates local branch `migration/2026-07-13-135` under scrubbed Git/object/index/config environment with no remote or external object state.
- Project_echo gains no extraction CLI, lifecycle state, lock/takeover, publication/recovery helper, committed sandbox profile, or migration-framework tests.
- An interrupted target is incomplete/unaccepted and manually archived before a fresh assigned run; no automatic adoption/resume/delete.
- Retrieval MCP has exactly eight pinned tools; canonical name/description/input/output/annotation descriptors and behavior bytes must match source, while loop/product tools are forbidden.
- Source MCP and target use exact request/seed bytes from sidecar-hashed per-tool fixtures, fresh processes/state, fixed volatile inputs, and equal per-case/aggregate hashes.
- State uses distinct ECHO_CONTEXT_HOME; live `~/.echo`, credentials, daemon, and MCP config are never read/mutated.
- Raw Granola capture may be copied generically; product decision/card/brief/approval logic stays out.
- Candidate inventory is exactly 211 paths (109 source, 102 test/fixture), pinned aggregate SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.
- Every source row has provenance and ported/rewritten/excluded disposition; standalone parity needs no source access.
- Registry-endpoint fetch is sandboxed then lock-integrity admitted; separate sealed seeds feed offline installs, and a lifecycle plan explicitly rebuilds/verifies native dependencies such as better-sqlite3 with pinned tools.
- Shared target stays read-only; verifier records exact HEAD/tree, clones that commit privately, detaches, removes origin, checks object independence, and rechecks shared HEAD/tree.
- Stdio, service-server, and service-client profiles are distinct: server only binds/accepts loopback and reports readiness by FD; client connects only after readiness to that exact endpoint.
- A top-level finalizer atomically publishes numerically bounded capsules for every nonzero/catchable-signal path; publication failure retains scratch/worktree, and target cleanup remains founder-owned.
- Synthetic loopback service tests prove capture/retrieval behavior; no live state migration or service cutover.
- The migration record pins target HEAD/tree, hashes, commands, tests, no-remotes, clean state, false authority, and no-live-state.

## open_questions

- R11 by independent `codex` and `codex-ops` must confirm descriptor parity, endpoint-scoped fetch plus lifecycle plan, pinned JS entrypoints/temp roots, top-level atomic capsules, and no-rewrite push policy.
- Later cutover decides remote, install, live-state migration/rollback, and echo-brain's versioned read-only contract.

## dont_touch

- Do not alter live daemon/MCP/state/credentials/launchd/user config.
- Do not add features or include product/loop code.
- Do not touch siblings, wiki, or holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md
- reviews: backlog/reviews/2026-07-13-135-local-echo-context-source-extraction/
