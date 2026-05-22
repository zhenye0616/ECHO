---
item_id: 2026-05-22-069-raycast-cold-start-continuity-hero
round: 2
spec_commit_sha: 656cce1a42a18110d2cbb8edf2f54d6735ac33d7
artifact_path: backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md
class: narrow
requested_at: '2026-05-22T20:17:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 00efb53f-ee10-40d3-baad-3ecb1a15bb00
focus_hints: 'Verify: (a) AC1b widens src/mcp/wire-shape/compact.ts rank_reason allowlist
  to the three reasons; AC3b compact-rank-reason test pins both survival + allowlist-filtering
  of future-unlisted reasons; (b) AC1 code_session_anchor uses artifact ''type'' field
  with ''repo''|''file''|''commit'' values and atom ''source.app === git''; no tautological
  cluster_id branch; (c) AC2 pickHero uses time_range.to and adds Raycast-side sessions.some(s
  => s.clusterId === top.cluster_id); hero text fallback is literal ''Untitled work''
  (no atom-preview fetch path); (d) Tests/DoD run root npm + (cd tools/raycast-echo
  && npm test && npm run typecheck); (e) hero test 5 pins linked-session-anchor fallback
  when substrate code_session_anchor is false.'
---

# What to review

Read `backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md` at commit `656cce1a42a18110d2cbb8edf2f54d6735ac33d7`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
