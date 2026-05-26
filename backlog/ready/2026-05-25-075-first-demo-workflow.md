---
id: 2026-05-25-075-first-demo-workflow
title: "First demo workflow — `change-review` workflow asset + workflow-sync engine"
status: ready
priority: HIGH
estimate: 1-2d
created: 2026-05-25
blocked_by:
  - 2026-05-25-074-echo-cli-binary
task_state_ref: 2026-05-25-075-first-demo-workflow
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - assets/echo-workflows/change-review.toml           # AC1 — NEW; the demo workflow asset
  - src/echo-home/adapters/workflow-sync.ts            # AC2 — NEW; syncDefaultWorkflows() following the syncDefaultRoles pattern
  - src/echo-home/adapter-sync.ts                      # AC3 — wire syncDefaultWorkflows into syncAll() + extend SyncAllOpts
  - src/echo-home/index.ts                             # AC3 minor — re-export workflow-sync types if needed for consumers
  - tests/echo-home/adapters/workflow-sync.test.ts     # AC7 — NEW; unit test for workflow-sync (mirrors role-sync.test.ts shape)
  - tests/echo-home/adapter-sync.test.ts               # AC7 — extension; default-workflow sync integration case
  - tests/cli/workflow-load.test.ts                    # AC7 — extension; load the shipped change-review.toml as a real-asset case
  - tests/cli/workflow-match.test.ts                   # AC7 — extension; match real workflow against onboarded codex profile
  - docs/BACKLOG.md                                    # AC8 — move 075 from Inbox to Ready (admin)
spec_refs:
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # source design — §"What's deferred" (first-session demo), §"Coord layer architecture" (role-plugging at runtime)
  - backlog/{ready,pending_review,complete}/2026-05-25-074-echo-cli-binary.md  # exports loadWorkflow, matchRolesToAgents, dispatchWorkflow, Workflow, WorkflowStep, AgentMatch. STAGE-STABLE — blocked_by gates claim until 074 is in complete/.
  - backlog/complete/2026-05-25-070-echo-global-home-scaffold.md  # ECHO_HOME_PATHS.workflows added by 074 AC5.1 minor; 070 scaffold pattern is the model for ensureEchoHome calls
  - backlog/complete/2026-05-25-071-role-definition-format-and-defaults.md  # ships assets/echo-roles/reviewer.toml — the role this workflow targets
  - backlog/complete/2026-05-25-072-adapter-sync-engine.md  # syncDefaultRoles pattern at src/echo-home/adapters/role-sync.ts is the literal template for syncDefaultWorkflows
  - assets/echo-roles/reviewer.toml  # role-name + capability schema the workflow's reviewer step must agree with
  - src/echo-home/adapters/role-sync.ts  # the function shape syncDefaultWorkflows mirrors exactly (byte-equality preservation, user-modified protection, idempotent re-sync)
  - src/cli/workflow/load.ts  # 074 loadWorkflow contract — strict-unknown-key, schema_version === 1, filename ↔ name agreement, role-name grammar
  - src/cli/workflow/match.ts  # 074 matchRolesToAgents contract — capabilities ⊇ role.requires.capabilities + earliest wired_at tiebreak
---

# First demo workflow — `change-review` (workflow asset + workflow-sync engine)

## Why this spec exists

074 ships the **mechanism** for role-plugging at runtime (workflow loader + role matcher + dispatcher). 075 ships the **first workflow asset** so `echoctl run change-review` does something a customer recognizes as useful from minute one.

Lead hypothesis (from `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` §"What's deferred"): cross-vendor change review with auto-detected diff-source priority `PR > unpushed > uncommitted > HEAD~1..HEAD`. The codex-consult origin is archived in that decision; the founder reopened the spec line in this strategist conversation prior to dogfooding 074 themselves.

