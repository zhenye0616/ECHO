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
  - tests/cli/shell-reachable.test.ts                  # AC9.4 — extend with pack-shape assertion that change-review.toml is in the npm-pack tarball (074-owned test; alternative new tests/cli/pack-shape.test.ts allowed at builder discretion)
  - package.json                                       # AC9 (r1 codex-ops F1 HIGH) — extend `files` allowlist with `assets/echo-workflows/**` so the default workflow ships in packed/npm-install installs; scripts/deps unchanged
  - src/cli/commands/run.ts                            # AC10 (r3 codex F1 HIGH) — NARROW lift of 074 out-of-scope: extend renderOutcomes() in human (non-JSON) mode to print the captured spawn.stdout + spawn.stderr; one block per outcome below the existing `${role}: exit <code>` line; the dispatcher capture is unchanged
  - tests/cli/run.test.ts                              # AC10.2 — extend; assert human-mode rendering prints the captured spawn.stdout (so demo findings are visible to the user, not silently dropped)
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
- **J2. The diff-source priority lives in the PROMPT, not in CLI helpers.** The four-step priority (`PR > unpushed > uncommitted > HEAD~1..HEAD`) is encoded as natural-language instructions in the workflow's prompt; the reviewer agent runs `gh pr view` / `git diff @{upstream}..HEAD` / `git diff HEAD` / `git diff HEAD~1..HEAD` itself in priority order (Priority 3 is `git diff HEAD` not bare `git diff` — covers staged + unstaged per r1 disposition). Rationale: (a) zero new mechanism in 074; (b) the agent's reasoning over its environment is more robust than a brittle bash resolver (e.g., handles "no upstream tracking branch" without erroring); (c) validates the wedge thesis (the agent is the thing that thinks; the substrate just routes). If dogfooding shows the prompt-encoded resolution is too slow or non-deterministic, the fix is a 076 spec named `change-review-diff-resolver` that adds a CLI pre-step — NOT inline expansion of 075.
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
   - **Priority 3 — All uncommitted changes (staged + unstaged):** `git diff HEAD` (r1 codex F1 + codex-ops F2, both HIGH — bare `git diff` excludes staged-only changes, so a `git add`-then-`echoctl run` flow would silently fall through to Priority 4 and review the previous commit instead of the staged work; `git diff HEAD` covers both the index and the working tree against HEAD).
   - **Priority 4 — Last commit fallback:** `git diff HEAD~1..HEAD`.
   The prompt MUST instruct the agent to use the FIRST priority that returns non-empty content (i.e., short-circuit; do not run all four). The prompt MUST ALSO explicitly state (r2 codex-ops F2 MED): **any priority whose detection command is missing (`gh` not on PATH, `command not found`), exits non-zero (no upstream tracking branch for Priority 2, no `HEAD~1` in a fresh / shallow / initial-commit repo for Priority 4), authenticates-fails (`gh` not logged in), or returns empty stdout MUST be treated as "priority unavailable, continue to next priority" — NOT as a fatal error**. This makes the demo robust under common unattended-environments: missing `gh`, no network, fresh-init repo, single-commit repo, no upstream set.
3. A review rubric naming THREE finding categories: **Correctness**, **Scope**, **Style**. Each gets a 1-sentence definition.
4. A structured finding-block template the agent MUST use for each finding, with these load-bearing fields: `### Finding N — <severity> — <one-line title>`, `**Where:**`, `**What:**`, `**Suggested fix:**`. Severity bands: `HIGH | MEDIUM | LOW`.
5. The empty-result string the agent MUST output if no findings: `No findings — diff looks ready to ship.` (exact string, including the em-dash). ADDITIONALLY (r2 codex-ops F2 MED): if ALL four priorities are unavailable (e.g., fresh-init repo with no commits + no `gh` + no upstream — all four return empty / fail), the agent MUST output the terminal string: `No diff source available — nothing to review.` (exact string, including the em-dash) and exit cleanly without producing finding blocks. This gives `echoctl run change-review` predictable, parseable output in degenerate environments instead of stalling or hallucinating findings.
6. A reference to the three ECHO MCP tools the agent should use for surrounding context: `mcp__echo__get_recent_work_context`, `mcp__echo__search_memories`, `mcp__echo__find_clusters`. The prompt MUST explicitly state these MCP calls are **best-effort** (r3 codex-ops MED): if any tool is unavailable (MCP server down, client binding absent, tool missing), errors, or times out, the agent MUST continue the diff review using repository-local context (files, git log) and STILL emit one of the pinned terminal outputs from AC1.3 step 5. MCP context enhances the review; the demo MUST NOT fail when MCP is unreachable. AC4.1 pins this with a substring/regex marker.
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

