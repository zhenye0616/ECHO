---
item_id: "2026-05-19-063-raycast-sessions-as-objects"
round: 1
reviewer: "codex-ops"
artifact_sha: "01ecb9d"
completed_at: '2026-05-19T22:41:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:128"
    finding: "SessionDetail depends on an immutable subprocessLogPath, but the referenced runner currently creates the per-run log internally and only updates latest.log; AgentRun exposes no path (tools/raycast-echo/src/lib/agent-runner.ts:93,227-245,248-255). Because this spec also treats agent-runner as unchanged, a builder is likely to reconstruct the path or use latest.log, which breaks under overlapping Raycast asks: a later run retargets latest.log, so Open/Tail can show the wrong session. Add an AC that exposes the exact log path from startAgent at session start and tests two overlapping runs storing distinct paths."
  - severity: "high"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:127"
    finding: "auditCalls are persisted as the session's evidence, but the collection model is only a since/until time slice of the process-global /mcp/recent-calls buffer. The endpoint can filter by time/status only (src/mcp/request-log.ts:105-112, src/mcp/server.ts:135-147), so any concurrent Raycast ask, MCP client, or coord tick inside the same window will be stored into this session's timeline/sourceBreakdown. In unattended production use that makes SessionDetail evidence confidently wrong. The spec needs a run-correlation strategy or an explicit single-live-ask lock plus interleaved-call tests before AC3/AC4 can be trusted."
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:134"
    finding: "Sessions are written with status=running before spawn and AC6.5 says running sessions are never evicted, but the spec has no startup reconciliation for rows whose Raycast command died before recordSessionEnd. Sleep, crash, extension reload, or a killed agent can leave immortal running rows; repeated failures eventually bypass MAX_SESSIONS and keep Resume/SessionsList showing work no process owns. Require reconciliation on first read, for example marking rows older than maxRuntime/log-mtime as cancelled or errored before eviction."
---

# codex-ops review

Verdict: proceed_after_patches. The shape is viable, but the spec needs the runtime identity/recovery patches above before a builder can ship the promised inspectable sessions safely.
