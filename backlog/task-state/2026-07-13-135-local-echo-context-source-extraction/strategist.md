## current_thesis

Materialize capture, normalization, storage, retrieval, and context APIs as a source-independent local `echo-context` repository while leaving live daemon/MCP/state untouched. Judge the final repo and synthetic parity, not migration machinery.

## locked_decisions

- `echo-context` owns generic capture, normalization/identity, append-only storage, clustering/retrieval, permissions/health, and context APIs.
- Source is pinned to `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; dirty checkout bytes are excluded.
- One attended builder owns absent target `/Users/zhenye/Desktop/echo-context`; siblings never touch it.
- The builder creates local branch `migration/2026-07-13-135` under sanitized Git config with no remote.
- Project_echo gains no extraction CLI, lifecycle state, lock/takeover, publication/recovery helper, committed sandbox profile, or migration-framework tests.
- An interrupted target is incomplete/unaccepted and manually archived before a fresh assigned run; no automatic adoption/resume/delete.
- Retrieval MCP has exactly eight pinned tools; loop/product tools are forbidden.
- Source MCP and target replay the identical immutable synthetic fixture corpus and must match per-case and aggregate hashes.
- State uses distinct ECHO_CONTEXT_HOME; live `~/.echo`, credentials, daemon, and MCP config are never read/mutated.
- Raw Granola capture may be copied generically; product decision/card/brief/approval logic stays out.
- Candidate inventory is exactly 211 paths (109 source, 102 test/fixture), pinned aggregate SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.
- Every source row has provenance and ported/rewritten/excluded disposition; standalone parity needs no source access.
- Verification exports target HEAD, sanitizes dependency config, and denies Project_echo/sibling/live-state/non-loopback access for checks.
- Synthetic loopback service tests prove capture/retrieval behavior; no live state migration or service cutover.
- The migration record pins target HEAD/tree, hashes, commands, tests, no-remotes, clean state, false authority, and no-live-state.

## open_questions

- R8 by independent `codex` and `codex-ops` must confirm the controller-free contract, exact tool fixtures, and synthetic service parity.
- Later cutover decides remote, install, live-state migration/rollback, and echo-brain's versioned read-only contract.

## dont_touch

- Do not alter live daemon/MCP/state/credentials/launchd/user config.
- Do not add features or include product/loop code.
- Do not touch siblings, wiki, or holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md
- reviews: backlog/reviews/2026-07-13-135-local-echo-context-source-extraction/
