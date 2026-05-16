---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 2
reviewer: "codex-ops"
artifact_sha: "5beaf38b35336b0e25142f5ac01e6db22a18c1ba"
completed_at: '2026-05-16T03:45:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:20-23,121-127"
    finding: >-
      The r2 patch still leaves `request.py` as a coord_invoke caller even though AC0 says any role invoking a reviewer must first push the artifact that reviewer will read. In production `request.py` runs before the watcher dispatch commit; if it best-effort spawns a reviewer from that pre-push state, the reviewer pulls origin, finds no request, exits no-op, and can still emit tick_start/tick_end or close the pre-spawn deadline for the same round correlation. That gives the strategist a false healthy/completed signal and can short-circuit coordination before any response file exists. Remove `request.py` as a spawning caller, or make it a no-spawn validation/logging path until the request path is visible on origin, and add a test proving no wrapper is spawned before the post-push watcher hook.
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:122,191-193,208-214,220-224"
    finding: >-
      The daemon is required to append role-attributed `coord:reviewer_invoked` and `coord:deadline_missed` events, but AC5 says role is always derived from the caller header and caller-supplied role is ignored. A daemon heartbeat or spawn path is not the missed reviewer, so the implementation either has no valid `X-Echo-Role` for the subject, writes these events as a daemon role, or adds an undocumented bypass that conflicts with the spoofing rule. Any of those outcomes breaks per-role `coord_status()` and can hide the exact missed reviewer at runtime. Specify an internal emitter contract with separate authenticated emitter and subject_role fields, define the resulting source/metadata attribution, and test that reviewer_invoked/deadline_missed for codex-ops are stored and reported under codex-ops.
  - severity: "medium"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:121-128,212,230-233"
    finding: >-
      Launchd/manual fallback ticks have no `coord_invoke` request_path or correlation_id, yet AC7 requires `_run_reviewer.sh` to emit tick_start/tick_end immediately after log redirect and AC5 makes correlation_id mandatory. On the unattended fallback path, the wrapper has not selected a request yet, so it can only omit coord emission or invent an uncorrelated run id that cannot be tied to a round, pre-spawn deadline, or short-circuit decision. Define the no-args wrapper semantics explicitly, such as a poll-run correlation/event type for scheduler health plus request-scoped events after candidate selection, and add a launchd-style no-args wrapper test with the daemon up.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r1 fixes close the original pre-spawn and daemon-down concerns, but r2 still has runtime gaps around when active invocation is allowed, how daemon-authored role events are attributed, and how scheduler fallback ticks produce valid correlation ids.
