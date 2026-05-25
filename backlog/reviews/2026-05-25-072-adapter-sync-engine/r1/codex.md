---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 1
reviewer: "codex"
artifact_sha: "4345f0a6d80be12461d1085330c52effb5b89231"
completed_at: '2026-05-25T23:42:41Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:92"
    finding: >-
      AC2 tells the builder to use smol-toml because it preserves comments and formatting, but smol-toml@1.6.1 does not carry comments through parse/stringify; a temp install round-trip dropped both top-level and [mcp_servers.echo] comments. That makes the mandatory comment/formatting preservation in AC2/AC7 impossible if the builder follows the primary instruction. Patch the spec to require a byte-range editor for the target table, using a parser only for target-value comparison, or explicitly pre-approve the fallback instead of requiring an escalation.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:181"
    finding: >-
      AC6 says populateEchoSkills failure should be returned in skillsPopulated rather than thrown, but the SyncResult interface types skillsPopulated only as SkillSyncResult and overallOk is defined only from agent and role results. This leaves the load-bearing first step untyped and untested on failure. Patch SyncResult to include the error variant, define overallOk false when population fails, and add an adapter-sync test for a missing or unreadable repoSkillsDir.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:68"
    finding: >-
      The marker/TOML/JSON conflict model requires last-known ECHO writes (previousEchoSection/previousServerConfig) to distinguish a user edit from ECHO's own older output, but 072 never writes or reads the adapter cache that the parent design and 070 layout reserve under ~/.echo/adapters. A version upgrade with a changed echoSection will conflict unless some later caller invents persistence. Patch 072 to either persist the last rendered per-agent sections/configs in ECHO_HOME_PATHS.adapters, or state that 073/074 own that cache and make the previous* inputs mandatory when callers intend updates.
  - severity: "low"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:11"
    finding: >-
      The frontmatter leaves task_state_ref empty, and the artifact commit has no backlog/task-state/2026-05-25-072-adapter-sync-engine/strategist.md pointer. That violates the role-typed task-state speccing contract and removes the builder cold-start anchor. Patch the frontmatter to self-reference the task-state directory and add a lint-clean strategist.md before claim.
---

# Code-Grounded Review

Verdict: pushback.

## Findings

1. HIGH: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:92` says to use `smol-toml` because it preserves comments and formatting, while AC7 requires comment/formatting preservation for the Codex config tests. I verified `smol-toml@1.6.1` in a temp install against a small config with top-level and `[mcp_servers.echo]` comments; `stringify(parse(src))` dropped the comments. The package README also describes a parser/serializer, not a comment-preserving document AST. A builder following the primary instruction cannot satisfy the acceptance tests without hitting the escalation branch immediately. Patch the spec to require key-targeted byte-range editing up front, with a TOML parser used only to parse/compare the target table value, or explicitly pre-approve the fallback path so the builder is not forced to stop on first read.

2. MEDIUM: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:181` says `populateEchoSkills` failure is returned in `skillsPopulated` rather than thrown, but the `SyncResult` block at line 190 types `skillsPopulated` only as `SkillSyncResult`, and `overallOk` at line 196 ignores first-hop skill population. This leaves the most important ordering step untyped on failure. Add the `{ ok: false; error: string }` variant to the public interface, define that any population failure makes `overallOk: false`, and add an `adapter-sync.test.ts` case where `repoSkillsDir` is missing or unreadable.

3. MEDIUM: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:68` and the adapter signatures rely on `previousEchoSection` / `previousServerConfig` to tell ECHO's own previous write apart from a user hand-edit. The parent design reserves `~/.echo/adapters/` for cached adapter outputs, and 070's layout says that directory is populated by 072, but this spec never writes or reads it. That means a later ECHO version with a changed generated section will conflict against ECHO's own old section unless 073/074 invent a persistence mechanism. Either make 072 persist the last rendered per-agent sections/configs under `ECHO_HOME_PATHS.adapters`, or explicitly assign that cache to 073/074 and make the `previous*` values a required caller contract for update flows.

4. LOW: `backlog/ready/2026-05-25-072-adapter-sync-engine.md:11` leaves `task_state_ref` empty, and `git ls-tree` at the artifact SHA shows no `backlog/task-state/2026-05-25-072-adapter-sync-engine/strategist.md`. This breaks the role-typed task-state contract for new specs. Add the self-reference plus a lint-clean strategist pointer before the item becomes claimable.

## Verification Notes

I reviewed the pinned artifact at `4345f0a6d80be12461d1085330c52effb5b89231`, the inline request, the referenced 070/071 contracts on `main`, the parent coord-layer design section, the current `package.json`, the founder's referenced `~/.codex/config.toml`, and `smol-toml@1.6.1` package behavior in a temporary install. I did not consume any task-state pointer for this reviewer tick.
