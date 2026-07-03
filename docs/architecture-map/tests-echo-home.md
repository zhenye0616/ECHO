# `tests/echo-home/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 19 files.

### `tests/echo-home/adapter-sync.test.ts` — orchestrator (`syncAll`) integration test suite

**Purpose:** Exercises `src/echo-home/adapter-sync.js`'s `syncAll` orchestrator end-to-end against a stubbed `$HOME`/`ECHO_HOME`/`CODEX_HOME` and a mocked repo mirror (package.json + assets/echo-skills, echo-roles, echo-workflows). Covers multi-agent fan-out (codex/claude-code/cursor), lockfile retry, symlink-safety guards, skills/roles/workflows population, profile filtering (customer vs dogfood), and secret-leak-free logging.

**Depends on:** `src/echo-home/adapter-sync.js` (dynamically imported), `node:fs`, `node:os`, `node:path`, `node:worker_threads`-free (uses vitest only), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadAdapterSync()` | function | `tests/echo-home/adapter-sync.test.ts:27` | Dynamically imports `adapter-sync.js` fresh per test via `vi.resetModules`. |
| `setupRepoMirror()` | function | `tests/echo-home/adapter-sync.test.ts:31` | Builds a fake repo root with package.json, contributor skills, customer skill fixtures, role fixtures, and a workflow fixture for `syncAll` to discover. |
| `describe: "syncAll (orchestrator)"` | describe | `tests/echo-home/adapter-sync.test.ts:92` | Covers: all-agents-succeed; codex config conflict without rollback of other agents; skills-populate-before-claude-fanout ordering; customer-profile skill filtering with roles/workflows no-op; populate-skills failure short-circuiting claude-code; default role list from `DEFAULT_ROLE_FILENAMES`; default workflow copy/source-missing/user-modified/per-file-error handling; sync lockfile RETRY_CONFLICT and listener-leak checks; repoRoot-not-findable and MISSING_REQUIRED_INPUT errors; symlink target/directory-component conflict detection (claude CLAUDE.md, ~/.echo/skills, ~/.echo/workflows); first-run parent-dir creation; codex missing packaged skill guard; repo skill symlink non-propagation; user-modified role gating via `allowUserModifiedRoles`; cursor auth-header redaction in logs; malformed cursor JSON PARSE_ERROR; marker conflict on existing CLAUDE.md; symlinked commandsDir targets skipped/all-skipped failure; symlinked codex config.toml followed through. |

### `tests/echo-home/adapters/atomic-write.test.ts` — atomic file-write primitive test suite

**Purpose:** Tests `src/echo-home/adapters/atomic-write.js`'s `atomicWrite` for temp-file naming uniqueness, permission-mode handling (0600 allowlist/secretSensitive/umask default), concurrent-writer safety (via real worker threads compiling the TS source with `typescript`), and symlink-following semantics.

**Depends on:** `src/echo-home/adapters/atomic-write.js` / `.ts` (dynamic import + on-the-fly transpile), `node:fs`, `node:os`, `node:path`, `node:url`, `node:worker_threads`, `typescript`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadAtomicWrite()` | function | `tests/echo-home/adapters/atomic-write.test.ts:24` | Dynamically (re-)imports the atomic-write module per test. |
| `describe: "atomicWrite"` | describe | `tests/echo-home/adapters/atomic-write.test.ts:39` | Covers: unique temp filename pattern `<basename>.<pid>.<8hex>.tmp` with no leftover temps; preserving existing 0600 mode; new-file 0600 for allowlisted basenames resolved against `HOME`; `secretSensitive:true` forcing 0600 on non-allowlisted paths; non-sensitive non-allowlisted files NOT forced to 0600; default umask-derived mode for new non-sensitive files; two concurrent worker threads writing the same path yield exactly one non-garbled payload with no stray temps; refusing to write through a symlink by default (`AtomicWriteError` code `EEXIST`); `followSymlink:true` writing through to the resolved target while preserving the symlink; `secretSensitive:true` clamping an existing 0644 file to 0600. |

### `tests/echo-home/adapters/codex-config.test.ts` — Codex TOML MCP-block merge test suite

