---
item_id: "2026-05-20-065-raycast-cluster-resume"
round: 2
reviewer: "codex"
artifact_sha: "2c1224131c87c17b06d6277d7429a3abd9e28dee"
completed_at: '2026-05-21T05:37:37Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:141; backlog/ready/2026-05-20-065-raycast-cluster-resume.md:154"
    finding: "AC8 still treats per-instance await order as an atomic reservation. It requires two near-simultaneous opens, e.g. Promise.all, to produce exactly one startAgent call, but the prescribed flow is lookup -> unconditional recordSessionStart -> startAgent. Two AnswerView instances can both complete findLatestSessionForCluster before either writes the running row, then both create rows and both spawn agents. The spec needs a cluster-keyed in-flight reservation/lock or a conditional get-or-create-running-session API around lookup+write, and the concurrency test should target that primitive."
  - severity: "medium"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:146; tools/raycast-echo/src/components/AnswerView.tsx:123; tools/raycast-echo/src/lib/agent-runner.ts:121"
    finding: "The required recordSessionStart-before-startAgent order is underspecified against the current log-path contract. AnswerView currently gets subprocessLogPath from run.sessionLogPath only after startAgent returns, and startAgent creates the session log internally before spawning. If the builder follows AC8 literally, the reserved session must be written with null subprocessLogPath, regressing SessionDetail log access; if they keep the log path, they have to call startAgent first and violate AC8. Add an explicit preallocated-log/prepare-run API, or a post-start session patch plus tests that prove the log path survives."
  - severity: "medium"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:139; backlog/ready/2026-05-20-065-raycast-cluster-resume.md:19; tools/raycast-echo/package.json:72"
    finding: "The AC7 test contract asks to mount EchoContext, click ClusterRow, let mocked agent-runner events flow, and observe a hook-driven re-render, but the current test stack only has Vitest/TypeScript and existing component tests inspect React elements by direct function invocation. There is no React renderer or Testing Library dependency in package.json/package-lock, and those files are not in files_to_modify. Either add the test renderer dependencies and list the package files, or change the AC7 test contract to a pure exported helper/callback seam the existing harness can exercise."
  - severity: "low"
    where: "backlog/ready/2026-05-20-065-raycast-cluster-resume.md:14; backlog/ready/2026-05-20-065-raycast-cluster-resume.md:24; tools/raycast-echo/src/echo.tsx:249"
    finding: "The file map still points the ClusterRow accessory-chip work at EmptyState.tsx, but the production ClusterRow implementation lives in echo.tsx. EmptyState only calls renderCluster. This is easy for the builder to route around because echo.tsx is also listed, but the spec should remove the stale EmptyState ClusterRow wording or limit that file's role to passing sessions/refresh data."
---

# Codex review - round 2

Verdict: pushback.

The r1 patch language landed for the async helper, fork cluster inheritance, onSessionChanged bridge, normalizeSession round-trip, running/done status filter, and start-before-agent ordering. The remaining blocker is that the AC8 mechanism is not actually an atomic reservation, and the current runner API makes the required ordering ambiguous for subprocess log preservation.

## Findings

1. HIGH - AC8 still is not atomic. A per-AnswerView await order does not prevent two simultaneous mounts from both seeing no session before either writes the running row. The spec needs a cluster-keyed lock or conditional reservation API, plus a test against that API.

2. MEDIUM - AC8 conflicts with the current log-path flow. `subprocessLogPath` currently comes from `startAgent`, so the spec must say how to reserve before spawn without losing SessionDetail log access.

3. MEDIUM - The AC7 integration test needs a renderer dependency or a different test seam. The current package only has Vitest and the existing tests use direct element-tree inspection.

4. LOW - The file map still names `EmptyState.tsx` as the ClusterRow accessory edit site even though ClusterRow lives in `echo.tsx`.
