## current_thesis

Extract capture, normalization, storage, retrieval, and context APIs into a local source-independent `echo-context` repository. Use one attended deterministic run and synthetic parity while leaving the live daemon, MCP, and state untouched.

## locked_decisions

- `echo-context` owns capture, normalization, identity, append-only context storage, clustering/retrieval, permissions, health, and context APIs.
- Source is pinned to `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; target is `/Users/zhenye/Desktop/echo-context` on a local migration branch with no remote.
- Lifecycle is `ABSENT -> RUNNING -> PUBLISHED | FAILED`; no automatic resume, takeover, quarantine token, checkpoint reuse, or later-process signaling exists.
- Atomic target-specific state-directory creation elects one run. The active supervisor owns and cleans its process group, sockets, and scratch database.
- `discard` refuses a final target or possibly-live resource, archives state/staging/record/cache/output without deletion, and requires a fresh pinned extraction.
- Migration record publication precedes no-replace target publication. Target + byte-identical record + committed candidate identity define published state.
- Retrieval MCP contains exactly the eight pinned context tools; coordination, task-state, review, and product tools are forbidden.
- Source-tool evidence executes the pinned source MCP against immutable synthetic fixtures under sanitized scratch state and a loopback-only sandbox.
- State uses distinct `ECHO_CONTEXT_HOME`; live `~/.echo` state, credentials, daemon, and MCP configuration are never read or mutated.
- Raw Granola capture may be copied as a generic source; decision extraction, cards, briefs, approval, and delivery stay out.
- The candidate inventory is exactly 211 paths (109 source, 102 test/fixture) at pinned SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.
- Every copied/relocated/rewritten file has source blob and destination hash provenance; standalone parity requires no source access.
- Direct dependencies derive from final bare imports plus fixed dev tools at exact source-lock versions.
- Pre-isolation acquisition builds an integrity-manifested run cache; all candidate work then runs offline under sanitized environment and OS sandbox.
- AF_INET and AF_INET6 probes independently prove loopback allow and known-listener non-loopback policy denial; missing topology is a preflight failure, not a skip.
- Node `22.22.1` and npm `10.9.4` are hard preflights; source bytes come only from pinned commit objects.
- `verify-handoff` derives canonical paths and validates original control blobs despite the later record-only evidence commit.
- No source/sibling dependency, symlink, submodule, shared writable state, behavior change, remote, or authority transfer occurs.

## open_questions

- R6 by independent `codex` and `codex-ops` bindings must confirm the structural cut plus tool-evidence fixtures, network probes, publication, and handoff contracts.
- Later cutover decides live-state migration, rollback, service installation, and echo-brain's read-only context contract.

## dont_touch

- Do not access or alter live daemon, MCP, state, credentials, launchd, or user config.
- Do not add retrieval/capture features or include product/loop code.
- Do not touch sibling targets, current wiki, or holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md
- reviews: backlog/reviews/2026-07-13-135-local-echo-context-source-extraction/