**Purpose:** Tests `syncCodexMcpBlock` from `src/echo-home/adapters/codex-config.js`, which merges/rewrites the `[mcp_servers.echo]` TOML block in a Codex `config.toml` while preserving sibling tables, comments, and user-added keys, and detecting conflicts against a `previousServerConfig` cache.

**Depends on:** `src/echo-home/adapters/codex-config.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "syncCodexMcpBlock"` | describe | `tests/echo-home/adapters/codex-config.test.ts:31` | Covers: `add` when block absent (byte-preserved prefix); `update` when existing matches `previousServerConfig` with siblings/comments preserved; user-added keys preserved on update; `noop` when existing already matches desired (with and without a previous cache); `conflict` when existing differs from both previous and new (with and without previous cache); `force` overwrite of a conflicting block while preserving sibling tables; conflict `proposedValue` preserving user-added keys; missing-file creation at mode 0600; sibling `[mcp_servers.other]` preserved byte-for-byte; mode preservation (0600) and `secretSensitive` clamping; descendant subtable `[mcp_servers.echo.headers]` rewritten (not duplicated) into dotted-key form. |

### `tests/echo-home/adapters/cursor-config.test.ts` — Cursor JSON MCP-entry merge test suite

**Purpose:** Tests `syncCursorMcpEntry` from `src/echo-home/adapters/cursor-config.js`, the JSON-analog of the codex-config merge for `~/.cursor/mcp.json`'s `mcpServers.echo` entry.

**Depends on:** `src/echo-home/adapters/cursor-config.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "syncCursorMcpEntry"` | describe | `tests/echo-home/adapters/cursor-config.test.ts:30` | Covers: `add` when `mcpServers.echo` absent, preserving sibling entries (`dart`); `update` when existing matches previous; user-added keys preserved on update; `noop` when existing matches desired (with/without previous cache); `conflict` when existing differs from both (with/without previous cache); `force` overwrite preserving siblings; conflict `proposedValue` preserving user-added keys; missing-file creation at mode 0600; sibling entries (`dart`, `supabase`) preserved after add; mode preservation (0600) across update. |

### `tests/echo-home/adapters/markers.test.ts` — HTML-comment marker-block merge test suite

**Purpose:** Tests `mergeWithMarkers`, `BEGIN_MARKER`, `END_MARKER` from `src/echo-home/adapters/markers.js`, the generic append/replace-between-markers primitive used for files like `AGENTS.md`/`CLAUDE.md` where ECHO owns only a delimited section.

**Depends on:** `src/echo-home/adapters/markers.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "mergeWithMarkers"` | describe | `tests/echo-home/adapters/markers.test.ts:28` | Covers: `append` to a fresh nonexistent file; `replace` when previous content matches, preserving surrounding text byte-for-byte; `noop` idempotent re-run when content already matches; `conflict` (kind `marker`) when inside content diverges, including `currentInside`/`expectedInside`/`proposedInside`/`unifiedDiff` fields; `force` bypassing a conflict to replace inside-marker content; byte-exact preservation of content above/below markers across replace; malformed markers (BEGIN without END) yielding a stable non-growing `malformed-marker` conflict across repeated runs; symlinked target file yielding `target-symlink` conflict without ever reading the link's real target; append to existing user content when no markers are present yet. |

### `tests/echo-home/adapters/role-sync.test.ts` — default-role file sync test suite

**Purpose:** Tests `syncDefaultRoles` from `src/echo-home/adapters/role-sync.js`, which copies the three default role TOML files (`builder.toml`, `reviewer.toml`, `strategist.toml`) into a target roles directory, treating byte-identical targets as no-ops and diverging targets as `user-modified` (never overwritten).

**Depends on:** `src/echo-home/adapters/role-sync.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupSource()` | function | `tests/echo-home/adapters/role-sync.test.ts:26` | Creates a temp source dir populated with the three fixture role TOML files. |
| `describe: "syncDefaultRoles"` | describe | `tests/echo-home/adapters/role-sync.test.ts:33` | Covers: empty target dir → all three roles `copied`; byte-identical target dir → all `noop`; user-edited `reviewer.toml` → `user-modified` and left untouched while `builder.toml` still copies; missing `builder.toml` source → `source-missing` for that role only, others still `copied`. |

### `tests/echo-home/adapters/skill-sync.test.ts` — skill-file population/sync test suite (populate, Claude, Codex hops)

