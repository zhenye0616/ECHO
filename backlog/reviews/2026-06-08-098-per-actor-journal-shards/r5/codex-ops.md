---
item_id: "2026-06-08-098-per-actor-journal-shards"
round: 5
reviewer: "codex-ops"
artifact_sha: "fe7d02bacdb5573461115753dd2e30aee0e3120c"
completed_at: '2026-06-08T22:34:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-098-per-actor-journal-shards.md:99"
    finding: "AC4's no-stale-path invariant enumerates CLAUDE.md, AGENTS.md, skills/*.md, and .claude/commands/*.md, but the Codex runtime also reads rendered ECHO skills from ~/.codex/skills/ECHO:*/SKILL.md; line 122 only reruns tools/sync-skills.sh, which does not refresh that cache. After cutover, an unattended Codex reviewer tick can still follow the stale installed skill and append to the frozen shared journal. Patch the spec to include the Codex rendered-skill surface in the cutover gate and require tools/install-echo-codex-skills.sh to be rerun or verified after canonical skills change."
---

## Findings

- **MEDIUM** `backlog/proposed/2026-06-08-098-per-actor-journal-shards.md:99` — AC4 omits the rendered Codex skill cache from the active instruction-surface set. `tools/sync-skills.sh` only updates Claude command copies, so the cutover can merge with repo surfaces aligned while Codex continues using stale installed `~/.codex/skills/ECHO:*/SKILL.md` instructions. Add the Codex skill installer/regeneration check to the same cutover gate.
