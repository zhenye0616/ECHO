---
item_id: "2026-05-29-081-raycast-command-disposition-and-removal"
round: 1
reviewer: "codex"
artifact_sha: "0b8346621f22625429d4c12e8f42f80f838615ef"
completed_at: '2026-05-30T05:42:13Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-29-081-raycast-command-disposition-and-removal.md:4,8,42,97; tools/blocked.py:27-35,167-172"
    finding: >-
      The artifact is already under backlog/ready while the spec says it is parked in backlog/inbox and must not be claimable until 080 AC8 and the disposition table are locked. The selector makes folder location authoritative and ignores status, so once this file is parseable it is a ready candidate with blocked_by empty, despite the artifact itself saying the gate is not met and the table is still pending. Keep the framework in backlog/inbox until promotion, or add a real machine-enforced blocker before placing anything in backlog/ready.
  - severity: "high"
    where: "backlog/ready/2026-05-29-081-raycast-command-disposition-and-removal.md:8; tools/blocked.py:93-117,155-159"
    finding: >-
      The inline comment on `blocked_by: []` is not compatible with tools/blocked.py's minimal frontmatter parser: it only recognizes an empty list when the scalar is exactly `[]`. In the current ready file this parses as a string, and `python3 tools/blocked.py --list-all` exits 2 with `blocked_by must be a list, got str`, which stops every builder selector run, not just 081. Move explanatory text out of the scalar line or use a multiline list/comment shape the parser accepts before this can be reviewed as a live ready item.
---

# Codex Review

Verdict: `pushback`.

The removal framework is directionally implementable, but the current artifact is not safe to hand to the builder queue. It is in the claimable `ready/` path while its own AC1 says it is not promoted, and the frontmatter shape currently breaks `tools/blocked.py` outright.