075 is intentionally **content-shaped, not mechanism-shaped**. The diff-source priority is encoded in the workflow's PROMPT TEXT — the reviewer agent (codex / claude-code) resolves the diff itself using its `fs.read` + `git.read` capabilities. This validates the "role-plugging at runtime" thesis (the workflow is just prompts; the agent does the heavy lifting via its capabilities + MCP tools) and means 075 introduces ZERO new CLI/runtime mechanism. The only new code in 075 is the workflow-sync helper that copies `assets/echo-workflows/*.toml` into `~/.echo/workflows/` during onboarding — a direct mirror of 072's `syncDefaultRoles` shape.

## Architectural sketch

```
assets/echo-workflows/change-review.toml         <-- AC1: the shipped asset
        │
        │ syncDefaultWorkflows({sourceDir, targetDir, defaults})   <-- AC2: new module, mirrors syncDefaultRoles
        │       byte-equality preservation
        ▼
~/.echo/workflows/change-review.toml             <-- populated by syncAll() during wizard.wire()
        │
        │ 074: loadWorkflow(path) → Workflow
        │      matchRolesToAgents({steps, roles, onboarded}) → AgentMatch[]
        │      dispatchWorkflow({workflow, matches, projectRoot}) → DispatchOutcome[]
        ▼
$ echoctl run change-review
  → reviewer step → spawn(codex exec --sandbox read-only -- "<prompt>")
  → agent resolves diff (PR > unpushed > uncommitted > HEAD~1..HEAD) and reviews against the prompt's rubric
  → findings on stdout, exit 0
```

## Judgment calls flagged for r1 reviewer

- **J1. The workflow is a single step, not a multi-step chain.** First demo is "review the current diff," full stop. No strategist-synthesis follow-up step, no parallel-reviewer pattern, no error-recovery. The single-step shape exercises the full mechanism (load → match → dispatch → capture stdout) with the smallest possible surface; extra steps add cycle time and review surface without adding demo value. Multi-step workflows are a 076+ concern.
- **J2. The diff-source priority lives in the PROMPT, not in CLI helpers.** The four-step priority (`PR > unpushed > uncommitted > HEAD~1..HEAD`) is encoded as natural-language instructions in the workflow's prompt; the reviewer agent runs `gh pr view` / `git diff @{upstream}..HEAD` / `git diff` / `git diff HEAD~1..HEAD` itself in priority order. Rationale: (a) zero new mechanism in 074; (b) the agent's reasoning over its environment is more robust than a brittle bash resolver (e.g., handles "no upstream tracking branch" without erroring); (c) validates the wedge thesis (the agent is the thing that thinks; the substrate just routes). If dogfooding shows the prompt-encoded resolution is too slow or non-deterministic, the fix is a 076 spec named `change-review-diff-resolver` that adds a CLI pre-step — NOT inline expansion of 075.
- **J3. Workflow sync follows the `syncDefaultRoles` pattern byte-for-byte.** The new `syncDefaultWorkflows` function in `src/echo-home/adapters/workflow-sync.ts` has the same shape as `src/echo-home/adapters/role-sync.ts:syncDefaultRoles` — byte-equality preservation (user-edited workflow → leave alone with `user-modified`), idempotent re-sync, symlink-target guard, per-file `error` reporting that doesn't abort the batch. Wired into `syncAll()` next to `syncDefaultRoles`. Reusing the pattern (instead of generalizing into a "syncDefaultAssets" abstraction) is cheaper and avoids hypothetical-future-requirement abstraction; if a third asset class lands later, that's the right time to generalize.
- **J4. The reviewer ROLE (not a new role) is the target.** The default `assets/echo-roles/reviewer.toml` shipped by 071 has `sandbox = "read-only"` + `capabilities = ["fs.read", "git.read", "mcp.echo.read"]`. Both codex and claude-code's `AGENT_CAPABILITIES_BY_KIND` map (074 AC2.5) include all three, so the matcher picks whichever was wired first (deterministic by `wired_at`). cursor has only `mcp.echo.read` — it falls out via `capability-mismatch`, which is correct (cursor has no headless CLI; can't dispatch anyway). No new role TOML needed.
- **J5. Workflow PROMPT TEXT is provisional content; mechanism is fixed.** The exact prose of the prompt block in `change-review.toml` (rubric, output format, finding-severity bands) is the founder's judgment call after dogfooding. The SPEC pins (a) the workflow's TOML schema, (b) the four-priority diff-source ordering, (c) that the prompt references ECHO MCP tools, (d) the structured-finding output shape, (e) a 600-word soft cap on the review. Anything else in the prompt is reviewer-tunable in r1+ without changing AC. The AC7 prompt-content checks assert PRESENCE of the load-bearing elements (the four priority steps, the MCP tool names, the finding-block template), NOT exact prose.
- **J6. No `echoctl workflows ls` / `show` / `add` subcommand.** Discovery is `ls ~/.echo/workflows/` (a real path the user can see). Adding management subcommands now would be speculation about hypothetical future workflow inventories; with one workflow shipped, the value is zero. If dogfooding (or a second shipped workflow) creates real discoverability friction, that's a follow-up.
- **J7. Dogfooding-revisit gate is explicit.** After 075 ships, the founder runs `echoctl init` + `echoctl run change-review` themselves end-to-end (the dogfooding loop the design archive said gates 075 originally). PROMPT TEXT revisions from that session land as commits to `assets/echo-workflows/change-review.toml` directly — they don't need a new backlog item because the mechanism is unchanged. Any change that requires NEW MECHANISM (e.g., a `--diff-source` flag, structured-YAML findings, multi-step output capture) is a new spec, NOT inline expansion of 075. This split keeps the prompt iterable while preserving spec integrity.

