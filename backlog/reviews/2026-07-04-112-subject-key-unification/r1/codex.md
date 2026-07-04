---
item_id: "2026-07-04-112-subject-key-unification"
round: 1
reviewer: "codex"
artifact_sha: "a39efaf1355c448da134ca3d1c77319c4d8b7011"
completed_at: '2026-07-04T19:19:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "files_to_modify / AC3"
    finding: "AC3 requires proving `search_memories` free-text and `metadata_match: {canonical_subject: ...}` return both Granola signal and team-decision atoms, but `files_to_modify` does not include the search/filter implementation path. Patch the spec to either add the concrete search/metadata filter source file to `files_to_modify` or explicitly name the existing implementation path that already supports this, so the builder has authority to fix the retrieval path if the AC3 test fails."
  - severity: "medium"
    where: "Acceptance Criteria"
    finding: "The load-bearing AC2/AC4 tests are described only generically. Patch the spec with a concrete Tests section naming exact test files and assertions, including a byte-stable pre-change fixture for `team-decision:<normalized>` dedupe keys and a mixed-generation store fixture proving latest-wins fallback for atoms that only have `normalized_subject`."
---

## Findings

The spec is directionally implementable, but it needs two mechanical patches before build handoff: give the builder authority or a pinned existing path for the AC3 retrieval behavior, and make the dedupe-key / legacy-fallback tests concrete enough to prevent accidental format drift.
