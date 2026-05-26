---
task_id: 2026-05-25-075-first-demo-workflow
role: builder
writer: codex-builder
last_updated: 2026-05-26T21:18:31Z
---

## current_thesis

Claimed 075 as Codex builder. Implement the first `change-review` workflow asset plus default workflow sync, real-asset workflow load/match tests, packed asset allowlist hygiene, and the narrow human-mode `echoctl run` renderer lift so captured review output is visible.

## locked_decisions

- AC1: ship exactly `assets/echo-workflows/change-review.toml`, schema_version 1, one `reviewer` step, no inputs, and prompt invariants for diff-source priority, finding format, terminal outputs, MCP best-effort context, and 600-word cap.
- AC2: add `syncDefaultWorkflows()` as a close mirror of `syncDefaultRoles()`, with `workflow` discriminators, byte-equality preservation, user-modified and symlink protection, source-missing handling, and per-file error isolation.
- AC3: wire workflow sync into `syncAll()` using `ECHO_HOME_PATHS.workflows`, extend workflow dir symlink guard coverage, and make workflow source-missing/error outcomes fail `overallOk` while preserving user-modified workflows as healthy.
- AC4-AC5: extend workflow load and match tests against the shipped workflow and reviewer role, including deterministic agent matching by capabilities and `wired_at` ordering.
- AC6-AC7: add workflow-sync unit coverage, adapter-sync integration coverage, and run the required `npm test`, `npm run typecheck`, and `npm run lint` gates.
- AC8: no builder action; `docs/BACKLOG.md` is strategist-owned and must not be edited by this builder.
- AC9: add only `assets/echo-workflows/**` to `package.json` `files` and assert the workflow asset appears in npm pack shape; do not claim packed-install correctness.
- AC10: only extend human-mode `renderOutcomes()` to print captured stdout and nonzero stderr; do not touch dispatch, match, load, project resolution, signal handling, exit-code derivation, JSON shape, or `RunOpts`.

## open_questions

- None blocking at claim. Escalate if implementation requires files outside `files_to_modify`, a new dependency, item-body edits, or broader 074 mechanism changes.

## dont_touch

- No new CLI subcommands, workflow management surface, per-invocation diff override flags, structured-YAML findings, multi-step workflows, branching, parallelism, or error-recovery DSL.
- No changes to `src/cli/workflow/*.ts`; consume 074 loader/matcher/dispatcher contracts as-is.
- No changes to 070 `paths.ts` or `scaffold.ts`; the workflows slot already exists.
- No new role TOML and no wiki, docs backlog/status/north-star, dependencies, scripts, or extra package allowlist fixes beyond `assets/echo-workflows/**`.
- No packed-install correctness fix for roles/skills; that inherited gap is a separate follow-up.

## canonical_anchors

- spec: backlog/claimed/2026-05-25-075-first-demo-workflow.md