## Acceptance Criteria

### AC1 — `assets/echo-workflows/change-review.toml` ships

**AC1.1 — Filename + location.** Exactly `assets/echo-workflows/change-review.toml` (kebab-case; matches 074's `WORKFLOW_FILENAME_RE = /^[a-z][a-z0-9-]*\.toml$/`).

**AC1.2 — TOML schema (074 contract).** The file MUST be valid per `loadWorkflow()` (074):

- `[workflow]` table with `name = "change-review"` (MUST equal filename minus `.toml`), `description` (free-form prose), `schema_version = 1`.
- Exactly ONE `[[step]]` array entry with `role = "reviewer"` (MUST match `assets/echo-roles/reviewer.toml`'s name, which is `reviewer` per 071), `prompt` (multi-line string per AC1.3), and NO `inputs` (no dynamic substitution needed — the prompt has no `${VAR}` placeholders).

**AC1.3 — Prompt content invariants (load-bearing; J5 caveat — exact prose is reviewer-tunable).** The `prompt` string MUST contain, in this order:

1. A short framing sentence stating the agent is reviewing the current diff in the repository.
2. The four-priority diff-source resolution rule, IN THIS PRIORITY ORDER, with the exact shell commands the agent should run:
   - **Priority 1 — Open PR:** `gh pr view --json baseRefName,headRefName` to detect; `gh pr diff` to fetch.
   - **Priority 2 — Unpushed commits:** `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}` to detect upstream; `git rev-list @{upstream}..HEAD --count` to check if non-zero; `git diff @{upstream}..HEAD` to fetch.
   - **Priority 3 — Uncommitted changes:** `git diff` (working tree + index).
   - **Priority 4 — Last commit fallback:** `git diff HEAD~1..HEAD`.
   The prompt MUST instruct the agent to use the FIRST priority that returns non-empty content (i.e., short-circuit; do not run all four).
3. A review rubric naming THREE finding categories: **Correctness**, **Scope**, **Style**. Each gets a 1-sentence definition.
4. A structured finding-block template the agent MUST use for each finding, with these load-bearing fields: `### Finding N — <severity> — <one-line title>`, `**Where:**`, `**What:**`, `**Suggested fix:**`. Severity bands: `HIGH | MEDIUM | LOW`.
5. The empty-result string the agent MUST output if no findings: `No findings — diff looks ready to ship.` (exact string, including the em-dash).
6. A reference to the three ECHO MCP tools the agent should use for surrounding context: `mcp__echo__get_recent_work_context`, `mcp__echo__search_memories`, `mcp__echo__find_clusters`.
7. A soft length cap: "Keep the review under 600 words. If you have more findings than fit, prioritize HIGH > MEDIUM > LOW."

**AC1.4 — File posture.** Trailing newline present. UTF-8 without BOM. LF line endings (not CRLF) — matches the rest of the repo. No tabs (TOML strings preserve formatting; use 2-space indent for any nested visual structure inside the prompt's heredoc).

### AC2 — `src/echo-home/adapters/workflow-sync.ts` exports `syncDefaultWorkflows()`

**AC2.1 — Public surface (mirrors `syncDefaultRoles` exactly).**

```ts
export interface WorkflowSyncOpts {
  sourceDir: string;       // e.g. assets/echo-workflows
  targetDir: string;       // e.g. ECHO_HOME_PATHS.workflows
  defaults: readonly string[];   // e.g. ['change-review.toml']
}

export type WorkflowPerFileAction = 'copied' | 'noop' | 'user-modified' | 'source-missing' | 'error';

export interface WorkflowPerFileConflict {
  filePath: string;
  sourceBytes: Buffer | null;
  userBytes: Buffer | null;
  targetIsSymlink?: boolean;
}

export type WorkflowPerFileResult =
  | { workflow: string; action: 'copied' }
  | { workflow: string; action: 'noop' }
  | { workflow: string; action: 'user-modified'; conflict: WorkflowPerFileConflict }
  | { workflow: string; action: 'source-missing' }
  | { workflow: string; action: 'error'; error: AdapterErrorShape };

export interface WorkflowSyncResult {
  results: WorkflowPerFileResult[];
  workflowsErrors: AdapterErrorShape[];
}

export function syncDefaultWorkflows(opts: WorkflowSyncOpts): WorkflowSyncResult;
```

The discriminator field name is `workflow` (not `role`) to keep type-safety distinct from `RolePerFileResult`; otherwise the function shape is byte-for-byte identical to `syncDefaultRoles`. Reuse `AdapterErrorShape` from 072 (re-import from `src/echo-home/adapters/role-sync.ts` or factor to a tiny shared module; either is acceptable — the builder picks based on whichever keeps `git diff` minimal).

**AC2.2 — Semantics (byte-for-byte mirror of `syncDefaultRoles`).**

For each `<name>.toml` filename in `defaults`:

1. Source absent (ENOENT on `readFileSync(sourceDir/<name>.toml)`) → `action: 'source-missing'`. NOT an error; the workflows asset directory may legitimately be empty.
2. Target absent → `atomicWrite` source bytes to target → `action: 'copied'`.
3. Target present + symlink (`lstatSync().isSymbolicLink()`) → `action: 'user-modified'` with `conflict.targetIsSymlink: true`, source + user bytes both `null`. Symlinks are NEVER written through (mirrors 072's symlink posture).
4. Target present + regular file + byte-equal to source → `action: 'noop'` (idempotent re-sync).
5. Target present + regular file + differs from source → `action: 'user-modified'` with both `sourceBytes` and `userBytes` populated (caller chooses how to surface the conflict; in 075's wiring, syncAll just collects the action for the WireResult).

`mkdirSync(targetDir, { recursive: true })` happens at function entry; mkdir failure propagates an error for every `defaults` entry (matches `syncDefaultRoles` line 47-67).

**AC2.3 — Per-file isolation.** A single workflow file's failure (read error, lstat error, write error) does NOT abort the batch; the failure is recorded in `results[]` AND aggregated into `workflowsErrors[]`, and the loop continues to the next workflow.

### AC3 — `syncAll()` wires `syncDefaultWorkflows`

**AC3.1 — `SyncAllOpts` extension.** Add two optional fields to `SyncAllOpts` in `src/echo-home/adapter-sync.ts`:

```ts
export interface SyncAllOpts {
  // ... existing fields unchanged ...
  workflowsSourceDir?: string;      // default: <repoRoot>/assets/echo-workflows (resolved same way as rolesSourceDir)
  defaultWorkflows?: readonly string[];   // default: ['change-review.toml']
}
```

Defaults match the `rolesSourceDir` / `defaultRoles` resolution pattern already in 072 (relative to `repoRoot`, falling back to the `import.meta.url`-derived repo root). Re-use whichever helper 072 already exports for that walk; do NOT reimplement.

**AC3.2 — `syncAll()` call site.** After the existing `syncDefaultRoles({sourceDir, targetDir: ECHO_HOME_PATHS.roles, defaults})` block, add a parallel `syncDefaultWorkflows({sourceDir: opts.workflowsSourceDir ?? <default>, targetDir: ECHO_HOME_PATHS.workflows, defaults: opts.defaultWorkflows ?? ['change-review.toml']})` block. The result is added to the existing `SyncResult` aggregate under a new field:

```ts
export interface SyncResult {
  // ... existing fields ...
  workflowsResult?: WorkflowSyncResult;   // present when syncDefaultWorkflows ran (i.e., not skipped due to repoRoot-resolution failure)
}
```

If the `repoRoot` walk fails (per 072's `AC5.7` recovery seam), workflows-sync is skipped just like roles-sync is skipped, and `workflowsResult` stays absent. No new failure modes; reuse 072's existing skip behavior.

**AC3.3 — `ECHO_HOME_PATHS.workflows`.** Reuse the slot added by 074 AC5.1 (`workflows: join(root, 'workflows')`). The `ensureEchoHome()` mkdir for that slot is also already added by 074. 075 makes ZERO changes to `paths.ts` or `scaffold.ts`.

**AC3.4 — `src/echo-home/index.ts` re-exports.** Add `WorkflowSyncResult`, `WorkflowPerFileResult`, `WorkflowPerFileConflict`, `syncDefaultWorkflows` to the index re-export block if and only if consumers outside `echo-home/` need them. If only `syncAll()` references the workflow-sync surface (likely true), the new module is internal and no re-export is needed; in that case, this AC is a no-op and the file is removed from `files_to_modify` at PR time (note in `agent_notes`).

### AC4 — The shipped `change-review.toml` loads cleanly via 074's `loadWorkflow`

**AC4.1 — Integration test case.** Extend `tests/cli/workflow-load.test.ts` with a new case: load `assets/echo-workflows/change-review.toml` directly (resolved via `import.meta.url` walk to the repo root, same pattern other tests in the repo use for asset fixtures). Assert:

- `loadWorkflow(path)` returns without throwing.
- Returned `Workflow.name === 'change-review'`.
- `Workflow.schemaVersion === 1`.
- `Workflow.steps.length === 1`.
- `Workflow.steps[0].role === 'reviewer'`.
- `Workflow.steps[0].prompt` is non-empty AND contains the four exact substring markers asserting the priority chain is present: `gh pr view`, `git diff @{upstream}..HEAD`, `git diff` (alone), `git diff HEAD~1..HEAD`. The four-substring assertion is the load-bearing content invariant from AC1.3 step 2; reviewer-tunable surrounding prose does NOT break this test.
- `Workflow.steps[0].inputs` is the empty frozen object (no `${VAR}` substitution required).

This test catches schema drift (e.g., someone deletes the `schema_version` field) AND prompt-content regression (e.g., someone removes a priority step from the chain).

### AC5 — The shipped workflow matches the default reviewer role against typical onboarded codex/claude-code profiles

**AC5.1 — Integration test case.** Extend `tests/cli/workflow-match.test.ts` with a new case that builds:

- `workflow = loadWorkflow('assets/echo-workflows/change-review.toml')`
- `roles = [<parsed reviewer.toml from assets/echo-roles>]` (reuse 071's `loadRolesFromDir` against the assets dir; or hand-construct the `Role` object if loadRolesFromDir is harder to invoke against the assets dir)
- `onboarded = [<codex profile with full capabilities + wired_at = 'T1'>, <cursor profile with only mcp.echo.read + wired_at = 'T2'>]`

Then call `matchRolesToAgents({steps: workflow.steps, roles, onboarded})` and assert:

- Returns a length-1 array.
- `matches[0].role === 'reviewer'`.
- `matches[0].pickedAgent === 'codex'` (capabilities ⊇ requirements; cursor is missing fs.read + git.read so falls out).
- `matches[0].reason === 'matched'`.
- `matches[0].resolvedSandbox === 'read-only'` (matches `assets/echo-roles/reviewer.toml`'s `sandbox` field).

**AC5.2 — Tiebreak case.** A second test variant with BOTH codex AND claude-code as onboarded (each with full capabilities, codex wired_at earlier than claude-code): asserts `matches[0].pickedAgent === 'codex'` (earliest `wired_at` wins per 074's matcher contract). Swap the wired_at order: asserts claude-code wins. Tests pin the determinism in 074's matcher contract against the real workflow asset.

### AC6 — Workflow-sync unit tests + integration

**AC6.1 — `tests/echo-home/adapters/workflow-sync.test.ts` (NEW).** Mirror the test shape of `tests/echo-home/adapters/role-sync.test.ts` (which 072 ships; consult for the table-of-cases template). Required cases:

1. Source missing → result has one `action: 'source-missing'` entry; no file written.
2. Target absent → result has `action: 'copied'`; target file exists post-call AND byte-equals source.
3. Target present + byte-equal → result has `action: 'noop'`; target file unchanged (mtime + content).
4. Target present + differs → result has `action: 'user-modified'` with both `sourceBytes` + `userBytes` populated; target file unchanged.
5. Target present + symlink → result has `action: 'user-modified'` with `targetIsSymlink: true`, both byte fields `null`; target symlink unchanged.
6. mkdir failure (target dir's parent is an unwritable path) → all `defaults` get `action: 'error'`; one entry per workflow in `workflowsErrors[]`.
7. Multiple defaults: 3 workflows in `defaults`, mixed states (one copied, one noop, one source-missing) → result has 3 entries in declared order; each with the correct action.

All cases use `os.tmpdir()` + a tmpdir created in `beforeEach` (mirrors 072's role-sync test fixture setup).

**AC6.2 — `tests/echo-home/adapter-sync.test.ts` extension.** Add a single integration case that runs `syncAll()` against a tmp ECHO_HOME with `defaultWorkflows: ['change-review.toml']` AND a `workflowsSourceDir` pointing at a tmp dir containing a valid `change-review.toml` fixture. Assert:

- Post-call: `<ECHO_HOME>/workflows/change-review.toml` exists and byte-equals the source fixture.
- `SyncResult.workflowsResult.results.length === 1`.
- `SyncResult.workflowsResult.results[0].action === 'copied'`.
- The existing role-sync + skill-sync + adapter-write assertions in adjacent test cases are NOT affected (test isolation via per-case tmpdir).

### AC7 — Test gates

**AC7.1 — Full suite passes.** `npm test` exits 0 with all new + existing tests passing. Existing 074 CLI tests (`tests/cli/workflow-load.test.ts`, `tests/cli/workflow-match.test.ts`) MUST continue to pass after extension — extension means adding cases, not modifying existing assertions.

**AC7.2 — Typecheck + lint pass.** `npm run typecheck` exits 0. `npm run lint` exits 0. The new `syncDefaultWorkflows` signature is fully typed; no `any`.

**AC7.3 — Asset-fixture freshness.** A test (in `tests/cli/workflow-load.test.ts` per AC4.1) asserts the SHIPPED `assets/echo-workflows/change-review.toml` parses cleanly, so a content edit that breaks the schema (e.g., adding an unknown key) fails CI immediately.

### AC8 — Backlog row migration

Move 075's row from `docs/BACKLOG.md`'s "Inbox" section to the "Ready" table with `Priority: HIGH`, `Estimate: 1-2d`, `Notes: First demo workflow asset + workflow-sync engine; lead hypothesis is cross-vendor change review. Founder dogfoods after merge.`

## Out of Scope (Don't Drift)

- **NO new CLI subcommands.** Not `echoctl workflows ls`, `echoctl workflows show`, `echoctl workflows add`, nor any inspection helper. Discovery is `ls ~/.echo/workflows/`.
- **NO per-invocation diff overrides.** Not `--diff-source <pr|branch|wt|head>`, not `--base <ref>`, not `--head <ref>`. The four-priority chain in the prompt is the only resolution mechanism.
- **NO structured-YAML findings.** Output is the Markdown finding-block shape from AC1.3 step 4. If dogfooding shows structured output is needed, that's a 076+ spec.
- **NO multi-step workflows / branching / parallelism / error-recovery DSL.** All 075-or-later concerns per 074 J3.
- **NO changes to 074's `run`/`dispatch`/`match`/`load` modules.** If you find yourself wanting to edit `src/cli/workflow/*.ts`, STOP — that's drift into 074's domain. The workflow is consumed via the existing contract; if the contract needs to change, that's a new spec on 074's mechanism, not 075.
- **NO changes to 070's `paths.ts` or `scaffold.ts`.** The `workflows` slot was added by 074 AC5.1 minor; the mkdir is already in `ensureEchoHome`. 075 makes ZERO mutations there.
- **NO new role TOML.** The default `reviewer.toml` from 071 is the target role; no `change-reviewer.toml` or similar.
- **NO wiki/operating-model edits.** Wiki updates happen post-shipment per CLAUDE.md.
- **NO `prepare` / `postinstall` / `build` script changes in `package.json`.** 074 owns the build surface; 075 is content + a helper module.

## Dogfooding-revisit gate (post-shipment, NOT a re-spec)

After 075 merges, the founder runs `echoctl init` (if not already) + `echoctl run change-review` in a real repo with a real diff. Observed friction lands in one of three buckets:

1. **PROMPT TEXT iteration** — direct commits to `assets/echo-workflows/change-review.toml` (rubric wording, severity-band definitions, MCP-tool prioritization). No new spec; the AC7.3 schema-freshness test gates that the file stays loadable. The four-priority chain (AC1.3 step 2) is INVARIANT — changing it requires a follow-up spec.
2. **New MECHANISM needed** — e.g., the prompt-encoded diff resolution proves too slow / non-deterministic → new spec `change-review-diff-resolver` adds a CLI pre-step. New BACKLOG ID, new claim cycle.
3. **Demo workflow was wrong choice** — e.g., founder finds the first session wants something OTHER than diff review → new spec for the actual first workflow, deprecate `change-review` (move asset to `assets/echo-workflows/deprecated/` or delete; document in After-Completion).

The split rule is what J5 calls out: content is iterable post-merge; mechanism changes need new specs.

## After Completion (Strategist Notes)

- **Wiki page candidate (post-shipment):** `wiki/surfaces/echoctl.md` gets a "First demo workflow" subsection naming `change-review` + the four-priority resolution. `wiki/architecture/coord-layer.md` gets a "Workflow assets" subsection naming `assets/echo-workflows/` + `~/.echo/workflows/` + the byte-equality sync pattern.
- **Decision-archive update:** `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` §"What's deferred" — strike "First-session demo workflow" from the deferred list; the lead hypothesis is now shipped (subject to dogfooding-revisit per the gate above).
- **Strategist note on the dogfooding gate:** the design archive originally specified 075 should be specced AFTER founder dogfoods the wizard. The founder reopened the spec line pre-dogfood in the 2026-05-26 strategist conversation, accepting that the PROMPT TEXT may iterate post-merge (the mechanism is what's load-bearing; the prompt is content). This is the rationale to record in the wiki promotion.
- **Trigger to revisit:** after the founder completes their first `echoctl run change-review` session, surface the three-bucket observation list (prompt iteration / new mechanism / wrong-demo) in the next strategist conversation.
