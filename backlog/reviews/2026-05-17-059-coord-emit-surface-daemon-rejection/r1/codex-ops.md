---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 1
reviewer: "codex-ops"
artifact_sha: "b36af1276b9387c8962579940dbb72a2fc69d12b"
completed_at: '2026-05-17T07:46:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:59,75,96-99,111"
    finding: >-
      The daemon-unreachable stderr behavior is still unresolved across the table, AC1, AC3, and the out-of-scope text. In production this is the branch hit during MCP daemon restarts and launchd tick storms; leaving the builder to choose between silent, always-log, or verbose opt-in makes the launchd log contract nondeterministic and can either flood ~/Library/Logs/echo-review-queue-*.log or preserve the old no-signal behavior. Patch the spec to pick one concrete behavior (codex-ops recommends silent by default, no env flag in this item) and make AC3 assert that exact contract.
  - severity: "medium"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:78,88-101"
    finding: >-
      AC1 adds a new HTTP 4xx/5xx observability branch, but AC3 tests only JSON-RPC rejection and curl-unreachable. The production wrong-transport failure is curl rc 0 with a non-2xx status (for example a stale ECHO_MCP_URL reaching a local service that is not the MCP daemon, or a daemon-side 500), which is exactly the sort of unattended miswire this spec is meant to surface. Add a local in-process HTTP fixture that returns 4xx or 5xx and assert exit 0 plus exactly one `coord-emit.sh: daemon returned HTTP <status>:` stderr line, so this branch cannot regress back to swallowed output.
---

# codex-ops review

Verdict: proceed_after_patches

Findings:

1. [medium] Lock the daemon-unreachable stderr contract in the spec. I recommend preserving the current silent-on-unreachable behavior for launchd noise control and making the test assert that exact behavior.

2. [medium] Add coverage for the new HTTP non-2xx branch. JSON-RPC rejection and curl-unreachable do not exercise the runtime path where a reachable but wrong service responds with 4xx/5xx.

Notes:

- The exit-0 invariant is correct and should remain load-bearing.
- The rejection line should surface only daemon-side validation failures, not every daemon outage.