**Purpose:** Tests `populateEchoSkills`, `syncClaudeSkills`, `syncCodexSkills` from `src/echo-home/adapters/skill-sync.js` — the three skill-distribution stages: populating `~/.echo/skills`, mirroring into `~/.claude/commands`, and rendering into `~/.codex/skills/<name>/SKILL.md` with corrected frontmatter, all gated by an `audience`/`profile` (customer vs dogfood) filter and symlink-avoidance guards.

**Depends on:** `src/echo-home/adapters/skill-sync.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupSource()` | function | `tests/echo-home/adapters/skill-sync.test.ts:30` | Creates a temp source dir with three plain `.md` skill fixtures. |
| `runFn(label, opts)` | function | `tests/echo-home/adapters/skill-sync.test.ts:39` | Dispatches to `populateEchoSkills` or `syncClaudeSkills` by label, normalizing their differing return shapes (throwing if `populateEchoSkills` reports `ok:false`) so both share one contract-test body. |
| `describe: "populateEchoSkills / syncClaudeSkills ($label) (shared overwrite-posture contract)"` | describe | `tests/echo-home/adapters/skill-sync.test.ts:52` | Parameterized (`describe.each`) over both functions: target dir auto-created and all source skills copied; idempotent byte-identical re-run; stale target file not in source is left in place; user-hand-edited target file matching a source filename is overwritten. |
| `describe: "populateEchoSkills — symlink guards"` | describe | `tests/echo-home/adapters/skill-sync.test.ts:99` | Covers: customer profile copies customer+untagged skills, skips dogfood-only; dogfood profile copies all audiences; symlinked source file is never followed (reported in `skipped`); unreadable `sourceDir` returns `ok:false` without throwing. |
| `describe: "syncClaudeSkills — symlink target skipped"` | describe | `tests/echo-home/adapters/skill-sync.test.ts:157` | Verifies a pre-existing symlinked target file in `~/.claude/commands` is skipped (not followed/overwritten) and the linked external file stays pristine. |
| `describe: "syncCodexSkills — Codex SKILL.md second-hop"` | describe | `tests/echo-home/adapters/skill-sync.test.ts:172` | Covers: rendering packaged skills into `<codexHome>/skills/<name>/SKILL.md` with corrected `name:` frontmatter; idempotent re-run preserving existing frontmatter fields (e.g. `description`) while fixing `name`; dogfood vs customer profile filtering of `using-echo-coord.md`; missing required `using-echo-mcp.md` source throws before any target write. |

### `tests/echo-home/adapters/workflow-sync.test.ts` — default-workflow file sync test suite

**Purpose:** Tests `syncDefaultWorkflows` from `src/echo-home/adapters/workflow-sync.js`, which copies default workflow TOML files (`change-review.toml`, `daily-review.toml`, `ship-check.toml`) into a target workflows directory with source-missing/copied/noop/user-modified/error dispositions, including symlinked-target and mkdir-permission-failure paths.

**Depends on:** `src/echo-home/adapters/workflow-sync.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupSource(names)` | function | `tests/echo-home/adapters/workflow-sync.test.ts:35` | Creates a temp source dir populated with the given (default: all three) workflow TOML fixtures. |
| `describe: "syncDefaultWorkflows"` | describe | `tests/echo-home/adapters/workflow-sync.test.ts:42` | Covers: source missing → `source-missing`, no write; target absent → `copied`, byte-equal to source; target byte-equal → `noop`, mtime unchanged; target differs → `user-modified` with `conflict.sourceBytes`/`userBytes` populated, target unchanged; target is a symlink → `user-modified` without following the link (`conflict.targetIsSymlink`, null byte fields); mkdir failure (chmod 0o000 parent) → every default gets `error` action and one entry in `workflowsErrors`; multiple defaults preserve declared order and isolate mixed copied/noop/source-missing actions per file. |

### `tests/echo-home/default-roles.test.ts` — shipped default-role asset validation test suite

**Purpose:** Validates the real shipped role assets in `assets/echo-roles/` (not fixtures) via `loadRolesFromDir`, `DEFAULT_ROLE_FILENAMES`, `CAPABILITIES`, `RoleValidationError` from `src/echo-home/roles.js` — ensuring role/skill/capability integrity and the `assertDefaults` completeness check.

