---
item_id: "2026-06-08-098-per-actor-journal-shards"
round: 3
reviewer: "codex-ops"
artifact_sha: "595b4ade56a784b6cb55c648908410f9475d9c68"
completed_at: '2026-06-08T22:18:44Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-098-per-actor-journal-shards.md:Why/AC4"
    finding: >-
      The spec relies on CLAUDE.md as the interim discipline source while explicitly deferring active skills that still quote the old shared journal path. Because watcher and interactive writers are discipline-enforced, any runtime prompt that still says to append `mcp-interactions-journal-YYYY-MM.md` can continue writing the frozen shared file after cutover and reintroduce the same dirty rebase surface. Required patch: either include the active instruction surfaces that agents actually load for journal writes in this item, or add a gating AC that the shard cutover is not considered enabled for non-wrapper writers until the post-merge skill sync has landed and been verified.
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-098-per-actor-journal-shards.md:AC5"
    finding: >-
      AC5 only requires fixture tests for `journal-cat.sh`, but AC3 makes the real frozen shared 2026-06 journal part of every merge and also makes malformed blocks fail loudly. If existing pre-cutover entries or preamble text do not match the parser, the first unattended HTML regeneration or synthesis read fails immediately after cutover. Required patch: add a real-data verification command to AC5, for example `tools/dogfooding/journal-cat.sh 2026-06 >/tmp/echo-journal-cat-2026-06.md`, and require it to succeed after the cutover note is appended.
---
