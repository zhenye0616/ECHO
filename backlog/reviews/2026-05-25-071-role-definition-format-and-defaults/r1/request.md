---
item_id: 2026-05-25-071-role-definition-format-and-defaults
round: 1
spec_commit_sha: 8fa6ecc4ba42ff2279f66aadc8f89597efcf6ff4
artifact_path: backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md
class: narrow
requested_at: '2026-05-25T22:42:40Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8fc60c15-2b31-4b25-b071-fb9f813db16b
focus_hints: "071 defines the role TOML schema + loader + 3 default roles. Verify\
  \ the 12 judgment calls: (1) AC1.1 name removed from [role] table, derived from\
  \ filename \u2014 loader rejects body name; (2) AC1.2 capabilities controlled vocabulary\
  \ of 7 entries {fs.read, fs.write, git.read, git.write, network, mcp.echo.read,\
  \ mcp.echo.write} \u2014 closed set, additions require new spec; (3) AC1.3 sandbox\
  \ enum read-only|workspace-write \u2014 no danger-full-access in V1; (4) AC1.4 mcp_servers\
  \ carries NAMES not URLs \u2014 role file is requirement; URLs are per-agent adapter\
  \ config (072); (5) AC1.5 [role.output].format stays free-form for V1, promote to\
  \ enum at 5+ roles; (6) AC1.6 unknown top-level keys \u2192 HARD ERROR (strict-by-default);\
  \ (7) AC2.5 smol-toml@^1.3.1 chosen (zero-dep, ESM, TOML 1.0.0); (8) AC2.1 loader\
  \ at src/echo-home/roles.ts to avoid naming conflict with existing src/coord/roles.ts\
  \ (057a coord SLA loader, different concept); (9) AC2.4 loader does skill-existence\
  \ check against skills/<name>.md \u2014 refuses to load roles referencing missing\
  \ skills; has optional skillsRoot overload for ~/.echo/-rooted runs; (10) AC3.1\
  \ strategist.toml skills include review-pending + merge-and-cleanup per CLAUDE.md\
  \ Reviewer Independence Rule, not just review-queue-watch; (11) AC3.3 builder.toml\
  \ skills include both process-backlog + process-backlog-batch (same role, multi-iteration\
  \ form); (12) AC4.2 reviewer sandbox=read-only locked as regression test pin. Cross-spec:\
  \ 071's canonical asset path assets/echo-roles/*.toml must match what 072 copies\
  \ from. Implementation depends on 070 + 071 having both landed, but spec writing\
  \ was parallel (blocked_by:[] is correct here). Ops lens: loader's skill-existence\
  \ check could fail silently if skillsRoot points to wrong dir post-install \u2014\
  \ see AC2.4 R3 note about the optional skillsRoot overload for ~/.echo/-rooted contexts."
---

# What to review

Read `backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md` at commit `8fa6ecc4ba42ff2279f66aadc8f89597efcf6ff4`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
