---
id: 2026-05-25-070-echo-global-home-scaffold
title: "ECHO global home (~/.echo/) scaffold — directory layout, state file schemas, daemon-aware paths for the Pro coord layer"
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-25
blocked_by: []
task_state_ref: "backlog/task-state/2026-05-25-070-echo-global-home-scaffold/strategist.md"
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/echo-home/paths.ts  # NEW — canonical path constants + state-file schema types; sole module that knows the ~/.echo/ layout
  - src/echo-home/scaffold.ts  # NEW — ensureEchoHome(): idempotent directory tree creation + initial state file write; pure-fs, no daemon coupling
  - src/daemon/index.ts  # AC3 — daemon calls ensureEchoHome() once during startup, before extractors/MCP server start; non-fatal on failure (log + continue)
  - tests/echo-home/paths.test.ts  # NEW — pin path constants honor ECHO_HOME env override + os.homedir() default
  - tests/echo-home/scaffold.test.ts  # NEW — pin idempotency, schema validation, no-rewrite-on-second-call

spec_refs:
  - src/daemon/index.ts  # current daemon entry point — the bootstrap that must learn about ~/.echo/. Note resolveDataDir + acquirePidLockOrExit pattern at lines ~46-50 as the integration point.
  - src/daemon/lifecycle.ts  # resolveDataDir() at lines 18-22 — the existing canonical pattern for resolving ECHO-owned filesystem paths from env + homedir. The new echo-home/paths.ts must follow the same shape (env override, fall back to homedir-based default).
  - src/capture/sources.ts  # lines 1, 24-28 — current canonical homedir() + ~ expansion pattern; consume the same approach in echo-home/paths.ts (do not reinvent).
  - src/capture/extractors/codex.ts  # lines 25-27 — example of an existing module that defines a HOME-derived default constant; mirror the const-at-module-load shape, not lazy resolution.
  - src/mcp/util/source-app.ts  # lines 16-22 — shows the established `${HOME}/.codex/...` style; the ECHO global home is the same shape one level deeper.
  - src/guards.ts  # isNonEmptyString — used by lifecycle.ts to gate env-string overrides; reuse for ECHO_HOME env handling.
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # the parent design doc — the "Coord layer architecture" section enumerates the ~/.echo/ tree this spec creates
  - backlog/complete/2026-05-22-069-raycast-cold-start-continuity-hero.md  # format reference for this spec's frontmatter + section structure

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

# ECHO global home (`~/.echo/`) scaffold

## Why this spec exists

