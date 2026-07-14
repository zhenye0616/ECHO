---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 10
reviewer: "codex-ops"
artifact_sha: "8327efe7b05c67edce34078a13272b20c0e40f14"
completed_at: '2026-07-14T01:00:02Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3 and AC7 — source-oracle execution"
    finding: "The illustrated source and target oracle runs reuse <attempt-root>/source-oracle.v1.json, allowing the target run to overwrite the baseline before comparison. Require separate create-new outputs, hash and make the pinned-source baseline immutable before target execution, and compare both with an operator-owned comparator bound to the pinned source runner and vectors."
  - severity: "high"
    where: "AC3 and AC7 — parity-vector runtime isolation"
    finding: "Parity vectors exercise stateful coordination, review-publication, and workflow behavior, but oracle and audit execution is not explicitly confined to disposable state. Require a private ECHO_LOOP_HOME, fixture-only repository roots, sanitized environment, offline scratch-write-only sandbox, deny-all network, and outside-sentinel assertions for both source and target runs so review cannot mutate the active loop."
  - severity: "high"
    where: "AC7 — npm fetch, offline, rebuild, and verification phases"
    finding: "env -i does not provide PATH, HOME, XDG, or TMPDIR, while npm and package scripts commonly resolve node through PATH and write configuration or temporary state. Host global or project npm configuration can also alter registry, cache, TLS, and dependency behavior. Specify the exact pinned Node/npm CLI invocation, allowlisted PATH and helpers, scratch environment, empty user/global configuration, pinned registry and cache flags, exit propagation, and hostile-config tests."
  - severity: "medium"
    where: "AC3 — CLI error and exit contract"
    finding: "The CLI contract has no total error-to-exit mapping: NOT_FOUND and TIMEOUT are unmapped, exit 78 has no corresponding declared error, and unexpected child, signal, or internal failures are unspecified. Add a command-by-condition table defining stdout, stderr, exit code, and side effects for every EchoLoopError and unexpected-process outcome."
---
