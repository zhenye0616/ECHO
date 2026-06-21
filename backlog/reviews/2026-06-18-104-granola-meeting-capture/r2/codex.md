---
item_id: "2026-06-18-104-granola-meeting-capture"
round: 2
reviewer: "codex"
artifact_sha: "ce14242cfdd82015fee8769b8c7e158317c3c17f"
completed_at: '2026-06-21T19:29:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-18-104-granola-meeting-capture.md:108"
    finding: "AC3 says idempotent restart upserts by dedupe key '(note id + updated_at)', but AC1 and Architecture require stable per-note/per-kind keys (`granola:{note_id}:summary` and `granola:{note_id}:transcript`) so updated notes upsert in place. Patch AC3 to use the same stable note-id + atom-kind dedupe keys, with `updated_at` only as checkpoint/order metadata."
  - severity: "medium"
    where: "backlog/proposed/2026-06-18-104-granola-meeting-capture.md:102 and backlog/proposed/2026-06-18-104-granola-meeting-capture.md:115"
    finding: "The checkpoint/config paths are called absolute paths but are specified as `~/.echo/state/...`; programmatic filesystem calls will not expand `~`. Patch the spec to require resolving these through the repo's state-dir/home-dir convention or `path.join(os.homedir(), '.echo/state/...')`, and include this in the startup/config test contract."
---
