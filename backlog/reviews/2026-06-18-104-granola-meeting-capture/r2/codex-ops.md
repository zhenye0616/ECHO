---
item_id: "2026-06-18-104-granola-meeting-capture"
round: 2
reviewer: "codex-ops"
artifact_sha: "ce14242cfdd82015fee8769b8c7e158317c3c17f"
completed_at: '2026-06-21T19:27:46Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-18-104-granola-meeting-capture.md:74"
    finding: "AC3 says restart dedupe uses note id + updated_at, but AC1 and the Atom shape require stable per-note atom keys so edited notes upsert in place. If the builder follows the AC3 wording, every Granola edit creates a new summary/transcript pair during unattended polling, leaving stale duplicates in search until manually cleaned. Patch AC3 to keep atom dedupe keys as note_id + atom kind, and use updated_at only for checkpoint overlap or boundary filtering."
---

## Review

One operational patch is required before build: the checkpoint tie-breaker wording needs to be separated from atom identity so the poller remains idempotent under edited notes.