**Depends on:** `src/echo-home/roles.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `makeTempDefaultRoles(filenames)` | function | `tests/echo-home/default-roles.test.ts:20` | Builds a temp repo-shaped dir with a subset of real role TOML files copied in plus a stub `using-echo-mcp.md` skill, for partial/complete-installation tests. |
| `expectDefaultAssertionError(dir, expectedMissingRole)` | function | `tests/echo-home/default-roles.test.ts:37` | Asserts `loadRolesFromDir(dir, { assertDefaults: true })` throws `RoleValidationError` mentioning "installation integrity" and the missing role name. |
| `describe: "default ECHO role assets"` | describe | `tests/echo-home/default-roles.test.ts:55` | Covers: loads exactly builder/reviewer/strategist in deterministic order; `DEFAULT_ROLE_FILENAMES` stays in sync with the actual asset directory listing; every default role's skill reference resolves to an existing customer-shipped skill file; role capabilities are drawn only from the public `CAPABILITIES` vocabulary; reviewer role is `read-only` sandbox with `fs.read`/`git.read`/`mcp.echo.read` and required output fields `verdict`/`reviewer`/`findings`; builder/strategist sandbox+capability sets and shared `using-echo-mcp` skill; partial role directories load fine without `assertDefaults`; complete installation accepted with `assertDefaults`; missing reviewer or strategist default rejected under `assertDefaults`. |

### `tests/echo-home/paths.test.ts` — ECHO_HOME path resolution and project-registry test suite

**Purpose:** Tests `src/echo-home/paths.js`'s `ECHO_HOME_PATHS` constant, onboarding/projects-state validators, per-repo `.echo/project.json` load/write, and the `~/.echo/state/projects.json` upsert registry (including its file-lock behavior).

**Depends on:** `src/echo-home/paths.js`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadPaths()` | function | `tests/echo-home/paths.test.ts:11` | Dynamically (re-)imports the paths module per test so `ECHO_HOME` env changes take effect at module-load time. |
| `describe: "ECHO home paths"` | describe | `tests/echo-home/paths.test.ts:15` | Covers: defaults to `~/.echo` and derives `skills`/`roles`/`adapters`/`state`/`stateOnboarding`/`stateProjects`/`stateCaptureSources` paths when `ECHO_HOME` unset; honors `ECHO_HOME` override at module load; `validateOnboardingState`/`validateProjectsState` accept well-formed and reject schema-version-missing/malformed state; `loadProjectConfig` returns Project_echo-compatible defaults (`coord_ref: 'main'`, `reviews_root: 'backlog/reviews'`, `reviewers: ['codex','cursor']`, `spec_dir: 'backlog'`) when `.echo/project.json` absent; `writeProjectConfig`/`loadProjectConfig` round-trip custom orchestration config; `upsertProjectRegistration` upserts `projects.json` atomically without duplicate records (repo-root trailing-slash normalized); a stale `projects.json.lock` directory causes `upsertProjectRegistration` to throw a lock-timeout error without truncating existing `projects.json`. |

### `tests/echo-home/roles.test.ts` — role TOML loader tests

**Purpose:** Exercises `loadRoleFromFile` and `RoleValidationError` from `src/echo-home/roles.js`, covering valid role-TOML parsing (name-from-filename, capability/skill validation) and every rejection path (missing tables, invalid sandbox/capabilities, unknown keys, skill-name traversal, kebab-case filename enforcement, explicit `skillsRoot` override behavior).

**Depends on:** `src/echo-home/roles.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeSkill(name, dir)` | function | `tests/echo-home/roles.test.ts:12` | Creates a fake skill markdown file at `<dir>/<name>.md` for role skill-existence checks. |
| `validToml(skills)` | function | `tests/echo-home/roles.test.ts:17` | Builds a minimal well-formed role TOML string with configurable skills list. |
| `writeRole(filename, contents)` | function | `tests/echo-home/roles.test.ts:34` | Writes a role TOML file into the temp `rolesDir` and returns its path. |
| `expectRoleError(filePath, expected, opts)` | function | `tests/echo-home/roles.test.ts:41` | Asserts `loadRoleFromFile` throws `RoleValidationError` whose message contains the file path and every expected substring. |
| `describe: "role TOML loader"` | test suite | `tests/echo-home/roles.test.ts:59` | Covers valid load, missing/invalid `[role]`, `[role.requires]`, `[role.output]` tables, sandbox enum enforcement, empty-array rejections, unknown-skill/unknown-key rejections, TOML parse-failure wrapping, kebab-case filename rule, explicit `skillsRoot` override, and traversal/format rejection of skill names. |

