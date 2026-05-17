---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 1
reviewer: "codex"
artifact_sha: "b36af1276b9387c8962579940dbb72a2fc69d12b"
completed_at: '2026-05-17T07:47:28Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:116"
    finding: "The spec skips the mandatory standalone `## Tests` section: it jumps from `## Risks` to `## Definition of Done`, then `## After Completion`. AC3 and Definition of Done name the Vitest coverage, but the ECHO spec shape requires `## Tests` after Risks and before After Completion with concrete file paths and assertions. Patch by adding that section, or by replacing the Definition of Done block with a `## Tests` section that pins `tests/coord/coord-emit-wrapper-transport.test.ts` and the two new assertions."
  - severity: "low"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:96"
    finding: "The unreachable-daemon test contract relies on `127.0.0.1:1` and states that port 1 is reserved and never bound. That is not a portable guarantee; port 1 is an assigned privileged port and could be serviced in unusual local/CI environments. Because the new test distinguishes daemon rejection from transport/HTTP behavior via stderr, use a definitely unused localhost port (for example bind a temporary server to port 0, record the port, close it, then point the wrapper there) or soften the AC to match the existing harness convention without claiming determinism."
---

# Codex review

Verdict: `proceed_after_patches`.

The core wrapper change is implementable against the pinned code: `coord-emit.sh` currently swallows both stdout and stderr at lines 97-104, the daemon returns tool-level `isError: true` from `src/mcp/tools/coord-emit.ts`, and the proposed `tick_start --tick-run-id=...` case reaches the validator path that emits `requires correlation_id`.

Findings are limited to spec patching before build. The behavior itself is scoped correctly and preserves the exit-0 queue durability contract.
