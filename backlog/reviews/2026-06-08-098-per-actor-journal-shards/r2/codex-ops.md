---
item_id: "2026-06-08-098-per-actor-journal-shards"
round: 2
reviewer: "codex-ops"
artifact_sha: "676cd923e36165d0c2e651efc5a515762fbdecf5"
completed_at: '2026-06-08T22:08:28Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Locked decisions LD2 / Acceptance criteria AC4"
    finding: "The actor-slug rule still maps distinct unattended writers that can run concurrently onto the same shard: Claude reviewer ticks, watcher/strategist ticks, and interactive Claude all write the `claude` shard, while Codex reviewer ticks and interactive Codex both write the `codex` shard. That leaves part of the documented reviewer/watcher/monitor EOF-conflict class as a same-file conflict that the spec labels out of scope. Patch LD2/AC4 so every independently concurrent writer role or process class gets a stable shard slug, and keep the wrapper `REVIEWER_NAME` mapping consistent with that namespace."
---
