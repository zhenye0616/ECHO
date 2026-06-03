---
item_id: "2026-06-02-087b-reviewer-child-readonly-migration"
round: 1
reviewer: "codex"
artifact_sha: "09f831d153c2895fd84c23fd6c1a276d2c65dd92"
completed_at: '2026-06-03T06:09:53Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:63-68"
    finding: "AC1/AC2 require the wrapper to recover review content via 087's capture.kind while AC3 makes the child read-only, but 087 wires only committed_file for current headless reviewers, which requires the child to write the canonical <reviewer>.md. A read-only child cannot satisfy that capture path. The spec needs to explicitly choose and implement a non-committed_file capture kind already defined by 087, such as stdout_text/stdout_json, and make AC5 assert the wrapper publishes from that captured content plus the no-content queue-error path."
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:65"
    finding: "AC3 flips agent_sandbox metadata to read-only, but 087's actual Codex sandbox is in the binding argv: codex exec ... --sandbox danger-full-access. The 087 gate resolves argv verbatim and does not derive it from agent_sandbox, so a builder could pass AC3's stated field check while still launching codex/codex-ops full-access. AC3/AC5 must require the resolved argv to use --sandbox read-only, or require gate-side enforcement that rejects metadata/argv mismatch."
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:65-73"
    finding: "AC3 says no reviewer binding may carry danger-full-access, but the rest of the spec is scoped to codex/codex-ops and explicitly leaves the 056 Claude required-flag decision out of scope. In 087, Claude still records danger-full-access/--dangerously-skip-permissions. As written, the builder must either change Claude out of scope or fail AC3. Narrow the ban to codex/codex-ops, or explicitly bring the Claude migration and its tests into scope."
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:27-29"
    finding: "The parent spec_ref points at backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md, but at the requested SHA that path is unreachable and current main has 087 in pending_review; once blocked_by is cleared it should be in complete. The builder loop must read every spec_ref before implementation, so this stale path will break the run. Point the ref at the lifecycle path the builder will actually have after 087 lands, or add an explicit resolution note."
---

## Codex Review

Verdict: `pushback`.

The trust-boundary direction is right, but the spec is not implementable as written. The predecessor 087 defines the capture enum, but its wired headless capture is still `committed_file`, and 087b does not say which non-file capture path the wrapper should use once the child is read-only. The spec also treats `agent_sandbox` as if it controls runtime, while the actual Codex sandbox is currently carried in the resolved `argv` vector.

Required patches:

1. Pin the new capture path: choose the 087-defined capture kind the child will emit under read-only, describe where the wrapper reads it, and add tests for successful publish plus empty/hung child queue-error.
2. Make sandbox enforcement runtime-falsifiable: assert codex/codex-ops resolved argv no longer contains `danger-full-access`, or make the gate derive/reject argv from `agent_sandbox`.
3. Resolve the Claude scope contradiction in AC3.
4. Fix the stale 087 `spec_ref` path before a builder tries to claim this after 087 lands.
