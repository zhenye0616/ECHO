---
item_id: "2026-07-04-112-subject-key-unification"
round: 1
reviewer: "codex-ops"
artifact_sha: "a39efaf1355c448da134ca3d1c77319c4d8b7011"
completed_at: '2026-07-04T19:19:05Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-04-112-subject-key-unification.md:30"
    finding: "AC4 only requires legacy fallback in queryLatestTeamDecisions and matchesQuery, but AC3's runtime retrieval path depends on search_memories free-text and metadata_match over canonical_subject. Existing team-decision atoms without canonical_subject can still disappear from unattended drift or loop queries. Patch the spec to require the search/metadata-match path to fall back to normalized_subject for decision atoms, or explicitly require an equivalent backfill-safe read path."
---
