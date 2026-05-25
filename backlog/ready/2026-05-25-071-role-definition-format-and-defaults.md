---
id: 2026-05-25-071-role-definition-format-and-defaults
title: "Role definition format + 3 default roles — TOML schema, loader/validator, and canonical strategist/reviewer/builder.toml files"
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-25
blocked_by: []
task_state_ref: 2026-05-25-071-role-definition-format-and-defaults
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/echo-home/roles.ts                              # AC2 — TOML loader/validator; exposes typed Role interface + loadRolesFromDir(dir)
  - src/echo-home/index.ts                              # AC2 — barrel re-export so consumers import from 'src/echo-home'
  - assets/echo-roles/strategist.toml                   # AC3 — canonical default role
  - assets/echo-roles/reviewer.toml                     # AC3 — canonical default role
  - assets/echo-roles/builder.toml                      # AC3 — canonical default role
  - tests/echo-home/roles.test.ts                       # AC4 — schema/loader test cases
  - tests/echo-home/default-roles.test.ts               # AC4 — pins the 3 shipped TOMLs load + validate
  - package.json                                        # AC2 — adds a TOML parser dependency (see AC2.5 for choice rationale)
  - package-lock.json                                   # AC2 — lockfile updated by npm install

spec_refs:
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # source design — role format sketch in "Role definition format" section + decomposition table row for 071
  - CLAUDE.md                                                              # strategist responsibilities (used as canonical strategist role description); operating-model section the builder role must reflect
  - docs/AGENT_INSTRUCTIONS.md                                             # canonical builder loop — the description + skills set for builder.toml must match this
  - skills/process-backlog.md                                              # builder skill referenced by builder.toml
  - skills/process-backlog-batch.md                                        # builder skill referenced by builder.toml
  - skills/review-pending.md                                               # reviewer skill referenced by reviewer.toml AND strategist.toml (strategist preps reviews per CLAUDE.md)
  - skills/review-queue-codex.md                                           # reviewer skill referenced by reviewer.toml
  - skills/review-queue-claude.md                                          # reviewer skill referenced by reviewer.toml
  - skills/review-queue-codex-ops.md                                       # reviewer skill referenced by reviewer.toml
  - skills/review-queue-watch.md                                           # strategist skill referenced by strategist.toml
  - skills/merge-and-cleanup.md                                            # strategist skill referenced by strategist.toml
  - skills/role-typed-task-state.md                                        # task-state contract — referenced by all three default roles
  - skills/using-superpowers.md                                            # cold-start primer skill referenced by all three default roles
  - src/coord/roles.ts                                                     # NAMING-CONFLICT REFERENCE: this is the coord-layer per-role-per-event-type SLA loader (057a), a different concept from 071's role-definition format; the new loader MUST live at src/echo-home/roles.ts to avoid overloading the existing module

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# Role definition format + 3 default roles

## Why this spec exists

The 2026-05-25 brainstorm (archived at `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`) packaged ECHO Pro's coordination layer as the paid tier on top of the free substrate. The **unit of paid product** is a *role* — strategist, reviewer, builder — each bundling a skill set + MCP wiring requirement + capability requirements. Workflows are emergent: connect roles to run multi-agent dev.

