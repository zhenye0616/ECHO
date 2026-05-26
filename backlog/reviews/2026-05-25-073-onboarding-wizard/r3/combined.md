---
item_id: 2026-05-25-073-onboarding-wizard
round: 3
combined_at: '2026-05-26T03:20:11Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 4
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:559-580; backlog/pending_review/2026-05-25-072-adapter-sync-engine.md:220-225,369-377,655,662 | accepted — patched | r3 spec patch: AC8.5 cases 11a/11b/11c rewritten to mirror 072's actual top-level-sentinel `SyncResult` shape per 072 lines 369-377 (`skillsPopulated: { ok:false, sourceDir:'', targetDir:'', error:'sync_skipped:lock_unavailable' }`, `roles: { results:[], rolesErrors:[] }`). Case 11b updated to reference AC9 case **23** (was 22 — case 22 is the claude-skill symlink case). Cross-spec consistency note added warning the builder to match against 072's actual `SyncResult` emission. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:14-29,177-199 | accepted — patched | r3 spec patch: `files_to_modify` frontmatter gains three entries — `src/echo-home/wizard/atom-store-readonly.ts` (the AC1.3 helper), `src/daemon/lifecycle.ts` (promote `resolveDbPath`), `src/daemon/index.ts` (re-import promoted helper). Builder write-scope now matches AC1.3 prose. |
| 3 | HIGH | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:354-361,434-438,669 | accepted — V1 documented limitation per "prefer removal over deeper patching" | r3 spec patch: AC6.1 ProbeOutcome adds `'mcp-not-configured'` reason; AC6.2 adds explicit "Claude Code MCP wiring gap" subsection naming 072's missing `~/.claude.json` adapter, marking V1-OOS; AC6.3 failure-mapping table adds a claude-code-only row mapping stderr/stdout patterns to `mcp-not-configured`; Out of Scope §14 (new) documents the gap; R8 (new) records mitigation + follow-up trigger (file 075-class spec on first dogfooding hit); DoD's manual-run line accepts EITHER probe success OR `mcp-not-configured`. Deliberately did NOT add a 4th claude-code MCP adapter in 073 — adding mechanism mid-flight when a follow-up spec is the cleaner V1 boundary. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:329-340,375,396-410 | accepted — patched | r3 spec patch: `WireOpts` adds `repoRoot?: string` pass-through; `Wizard.wire` Pick widens to include `repoRoot`; AC5.3 Dispatch phase rewritten — `syncAll(profiles, opts.repoRoot ? { repoRoot: opts.repoRoot } : undefined)`. Recovery from the AC5.7 `repoRoot` sentinel is now possible: caller observes the sentinel, supplies an explicit `opts.repoRoot`, re-invokes `wire()`. |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:90-91,161-199 | accepted — patched | r3 spec patch: J2 judgment-call rewritten to match AC1.3 — references `Storage` (not `AtomStore`), `openExistingAtomStoreReadOnly()` helper, `resolveDbPath()` precedence, readonly+fileMustExist+query_only pragma, no-mutation guarantee. Stale text replaced wholesale; no two operational contracts now disagree in the spec. |

## Convergence call

needs R4 — focus_hints: Verify (1) AC8.5 11a/11b/11c fixture shapes match 072 lines 369-377 (`skillsPopulated.ok:false` + `error: 'sync_skipped:...'`, `roles: { results:[], rolesErrors:[] }`) and 11b references AC9 case 23; (2) `files_to_modify` includes `atom-store-readonly.ts` + `daemon/lifecycle.ts` + `daemon/index.ts`; (3) `'mcp-not-configured'` is in `ProbeOutcome` reason union AND in the AC6.3 failure-mapping table AND in Out of Scope §14 AND R8 AND DoD manual-run line — all five surfaces consistent; (4) `WireOpts.repoRoot` is wired through to `syncAll(profiles, { repoRoot })` and the `Wizard.wire` Pick includes it; (5) J2 prose has no remaining `AtomStore` references and matches AC1.3's operational contract; (6) no regression to earlier r1/r2 patches (atom-store readonly, source_prefix matching, AC5.7 three-sentinel, completed-flag ownership).

