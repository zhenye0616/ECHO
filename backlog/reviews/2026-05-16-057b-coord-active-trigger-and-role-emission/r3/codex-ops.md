---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 3
reviewer: "codex-ops"
artifact_sha: "c38f9ddd40d404438fd5a9a8d0d2470a0dd5a726"
completed_at: '2026-05-16T07:24:50Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:115"
    finding: >-
      AC0 tells the builder to resolve the wrapper from src/mcp/tools/coord-invoke.ts with new URL("../../tools/review-queue/run-${role}-reviewer.sh", import.meta.url). From that module location, ../../tools lands under src/tools (or under dist/tools after build), not the repo-root tools/review-queue directory. In production the daemon will reject every active trigger as wrapper-missing/non-executable before spawning, so the 057b runtime path remains launchd-fallback-only and the motivating silent-fail path is not covered. Patch the spec to derive from the already captured repo root / ECHO_REPO_ROOT, or use a relative path that is correct for both source and built entrypoints, and keep the cwd-independent test asserting the real wrapper path.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:160"
    finding: >-
      The scheduler-health deadline is opened at log-redirect-open, but AC7 only closes it with scheduler_health_done before process exit. A normal unattended Codex review can run longer than the stated ~120s scheduler-health deadline, so coord_status() will surface false deadline_missed alerts while the reviewer is simply still working. Close scheduler health after the scheduler handoff/bind phase succeeds, add a heartbeat, or give this event a deadline longer than the maximum expected review runtime; add a long-running reviewer fixture so this does not regress.
---

# codex-ops review

Verdict: `proceed_after_patches`.

## Findings

### F1 — HIGH — wrapper path resolves outside the repo-root tools directory

AC0 tells the builder to resolve the wrapper from `src/mcp/tools/coord-invoke.ts` with `new URL("../../tools/review-queue/run-${role}-reviewer.sh", import.meta.url)`. From that module location, `../../tools` lands under `src/tools` (or under `dist/tools` after build), not the repo-root `tools/review-queue` directory. In production the daemon will reject every active trigger as wrapper-missing/non-executable before spawning, so the 057b runtime path remains launchd-fallback-only and the motivating silent-fail path is not covered.

Patch the spec to derive from the already captured repo root / `ECHO_REPO_ROOT`, or use a relative path that is correct for both source and built entrypoints, and keep the cwd-independent test asserting the real wrapper path.

### F2 — MEDIUM — scheduler-health can false-positive during normal long reviews

The scheduler-health deadline is opened at log-redirect-open, but AC7 only closes it with `scheduler_health_done` before process exit. A normal unattended Codex review can run longer than the stated ~120s scheduler-health deadline, so `coord_status()` will surface false `deadline_missed` alerts while the reviewer is simply still working.

Close scheduler health after the scheduler handoff/bind phase succeeds, add a heartbeat, or give this event a deadline longer than the maximum expected review runtime; add a long-running reviewer fixture so this does not regress.
