## current_thesis

Extract capture, normalization, storage, retrieval, and context APIs into a local source-independent `echo-context` repository. Use one attended deterministic run and synthetic parity while leaving the live daemon, MCP, and state untouched.

## locked_decisions

- `echo-context` owns capture, normalization, identity, append-only context storage, clustering/retrieval, permissions, health, and context APIs.
- Source is pinned to `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; target is `/Users/zhenye/Desktop/echo-context` on a local migration branch with no remote.
- Lifecycle is `ABSENT -> RUNNING -> PUBLISHED | FAILED`; no automatic resume, takeover, quarantine token, checkpoint reuse, or later-process signaling exists.
- A fully initialized/fsynced run directory is RENAME_EXCL-elected into the fixed claim; durable state and a launch gate bind child PID/PGID/start/executable before work. Only the active supervisor cleans its resources.
- `discard` refuses a final target or exact live process/resource and atomically renames the whole claim; PID reuse is quiescent and never signaled.
- No-replace target publication defines PUBLISHED with committed candidate identity. The Project_echo record is a separate post-publish, expected-parent CAS evidence commit.
- Retrieval MCP contains exactly the eight pinned context tools; coordination, task-state, review, and product tools are forbidden.
- Source-tool evidence executes the pinned source MCP against immutable fixtures; the candidate replays the identical corpus/environment and must match every per-case and aggregate digest.
- State uses distinct `ECHO_CONTEXT_HOME`; live `~/.echo` state, credentials, daemon, and MCP configuration are never read or mutated.
- Raw Granola capture may be copied as a generic source; decision extraction, cards, briefs, approval, and delivery stay out.
- The candidate inventory is exactly 211 paths (109 source, 102 test/fixture) at pinned SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.
- Every copied/relocated/rewritten file has source blob and destination hash provenance; standalone parity requires no source access.
- Direct dependencies derive from final bare imports plus fixed dev tools at exact source-lock versions.
- Acquisition uses env-i, run-owned config/HOME, scrubbed secrets, and a credential-denying filesystem sandbox. Source/candidate work uses the exact offline npm command/cache under a validated runtime closure.
- AF_INET and AF_INET6 probes independently prove loopback allow and known-listener non-loopback policy denial; missing topology is a preflight failure, not a skip.
- Node `22.22.1` and npm `10.9.4` are hard preflights; source bytes come only from pinned commit objects.
- `verify-handoff` derives canonical paths, validates original control blobs, and accepts only the control HEAD or one exact record-only child commit.
- No source/sibling dependency, symlink, submodule, shared writable state, behavior change, remote, or authority transfer occurs.

## open_questions

- R7 by independent `codex` and `codex-ops` bindings must confirm atomic discard/target publication, gated PID identity, exact source/candidate fixtures, offline/runtime closure, network probes, record CAS, and handoff.
- Later cutover decides live-state migration, rollback, service installation, and echo-brain's read-only context contract.

## dont_touch

- Do not access or alter live daemon, MCP, state, credentials, launchd, or user config.
- Do not add retrieval/capture features or include product/loop code.
- Do not touch sibling targets, current wiki, or holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md
- reviews: backlog/reviews/2026-07-13-135-local-echo-context-source-extraction/