### `tests/echo-home/scaffold.test.ts` — ensureEchoHome scaffolding tests

**Purpose:** Verifies `ensureEchoHome` from `src/echo-home/scaffold.js` creates the ECHO_HOME directory tree and initial onboarding/projects state files, is idempotent on repeat calls, and preserves hand-edited existing state files while still creating missing ones.

**Depends on:** `src/echo-home/scaffold.js`, `src/echo-home/paths.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadScaffold()` | function | `tests/echo-home/scaffold.test.ts:21` | Dynamically imports the scaffold module after `vi.resetModules()` so `ECHO_HOME` env changes take effect. |
| `loadPaths()` | function | `tests/echo-home/scaffold.test.ts:25` | Dynamically imports the paths module for `ECHO_HOME_PATHS` and state validators. |
| `describe: "ensureEchoHome"` | test suite | `tests/echo-home/scaffold.test.ts:29` | Covers fresh-install directory/file creation with schema validation, idempotency (no rewrite, same mtime/content), and byte-for-byte preservation of a hand-edited `onboarding.json` while still creating the missing `projects.json`. |

### `tests/echo-home/wizard/adapter-cache.test.ts` — adapter cache read/write tests

**Purpose:** Exercises `readAdapterCache`/`writeAdapterCache`/`AdapterCacheError` from `src/echo-home/wizard/adapter-cache.js`, covering missing-file null return, round-trip read/write, schema_version rejection, missing-required-field errors, directory recreation on write, and restrictive file permissions.

**Depends on:** `src/echo-home/wizard/adapter-cache.js`, `src/echo-home/paths.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadModule()` | function | `tests/echo-home/wizard/adapter-cache.test.ts:18` | Dynamically imports the adapter-cache module post `vi.resetModules()`. |
| `loadPaths()` | function | `tests/echo-home/wizard/adapter-cache.test.ts:24` | Dynamically imports the paths module for `ECHO_HOME_PATHS.adapters`. |
| `describe: "adapter cache"` | test suite | `tests/echo-home/wizard/adapter-cache.test.ts:28` | Covers null-on-missing, write/read round trip, unsupported `schema_version` throw, missing-field throw naming `last_written_at`, adapters-dir recreation on write, and 0600-only file permission bits after write. |

### `tests/echo-home/wizard/detect-agents.test.ts` — detectAgents signal-detection tests

**Purpose:** Exercises `detectAgents` from `src/echo-home/wizard/detect-agents.js` against a `FakeStore` implementing the `Storage` interface, covering config-file signals (including symlinks), atom-activity signals via `buildSourceAppMap` source prefixes, confidence-level combination (high/medium/none), the 30-day injected-`now` window, atom-count saturation at 50,000 rows, query-failure propagation, and safe behavior when `ECHO_DB_PATH` points at a missing production database.

