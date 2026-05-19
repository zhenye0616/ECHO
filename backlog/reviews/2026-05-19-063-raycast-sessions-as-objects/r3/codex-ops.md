---
item_id: "2026-05-19-063-raycast-sessions-as-objects"
round: 3
reviewer: "codex-ops"
artifact_sha: "0f997064181a955c1a42539c83d718c43be64c95"
completed_at: '2026-05-19T23:05:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:242"
    finding: >-
      AC6.7 requires auditCalls to be unioned by call id, but the daemon payload this spec is allowed to consume does not expose one. The private MCP request-log entry has an id, yet publicClone returns only ts/tool/args_shape/result_shape/duration_ms/status, and the Raycast AuditCall type mirrors that id-less shape. In production, overlapping recordSessionUpdate writes cannot reliably distinguish a pending call from the same call after it finishes, or two same-tool calls in the same millisecond, so the merge either duplicates audit rows or drops the terminal result. Patch the spec to either add an explicit in-scope public audit id, or define a stable client-side merge key and pending-to-terminal replacement rule that works with the existing /mcp/recent-calls payload, then test that exact key path.
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:242"
    finding: >-
      The mergeAndWrite scalar rule can regress a finished session back to running. AC6.3 keeps debounced recordSessionUpdate writes active while AC6.4 writes the final done/errored/cancelled state on exit; with "incoming non-null overrides" and full Session-shaped updates, a late 80 ms update that was queued before exit can re-read the just-completed row and overwrite status="done" with status="running". That leaves the session out of warm resume and protected from eviction as an immortal running row. Patch AC6.7 so update writes are Partial<Session> patches that cannot touch lifecycle fields, or define monotonic status precedence/completedAt handling; add a test where recordSessionEnd lands before a pending debounced update.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r2 runtime fixes mostly landed: the log-mtime reconciliation branch is gone, the fork flow now waits in TypingState before spawning, and SessionDetail has a non-null missing-log fallback. The remaining blockers are both in AC6.7's merge contract. As written, the merge cannot safely preserve audit detail with the current daemon payload, and a late debounced update can corrupt the session lifecycle after completion.
