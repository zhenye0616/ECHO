---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 3
reviewer: "codex"
artifact_sha: "d9f09b267b26637ed648cfe7d6c1b248dd833dbd"
completed_at: '2026-05-16T03:57:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC0 lines 128-133"
    cross_ref:
      round: 2
      reviewer: "codex"
      finding_index: 1
    finding: >-
      The r3 patch removes `request.py` from the main trigger bullets, but AC0's best-effort contract still says "request.py's coord_invoke call" must be non-fatal and repeats "Same in request.py". That directly contradicts the adjacent invariant that `request.py` must never spawn reviewers before the watcher push, and it leaves the builder with two incompatible instructions for the exact high-risk path r2 was supposed to eliminate. Patch line 133 to cover only wrapper-side `coord_emit` and post-push watcher/skill `coord_invoke` calls, or make any `request.py` mention explicitly diagnostic-only with no MCP invocation.
  - severity: "medium"
    where: "AC7 lines 244-245; tools/review-queue/schemas/request.schema.json lines 7-16; tools/review-queue/request.py lines 95-103"
    cross_ref:
      round: 2
      reviewer: "codex-ops"
      finding_index: 3
    finding: >-
      AC7 says an unattended launchd fallback has no incoming coord_invoke correlation id, then "picks up `correlation_id` from the request.md itself" so fallback and active-invoked ticks use the same round id. The current request frontmatter schema has `additionalProperties: false` and no `correlation_id` field, and `request.py` only writes item_id/round/spec_commit_sha/artifact_path/class/requested_at/requested_reviewers/focus_hints. As written, a builder cannot implement the fallback contract without either violating request validation or inventing a second correlation id. Add `correlation_id` to the request schema/write path, or change AC7 to derive a deterministic round correlation id from existing request fields and require `coord_invoke` to use that same derivation.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r3 fixes close the large structural issues from r2: active invocation is now post-push in the main flow, daemon-authored subject attribution is explicit, and the deadline state machine is concrete.

Two narrow patches remain before this should be claimed. First, remove the leftover `request.py` invocation language so the spec has a single ordering rule. Second, make the correlation id source for launchd fallback ticks implementable against the current request schema, either by adding the field or by specifying a deterministic derivation.