**Depends on:** `src/storage/sqlite.js`, `src/storage/interface.js`, `src/mcp/util/source-app.js`, `src/echo-home/wizard/detect-agents.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FakeStore` | class | `tests/echo-home/wizard/detect-agents.test.ts:15` | In-memory `Storage` implementation filtering rows by `source_prefix`/`since`/`until`/`limit`, optionally throwing on `query`. |
| `FakeStore.append()` | method | `tests/echo-home/wizard/detect-agents.test.ts:21` | Always throws 'unused' — append is not exercised by these tests. |
| `FakeStore.query(filter)` | method | `tests/echo-home/wizard/detect-agents.test.ts:25` | Filters and slices the in-memory rows array per the given `QueryFilter`. |
| `FakeStore.count()` | method | `tests/echo-home/wizard/detect-agents.test.ts:36` | Returns the total row count. |
| `FakeStore.getByIds()` | method | `tests/echo-home/wizard/detect-agents.test.ts:40` | Returns an empty array (unused by detectAgents). |
| `FakeStore.iterateCoordAtomsByAppendOrder()` | method | `tests/echo-home/wizard/detect-agents.test.ts:44` | Returns an empty array stub. |
| `FakeStore.getCurrentCoordSequence()` | method | `tests/echo-home/wizard/detect-agents.test.ts:48` | Returns 0 stub. |
| `event(source, timestamp)` | function | `tests/echo-home/wizard/detect-agents.test.ts:58` | Builds a minimal `CaptureEvent` fixture keyed by source+timestamp. |
| `loadModule()` | function | `tests/echo-home/wizard/detect-agents.test.ts:62` | Dynamically imports `detect-agents.js` post `vi.resetModules()`. |
| `describe: "detectAgents"` | test suite | `tests/echo-home/wizard/detect-agents.test.ts:68` | Covers high confidence when config files + atom activity both exist; medium/none combinations; null atom store handling; symlinked config-file detection; query-failure propagation; injected-`now` 30-day window; atomCountSaturated at exactly 50,000 rows; and safe no-op behavior plus real `SqliteStorage`-backed detection via `ECHO_DB_PATH`. |

### `tests/echo-home/wizard/detect-projects.test.ts` — detectProjects repo-root grouping tests

**Purpose:** Exercises `detectProjects` from `src/echo-home/wizard/detect-projects.js`, covering grouping/sorting atoms by `repo_root` metadata, source-breakdown counts, trailing-slash normalization, limit clamping, filtering of ephemeral reviewer/tmp worktrees and sibling `--worktree` directories, git-root collapsing of subdirectories, and safe behavior against a missing production database.

**Depends on:** `src/mcp/util/source-app.js`, `src/echo-home/wizard/detect-projects.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FakeStore` | class | `tests/echo-home/wizard/detect-projects.test.ts:14` | In-memory `Storage` implementation supporting `since`/`until`/`limit` filtering for detectProjects fixtures. |
| `FakeStore.append()` | method | `tests/echo-home/wizard/detect-projects.test.ts:17` | Always throws 'unused'. |
| `FakeStore.query(filter)` | method | `tests/echo-home/wizard/detect-projects.test.ts:21` | Filters/slices rows by timestamp bounds and limit. |
| `FakeStore.count()` | method | `tests/echo-home/wizard/detect-projects.test.ts:28` | Returns total row count. |
| `FakeStore.getByIds()` | method | `tests/echo-home/wizard/detect-projects.test.ts:32` | Returns empty array stub. |
| `FakeStore.iterateCoordAtomsByAppendOrder()` | method | `tests/echo-home/wizard/detect-projects.test.ts:36` | Returns empty array stub. |
| `FakeStore.getCurrentCoordSequence()` | method | `tests/echo-home/wizard/detect-projects.test.ts:40` | Returns 0 stub. |
| `event(source, timestamp, repoRoot, id)` | function | `tests/echo-home/wizard/detect-projects.test.ts:48` | Builds a `CaptureEvent` fixture with optional `metadata.repo_root`. |
| `loadModule()` | function | `tests/echo-home/wizard/detect-projects.test.ts:63` | Dynamically imports `detect-projects.js` post `vi.resetModules()`. |
| `describe: "detectProjects"` | test suite | `tests/echo-home/wizard/detect-projects.test.ts:69` | Covers repo-root grouping + descending atom-count sort + source breakdown; null-repo-root exclusion; empty-store handling; limit clamping; trailing-slash merge; ephemeral tmp reviewer-root filtering (`echo-codex-<uuid>`, `echo-codex-ops-<uuid>`); non-matching tmp project names kept; matching names outside tmp kept; combined realpath-tmp + sibling-worktree filtering with subdir-to-git-root collapsing; double-dash repo roots kept when no base sibling exists; and no-op on missing production database. |

### `tests/echo-home/wizard/probe.test.ts` — probeAgents CLI-probe tests

**Purpose:** Exercises `probeAgents` from `src/echo-home/wizard/probe.js` with an injected fake `spawn`, covering successful pong-JSON parsing (including markdown-fenced and log-preamble-prefixed stdout), scanning-all-lines regression coverage, error-code mapping (`cli-unavailable`, `auth-required`, `timeout`, `unexpected-output`, `mcp-not-configured`), default/overridden timeout propagation, the codex trust-bypass CLI args, claude-code's CLI arg/payload contract, cursor's manual-only no-spawn short-circuit, and sequential multi-agent probing order.

