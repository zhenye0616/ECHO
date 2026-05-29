---
item_id: "2026-05-28-078-decision-card-board"
round: 3
reviewer: "codex-ops"
artifact_sha: "e5941df59d5c5287e11e39dfc255d0beeade955b"
completed_at: '2026-05-29T03:32:12Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:102; backlog/ready/2026-05-28-078-decision-card-board.md:105; backlog/ready/2026-05-28-078-decision-card-board.md:108; tools/raycast-echo/src/lib/mcp.ts:119-155"
    finding: >-
      The bounded freshness fetch is rate-limited, but it is not wall-clock bounded or forced non-interactive. In the Raycast path the MCP client aborts after roughly 2s, while the daemon-side `git fetch origin main` can still hang on DNS, a credential prompt, or a stuck remote unless the spec requires a child-process timeout and prompt suppression. That means a Decisions poll can time out before returning `upstream_stale=true`, and the server can accumulate stuck fetch children on later refresh windows instead of showing the stale-source banner. Patch AC1/AC7 to require the fetch runner to use a timeout shorter than the Raycast MCP timeout, non-interactive git env such as `GIT_TERMINAL_PROMPT=0` / disabled askpass, and to treat timeout or prompt failure exactly like offline: keep the last successful `upstream_checked_at`, set `upstream_stale=true`, and return a warning state. Add a hung-fetch fixture, not only an offline failure fixture.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:103; backlog/ready/2026-05-28-078-decision-card-board.md:116; tools/review-queue/dispatch-next-round.py:7-16; tools/review-queue/schemas/combined.schema.json:42-49"
    finding: >-
      The r2 close/reset fix is stated correctly in AC2, but J4 still says the resolved predicate is built from a `convergence call` and the presence of `r<N+1>/request.md`. That stale note reintroduces the exact runtime ambiguity the round was supposed to remove: a builder following J4 can parse body prose or request presence instead of the durable `next_round` frontmatter, leaving terminal/claim-ready cards with inconsistent close and A1-reset behavior. Patch J4 to match AC2 verbatim: `escalated_to_founder` + `next_round` + review-active backlog dir only, no convergence-call/body parsing and no request-presence predicate.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The main r2 contracts are close: `upstream_checked_at` / `upstream_stale` make `behind=0` honest, and AC2 now accepts the claim-ready-but-unclaimed card as a real pending action with a frozen A1 count. The remaining production gaps are in the runtime envelope around the new fetch and one stale predicate note that could steer implementation back to body parsing.
