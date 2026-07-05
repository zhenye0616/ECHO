---
item_id: 2026-07-05-117-loop-observability-stations-1-3
round: 4
spec_commit_sha: 4b011269e27feff98a068a177d145bbb5ec02c00
artifact_path: backlog/proposed/2026-07-05-117-loop-observability-stations-1-3.md
class: narrow
requested_at: '2026-07-05T23:40:32Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7c302d83-daff-4bf9-8508-4924a09108bf
focus_hints: "Verify: AC2 malformed/unreadable/partial granola-checkpoint.json + storage\
  \ read failure degrade station-1 only (path+error+remediation), rest renders; AC4\
  \ <port> pinned to doctor's resolved MCP port (--port > ECHO_MCP_PORT > 38478, resolveMcpPort),\
  \ lookup must not re-derive; AC6 consolidated into a single read-path degradation\
  \ matrix \u2014 confirm NO prior fixture case dropped (checklist: healthy/never-ran/stale/failing-notes/dist-stale/src-dev/port-owner-unverifiable/argv-race/missing-src-or-dist/malformed-artifact)\
  \ + station-1 rows + port assertion added. This is reformatting+extension, not behavioral\
  \ removal."
---

# What to review

Read `backlog/proposed/2026-07-05-117-loop-observability-stations-1-3.md` at commit `4b011269e27feff98a068a177d145bbb5ec02c00`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