**Depends on:** `src/echo-home/wizard/probe.js`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ok(stdout)` | function | `tests/echo-home/wizard/probe.test.ts:4` | Builds a successful `SpawnResult` fixture (`exitCode: 0`, given stdout, no timeout). |
| `describe: "probeAgents"` | test suite | `tests/echo-home/wizard/probe.test.ts:8` | Covers pong/ts-presence success criteria; unparseable-output mapping; markdown-fence and log-preamble stdout parsing; regression pinning "scan all lines not just last"; ENOENT→cli-unavailable; login-stderr→auth-required; timedOut→timeout; default 30s and overridden timeout propagation to injected spawn; codex `--skip-git-repo-check --sandbox read-only` args; claude-code `--print --output-format text --allowedTools` args; cursor manual-only with zero spawn calls; mixed-agent sequential ordering; and claude-code-only `mcp-not-configured` text mapping vs codex's `unexpected-output` fallback. |

### `tests/echo-home/wizard/render-echo-section.test.ts` — renderEchoSection markdown-block tests

**Purpose:** Exercises `renderEchoSection` from `src/echo-home/wizard/render-echo-section.js`, covering version/rendered-at fingerprint embedding, "none chosen" fallback for a null default project, byte-identical determinism for identical input, and the thrown error for the unsupported `cursor` agent.

**Depends on:** `src/echo-home/wizard/render-echo-section.js`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "renderEchoSection"` | test suite | `tests/echo-home/wizard/render-echo-section.test.ts:4` | Covers `<!-- echo-version -->` and `rendered-at` fingerprint substrings, "none chosen" text for a null `defaultProjectRepoRoot`, byte-identical output for identical context, and a thrown error mentioning "cursor" when `agent: 'cursor'` is passed. |

### `tests/echo-home/wizard/run-wizard.test.ts` — createWizard end-to-end orchestration tests

**Purpose:** Exercises `createWizard` from `src/echo-home/wizard/run-wizard.js`, covering the full detect→projects→wire→probe→summary→markCompleted pipeline with injected dependencies (fake atom store, wire override, probe spawn), summary snapshotting before any step runs, selective `probed_at` mutation only for successful probe outcomes, idempotent `markCompleted` with advancing `last_updated_at`, and the all-none-detected + empty-wire path.

**Depends on:** `src/storage/interface.js`, `src/mcp/util/source-app.js`, `src/echo-home/wizard/adapter-cache.js` (types), `src/echo-home/wizard/detect-agents.js` (types), `src/echo-home/adapter-sync.js` (types), `src/echo-home/wizard/run-wizard.js`, `src/echo-home/paths.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FakeStore` | class | `tests/echo-home/wizard/run-wizard.test.ts:17` | In-memory `Storage` implementation used to drive the wizard's `detectAgentsDeps`/`detectProjectsDeps`. |
| `FakeStore.append()` | method | `tests/echo-home/wizard/run-wizard.test.ts:20` | Always throws 'unused'. |
| `FakeStore.query(filter)` | method | `tests/echo-home/wizard/run-wizard.test.ts:24` | Filters rows by `source_prefix`/`since`/`until`/`limit`. |
| `FakeStore.count()` | method | `tests/echo-home/wizard/run-wizard.test.ts:34` | Returns total row count. |
| `FakeStore.getByIds()` | method | `tests/echo-home/wizard/run-wizard.test.ts:38` | Returns empty array stub. |
| `FakeStore.iterateCoordAtomsByAppendOrder()` | method | `tests/echo-home/wizard/run-wizard.test.ts:42` | Returns empty array stub. |
| `FakeStore.getCurrentCoordSequence()` | method | `tests/echo-home/wizard/run-wizard.test.ts:46` | Returns 0 stub. |
| `loadWizard()` | function | `tests/echo-home/wizard/run-wizard.test.ts:55` | Dynamically imports `run-wizard.js` post `vi.resetModules()`. |
| `loadPaths()` | function | `tests/echo-home/wizard/run-wizard.test.ts:59` | Dynamically imports `paths.js` for `ECHO_HOME_PATHS`. |
| `event(source, timestamp, repoRoot)` | function | `tests/echo-home/wizard/run-wizard.test.ts:63` | Builds a `CaptureEvent` fixture with optional `repo_root` metadata. |
| `successResult(agents)` | function | `tests/echo-home/wizard/run-wizard.test.ts:73` | Builds a successful `SyncResult` fixture for the given agent kinds. |
| `writeInitialState()` | function | `tests/echo-home/wizard/run-wizard.test.ts:87` | Writes a fresh, uncompleted `onboarding.json` state file and returns its path. |
| `cacheOverride()` | function | `tests/echo-home/wizard/run-wizard.test.ts:101` | Builds an in-memory adapter-cache read/write override (Map-backed) for injection into `wire`. |
| `describe: "createWizard"` | test suite | `tests/echo-home/wizard/run-wizard.test.ts:114` | Covers the full detect→projects→wire→probe→summary→markCompleted flow with populated summary fields and `completed: true` state; summary returning null step results pre-run; probe mutating `probed_at` only for successful agents; idempotent `markCompleted` advancing `last_updated_at` across two injected `now` values; and all-agents-none detection followed by `wire([])` passing zero profiles to `syncAll`. |

