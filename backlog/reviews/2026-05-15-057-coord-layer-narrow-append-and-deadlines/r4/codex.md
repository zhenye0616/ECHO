---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 4
reviewer: "codex"
artifact_sha: "d9aa9ca3a95bac9044b09c9488ed32261d37c0fa"
completed_at: '2026-05-16T04:05:53Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 lines 153; AC3 lines 206-209; AC5 lines 230-234; AC7 lines 254-258"
    cross_ref:
      round: 3
      reviewer: "codex-ops"
      finding_index: 4
    finding: >-
      The r4 patch adds scheduler-tier `tick_run_id` in AC3/AC5, but AC1 still defines the write tool as `coord_emit(event_type, payload, correlation_id, expected_by?)`. That signature makes `correlation_id` look required and gives no input slot for `tick_run_id`, while AC7 phase 1 must emit `scheduler_health`/`scheduler_health_done` with no round correlation id. A builder can satisfy the AC1 tool contract and still reject every scheduler-tier health event, erasing the no-candidate/fallback observability r3 was supposed to add. Patch AC1 to make `coord_emit` a per-tier/discriminated input (`correlation_id` required only for round-tier, `tick_run_id` required only for scheduler-tier, plus `schema_version`) and add a fixture that calls the registered MCP tool with a scheduler-health payload and no `correlation_id`.
  - severity: "high"
    where: "AC0 line 129; AC2 lines 169-198; AC7 line 258"
    finding: >-
      `coord_invoke` reads an `invoke_command` string, substitutes caller-controlled `request_path` / `correlation_id` tokens, and spawns the wrapper, but the spec never says whether this is shell-free argv spawning or validates the substituted values before launch. Since `coord_invoke` is a loopback MCP action surface, a naive implementation that runs the substituted string through a shell turns `request_path` into command injection under the founder account; even without shell injection, an arbitrary path can send a reviewer at a non-round artifact. Require `invoke_command` to be represented/executed as an argv vector or otherwise shell-free, validate `correlation_id` as uuid4 and `request_path` as a repo-relative `backlog/reviews/<item>/r<N>/request.md` path with no traversal, and add a negative test with shell metacharacters/traversal proving nothing is executed and no `reviewer_invoked` atom is appended.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r3 blockers are materially fixed: `request.py` is no longer an invocation point, `correlation_id` is now committed in `request.md`, fallback can share it, and scheduler-tier vs round-tier keyspaces are spelled out. Two implementation-facing patches remain before claim: update the `coord_emit` input contract to match scheduler-tier events, and lock down `coord_invoke` command spawning so the active trigger cannot become an unsafe shell-template surface.