**AC3.4 — Directory-component symlink guard (r1 codex F2 HIGH + codex-ops F3 MED).** `syncAll()` already runs a directory-component symlink guard (`src/echo-home/adapter-sync.ts:436-461`) on `ECHO_HOME_PATHS.{skills,roles,state}` — refuses to operate if any path component up to `ECHO_HOME_PATHS.root` is a symlink. The shipped `dirChecks` array MUST be extended with `{ path: ECHO_HOME_PATHS.workflows, boundary: ECHO_HOME_PATHS.root }` so a symlinked `~/.echo/workflows/` (or any symlinked component on the way to it) is caught BEFORE `mkdirSync`/`atomicWrite` can follow it and write outside ECHO_HOME. Without this, the per-file symlink check inside `syncDefaultWorkflows` only catches the FINAL file path — the intermediate-directory symlink is invisible to `lstatSync(<dir>/<file>.toml)` and `atomicWrite` follows it silently. This is a 1-line addition to the existing array; the guard's `directorySymlink` return path already short-circuits with `overallOk: false`, so no new failure mechanism is introduced.

**AC3.5 — `overallOk` policy for workflow-sync outcomes (r1 codex F3 MED + codex-ops F1 HIGH).** The existing `syncAll()` `overallOk` rollup MUST treat workflow-sync results with the same strictness it applies to roles/skills — a "successful" `echoctl init` MUST NOT report `overallOk: true` when the default workflow is missing/unwritable at runtime, because the immediate next user action (`echoctl run change-review`) would fail with no workflow installed. Specifically, `overallOk: false` if ANY of:

- `workflowsResult.workflowsErrors.length > 0` (any per-file error during sync).
- ANY `workflowsResult.results[i].action === 'error'` (per-file failure tracked in results too).
- ANY `workflowsResult.results[i].action === 'source-missing'` where `results[i].workflow` is named in the effective `defaultWorkflows` list (a default workflow that the spec promises to ship is missing from `workflowsSourceDir`). User-edited workflows (`action: 'user-modified'`) do NOT fail the rollup — the user's edit is preserved per AC2.2 step 5, and the existing file is still loadable by `echoctl run`.

`workflowsResult.results[i].action === 'noop'` (idempotent re-sync) and `action: 'copied'` (first install) are healthy outcomes that do not affect `overallOk`. The integration test in AC6.3 pins the per-action rollup contribution.

**AC3.6 — `src/echo-home/index.ts` re-exports.** Add `WorkflowSyncResult`, `WorkflowPerFileResult`, `WorkflowPerFileConflict`, `syncDefaultWorkflows` to the index re-export block if and only if consumers outside `echo-home/` need them. If only `syncAll()` references the workflow-sync surface (likely true), the new module is internal and no re-export is needed; in that case, this AC is a no-op and the file is removed from `files_to_modify` at PR time (note in `agent_notes`).

### AC4 — The shipped `change-review.toml` loads cleanly via 074's `loadWorkflow`

**AC4.1 — Integration test case.** Extend `tests/cli/workflow-load.test.ts` with a new case: load `assets/echo-workflows/change-review.toml` directly (resolved via `import.meta.url` walk to the repo root, same pattern other tests in the repo use for asset fixtures). Assert:

