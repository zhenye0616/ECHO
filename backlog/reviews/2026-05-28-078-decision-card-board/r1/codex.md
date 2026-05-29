---
item_id: "2026-05-28-078-decision-card-board"
round: 1
reviewer: "codex"
artifact_sha: "9f126461b80f3ea035ec0d40f87d926e95afcf7a"
completed_at: '2026-05-29T03:07:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:87-100; skills/review-queue-watch.md:85-87; tools/review-queue/combine.py:634-737 at 9f12646"
    finding: >-
      AC2/AC3 hinge on `awaiting the founder`, `not-yet-dispositioned`, and `resets on touch`, but the spec never names a durable file/field that records a founder touch or a resolved decision. The current queue artifacts expose `combined_verdict`, `escalated_to_founder`, response filenames, optional `next_round`, and body tables whose disposition cells start as `_strategist fills_`; the watcher skill says founder-escalated rounds are journaled and then the watcher exits. None of that is a stable, machine-readable "founder touched this decision" marker. A builder must invent an inference from body placeholders, later request directories, backlog status, or journal prose, which can leave stale cards visible or hide real pending founder decisions. Patch the spec with an exact predicate and tests, for example "card iff latest round's combined frontmatter has `escalated_to_founder: true` and no newer r<N+1>/request.md / no accepted disposition marker", plus the concrete source that resets A1.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:88,99; tools/review-queue/combine.py:56-88,435-461 at 9f12646"
    finding: >-
      A2 requires detecting a recurring >=MED finding across rounds and escalating when its spec line moved, but the current combined contract only normalizes/bridges `where` values within a single round. Across rounds, reviewer `where` strings are free text and line-number based, and `cross_ref` points to findings in the same reviewer schema context rather than giving a persistent finding id across future rounds. The "real 072 round sequence" test requirement is not enough to tell a builder whether to match on normalized finding text, primary `where`, `cross_ref`, spec diff hunks, or some combination. Patch AC3/AC7 with the actual A2 fingerprint and line-move algorithm, or explicitly defer A2 so v0 only ships A1.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:19-20,89; tools/raycast-echo/src/lib/mcp.ts:84-135 at 9f12646"
    finding: >-
      AC4 requires `AbortController + interval torn down on dismount`, but the current Raycast MCP client owns its own `AbortController` inside `callTool()` and exposes no caller-provided `AbortSignal`; the proposed `pendingDecisions(repoPath: string)` signature gives `decisions.tsx` no way to abort an in-flight fetch on unmount. A builder can clear the interval and ignore late results with a `cancelled` flag, but cannot satisfy the stated abort behavior through the additive client method as written. Patch the spec/tests to either add an optional signal/timeout parameter to `pendingDecisions`/`callTool`, or relax the acceptance criterion to interval cleanup plus stale-result suppression.
---

# Codex review

Verdict: `proceed_after_patches`.

The DecisionCard direction is implementable against the current repo, but the builder needs a tighter machine contract before this should be claimed. The main issue is not the daemon fs-read choice itself; it is that the card source predicate and alarm reset semantics currently depend on concepts the queue does not encode as stable data. The Raycast side also needs a small API contract patch if abort-on-unmount is meant literally rather than as stale-result suppression.