The 2026-05-25 ECHO Pro design (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`) packages the paid tier as a **coord layer** that lives under a single global directory: `~/.echo/`. Skills, role TOMLs, adapter cache, and runtime state (onboarding progress, known projects) all root there. Five sibling backlog items — 071 (role definitions), 072 (adapter sync), 073 (onboarding wizard), 074 (`echo` CLI), 075 (first demo) — all assume this directory exists and that a single TypeScript module owns the canonical paths and schema types.

070 is the foundation. It creates the directory tree, defines the JSON schemas for the two runtime state files (`onboarding.json`, `projects.json`), and teaches the daemon at `src/daemon/index.ts` to ensure the tree exists on startup. No skills are written here (that's 071); no adapters are touched (that's 072); no wizard runs (that's 073). The deliverable is **just the empty, well-typed scaffold** that everything else slots into.

The integration point in the existing daemon is the bootstrap section at `src/daemon/index.ts:46-50`, immediately after PID lock acquisition and before extractors start. `resolveDataDir()` at `src/daemon/lifecycle.ts:18-22` is the canonical pattern this module mirrors: env override (`ECHO_HOME` for the new module, mirroring `ECHO_DATA_DIR`), fall back to a homedir-derived default.

## The minimum-viable scaffold

**What ships in 070:**

- One new module `src/echo-home/paths.ts` exporting:
  - Const path strings for every directory + file in the `~/.echo/` tree (resolved once at module load, overridable via `ECHO_HOME` env).
  - TypeScript types for the two state-file schemas (`OnboardingState`, `ProjectsState`).
  - A JSON-schema validator pair (Ajv compiled at module load; the project already depends on Ajv per `package.json`) so 071–074 can validate state files they read/write.
- One new module `src/echo-home/scaffold.ts` exporting `ensureEchoHome()`:
  - Creates the directory tree idempotently (`mkdirSync(..., { recursive: true })`).
  - Writes initial-state files **only if absent** — never overwrites an existing file. This is the load-bearing invariant that lets the daemon call it on every start without clobbering wizard progress.
  - Pure fs / synchronous; no daemon coupling, no extractor coupling. Importable by future CLI code (074) without dragging in the daemon module.
- One edit to `src/daemon/index.ts`: call `ensureEchoHome()` once after `acquirePidLockOrExit(dataDir)` and before the `Promise.all` of extractor/MCP startup. Failure is logged (`createLogger('daemon.echo-home').error(...)`) but **non-fatal** — the daemon must still serve substrate-only callers (V1 free tier) even if `~/.echo/` is unwritable.
- Two new test files pinning idempotency, env override, and schema shape.

## Directory layout

```
~/.echo/
├── skills/              # empty; populated by 072 (adapter sync engine copies repo skills/ here)
├── roles/               # empty; populated by 072 (adapter sync engine copies assets/echo-roles/ here on first install)
├── adapters/            # empty; populated by 072 (cached per-agent adapter outputs)
└── state/
    ├── onboarding.json  # initial empty-state written here; mutated by 073
    └── projects.json    # initial empty-state written here; mutated by 073+
```

`ECHO_HOME` env, when set and non-empty (per `isNonEmptyString` from `src/guards.ts`), overrides the `~/.echo/` default. Resolution is path.resolve()-normalized exactly the same way `resolveDataDir()` does. No XDG fallback in V1 (we are macOS-first per the V1 spec; cross-platform is V1.5+).

## State file schemas

**`onboarding.json`** — records what the wizard wired and when. Initial state on first daemon boot is an empty-but-typed shell so 073 can start mutating from a known shape rather than null-checking everywhere.

```ts
export interface OnboardingState {
  schema_version: 1;
  created_at: string;            // ISO8601, set on first write, never mutated after
  last_updated_at: string;       // ISO8601, set on first write, updated by 073 on each wire/probe
  completed: boolean;            // wizard finished end-to-end at least once
  agents: OnboardedAgentProfile[];  // appended by 073 as agents are detected + wired
}

export interface OnboardedAgentProfile {
  id: 'codex' | 'claude-code' | 'cursor' | string;  // free-form for future agents
  detected_at: string;           // ISO8601 — when detection step saw this agent
  wired_at: string | null;       // ISO8601 — when AGENTS.md / config write completed; null if skipped/failed
  probed_at: string | null;      // ISO8601 — when echo_ping round-trip succeeded; null if skipped/failed
  capabilities: string[];        // free-form strings like 'fs.read', 'git.read' — populated by 073, schema-free at the wire
  wire_error: string | null;     // last write/probe error message if any; cleared on next success
}
```

Initial state written by `ensureEchoHome()`:
```json
{ "schema_version": 1, "created_at": "<now>", "last_updated_at": "<now>", "completed": false, "agents": [] }
```

**`projects.json`** — known projects, auto-populated by 073 (and later refreshed on every daemon start in a future item). Empty on initial write; 070 does NOT populate it from the atom store (that lookup belongs to 073).

```ts
export interface ProjectsState {
  schema_version: 1;
  last_refreshed_at: string;     // ISO8601 — when the atom-store scan last ran; equals created_at on initial write
  default_project: string | null;  // repo_root path picked during onboarding step 3; null until wizard runs
  projects: ProjectRecord[];
}

export interface ProjectRecord {
  repo_root: string;             // absolute, normalized
  last_seen: string;             // ISO8601 — most-recent atom timestamp for this repo
  source_breakdown: Record<string, number>;  // { codex: 12, claude_code: 47, ... } — per-source atom count over the scan window
}
```

Initial state written by `ensureEchoHome()`:
```json
{ "schema_version": 1, "last_refreshed_at": "<now>", "default_project": null, "projects": [] }
```

**Schema-version policy:** every schema starts at `1`. Migrations happen in V1.5+ specs that own the format change; 070 ships only v1 readers/writers. Consumers in 071–074 MUST check `schema_version === 1` and fail loudly on mismatch — not auto-upgrade.

## Acceptance Criteria

### AC1 — `src/echo-home/paths.ts` exports canonical paths + schema types

- New file `src/echo-home/paths.ts`. No external imports beyond `node:os`, `node:path`, `ajv`, and `../guards.js`. (`ajv` is required for the validators below; the repo's existing import shape is `import { Ajv, type AnySchema, type ValidateFunction } from 'ajv';` — match it. No other third-party imports.)
- Exports a frozen object `ECHO_HOME_PATHS` with at minimum: `root`, `skills`, `roles`, `adapters`, `state`, `stateOnboarding`, `stateProjects`. All values are absolute, normalized strings resolved once at module load.
- Resolution rule, mirroring `src/daemon/lifecycle.ts:18-22`:
  - If `process.env['ECHO_HOME']` is non-empty (per `isNonEmptyString`), `root` = `path.resolve(process.env['ECHO_HOME'])`.
  - Else `root` = `path.join(os.homedir(), '.echo')`.
- All sub-paths are derived from `root` via `path.join`; no string concatenation with `/`.
- Exports the TypeScript interfaces `OnboardingState`, `OnboardedAgentProfile`, `ProjectsState`, `ProjectRecord` exactly as shown in the spec body above (field names, types, optionality). The `OnboardedAgentProfile` name is deliberately distinct from 072's `AdapterSyncProfile` (a transient sync-input DTO); collision avoidance is load-bearing because both types live under `src/echo-home/`.
- Exports two named Ajv-compiled validators: `validateOnboardingState`, `validateProjectsState`. Each is a typed `ValidateFunction<T>` from `ajv`. Ajv import shape matches existing usage in the repo — grep `ajv` to confirm before writing.
- Module-load cost is bounded — no I/O at import time. Path resolution + Ajv schema compile only.

### AC2 — `src/echo-home/scaffold.ts` exports `ensureEchoHome()` with idempotent semantics

- New file `src/echo-home/scaffold.ts`. Imports paths/types from `./paths.js`. Uses `node:fs` (sync) for all I/O.
- Exports `ensureEchoHome(): EnsureEchoHomeResult` where the result type is:
  ```ts
  export interface EnsureEchoHomeResult {
    root: string;                    // ECHO_HOME_PATHS.root, echoed back for callers
    created_dirs: string[];          // absolute paths of dirs that did NOT exist before this call
    created_files: string[];         // absolute paths of state files that did NOT exist before this call
  }
  ```
- Behavior:
  1. `mkdirSync(root, { recursive: true })` and the four sub-dirs (`skills`, `roles`, `adapters`, `state`).
  2. For each of `stateOnboarding`, `stateProjects`: **exclusive-create absent-only write**. Use `writeFileSync(path, json, { flag: 'wx' })` (Node maps `wx` to `O_CREAT | O_EXCL`). On `EEXIST`: catch and treat as a successful no-op (file already there; do NOT read, do NOT validate, do NOT rewrite). On any other error: re-throw. The load-bearing invariant `wx` provides is **concurrent-first-create exclusion**: when two processes share an `ECHO_HOME` and race to initialize, exactly one wins the kernel-level name creation; the loser gets `EEXIST` and treats it as success. Do NOT use a check-then-write pattern (that pattern races). The initial-state JSON payload itself sets `created_at` / `last_updated_at` / `last_refreshed_at` to `new Date().toISOString()`. **What this contract does NOT promise:** crash-atomic durability of the file *contents*. `O_CREAT | O_EXCL` makes the name-creation atomic, but a SIGKILL / ENOSPC / short write between the kernel's `open()` returning and `writeFileSync` finishing its payload can leave a zero-byte or truncated final file. Partial-write recovery is **explicitly out of scope for 070** — substrate ships dormant and the failure window for a few-hundred-byte init write is small enough not to warrant a temp-file-plus-link mechanism here. The recovery contract is downstream: 071–074 consumers MUST check `schema_version === 1` and fail loudly on mismatch (per the Schema-version policy section above), which is the operator-visible signal for any truncated state file. If V1.5+ observability shows non-trivial partial-write rates in the wild, a follow-up spec can introduce the durable-publish primitive (temp-in-same-dir + write + fsync + atomic `linkSync(tmp, final)` with EEXIST-as-loser + unlink temp); 070 deliberately defers that.
  3. Populate `created_dirs` / `created_files` arrays with the paths actually created in this call (so a second call returns empty arrays).
- The function is synchronous and idempotent: calling it twice in a row produces an empty-arrays second result with no filesystem mutations between calls (verified by AC4 Test 3).
- Errors propagate (do not swallow). The daemon caller is responsible for downgrading exceptions to non-fatal logs (AC3).

### AC3 — Daemon calls `ensureEchoHome()` during startup, non-fatally

- `src/daemon/index.ts` imports `ensureEchoHome` from `./echo-home/scaffold.js` (or `../echo-home/scaffold.js` depending on import-path conventions in the daemon module — match existing relative-import style).
- The call happens after `acquirePidLockOrExit(dataDir)` and before the `Promise.all([startFsWatcher, ..., startMcpServer])` block.
- Wrapped in try/catch:
  ```ts
  try {
    const result = ensureEchoHome();
    if (result.created_dirs.length > 0 || result.created_files.length > 0) {
      log.info('echo_home_initialized', {
        root: result.root,
        created_dirs: result.created_dirs,
        created_files: result.created_files,
      });
    }
  } catch (err) {
    log.error('echo_home_init_failed', { message: (err as Error).message });
  }
  ```
- The logger is acquired via `createLogger('daemon.echo-home')` (matching the existing daemon-side logger pattern at `src/daemon/lifecycle.ts:10`).
- A failed `ensureEchoHome()` MUST NOT prevent the daemon from continuing to start its extractors and MCP server — the substrate (V1 free tier) does not require `~/.echo/`.

### AC4 — Tests pin path resolution + idempotency + schema validation

- `tests/echo-home/paths.test.ts` — three cases:
  1. With `ECHO_HOME` unset (delete from `process.env` in the test), `ECHO_HOME_PATHS.root` ends with `/.echo` and equals `path.join(os.homedir(), '.echo')`. Sub-paths are joined under it (e.g., `stateOnboarding` equals `path.join(root, 'state', 'onboarding.json')`).
  2. **Pinning the env-override branch**: because paths are resolved at module load, set `process.env['ECHO_HOME']` to a tmpdir path BEFORE the dynamic import, then `await import('../../src/echo-home/paths.js')` and assert `root` equals the resolved tmpdir. (Use `vi.resetModules()` between tests; the pattern is established in this repo — grep for existing `vi.resetModules()` usage to confirm.)
  3. `validateOnboardingState(<the initial-state object literal>)` returns `true`; passing an object missing `schema_version` returns `false`. Same shape for `validateProjectsState`.
- `tests/echo-home/scaffold.test.ts` — three cases:
  1. **Fresh tmpdir**: set `ECHO_HOME` to `path.join(mkdtempSync(...), 'echo-home')` — a child path under the mkdtemp parent that does NOT yet exist (mkdtemp creates the parent, but the `echo-home` child must be created by `ensureEchoHome()` for the root-creation count to be reported). Dynamic-import scaffold, call `ensureEchoHome()`. Assert all four sub-dirs exist, both state files exist on disk, `created_dirs.length === 5` (root + four sub-dirs), `created_files.length === 2`, and `validateOnboardingState(JSON.parse(...))` returns `true` for the file contents.
  2. **Idempotency**: from the same fresh tmpdir as Test 1, immediately call `ensureEchoHome()` a second time. Assert both result arrays are empty AND the on-disk `created_at` field of `onboarding.json` is byte-identical to the first call's value (proves no rewrite). Use `fs.statSync(...).mtimeMs` as a secondary check that the file wasn't touched.
  3. **Partial-state recovery**: pre-create `<tmpdir>/state/onboarding.json` with a hand-rolled JSON `{"hand_edited": true}` BEFORE calling `ensureEchoHome()`. Assert the function still creates the missing dirs + the missing `projects.json` BUT does NOT overwrite the hand-rolled file (its contents remain `{"hand_edited": true}` byte-for-byte). This is the load-bearing semantic that lets wizard-progress survive daemon restarts. (Two adjacent concerns are NOT pinned by this test, and that is intentional: (a) the AC2.2 literal requirement to use `writeFileSync(..., { flag: 'wx' })` rather than the explicitly-forbidden `existsSync`-then-`writeFileSync` pattern is verified at PR-time **implementation review** — both implementations would pass Test 3, so the unit-test layer cannot disambiguate; the contract is honored by reading the code. (b) The OS-level `O_EXCL` race between two processes sharing an `ECHO_HOME` is exercised in production rather than unit-tested — a synchronous JS function cannot interleave with itself via the microtask queue, so a Promise-based "race" test was considered and rejected as theatrical. The unit-test layer's job is to pin behavior against an already-existing file; the `wx` literal and the cross-process race are out of unit-test scope.)
- All tests use OS tmpdirs and clean up via `rmSync(..., { recursive: true })` in `afterEach`. No test touches the real `~/.echo/`.
- Tests live under `tests/echo-home/` (new directory), matching the existing pattern of one test directory per `src/<subsystem>/`.

## Out of Scope (Don't Drift)

1. **Writing skill `.md` files into `~/.echo/skills/`.** The directory is created empty in 070; populating it (canonical skills synced from the in-repo `skills/`) is 072's responsibility (adapter sync engine). Do not copy/sync any files into `skills/`.
2. **Role TOML format + default role files.** Schema lives in 071. 070 creates only the empty `roles/` directory.
3. **Adapter writes (AGENTS.md, CLAUDE.md, config.toml).** 072 owns merge-with-markers logic. 070 does NOT write to `~/.codex/`, `~/.claude/`, `~/.cursor/`, or any other agent-owned directory.
4. **Onboarding wizard UI or CLI.** 073 owns step-by-step UX; 070's `ensureEchoHome()` is silent unless logging.
5. **Populating `projects.json` from the atom store.** Atom-store scanning for known projects is 073 step 3. 070's initial-write is an empty `projects: []`.
6. **`echo` CLI binary.** 074. 070 ships only library modules importable by future CLI code.
7. **Per-project `.echo/config.toml` overrides.** V1.5+ per the parent decision. No per-project config logic in 070.
8. **Schema migrations.** v1 only. No migration code, no version-detection beyond a hard `schema_version === 1` check by future consumers.
9. **Cross-platform / XDG / Windows paths.** macOS-first. `~/.echo/` only. Cross-platform is a V1.5+ spec when warranted.
10. **MCP exposure of `~/.echo/` state.** No new MCP tool (`get_role_state`, etc.) in 070. 074+ may add one if needed.
11. **Touching the existing data directory (`~/Library/Application Support/ECHO/`).** Atom store, daemon PID lock, DB path — all unchanged. `~/.echo/` is a NEW sibling tree, not a relocation.

## Risks

- **R1 — `ensureEchoHome()` runs on every daemon start, so disk-rewrite bugs would erase wizard progress on every restart.** Mitigation: AC2's "do NOT rewrite if file exists" invariant is pinned by AC4 Test 2 (byte-identical `created_at`) and AC4 Test 3 (hand-rolled content survives). The invariant is the most load-bearing thing 070 ships.

- **R2 — Module-load Ajv compile cost on every daemon start.** Two compiled schemas is negligible (sub-millisecond), but flagged here so 071+ don't accumulate dozens of schemas in this module without reconsideration. If the count grows past ~5, move to lazy compile.

- **R3 — `ECHO_HOME` env override is read at module load, not per-call.** A test that sets `process.env['ECHO_HOME']` after the module has been imported will see the original value. AC4 Test 2 pins the `vi.resetModules()` discipline; future consumers (and 073+ tests) must follow the same pattern.

- **R4 — Initial-state JSON contains `created_at: <now>`, which is non-deterministic.** Tests must assert structural correctness via the Ajv validator, NOT byte-equality against a fixture. AC4 reflects this.

- **R5 — `~/.echo/` collision with another tool.** The directory name is unconventional but not impossible to collide with. Mitigation: search of the user's home dir at the founder's machine confirms it's free as of 2026-05-25. If a future user reports a collision, V1.5 adds `ECHO_HOME` env-var precedence guidance to onboarding; the env override is already in place from 070.

## Tests

All test changes are additive — no existing test rewrites.

- `tests/echo-home/paths.test.ts` — 3 cases per AC4.
- `tests/echo-home/scaffold.test.ts` — 3 cases per AC4.

Verify steps:

- `npm test -- tests/echo-home/`
- `npm test`
- `npm run lint`
- `npm run typecheck`

All four must pass before the builder moves 070 to `pending_review/`.

## Definition of Done

- AC1: `src/echo-home/paths.ts` exports `ECHO_HOME_PATHS`, schema interfaces, and two Ajv validators; honors `ECHO_HOME` env override with `os.homedir()`-based fallback; no I/O at import time.
- AC2: `src/echo-home/scaffold.ts` exports `ensureEchoHome()` which creates the four sub-dirs and the two initial state files when absent, leaves existing files untouched, and returns accurate `created_dirs` / `created_files` arrays.
- AC3: `src/daemon/index.ts` invokes `ensureEchoHome()` after PID-lock acquisition and before extractor/MCP startup, inside a try/catch that logs failure non-fatally via `createLogger('daemon.echo-home')`.
- AC4: All six new test cases pass; existing tests (including `tests/daemon/lifecycle.test.ts`) continue to pass without modification.
- All four verify commands above are clean.
- A manual daemon start on a machine where `~/.echo/` does not yet exist creates the tree exactly once and logs `echo_home_initialized` with the populated arrays; a second start produces no `echo_home_initialized` log line (empty arrays = nothing to report).

## After Completion (Strategist Notes)

- **Wiki page candidate:** `wiki/architecture/coord-layer.md` (does not yet exist). 070 alone is single-spec basis — do NOT create the page yet. Create when 071 or 072 also lands.
- **Update `wiki/architecture/system-architecture.md`** with one paragraph noting that the daemon now ensures `~/.echo/` on startup as the foundation for the ECHO Pro coord layer, with a forward pointer to `coord-layer.md` once that page exists.
- **`backlog/_followups.md` annotations:** when 070 lands in `complete/`, no follow-ups are filed by 070 itself. 071–074 are tracked as separate items per the parent decision archive's "Implied backlog decomposition" table.
- **Trigger to write `wiki/architecture/coord-layer.md`:** the second coord-layer item to land in `complete/` (071 or 072, whichever ships first).
- **No new principle page.** Scaffold-before-feature is one occurrence; promote on second occurrence per project rule.