- `loadWorkflow(path)` returns without throwing.
- Returned `Workflow.name === 'change-review'`.
- `Workflow.schemaVersion === 1`.
- `Workflow.steps.length === 1`.
- `Workflow.steps[0].role === 'reviewer'`.
- `Workflow.steps[0].prompt` is non-empty AND contains the priority-chain markers asserted in the order they appear in the prompt (r3 codex F2 MED — substring containment alone is insufficient because `'git diff HEAD'.includes('git diff HEAD')` also matches inside `'git diff HEAD~1..HEAD'`, so a Priority-3-omitted prompt could pass). The test MUST use:
  1. `/\bgh pr view\b/.test(prompt)` (Priority 1 marker)
  2. `prompt.includes('git diff @{upstream}..HEAD')` (Priority 2)
  3. `/\bgit diff HEAD\b(?!~)/.test(prompt)` (Priority 3 — `git diff HEAD` NOT immediately followed by `~`; this distinguishes from Priority 4's `git diff HEAD~1..HEAD`)
  4. `prompt.includes('git diff HEAD~1..HEAD')` (Priority 4)
  5. The Priority 1 marker MUST appear at a lower string index than the Priority 2 marker, which MUST appear at a lower index than the Priority 3 regex match, which MUST appear at a lower index than the Priority 4 marker — the four-priority ORDER is load-bearing. Implement via `indexOf` ordering checks.
  Reviewer-tunable surrounding prose does NOT break these assertions; only deletion / reordering of the load-bearing priority commands does.
- `Workflow.steps[0].prompt` ALSO contains the two terminal-output substrings asserting the empty / no-source branches are pinned (r1 + r2 disposition): `No findings — diff looks ready to ship.` AND `No diff source available — nothing to review.` (both exact, including em-dashes). These assertions pin AC1.3 step 5's terminal-output invariants against future prose iteration.
- `Workflow.steps[0].prompt` ALSO contains the fallthrough-rule marker (r3 codex F2 MED — without this, a builder could omit the entire AC1.3 step 2 fallthrough paragraph and still pass the priority-chain assertions): a regex match for `/priority unavailable[^.\n]*continue/i.test(prompt)` (case-insensitive, allowing punctuation/wording variation between "priority unavailable" and "continue"; this pins the load-bearing semantic "treat command-not-found / non-zero / empty as priority-unavailable, continue to next priority" against deletion).
- `Workflow.steps[0].prompt` ALSO contains the MCP best-effort marker (r3 codex-ops MED): a regex match for `/best.effort/i.test(prompt)` AND `prompt.includes('mcp__echo__')` (the latter pins reference to ECHO MCP tools; the former pins the best-effort-on-failure semantic). Together these assert that "MCP context calls enhance the review but are not required for it to complete" survives any prose iteration.
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

**AC6.2 — `tests/echo-home/adapter-sync.test.ts` extension — happy path.** Add a single integration case that runs `syncAll()` against a tmp ECHO_HOME with `defaultWorkflows: ['change-review.toml']` AND a `workflowsSourceDir` pointing at a tmp dir containing a valid `change-review.toml` fixture. Assert:

- Post-call: `<ECHO_HOME>/workflows/change-review.toml` exists and byte-equals the source fixture.
- `SyncResult.workflowsResult.results.length === 1`.
- `SyncResult.workflowsResult.results[0].action === 'copied'`.
- `SyncResult.overallOk === true` (the happy path keeps the rollup green).
- The existing role-sync + skill-sync + adapter-write assertions in adjacent test cases are NOT affected (test isolation via per-case tmpdir).

**AC6.3 — Failure-path matrix (r1 codex F3 + codex-ops F1 disposition; r2 codex F2 + F3 refinements to use concrete diagnostic surface + correct test placement).** Add the cases below. `workflowsResult` IS the typed diagnostic channel — no new `SyncResult` field is added; readers distinguish workflow failures from role failures by checking `workflowsResult.results[i].action` vs `roles.results[i].action`. (r2 codex F2 disposition: drop the earlier ambiguous "extend reason fields" language; `workflowsResult` is already on `SyncResult` per AC3.2 and is sufficient.)

**Case 1 (in `tests/echo-home/adapter-sync.test.ts`) — Default-workflow source missing.** `defaultWorkflows: ['change-review.toml']`, `workflowsSourceDir` points at an empty tmp dir → assert `SyncResult.workflowsResult.results[0].action === 'source-missing'` AND `SyncResult.workflowsResult.results[0].workflow === 'change-review.toml'` AND `SyncResult.overallOk === false`. The reader's contract for distinguishing "workflow failure" from "role failure" is: check `workflowsResult.results[*].action === 'source-missing'` for the workflow case; check `roles.results[*].action === 'source-missing'` for the role case. Both are typed shapes that exist in `SyncResult` post-075.

**Case 2 (in `tests/echo-home/adapters/workflow-sync.test.ts`, NOT in `adapter-sync.test.ts` — r2 codex F3 disposition).** The earlier placement (in the integration test that exercises full `syncAll`) is wrong: chmod-ing `ECHO_HOME` to 0000 would prevent the state-lock acquisition and the skills/roles sync from even running, so `syncAll` returns earlier failures with `workflowsResult` undefined. The right placement is the `syncDefaultWorkflows` unit test where `targetDir` is controllable in isolation — fixture: `targetDir = <tmp>/locked/workflows` with `chmod 0000` only on `<tmp>/locked/`, source dir healthy, default `change-review.toml` present. Assert: `result.results[0].action === 'error'` AND `result.workflowsErrors.length === 1`. The integration-level `overallOk: false` mapping is covered by Case 1 (source-missing) and the test in `workflow-sync.test.ts` Case 6 (mkdir failure produces error action); 075 does NOT need a separate integration-level chmod test in `adapter-sync.test.ts`.

**Case 3 (in `tests/echo-home/adapter-sync.test.ts`) — Workflow user-modified is NOT a failure.** `defaultWorkflows: ['change-review.toml']`, source has a fixture, `<ECHO_HOME>/workflows/change-review.toml` pre-populated with different bytes → assert `SyncResult.workflowsResult.results[0].action === 'user-modified'` AND `SyncResult.overallOk === true` (user's edit is preserved; this is healthy per AC3.5). The target file MUST be unchanged (mtime + content) after the sync.

**Case 4 (in `tests/echo-home/adapter-sync.test.ts`) — Workflow per-file `error` action fails `overallOk` at the integration level (r3 codex F3 MED).** AC3.5 promises that any `workflowsResult.results[i].action === 'error'` results in `SyncResult.overallOk: false`, and `workflowsErrors.length > 0` does the same. Without an integration test that produces `action: 'error'` AND asserts the `overallOk` rollup consumes it, a builder could wire the `source-missing` branch in `computeOverallOk` and silently ignore `error` / `workflowsErrors` while passing Cases 1 + 3. The setup uses EISDIR to surface a per-file error within `syncDefaultWorkflows` AFTER `syncAll`'s state-lock and skills/roles steps have completed successfully (which is why this case CAN live at the integration level — unlike the unit-test chmod case which would block earlier steps): precreate `<ECHO_HOME>/workflows/change-review.toml` as a DIRECTORY (not a file), `defaultWorkflows: ['change-review.toml']`, source has a valid `change-review.toml` fixture → when `syncDefaultWorkflows` calls `atomicWrite` for the file path, the underlying `writeFileSync` / `rename` fails with EISDIR. Assert:

- `SyncResult.workflowsResult.results.length === 1`.
- `SyncResult.workflowsResult.results[0].action === 'error'` AND `.workflow === 'change-review.toml'`.
- `SyncResult.workflowsResult.workflowsErrors.length === 1`.
- `SyncResult.overallOk === false`.
- The skills/roles results in the same `SyncResult` are unchanged (the per-file error is isolated to workflows; the rest of `syncAll` still ran successfully).

**AC6.4 — `tests/echo-home/adapter-sync.test.ts` extension — workflows directory symlink guard (r1 codex F2 + codex-ops F3 disposition).** Add a case that mirrors the existing `dirChecks` test pattern in `tests/echo-home/adapter-sync.test.ts` for the skills/roles/state slots. Setup: pre-populate `<ECHO_HOME>/workflows` as a SYMLINK pointing outside ECHO_HOME (e.g., to a sibling tmp dir). Assert:

- `syncAll()` returns with `directorySymlink` populated naming the workflows path.
- `SyncResult.overallOk === false`.
- The symlinked target dir is UNCHANGED post-call (no file written through the symlink — this is the load-bearing guard against writing outside `~/.echo/`).
- No `workflowsResult` is computed (the guard short-circuits before `syncDefaultWorkflows` is called — same behavior the existing skills/roles short-circuit exhibits).

### AC7 — Test gates

**AC7.1 — Full suite passes.** `npm test` exits 0 with all new + existing tests passing. Existing 074 CLI tests (`tests/cli/workflow-load.test.ts`, `tests/cli/workflow-match.test.ts`) MUST continue to pass after extension — extension means adding cases, not modifying existing assertions.

**AC7.2 — Typecheck + lint pass.** `npm run typecheck` exits 0. `npm run lint` exits 0. The new `syncDefaultWorkflows` signature is fully typed; no `any`.

**AC7.3 — Asset-fixture freshness.** A test (in `tests/cli/workflow-load.test.ts` per AC4.1) asserts the SHIPPED `assets/echo-workflows/change-review.toml` parses cleanly, so a content edit that breaks the schema (e.g., adding an unknown key) fails CI immediately.

### AC8 — Backlog row migration

Move 075's row from `docs/BACKLOG.md`'s "Inbox" section to the "Ready" table with `Priority: HIGH`, `Estimate: 1-2d`, `Notes: First demo workflow asset + workflow-sync engine; lead hypothesis is cross-vendor change review. Founder dogfoods after merge.`

### AC9 — `package.json` `files` allowlist hygiene (r2 codex-ops F1 + codex F1 disposition: REMOVAL per 058 — packed-install correctness is OUT OF SCOPE for 075)

**AC9.1 — Allowlist entry (hygiene-only).** 074 set the `files` allowlist to `["dist/**/*.js", "dist/**/*.d.ts", "package.json", "README.md"]` so the packed bin contains the CLI build artifacts. The default workflow asset at `assets/echo-workflows/change-review.toml` lives OUTSIDE that allowlist. 075 adds `assets/echo-workflows/**` so the asset is at least PRESENT in any `npm pack` tarball — this is hygiene, NOT a packed-install correctness claim. Final allowlist:

```json
"files": [
  "dist/**/*.js",
  "dist/**/*.d.ts",
  "package.json",
  "README.md",
  "assets/echo-workflows/**"
]
```

**AC9.2 — Bounded scope (r2 removal per 058).** ONLY `assets/echo-workflows/**` is added. Do NOT touch `scripts`, `dependencies`, `devDependencies`, or any other package.json key. Do NOT add `assets/echo-roles/**` or `skills/**` — they have the same packed-install bug inherited from 074, BUT fixing only workflows here is incoherent: the demo workflow targets the `reviewer` role, whose source `assets/echo-roles/reviewer.toml` is also missing from the packed tarball, so `echoctl init` would still fail with `source-missing` on roles long before reaching workflow sync (r2 codex-ops F1 HIGH). The right fix is a single coordinated allowlist-lift across all three asset classes (roles + skills + workflows + any repo-root-discovery prerequisites like `package.json` location handling in `syncAll`); that's a separate spec, logged in After-Completion and `backlog/_followups.md`.

**AC9.3 — 075 explicitly does NOT claim packed-install correctness (r2 disposition).** AC3.5's `overallOk` policy is correct semantics for ALL install paths (source-repo `npm link` AND packed `npm pack` + `npm install -g`), but in a packed install today, `overallOk: false` will be set by the inherited `source-missing` failures on roles + skills BEFORE workflow sync even runs. 075's first-demo claim is scoped to the **source-repo dogfooding context only** (founder's `npm link` from `~/Desktop/Project_echo/`). The packed-install demo readiness is gated on the 074-follow-up that lifts allowlist + repo-root-discovery comprehensively.

**AC9.4 — Pack-shape smoke test (narrow hygiene assertion).** Extend `tests/cli/shell-reachable.test.ts` (074-owned, in scope for extension here since 075's change makes the contract stricter for the workflow asset) with ONE assertion: after `npm pack`, `package/assets/echo-workflows/change-review.toml` is present in the tarball (via `tar tf <tarball>` or `npm pack --dry-run --json`). This pins the AC9.1 hygiene-only claim: the asset is shipped. It does NOT assert that `echoctl init` succeeds end-to-end in a packed install — that would be a false-confidence test (it would fail today on the inherited roles/skills gap), and assertions of that scope are explicitly OUT OF SCOPE for 075 per AC9.3. The single-assertion test is sufficient to catch future regressions where someone deletes the allowlist entry. If extending `shell-reachable.test.ts` proves invasive, a new `tests/cli/pack-shape.test.ts` is an acceptable alternative (builder's choice; update `files_to_modify` at PR time).

### AC10 — `echoctl run` human-mode renderer surfaces captured stdout (r3 codex F1 HIGH; narrow lift of 074 out-of-scope)

**Background (r3 codex F1 HIGH disposition).** At SHA `707b41e` (the r3 spec_commit_sha), `src/cli/commands/run.ts:96-98` (the human-mode branch of `renderOutcomes`) prints only `${outcome.step.role}: exit <code>` per outcome and discards the captured `outcome.spawn.stdout` entirely. The `--json` branch (line 91) DOES expose stdout via `JSON.stringify(outcomes)`. Consequence: the first-demo flow `echoctl run change-review` (the documented default per AC1.2 and the first-session arc in J7 + the design archive) prints `reviewer: exit 0` and NOTHING ELSE — the entire review (the findings the user came for) is silently dropped. Originally 075 forbade touching `src/cli/commands/run.ts` to keep blast radius bounded; r3 surfaced that the prohibition is incompatible with the demo-correctness claim. The narrow, contained lift below adds ~10 LOC to `renderOutcomes`, exclusively in the existing human-mode branch, with NO change to dispatcher capture, exit-code derivation, signal handling, or JSON-mode shape.

**AC10.1 — Renderer extension.** In `src/cli/commands/run.ts`, extend `renderOutcomes()` (line ~91-101 at SHA 707b41e). The JSON branch (`opts.json === true`) is unchanged. The human-mode branch (the existing `for (const outcome of outcomes)` loop):

- KEEP the existing `${role}: exit <code>` line (or `${role}: ${error}` for the error branch) as the FIRST line per outcome.
- IF `outcome.spawn?.stdout` is non-empty, write it BELOW the exit line, with a single blank line above for visual separation.
- IF `outcome.spawn?.stderr` is non-empty AND `outcome.spawn.exitCode !== 0`, write the stderr block AFTER the stdout block (or in its place if stdout is empty), prefixed with the line `stderr:` for the reader to distinguish.
- `opts.quiet` continues to suppress all output (no change).

This is a single-function-local change; no new exports, no dispatcher mutation, no contract drift in `DispatchOutcome`. The captured stdout/stderr already exists in the type (see `DispatchOutcome.spawn.stdout / .stderr` per 074); only the renderer changes.

**AC10.2 — Test assertion.** Extend `tests/cli/run.test.ts` with a new case that constructs a fake `DispatchSpawn` returning a `stdout` of (a known marker like) `"### Finding 1 — HIGH — sample"`, exit 0, drives `runRun()` in human mode (no `--json`), and asserts the captured stdout marker appears in the test's collected stdout. A second sub-case: exit-nonzero branch outputs stderr block (asserts the `stderr:` prefix + the stderr content). This pins AC10.1 against future renderer changes that re-hide the captured output.

**AC10.3 — JSON branch UNCHANGED.** Explicit non-claim: 075 does NOT modify the `--json` event shape. `run.outcomes` continues to carry the full `outcomes` array verbatim. Any consumer of the JSON stream is unaffected.

**AC10.4 — Bounded scope (don't drift).** The renderer change is the ONLY mutation to `src/cli/commands/run.ts`. Do NOT touch `dispatchWorkflow` (074-domain), `matchRolesToAgents` (074-domain), `loadWorkflow` (074-domain), `computeExitCode` (074-domain), the project-resolution logic (074 J8), the signal-handling lifecycle (074 AC5.x), or `RunOpts` shape. If any of those need to change, that's a NEW spec on 074's mechanism, not 075. The line count budget for this AC is ~10 LOC in `run.ts` + ~30 LOC in the test; anything beyond that is drift and should escalate.

## Out of Scope (Don't Drift)

- **NO new CLI subcommands.** Not `echoctl workflows ls`, `echoctl workflows show`, `echoctl workflows add`, nor any inspection helper. Discovery is `ls ~/.echo/workflows/`.
- **NO per-invocation diff overrides.** Not `--diff-source <pr|branch|wt|head>`, not `--base <ref>`, not `--head <ref>`. The four-priority chain in the prompt is the only resolution mechanism.
- **NO structured-YAML findings.** Output is the Markdown finding-block shape from AC1.3 step 4. If dogfooding shows structured output is needed, that's a 076+ spec.
- **NO multi-step workflows / branching / parallelism / error-recovery DSL.** All 075-or-later concerns per 074 J3.
- **NO changes to 074's `dispatch`/`match`/`load` modules.** If you find yourself wanting to edit `src/cli/workflow/*.ts`, STOP — that's drift into 074's domain. The workflow is consumed via the existing contract; if the contract needs to change, that's a new spec on 074's mechanism, not 075.
- **Run-command renderer extension is the ONE permitted 074 surface change** (r3 codex F1 HIGH per AC10): the human-mode branch of `renderOutcomes()` in `src/cli/commands/run.ts` MAY be extended to print captured `spawn.stdout` + `spawn.stderr` (bounded ~10 LOC per AC10.4). Nothing else in `run.ts` — not the dispatcher invocation, not the project-resolution logic, not the signal handler, not `computeExitCode`, not `RunOpts`. The constraint chain is: AC10 is narrow because the first-demo flow needs the user to actually see findings; ANY other run.ts change is drift.
- **NO changes to 070's `paths.ts` or `scaffold.ts`.** The `workflows` slot was added by 074 AC5.1 minor; the mkdir is already in `ensureEchoHome`. 075 makes ZERO mutations there.
- **NO new role TOML.** The default `reviewer.toml` from 071 is the target role; no `change-reviewer.toml` or similar.
- **NO wiki/operating-model edits.** Wiki updates happen post-shipment per CLAUDE.md.
- **NO `prepare` / `postinstall` / `build` `scripts` changes in `package.json`. NO `dependencies` / `devDependencies` changes.** 074 owns the build surface; 075 is content + a helper module. The narrow `files` allowlist extension in AC9 is the SOLE permitted `package.json` mutation (r1 codex-ops F1 disposition — without it the asset doesn't ship in packed install and the demo silently breaks). Do NOT also fix the 074-inherited allowlist gap for `assets/echo-roles/**` or `skills/**` here; that's a 074-follow-up (logged in After-Completion + `backlog/_followups.md`), NOT 075's scope.

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
- **074-inherited packed-install gap (file a follow-up).** r1 codex-ops F1 surfaced that 074's `files` allowlist (`["dist/**/*.js", "dist/**/*.d.ts", "package.json", "README.md"]`) omits `assets/echo-roles/**` and `skills/**` — the same gap 075's AC9 fixes for `assets/echo-workflows/**`. Roles + skills would also be source-missing in a packed install, so `syncDefaultRoles` and `syncClaudeSkills` would silently no-op post-install. File `backlog/_followups.md` entry referencing this disposition + the AC9 precedent so the next bin-install spec lifts all three at once. NOT a 075-scope fix — keep blast radius bounded.
