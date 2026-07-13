## current_thesis

Extract cross-tool capture, storage, normalization, retrieval, and context APIs into a local source-independent `echo-context` repository. Prove synthetic parity while leaving the live daemon, MCP, and state untouched.

## locked_decisions

- `echo-context` owns capture, normalization, identity, append-only context storage, clustering/retrieval, permissions, health, and context APIs.
- Source input is `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; target is absent `/Users/zhenye/Desktop/echo-context`.
- The target is local Git on a migration branch with no remote, install, publication, or authority transfer.
- Retrieval MCP belongs here; coord/task-state/review tools belong to echo-loop and are forbidden.
- Product decision extraction, cards/briefs/approval, Slack/Linear, and client delivery are forbidden.
- State uses a distinct `ECHO_CONTEXT_HOME`; no implicit read of live `~/.echo` state is allowed.
- All verification uses synthetic scratch data and ephemeral ports; live state migration is a later item.
- Raw Granola capture may be copied here; product semantics stay out. echo-brain may own a separate minimal copy with provenance.
- Every copied/relocated/rewritten file has source blob and destination hash provenance.
- No source/sibling dependency, symlink, submodule, shared writable state, or behavior change.

## open_questions

- Cross-vendor review must validate the exact context-only MCP roster and shared storage split.
- Later cutover will decide live-state migration, rollback, service installation, and echo-brain's versioned read-only context contract.

## dont_touch

- Do not access or alter live daemon, MCP, state, credentials, launchd, or user config.
- Do not add retrieval/capture features or include product/loop code.
- Do not touch `/Users/zhenye/Desktop/echo-brain`, `/Users/zhenye/Desktop/echo-loop`, current wiki, or holdout-131.

## canonical_anchors

- spec: backlog/proposed/2026-07-13-135-local-echo-context-source-extraction.md
- reviews: backlog/reviews/2026-07-13-135-local-echo-context-source-extraction/
