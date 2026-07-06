---
item_id: 2026-07-06-118-drift-join-nomination
round: 1
spec_commit_sha: 4f346177632468c1016598330d82158b7155bfe6
artifact_path: backlog/proposed/2026-07-06-118-drift-join-nomination.md
class: narrow
requested_at: '2026-07-06T00:36:00Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 990050f9-239e-4868-80da-db9cfb03299b
focus_hints: 'Judge the AI-free token-overlap (Jaccard) nominator: is the named-constant
  threshold+cap defensible, does it stay inside seam decision 19 (no AI/embeddings
  in plumbing) while reusing the existing brain judge as the precision gate (seam
  decision 18)? Is nominate-then-confirm checkpoint-safe under multi-nomination (pair-key
  includes both dedupe_keys)? Does separator-folding in the single shared normalizer
  preserve team-decision dedupe_key stability for separator-free subjects? Is the
  no-candidate near-miss counter+log the right observability to make seam-18 misses
  into data without an alias layer?'
---

# What to review

Read `backlog/proposed/2026-07-06-118-drift-join-nomination.md` at commit `4f346177632468c1016598330d82158b7155bfe6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
