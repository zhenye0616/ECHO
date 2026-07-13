## current_thesis

Extract cross-tool capture, storage, normalization, retrieval, and context APIs into a local source-independent `echo-context` repository. Prove synthetic parity while leaving the live daemon, MCP, and state untouched.

## locked_decisions

- `echo-context` owns capture, normalization, identity, append-only context storage, clustering/retrieval, permissions, health, and context APIs.
- Source input is `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; final target `/Users/zhenye/Desktop/echo-context` is published only from verified same-filesystem staging under an atomic lock.
- `tools/repository-extraction/echo-context.mjs` owns external lifecycle state, stale-lock quarantine, no-replace publication, exact reconcile-only recovery, process-group supervision, and handoff verification.
- The target is local Git on a migration branch with no remote, install, publication, or authority transfer.
- Retrieval MCP is exactly eight pinned tools (`echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, `wait_for_new_turns`); coord/task-state/review tools are forbidden.
- Product decision extraction, cards/briefs/approval, Slack/Linear, and client delivery are forbidden.
- State uses a distinct `ECHO_CONTEXT_HOME`; no implicit read of live `~/.echo` state is allowed.
- All verification uses synthetic scratch data and ephemeral ports; live state migration is a later item.
- Raw Granola capture may be copied here; product semantics stay out. echo-brain may own a separate minimal copy with provenance.
- Every copied/relocated/rewritten file has source blob and destination hash provenance.
- The source-at-SHA parity candidate is exactly 211 paths (109 source, 102 test/fixture) at SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`; every row requires an owned or excluded disposition.
- A committed source-evidence bundle is compared to commit objects before isolation; standalone parity and eight-tool schema checks consume digests/fixtures without source access.
- Direct dependencies derive from final bare imports plus a fixed dev-tool set at exact source-lock versions.
- Node `22.22.1` and npm `10.9.4` are hard preflights; committed `package-lock.json` and commit-object materialization are required.
- Verification denies source reads/external writes/non-loopback networking at the OS layer; a process-group supervisor proves cleanup after hangs and injected failures.
- The migration record pins a clean local HEAD/hash handoff for independent review.
- No source/sibling dependency, symlink, submodule, shared writable state, or behavior change.

## open_questions

- R4 by independent `codex` and `codex-ops` bindings must verify the external control plane, evidence/schema digests, network sandbox, process-group cleanup, and handoff.
- Later cutover will decide live-state migration, rollback, service installation, and echo-brain's versioned read-only context contract.

## dont_touch

- Do not access or alter live daemon, MCP, state, credentials, launchd, or user config.
- Do not add retrieval/capture features or include product/loop code.
- Do not touch `/Users/zhenye/Desktop/echo-brain`, `/Users/zhenye/Desktop/echo-loop`, current wiki, or holdout-131.

## canonical_anchors

- spec: backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md
- reviews: backlog/reviews/2026-07-13-135-local-echo-context-source-extraction/