### `tests/echo-home/wizard/wire.test.ts` — wire onboarding-state + adapter-sync integration tests

**Purpose:** Exercises `wire` from `src/echo-home/wizard/wire.js`, covering `AdapterSyncProfile` construction (previous cache values, MCP server config, rendered echo section), cache-write gating on per-agent success/conflict, claude-code MCP CLI registration, onboarding-state mutation (`wired_at`, `wire_error` set/clear, `detected_at` preservation), schema_version validation, error/exception isolation (no state or cache mutation on throw), and top-level sentinel short-circuits (`syncLock`, `repoRoot`, `directorySymlink`).

**Depends on:** `src/echo-home/adapter-sync.js` (types + `syncAll`), `src/echo-home/wizard/detect-agents.js` (types), `src/echo-home/wizard/adapter-cache.js` (types), `src/echo-home/wizard/wire.js`, `src/echo-home/paths.js`, node:fs, node:crypto, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadWire()` | function | `tests/echo-home/wizard/wire.test.ts:18` | Dynamically imports `wire.js` post `vi.resetModules()`. |
| `loadPaths()` | function | `tests/echo-home/wizard/wire.test.ts:22` | Dynamically imports `paths.js` for `ECHO_HOME_PATHS`. |
| `writeInitialState()` | function | `tests/echo-home/wizard/wire.test.ts:26` | Writes a fresh, uncompleted `onboarding.json` and returns its path. |
| `sha(path)` | function | `tests/echo-home/wizard/wire.test.ts:40` | Computes the sha256 hex digest of a file's contents, used to assert state files are byte-unchanged. |
| `successResult(agents)` | function | `tests/echo-home/wizard/wire.test.ts:44` | Builds a successful `SyncResult` fixture with `files_written`/`actions` for the given agents. |
| `conflict(kind, filePath)` | function | `tests/echo-home/wizard/wire.test.ts:63` | Builds a `SyncConflict` fixture of kind `config` or `marker` (with diff fields for `marker`). |
| `makeCache(seed)` | function | `tests/echo-home/wizard/wire.test.ts:74` | Builds an in-memory adapter-cache read/write stub seeded with prior records, recording all writes for assertions. |
| `describe: "wire"` | test suite | `tests/echo-home/wizard/wire.test.ts:98` | Covers profile-building with no prior cache and cache-write-after-success; real `syncAll` claude-code MCP CLI registration call shape; cache-write gating (only successful agents get cache updates, conflicting agent's `wire_error` recorded); prior-cache values flowing into `previousEchoSection`/`previousMcpServerConfig`; cache overwritten with only the desired `mcpServerConfig`; `detected_at` preserved while `wired_at` updates; `schema_version` mismatch throwing "invalid onboarding state"; `wire_error` cleared on later success; `AdapterError` messages recorded as `wire_error`; cursor-only profiles omitting `echoSection`; unexpected `syncAll` throw leaving state/cache untouched; injected `now` shared between rendered echo section and cache `last_written_at`; and top-level `syncLock`/`repoRoot`/`directorySymlink` sentinel short-circuits leaving cache/state untouched. |
