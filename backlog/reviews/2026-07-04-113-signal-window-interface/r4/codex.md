---
item_id: "2026-07-04-113-signal-window-interface"
round: 4
reviewer: "codex"
artifact_sha: "18c01009260d97adb43ed8dc7e38f66412ee7b1d"
completed_at: '2026-07-04T19:45:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-04-113-signal-window-interface.md:36"
    finding: "AC3 defines cursor filtering and ordering, but does not pin where `limit` is applied relative to `since`/`until`/`scope`/`loop`. Patch AC3 to require all predicates are applied before the selected ordering and final limit, and add a cursor+loop or cursor+scope test with leading filtered-out rows and a small limit so an eligible later row cannot be hidden by a pre-filter limit."
  - severity: "medium"
    where: "backlog/proposed/2026-07-04-113-signal-window-interface.md:32"
    finding: "AC1 requires full untruncated content/metadata, but the Tests section only asserts union shape, `sequence_id`, and import closure. Patch `tests/trace/signal-window.test.ts` to insert raw and derived entries with content/metadata longer than the existing wire caps and assert exact round-trip fidelity; import closure alone will not catch local truncation or a reused capped adapter."
---
