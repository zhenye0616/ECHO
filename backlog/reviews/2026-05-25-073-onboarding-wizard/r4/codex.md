---
item_id: "2026-05-25-073-onboarding-wizard"
round: 4
reviewer: "codex"
artifact_sha: "02ab43b0e4020c4f04a81cf52514061dc561a2e9"
completed_at: '2026-05-26T03:28:57Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:431-469,605-614,661-673"
    finding: >-
      AC6 adds a new user-facing probe outcome, `reason: 'mcp-not-configured'`, and R8 / the DoD rely on that exact reason to make the Claude Code MCP wiring gap actionable. The AC8.6 probe test matrix still has no case for this branch, so a builder can omit or misorder the claude-code MCP-not-configured matcher and still satisfy every listed probe test. Add a `probe.test.ts` case where claude-code stdout/stderr matches one of the AC6.3 patterns (for example `mcp__echo__echo_ping not found` or `mcp server not configured`) and assert `{ agent: 'claude-code', probed: false, reason: 'mcp-not-configured' }`; then update the AC8.6 count and total test count.
  - severity: "low"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:480-488"
    finding: >-
      The `CreateWizardOpts` comment still says production resolves the defaults as `real AtomStore, real syncAll, real spawn`. `AtomStore` is the stale non-existent type name this spec otherwise removed; AC1.3 says production should use the read-only `Storage` opener. Patch the comment to say `real storage opener` / `real detect deps` (or remove the parenthetical) so the public API block does not point builders back to a type that does not exist.
---

# Codex review

Verdict: `proceed_after_patches`.

The r4 artifact resolves the requested structural items from r3: the frontmatter write scope includes the read-only atom-store helper and daemon resolver refactor, AC8.5 now uses 072-compatible no-dispatch sentinel shapes with `rolesErrors: []`, `repoRoot` is passed through to `syncAll`, and the `mcp-not-configured` reason is consistently documented in the runtime contract and DoD.

The remaining patch is test coverage for that new probe reason. Without it, the spec's main mitigation for the Claude Code MCP wiring gap is documented but not pinned. I also flagged one stale `AtomStore` comment in the public API block.

I reviewed `backlog/ready/2026-05-25-073-onboarding-wizard.md` at `02ab43b0e4020c4f04a81cf52514061dc561a2e9`, the r4 request focus hints, and the current 072 adapter-sync spec lines around the referenced no-dispatch result shapes. I did not consume task-state for this reviewer tick.