For roles to be portable across agents (Codex, Claude Code, Cursor's Claude, future bindings), they need a vendor-neutral, machine-readable definition format. That format is the contract that subsystems 072 (adapter sync), 073 (onboarding wizard), and 074 (`echo` CLI binary) all consume.

071 ships that contract: the TOML schema, a TypeScript loader/validator, and the three canonical default role files. Everything downstream depends on it; nothing in 071 consumes itself.

## Dependency posture (call-out per team-lead brief)

`blocked_by: []`. The full `~/.echo/` scaffold (070) is a *runtime* dependency for any subsystem that *reads from* `~/.echo/roles/`. 071 only defines the format and ships the canonical TOML files inside the repo at `assets/echo-roles/`; the loader is directory-agnostic (`loadRolesFromDir(dir)`). 070 and 071 can be implemented in parallel and consumed together by 072+073+074. The first consumer that needs an actual `~/.echo/roles/*.toml` to exist is 072 (adapter sync, which copies the canonical TOMLs into `~/.echo/roles/`); by then 070 will have shipped.

## The minimum-viable fix (what ships in 071)

Three concrete deliverables, no more:

1. **Schema** — a TOML grammar for `<role-name>.toml`, refined from the brainstorm sketch (see AC1 below) with a controlled vocabulary for capabilities and a deliberate choice on `mcp_servers` semantics.
2. **Loader/validator** — `src/echo-home/roles.ts` exporting `loadRolesFromDir(dir: string): Role[]`, `loadRoleFromFile(path: string): Role`, and the `Role` TypeScript interface. Validation errors throw with the offending file path + field name in the message.
3. **Three canonical TOMLs** — `assets/echo-roles/{strategist,reviewer,builder}.toml`, each loading + validating cleanly through the loader.

Tests cover: schema happy-path, every required-field rejection, every controlled-vocabulary rejection, and a smoke test that all three shipped TOMLs load successfully.

## Acceptance Criteria

### AC1 — TOML schema for `~/.echo/roles/<name>.toml` is precisely defined

The canonical schema. Refined from the brainstorm sketch with the judgment calls explained inline:

```toml
# [role] — required table
[role]
description = "One-sentence human-readable summary of what this role does."
sandbox = "read-only"                       # required; enum: "read-only" | "workspace-write"
skills    = ["review-pending", "review-queue-codex"]  # required; non-empty array of strings, each must resolve to skills/<name>.md

# [role.requires] — required table
[role.requires]
mcp_servers  = ["echo"]                     # required; non-empty array of MCP server NAMES (not URLs); "echo" is the canonical ECHO daemon name
capabilities = ["fs.read", "git.read"]      # required; non-empty array; each entry must be in the controlled vocabulary (see AC1.2)

# [role.output] — required table
[role.output]
format          = "yaml-header + markdown"  # required; free-form string for now (no enum) — describes the role's primary written output shape
required_fields = ["verdict", "reviewer", "findings"]  # required; non-empty array of strings — fields the role's output must contain
```

**AC1.1 — `name` field is REMOVED from the sketch and derived from the filename.** Judgment call (justification): the brainstorm sketch had `name = "reviewer"` inside `[role]`, but this duplicates the filename and creates a second source of truth that can disagree. The loader derives `name` from `basename(path, '.toml')`. Filename rule: `[a-z][a-z0-9-]*\.toml` (kebab-case, starts with a letter). The loader rejects any TOML whose body still contains a `[role].name` key (helps catch sketches that copy-pasted the old shape).

**AC1.2 — `capabilities` controlled vocabulary.** Judgment call (justification): an uncontrolled string array means downstream consumers (074's role-plugging matcher) can't reason about what an agent must provide. V1 vocabulary:

| Capability | Meaning |
|---|---|
| `fs.read`        | Read files on disk |
| `fs.write`       | Write/create files on disk |
| `git.read`       | Read git history / refs / diffs |
| `git.write`      | Make commits, create branches, push |
| `network`        | Make outbound network calls (HTTP, etc.) beyond local MCP |
| `mcp.echo.read`  | Call read-only ECHO MCP tools (`find_clusters`, `get_atom`, `search_memories`, etc.) |
| `mcp.echo.write` | Call ECHO MCP tools that mutate (`coord_emit`, `memory_remember`, etc.) |

The loader rejects any capability not in this set. Adding to the vocabulary is a separate spec (follow-up); 071 ships only what the three default roles need.

**AC1.3 — `sandbox` is an enum, not free-form.** Values: `"read-only" | "workspace-write"`. Matches the existing codex-sandbox terminology used throughout `skills/review-queue-*.md` and CLAUDE.md ("read-only sandbox" for reviewers). The loader rejects any other value. (`danger-full-access` is deliberately omitted from V1 — no default role needs it.)

**AC1.4 — `mcp_servers` carries NAMES, not URLs.** Judgment call (justification): the role file is the *requirement*, not the *wiring*. URLs / commands belong in the per-agent adapter config (e.g., `~/.codex/config.toml` `[mcp_servers.echo]` block written by 072). The role only declares "this role needs an MCP server registered under the name `echo`." Matching that name to a running daemon is 074's responsibility. Names must match the regex `[a-z][a-z0-9_-]*` and the array must be non-empty.

**AC1.5 — `[role.output].format` stays free-form for V1.** Judgment call (justification): the three default roles each have a distinct output shape (`yaml-header + markdown` for reviewer, `markdown` for builder run logs, `markdown` for strategist specs). Forcing an enum now would over-fit. Promoted to enum in a follow-up once 5+ roles exist and patterns are clear.

**AC1.6 — Unknown top-level keys are a HARD ERROR.** A TOML that contains, for example, `[role.metadata]` or `[role.author]` is rejected. Why: silent-ignore allows drift toward incompatible future shapes. Strict-by-default; expand the schema explicitly when a new key earns its keep.

**AC1.7 — Role TOMLs are intentionally unversioned in V1.** Unlike 070's `onboarding.json` / `projects.json` which carry `schema_version: 1`, role TOMLs ship no `[role].schema_version` field. The strict-unknown-key rejection (AC1.6) + additive-only schema evolution + explicit follow-up migration specs for any breaking change collectively serve the same role as JSON state versioning. If a future spec needs in-file version negotiation (e.g., user-authored roles need to declare schema-compat), it adds `[role].schema_version` then and migrates the three default TOMLs explicitly. Do not preemptively add the field in 071. The "additive-only" language in After Completion §1 refers to this discipline, not to a numeric version field.

### AC2 — TypeScript loader/validator at `src/echo-home/roles.ts`

**AC2.1 — File location and reason.** New file at `src/echo-home/roles.ts`. The existing `src/coord/roles.ts` (057a) is a *different concept* — it loads per-role-per-event-type SLA config for the coord-event layer. Conflating them would force one module to grow two unrelated schemas. The barrel file `src/echo-home/index.ts` re-exports the public surface (`Role`, `loadRoleFromFile`, `loadRolesFromDir`, `RoleValidationError`).

**AC2.2 — Public surface.**

```ts
export interface Role {
  readonly name: string;                  // derived from filename, NOT from TOML body
  readonly description: string;
  readonly sandbox: 'read-only' | 'workspace-write';
  readonly skills: readonly string[];
  readonly requires: {
    readonly mcpServers: readonly string[];
    readonly capabilities: readonly Capability[];
  };
  readonly output: {
    readonly format: string;
    readonly requiredFields: readonly string[];
  };
  readonly sourcePath: string;            // absolute path the role was loaded from — useful for error attribution in downstream consumers
}

export type Capability =
  | 'fs.read' | 'fs.write'
  | 'git.read' | 'git.write'
  | 'network'
  | 'mcp.echo.read' | 'mcp.echo.write';

export class RoleValidationError extends Error {
  constructor(message: string, public readonly filePath: string, public readonly field?: string);
}

export interface RoleLoadOptions {
  // Override for the directory containing skills/<name>.md used by AC2.4's
  // skill-existence check. When undefined, the loader walks upward from
  // sourcePath to find a directory containing both package.json AND a skills/
  // subdir (repo-rooted default; works from worktrees + main repo). When set
  // (typical for ~/.echo/-rooted consumers in 072/074), the loader resolves
  // skills against this directory directly without walking. Both code paths
  // enforce AC2.4's two-step grammar + path-containment check.
  skillsRoot?: string;
  // If true, loadRolesFromDir asserts every entry in DEFAULT_ROLE_FILENAMES is
  // present in dirPath. Missing defaults throw RoleValidationError with message
  // "installation integrity: missing default role <name>" — a louder, distinct
  // failure mode than per-file validation, intended for ~/.echo/roles/ post-
  // install integrity checks (where a partially-populated dir from a 072
  // mid-failure must not be treated as a valid one-role system). Off by default
  // so generic dir loads (test fixtures, arbitrary user dirs) still return only
  // discovered roles.
  assertDefaults?: boolean;
}

export function loadRoleFromFile(filePath: string, opts?: RoleLoadOptions): Role;
export function loadRolesFromDir(dirPath: string, opts?: RoleLoadOptions): Role[];   // skips dotfiles; sorts by name; throws on any single-file failure

// Canonical list of role filenames shipped by 071. Single source of truth — 072's
// syncDefaultRoles / syncAll consume this constant instead of hardcoding the list.
// Order is the canonical sort order returned by loadRolesFromDir.
export const DEFAULT_ROLE_FILENAMES: readonly string[] = [
  'builder.toml',
  'reviewer.toml',
  'strategist.toml',
] as const;
```

**AC2.3 — Validation behaviors.** Each of the following MUST throw `RoleValidationError` with a message that includes the file path and the offending field name:

- Missing `[role]` table → message contains "missing required table [role]"
- Missing any required field within `[role]`, `[role.requires]`, or `[role.output]` → message names the field
- `[role].name` key present in TOML body → message says "name must be derived from filename, not declared in body"
- Filename does not match `^[a-z][a-z0-9-]*\.toml$` → message names the filename rule
- `sandbox` value not in enum → message lists valid values
- Any entry of `capabilities` not in controlled vocabulary → message names the rejected capability AND lists the vocabulary
- Any entry of `skills` that does NOT correspond to an existing file at `<repo-root>/skills/<skill>.md` → message names the missing skill (per AC2.4 below)
- Any unknown top-level key inside `[role]`, `[role.requires]`, `[role.output]` → message names the unknown key
- Empty array where non-empty is required (`skills`, `mcp_servers`, `capabilities`, `required_fields`) → message names the field
- TOML parse failure → wrapped in `RoleValidationError` with the original parser message

**AC2.4 — Skills-array reference check (two-step).** The loader validates that every entry in `skills` corresponds to an existing skill file. Resolution proceeds in two steps:

1. **Skill name grammar:** each entry MUST match `^[a-z][a-z0-9-]*$`. Names containing `/`, `..`, dots, capital letters, underscores, or other characters throw `RoleValidationError` with message naming the rejected entry AND the grammar. This blocks traversal-shaped entries (`../escape`, `../../etc/passwd`, `./local`) and environment-specific aliases at the schema layer, BEFORE any filesystem access.
2. **Skill location + containment:** the candidate path is `<skillsRoot>/<name>.md`. When `opts.skillsRoot` is undefined, `skillsRoot` is discovered by walking upward from `sourcePath` until a directory containing both `package.json` AND a `skills/` subdir is found (this matches how other tools in this repo locate the root from worktrees + main repo equally). The resolved absolute path MUST remain inside `skillsRoot` — i.e., `path.resolve(candidate)` startsWith `path.resolve(skillsRoot) + path.sep`. A constructed candidate that escapes the root throws `RoleValidationError` even if it happens to exist on disk. Only then is `fs.statSync` used; missing-file throws with the resolved path.

The check is intentional dogfooding of the "skills are the cross-tool protocol" decision: the role file cannot reference a skill that doesn't exist in the canonical skill library, AND cannot use the role file as a generic file-existence oracle outside that library.

**R1 r1 patch (codex-ops Finding 3):** the explicit grammar + path-containment check were folded in to close path-traversal risk surfaced by the `skillsRoot` overload. Without these, a join-only implementation could accept traversal-shaped entries when the user-supplied `skillsRoot` happens to live next to a sensitive directory.

**AC2.5 — TOML parser dependency.** Add `smol-toml@^1.6.1` as a `dependencies` entry in `package.json`. **Floor is 1.6.1, NOT lower** — earlier versions are flagged by GHSA-v3rj-xjv7-4jmq (parser DoS, fixed in 1.6.1), and this loader will eventually parse user-authored role TOMLs from `~/.echo/roles/`. The lockfile MUST resolve to 1.6.1 or newer; CI's `npm audit --audit-level=high` will fail otherwise. Rationale for smol-toml: pure-JS, zero-dep, TOML 1.0.0 compliant, ESM-native (matches the repo's `module: NodeNext` setup), 25kB. Alternatives considered: `@iarna/toml` (stale, CJS-only, doesn't fully implement 1.0.0); `@ltd/j-toml` (heavier; doesn't add value for our shape). Choosing the smaller pure-JS option keeps the substrate's dependency surface tight. If a future capability (e.g., format-preserving round-trip writes) needs a different parser, swap behind the same `Role` interface.

**R1 r1 patch (codex Finding 2):** floor bumped from `^1.3.1` to `^1.6.1` per GHSA-v3rj-xjv7-4jmq.

### AC3 — Three canonical default role files shipped at `assets/echo-roles/`

Each file lives at `assets/echo-roles/<name>.toml` and conforms to AC1's schema. Content must reflect the canonical role descriptions in CLAUDE.md / `docs/AGENT_INSTRUCTIONS.md` / `skills/review-queue-*.md` — not invented from scratch.

**AC3.1 — `assets/echo-roles/strategist.toml`.**

```toml
[role]
description = "Long-context planner. Drafts backlog specs from founder conversations, synthesizes reviewer findings across rounds, decides when a spec is ready to merge. Reads the full corpus on cold-start via task-state pointers."
sandbox = "workspace-write"
skills = ["review-queue-watch", "review-pending", "merge-and-cleanup", "role-typed-task-state", "using-superpowers"]

[role.requires]
mcp_servers = ["echo"]
capabilities = ["fs.read", "fs.write", "git.read", "git.write", "mcp.echo.read", "mcp.echo.write"]

[role.output]
format = "markdown"
required_fields = ["spec-body", "acceptance-criteria"]
```

Description aligned to CLAUDE.md's "Strategist Responsibilities" section. `skills` set covers the three skills the strategist actively invokes (`review-queue-watch`, `review-pending`, `merge-and-cleanup`) plus the two cross-role primers (`role-typed-task-state`, `using-superpowers`).

**AC3.2 — `assets/echo-roles/reviewer.toml`.**

```toml
[role]
description = "Fresh-eyes-at-SHA code review. Reads the diff against acceptance criteria, surfaces correctness/scope/style findings. Read-only sandbox; never merges. Per-vendor adapters (codex, codex-ops, claude) share this role shape."
sandbox = "read-only"
skills = ["review-queue-codex", "review-queue-codex-ops", "review-queue-claude"]

[role.requires]
mcp_servers = ["echo"]
capabilities = ["fs.read", "git.read", "mcp.echo.read"]

[role.output]
format = "yaml-header + markdown"
required_fields = ["verdict", "reviewer", "findings"]
```

Description aligned to `skills/review-queue-codex.md` / `skills/review-queue-claude.md` / `skills/review-queue-codex-ops.md`. NOTE: reviewer output format `yaml-header + markdown` and required-fields list match the existing `request.md`/`<reviewer>.md` shape produced by the review-queue skills today.

**AC3.3 — `assets/echo-roles/builder.toml`.**

```toml
[role]
description = "Claims a backlog item, works in an isolated git worktree on a feature branch, implements to acceptance criteria only, ships to backlog/pending_review/. One item per run. Drifts are caught by the explicit Out-of-Scope section of each spec."
sandbox = "workspace-write"
skills = ["process-backlog", "process-backlog-batch", "role-typed-task-state", "using-superpowers"]

[role.requires]
mcp_servers = ["echo"]
capabilities = ["fs.read", "fs.write", "git.read", "git.write", "mcp.echo.read", "mcp.echo.write"]

[role.output]
format = "markdown"
required_fields = ["run-log", "agent_notes"]
```

Description aligned to `docs/AGENT_INSTRUCTIONS.md`'s loop description. `process-backlog-batch` is included because the batch wrapper IS the same role with the same discipline — it's the multi-iteration form, not a separate role.

**AC3.4 — Pre-flight skill-existence check at write time.** Before committing the three TOMLs, the builder MUST verify each listed skill resolves to an existing `skills/<name>.md` (i.e., the same check the loader does). If a skill is missing, the builder STOPS and escalates rather than removing it from the TOML — the canonical skill library is the source of truth, not the role file. (All skills referenced above were verified to exist at spec-draft time: `skills/{review-queue-watch,review-pending,merge-and-cleanup,role-typed-task-state,using-superpowers,review-queue-codex,review-queue-codex-ops,review-queue-claude,process-backlog,process-backlog-batch}.md`.)

### AC4 — Tests pin the schema and the three default roles

**AC4.1 — `tests/echo-home/roles.test.ts`** (loader + schema cases). Vitest. Each test loads a small inline TOML string via a helper that writes to a temp dir then calls `loadRoleFromFile`. Required cases:

1. Happy path: a valid minimal TOML loads, all fields populated correctly, `name` derived from filename.
2. Missing `[role]` table → throws `RoleValidationError`; message contains "missing required table [role]".
3. Missing `description` → throws; message names `description`.
4. Missing `sandbox` → throws; message names `sandbox`.
5. Invalid `sandbox` value (e.g., `"danger-full-access"`) → throws; message lists valid enum values.
6. Empty `skills` array → throws; message names `skills` and "non-empty".
7. `skills` entry that doesn't exist on disk (e.g., `["nonexistent-skill"]`) → throws; message names `nonexistent-skill` and points at `skills/nonexistent-skill.md`.
8. `[role].name` declared in TOML body → throws; message says "name must be derived from filename".
9. Filename `Reviewer.toml` (capital R) → throws; message names the kebab-case rule.
10. `capabilities` entry not in vocabulary (e.g., `["fs.fly"]`) → throws; message names `fs.fly` and lists the vocabulary.
11. Unknown top-level key (e.g., `[role.metadata]`) → throws; message names `metadata`.
12. Empty `mcp_servers` array → throws; message names `mcp_servers`.
13. Missing `[role.output].required_fields` → throws; message names `required_fields`.
14. Parse error (malformed TOML) → throws `RoleValidationError` wrapping the parser error.
15. Missing `skills` array entirely → throws; message names `skills`.
16. Missing `[role.requires]` table → throws; message names `[role.requires]`.
17. Missing `mcp_servers` field → throws; message names `mcp_servers`.
18. Missing `capabilities` field → throws; message names `capabilities`.
19. Missing `[role.output]` table → throws; message names `[role.output]`.
20. Missing `output.format` field → throws; message names `format`.
21. Unknown key inside `[role.requires]` (e.g., `[role.requires].secrets`) → throws; message names `secrets`.
22. Unknown key inside `[role.output]` (e.g., `[role.output].max_tokens`) → throws; message names `max_tokens`.
23. **`skillsRoot` overload success:** `loadRoleFromFile(path, { skillsRoot: '<tmpdir>/skills' })` where the tmp `skills/` contains stubs for the referenced skill names → loads successfully without walking upward.
24. **`skillsRoot` overload failure (wrong root):** `loadRoleFromFile(path, { skillsRoot: '<tmpdir>/empty' })` → throws; message names the missing skill and the resolved path under the supplied root.
25. **`skillsRoot` overload disables walk:** when `opts.skillsRoot` is set, the loader does NOT fall back to walking from `sourcePath` even if walking would have found the skill → throws as in #24.
26. **Skill name grammar — traversal-shaped:** `skills = ["../escape"]` → throws `RoleValidationError`; message names `../escape` and the grammar `^[a-z][a-z0-9-]*$`. The check fires BEFORE filesystem lookup (must NOT depend on whether the would-be path exists).
27. **Skill name grammar — capital letter:** `skills = ["Foo"]` → throws; message names the grammar.
28. **Skill name grammar — dot in name:** `skills = ["foo.bar"]` → throws; message names the grammar.

**R1 r1 patch (codex Finding 3 + codex-ops Finding 3):** test cases 15-22 cover the missing-table/missing-field rejection promises in AC2.3 that were previously implicit; cases 23-25 pin the `skillsRoot` overload added to AC2.2; cases 26-28 pin the skill-name grammar added to AC2.4.

**AC4.2 — `tests/echo-home/default-roles.test.ts`** (smoke-test the shipped defaults).

1. `loadRolesFromDir('assets/echo-roles')` returns exactly 3 roles, sorted by name: `builder`, `reviewer`, `strategist`.
2. Each role's `skills` array entries all resolve to existing `skills/<name>.md` files.
3. Each role's `capabilities` array is non-empty and all entries are in the controlled vocabulary.
4. `reviewer.sandbox === 'read-only'` (regression pin: the reviewer must NEVER ship as workspace-write).
5. The reviewer role's `required_fields` includes exactly `'verdict'`, `'reviewer'`, `'findings'`.
6. `builder.skills` includes `'process-backlog'` (regression pin: the canonical builder skill must always be present).
7. `strategist.skills` includes `'review-queue-watch'` (regression pin: the canonical strategist orchestration skill must always be present).
8. `DEFAULT_ROLE_FILENAMES` exactly equals the sorted basenames present at `assets/echo-roles/` (regression pin: the constant is the single source of truth consumed by 072; if a future spec adds a 4th default role TOML, the constant MUST be updated in the same commit or this test fails — the test is the trip-wire that prevents 072 from silently lagging 071).
9. **`assertDefaults: false` default — partial dir, no throw:** `loadRolesFromDir('<tmpdir>/partial')` where only `builder.toml` is present → returns 1 role, no throw. Verifies generic dir loads do not silently expand to integrity assertions.
10. **`assertDefaults: true` success:** `loadRolesFromDir('assets/echo-roles', { assertDefaults: true })` → returns 3 roles, no throw.
11. **`assertDefaults: true` failure (missing reviewer):** `loadRolesFromDir('<tmpdir>/partial', { assertDefaults: true })` with only `builder.toml` present → throws `RoleValidationError` with message `"installation integrity: missing default role reviewer"`. Pins the failure mode codex-ops flagged: partially-populated `~/.echo/roles/` from a 072 mid-failure must fail loud, not silently degrade.
12. **`assertDefaults: true` failure (missing strategist):** same shape as #11 with builder + reviewer present → throws `"installation integrity: missing default role strategist"`.

**R1 r1 patch (codex-ops Finding 2):** tests 9-12 added to pin the `assertDefaults` contract codex-ops flagged as missing. Without these, a 072 partial-failure leaving only `builder.toml` in `~/.echo/roles/` would be treated as a valid one-role system by downstream consumers; 074's role-plugging matcher could then silently degrade.

**AC4.3 — All existing tests continue to pass.** No edits to existing test files.

## Out of Scope (Don't Drift)

1. **The `~/.echo/` directory itself.** Creating the directory, the `state/onboarding.json` file, the `state/projects.json` file, the `adapters/` cache — all 070. 071 does NOT touch `~/.echo/`. The loader takes a directory path argument; the caller decides what directory.

2. **Copying canonical TOMLs to `~/.echo/roles/`.** That's 072 (adapter sync). 071 ships them in-repo at `assets/echo-roles/`. Do NOT add any "install" step.

3. **The onboarding wizard.** UI/CLI for asking "which agents do you have?" — 073. 071 has no user-facing surface.

4. **The `echo` CLI binary.** `echo init`, `echo run`, `echo doctor`, `echo uninstall` — all 074. 071 ships TypeScript code consumable from the daemon and from future CLI; no binary.

5. **Role-plugging RUNTIME matching.** Matching a role's `[role.requires]` against an onboarded agent's capability profile to pick which agent fulfills which role — 074. 071 only defines the format; it does NOT implement the matcher.

6. **Adding new skills.** If a default role's preferred skill set wants a skill that doesn't exist at `skills/<name>.md`, do NOT write the skill in 071. STOP and escalate — the skill goes into a follow-up spec, and the role file uses the existing skills until then.

7. **Adding capabilities to the controlled vocabulary.** The seven capabilities in AC1.2 are exactly what the three default roles need. Adding `meeting.read`, `slack.write`, etc. is V1.5+ when a new role earns the addition.

8. **A `[role].name` field.** The brainstorm sketch had one; AC1.1 removes it. Do NOT add it back.

9. **Format-preserving TOML writes.** 071 only READS TOML files. Writing/mutating them is 072's concern.

10. **`get_skill(name)` MCP tool for dynamic skill serving.** Deferred per the brainstorm's "What's deferred" table — V1.5+.

11. **User-authored role editor.** No editor ships in V1; users hand-write extra roles by copying a default. Surface area for the editor is V2+.

12. **Workflow definitions.** "Connect roles to run multi-agent dev" — that's an emergent property of role + skill composition, not a separate file format. 071 ships no `workflow.toml` or equivalent.

## Risks

- **R1 — Schema bikeshedding before downstream consumers exist.** No file *reads* this schema yet outside its own tests. Risk that 072/073/074 surface required-field changes that 071 didn't predict, forcing a schema bump and migration of the three default TOMLs. Mitigation: schema is intentionally minimal (4 required tables, controlled vocabulary, strict-unknown-key rejection). Adding a field is additive; the strict-rejection of unknown keys catches any 072/073/074 attempt to silently overload the schema. Acceptable churn cost.

- **R2 — `smol-toml` is a new dependency.** Substrate's `package.json` does not currently depend on a TOML parser. Mitigation: AC2.5 documents alternatives considered; smol-toml is the smallest, ESM-native, TOML-1.0.0-compliant option. Pinned to `^1.6.1` (NOT lower — GHSA-v3rj-xjv7-4jmq parser-DoS is fixed in 1.6.1; lockfile must resolve to 1.6.1+, gated by `npm audit --audit-level=high` in CI). If a future security/maintenance concern surfaces, swap to `@iarna/toml` behind the same `Role` interface in a follow-up. **(R2 r1-patch update: floor was `^1.3.1` in r1 draft; bumped to `^1.6.1` per R1 codex Finding 2 / codex-ops R2 stale-prose follow-up.)**

- **R3 — Skill-existence check couples loader to filesystem layout.** The loader walks upward from `sourcePath` to find repo root. Risk: in 072/074, when the role files live at `~/.echo/roles/`, the "repo root" walk will fail — there is no `package.json` upward. Mitigation: AC2.2 exposes `RoleLoadOptions` (`skillsRoot?`, `assertDefaults?`) as part of the public contract on BOTH `loadRoleFromFile(filePath, opts?)` and `loadRolesFromDir(dirPath, opts?)`. Downstream consumers running from `~/.echo/` pass an explicit `skillsRoot`; the loader does NOT fall back to walking when `opts.skillsRoot` is supplied. AC2.4 enforces the two-step grammar + path-containment check on every resolution path so the overload cannot become a file-existence oracle.

- **R4 — Backlog-item-id-as-name collision.** A user creates `~/.echo/roles/strategist.toml` AND `~/.echo/roles/Strategist.toml` (case-different) — filesystems vary in case-sensitivity. Mitigation: AC1.1's filename rule (`^[a-z][a-z0-9-]*\.toml$`) rejects any uppercase. `loadRolesFromDir` enforces the rule per file and additionally rejects the directory if two files normalize to the same role name.

- **R5 — `[role.requires].mcp_servers = ["echo"]` is a name, not a wiring.** A reviewer might object that this declaration provides no run-time signal of WHICH `echo` daemon. Response: that's intentional — wiring is per-agent-adapter (072) work, not role-declaration (071) work. Documented inline as a code comment on the `mcpServers` field.

## Tests

All additive — no existing test rewrites.

- `tests/echo-home/roles.test.ts` — 28 cases per AC4.1 (14 original + 14 added in r1 patch: 8 missing-table/field + 3 `skillsRoot` overload + 3 grammar/traversal).
- `tests/echo-home/default-roles.test.ts` — 12 cases per AC4.2 (8 original + 4 `assertDefaults` integrity cases added in r1 patch). Net new across AC4 from r1 patches: +18 cases.

Verify steps:

- `npm install` after adding `smol-toml` — confirms lockfile updates cleanly.
- `npm test -- tests/echo-home/roles.test.ts tests/echo-home/default-roles.test.ts` — both new files pass.
- `npm test` — full root suite, all tests pass.
- `npm run lint` — clean.
- `npm run typecheck` — clean.

All five verify commands must pass before the builder moves 071 to `pending_review/`.

## Definition of Done

- AC1: schema documented in code comments on `src/echo-home/roles.ts`; controlled vocabulary, enum values, and unknown-key rejection all implemented.
- AC2: `src/echo-home/roles.ts` exports `Role`, `Capability`, `RoleValidationError`, `RoleLoadOptions`, `loadRoleFromFile`, `loadRolesFromDir`, `DEFAULT_ROLE_FILENAMES`. Both `loadRoleFromFile` and `loadRolesFromDir` accept `RoleLoadOptions` (`skillsRoot?`, `assertDefaults?`) as part of the public contract — not R3-only prose. Barrel `src/echo-home/index.ts` re-exports the public surface. `smol-toml@^1.6.1` is in `package.json` `dependencies` and `package-lock.json` resolves to 1.6.1 or newer (GHSA-v3rj-xjv7-4jmq compliant; `npm audit --audit-level=high` gates this). The skill-name grammar (`^[a-z][a-z0-9-]*$`) + path-containment check (resolved skill path must remain inside `skillsRoot`) are enforced BEFORE existence lookup per AC2.4.
- AC3: `assets/echo-roles/{strategist,reviewer,builder}.toml` all exist; each conforms to the AC1 schema; each skill referenced resolves to `skills/<name>.md`.
- AC4: all 28 loader cases + 12 default-roles cases pass (40 total; up from 22 in r1 draft — 14 loader + 8 default-roles — per the R1 r1 disposition patches that added 14 loader cases and 4 default-roles cases).
- All five verify commands clean.

## After Completion (Strategist Notes)

- **Wiki page candidates (post-shipment):** none yet — 071 alone is not enough. After 072+073+074 ship, write `wiki/architecture/coord-layer.md` (the full `~/.echo/` layout + role format + adapter sync) and include the AC1 schema definition there as the canonical reference.

- **Update `wiki/product/echo-pro.md`** (to be created when 070+071+072+073+074 are all complete) with a one-line note that ECHO Pro's role format is TOML, schema versioned via additive-only changes, controlled-vocabulary for capabilities.

- **`backlog/_followups.md` annotations:** when 071 lands in `complete/`, append:
  - "Capability vocabulary additions (e.g., `meeting.read`, `slack.write`) gated by new-role demand" — Out of Scope §7
  - "`get_skill(name)` MCP tool for dynamic skill serving" — Out of Scope §10 (already in brainstorm's deferred table)
  - "Role editor UI/CLI" — Out of Scope §11
  - "Schema enum-promotion review at 5+ roles" — AC1.5 trigger

- **Trigger for follow-up cleanup spec:** if 072/073/074 surface schema gaps requiring a `[role].version` field or any breaking change, file a 071-followup spec rather than editing the original. The three shipped default TOMLs are then migrated explicitly.

- **No new principle page.** Vendor-neutral role format is one occurrence of the "skills are the cross-tool protocol" principle (already shipped at `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`); promote to wiki principle on second occurrence.
