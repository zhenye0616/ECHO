---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 5
reviewer: "codex"
artifact_sha: "2d15276209d77278022d2c1bff4929d64d46f234"
completed_at: '2026-05-16T04:16:37Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:133"
    finding: >-
      Pinned-request active trigger is not wired to a real wrapper entrypoint. AC0 requires coord_invoke(role, request_path, correlation_id) to spawn the reviewer wrapper and make the reviewer prompt review that exact request, but the concrete argv example calls `codex exec ... --input-file ... --correlation-id ...`; the installed `codex exec` exposes neither flag, the existing `tools/review-queue/run-codex-reviewer.sh` driver execs `_run_reviewer.sh` without forwarding `$@`, and the actual candidate selection still lives in the review prompt scan loop. As written, a builder can add coord_invoke and still have the active trigger fail at CLI parsing or fall back to scan-pick instead of the requested round. Patch the spec to name the real wrapper CLI/env handoff, include the driver plus `skills/.claude` reviewer prompt adapters in `files_to_modify`, and require a pinned-mode test that proves the selected request bypasses scan-pick.
  - severity: "medium"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:137"
    finding: >-
      Pinned-request mode does not explicitly preserve the 043 per-round roster guard. The current reviewer loop only considers a request after checking `combined.md`, an existing reviewer response, and `requested_reviewers` membership; AC0's pinned path only names request existence and correlation_id mismatch as bind failures. That creates an alternate path where a bad coord_invoke(role, request_path, correlation_id) can make Codex review a round that did not request Codex, violating the roster-as-source-of-truth invariant. Add pinned-mode validation for requested_reviewers, pre-existing response, and combined.md, with a test fixture that rejects/no-ops the wrong-role request before any response write.
---

## Findings

1. HIGH — Pinned-request active trigger is not wired to a real wrapper entrypoint.

AC0 says `coord_invoke(role, request_path, correlation_id)` must spawn the wrapper and force that exact request. The concrete argv example targets `codex exec` with `--input-file` / `--correlation-id`, but this local `codex exec` has no such flags. The current `run-codex-reviewer.sh` also discards args, and the candidate selection logic still lives in the reviewer prompt's scan loop. Without a concrete wrapper CLI/env handoff and prompt changes, the active trigger can fail or silently scan-pick.

2. MEDIUM — Pinned-request mode drops the existing roster guard unless the spec says otherwise.

The normal loop skips rounds when `combined.md` exists, the reviewer response exists, or `requested_reviewers` does not include the current reviewer. The pinned path only calls out missing request and correlation mismatch. It should preserve those same terminal/no-op checks and test the wrong-role case.
