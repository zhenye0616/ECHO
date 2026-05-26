---
id: 2026-05-25-073-onboarding-wizard
title: "ECHO Pro onboarding wizard — staged library API for detect-agents / detect-projects / wire / probe (steps 2-5), consumed by 074's CLI"
status: ready
priority: HIGH
estimate: 1.5-2.5d
created: 2026-05-25
blocked_by:
  - 2026-05-25-070-echo-global-home-scaffold
  - 2026-05-25-071-role-definition-format-and-defaults
  - 2026-05-25-072-adapter-sync-engine
task_state_ref: 2026-05-25-073-onboarding-wizard
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/echo-home/wizard/detect-agents.ts          # AC1 — layered scan: config files + atom-store activity → DetectedAgent[]
  - src/echo-home/wizard/detect-projects.ts        # AC2 — atom-store group-by-repo_root over last 7d → DetectedProject[]
  - src/echo-home/wizard/atom-store-readonly.ts    # AC1.3 production opener — fs.existsSync + better-sqlite3 readonly + query_only pragma; consumed by detect-agents.ts + detect-projects.ts (codex r3 F2 — required by AC1.3 prose, must be in write-scope)
  - src/echo-home/wizard/adapter-cache.ts          # AC3 — read/write ~/.echo/adapters/<agent>.json (the previous* cache 072 AC6 said is caller-owned)
  - src/echo-home/wizard/render-echo-section.ts    # AC4 — per-agent markdown renderer for the BEGIN ECHO / END ECHO body 072's markers.ts splices in
  - src/echo-home/wizard/wire.ts                   # AC5 — orchestrator: load previous*, build AdapterSyncProfile[], call 072's syncAll, persist new previous*, mutate ~/.echo/state/onboarding.json
  - src/echo-home/wizard/probe.ts                  # AC6 — per-agent best-effort spawn-and-check (codex / claude-code automated; cursor manual-only)
  - src/echo-home/wizard/run-wizard.ts             # AC7 — top-level createWizard() factory returning a staged API; 074 drives flow
  - src/echo-home/wizard/index.ts                  # AC7 — barrel re-export of the public surface
  - src/daemon/lifecycle.ts                        # AC1.3 — promote daemon-private `resolveDbPath()` to an exported helper alongside `resolveDataDir`. Wizard imports from here. (codex r3 F2 / codex r2 F2.)
  - src/daemon/index.ts                            # AC1.3 — re-import promoted `resolveDbPath` from lifecycle.ts (delete the local copy). No behavior change for the daemon; pure refactor. (codex r3 F2.)
  - tests/echo-home/wizard/detect-agents.test.ts   # AC8
  - tests/echo-home/wizard/detect-projects.test.ts # AC8
  - tests/echo-home/wizard/adapter-cache.test.ts   # AC8
  - tests/echo-home/wizard/render-echo-section.test.ts # AC8
  - tests/echo-home/wizard/wire.test.ts            # AC8
  - tests/echo-home/wizard/probe.test.ts           # AC8
  - tests/echo-home/wizard/run-wizard.test.ts      # AC8 — integration; uses fake atom-store + fake spawn

spec_refs:
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # source design — §"Onboarding wizard — 6 steps" + §"Failure modes"
  - backlog/{ready,pending_review,complete}/2026-05-25-070-echo-global-home-scaffold.md  # 070 exports ECHO_HOME_PATHS + OnboardingState + ProjectsState + OnboardedAgentProfile. STAGE-STABLE: 073 is blocked_by 070, so by claim time 070 is in complete/. Builder reads via filename lookup across the three stage directories.
  - backlog/{ready,pending_review,complete}/2026-05-25-071-role-definition-format-and-defaults.md  # 071 ships role TOMLs but 073 does NOT consume them at run time; reference only — no import.
  - backlog/{ready,pending_review,complete}/2026-05-25-072-adapter-sync-engine.md  # 072 exports syncAll, AdapterSyncProfile, SyncResult, SyncConflict, AdapterError, and atomicWrite. STAGE-STABLE — 073 is blocked_by 072.
  - src/storage/interface.ts  # Storage interface (NOT `AtomStore` — that name does not exist; codex r1 F1) — 073 imports for direct SQLite atom queries via `openExistingAtomStoreReadOnly()` (atom-store activity + repo_root group-by). The MCP path is not used in the wizard; direct read is faster and avoids requiring the daemon to be up.
  - src/storage/sqlite.ts  # concrete SqliteStorage — wizard test rigs construct in-memory variants for fake-store tests. NOTE: the wizard MUST NOT construct this directly in production (it mkdirs the parent + opens R/W + runs migrations + canonicalizeTimestamps); see AC1.3 production opener.
  - src/mcp/request-log.ts  # lines 220-340 reference: echo_ping is the canonical no-op probe tool (defined here). The wizard's probe (AC6) invokes it via per-agent spawn.
  - src/mcp/util/source-app.ts  # `buildSourceAppMap()` + `SOURCE_APP_VALUES` — canonical AgentKind→SourceApp→FS-prefix mapping the wizard MUST import for AC1.3 source matching and AC2 sourceBreakdown classification (codex r2 F1 / codex-ops r2 F1).
  - src/daemon/index.ts  # `resolveDbPath()` (currently private at lines ~19-25) — daemon's DB-path resolver honoring `ECHO_DB_PATH` > `ECHO_DATA_DIR` > default Application Support path. The builder MUST promote this to an exported helper (suggested target: `src/daemon/lifecycle.ts` alongside `resolveDataDir`), and the wizard MUST consume it. Per AC1.3 production opener (codex r2 F2 / codex-ops r2 F2).
  - src/daemon/lifecycle.ts  # `resolveDataDir()` at lines ~18-22 — only the data-dir layer; insufficient on its own because it ignores `ECHO_DB_PATH`. See note on `src/daemon/index.ts` above. The wizard pulls the DB-path resolver from here once promoted.
  - src/capture/extractors/codex.ts # source-prefix evidence — the codex extractor writes `source: 'fs:$HOME/.codex/sessions/...'`. Cited by AC1.3 to motivate prefix matching.
  - src/capture/extractors/claude-code.ts # source-prefix evidence — `source: 'fs:$HOME/.claude/projects/...'`.
  - src/capture/extractors/cursor.ts # source-prefix evidence — `source: 'fs:$HOME/Library/Application Support/Cursor/...'`.
  - CLAUDE.md  # operating model — wizard touches none of the operating-model files; this ref is for grounding only

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

# Onboarding wizard (steps 2–5)

## Why this spec exists

The 2026-05-25 ECHO Pro design (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`) ships onboarding as a 6-step arc: welcome → detect agents → detect projects → wire → probe → done. Steps 1 + 6 are UX framing owned by 074's `echo init` CLI. Steps 2–5 are the **decision + action substance** of onboarding and live in 073 as a UX-free library that 074 (and any future surface — Raycast Detail, Mac app window) drives.

073 ships:
- **Auto-detection** of which agents the user actually has (`codex`, `claude-code`, `cursor`) — based on config-file presence and atom-store activity, not best-effort guesses.
- **Project enumeration** from the atom store, ranked by recent activity, so the wizard can offer a default `--project` candidate.
- **The wire step** — loads the `previous*` cache 072 said it would not own, builds `AdapterSyncProfile[]`, calls 072's `syncAll`, persists results into `~/.echo/state/onboarding.json` and the `~/.echo/adapters/` cache.
- **Per-agent probe** — exercises the wiring by spawning each agent and asking it to invoke `mcp__echo__echo_ping`, with explicit best-effort semantics so missing CLIs or missing auth do not block onboarding.

074 will compose these into the `echo init` flow. Cursor (the editor) becomes its own concern at the probe step — see AC6's manual-only branch.

## Architectural sketch

```
                                  ┌────────────────────────────────────┐
074 echo init  ──▶  createWizard()│ wizard.detectAgents()              │  AC1  reads ~/.{codex,claude,cursor}/* + atom store
                  │              │ wizard.detectProjects()             │  AC2  reads atom store group-by repo_root
                  │              │ wizard.wire({selected, project})    │  AC5  → 072 syncAll + AC3 cache + AC4 render + 070 onboarding.json
                  │              │ wizard.probe({agents})              │  AC6  best-effort spawn per agent
                  └──────────────│ wizard.summary()                    │  AC7  read-only snapshot of state for the UI
                                  └────────────────────────────────────┘
```

Every method is async; every method returns a typed result. None of them prompts the user, prints to stdout, or talks to a TUI — that is 074's job.

## Judgment calls flagged for r1 review

The brainstorm sketch leaves several mechanics unspecified. The calls below are the spec author's picks; reviewers should push back if any of them feel wrong.

- **J1. Staged library API, not callback pipeline.** `createWizard()` returns an object with `detectAgents()`, `detectProjects()`, `wire()`, `probe()`, `summary()`. The UI calls them in order, surfaces user confirmation between steps, and decides whether to retry/skip on a failure. A callback-driven `runWizard(opts, onStep)` pipeline was rejected because steps 2 and 3 require user confirmation before step 4, which would force the UI to suspend the pipeline mid-call — awkward.
- **J2. Atom-store access via direct SQLite, not MCP.** 073 imports `Storage` (NOT `AtomStore` — that name does not exist) from `src/storage/interface.ts` and opens the existing SQLite DB via the wizard-local `openExistingAtomStoreReadOnly()` helper at `src/echo-home/wizard/atom-store-readonly.ts` (see AC1.3 "Production opener"). The DB path comes from the daemon's `resolveDbPath()` resolver — `ECHO_DB_PATH > ECHO_DATA_DIR > Application Support default` (see AC1.3 "DB path resolution must mirror the daemon"). The helper opens better-sqlite3 with `{ readonly: true, fileMustExist: true }` + `pragma query_only=ON` and skips migrations + canonicalizeTimestamps, so detection never creates a daemon DB or contends with a running daemon. The MCP route would force the daemon to be running and would route reads through HTTP+JSON for no benefit. Tests inject a fake `Storage` impl. (Originally written with the wrong type names + DB-path-resolution drift; rewritten in r3 to match AC1.3 per codex-ops r3 F5.)
- **J3. "Running processes" detection is OUT of scope.** The design archive mentions "config files + running processes + atom-store `source_breakdown`." The "running processes" signal is dropped: it conflates "installed" with "running right now" (which is brittle and not what onboarding cares about). Config-file presence + atom-store activity over 30d is sufficient; a process scan adds no decision value.
- **J4. Probe spawns the agent's CLI directly; cursor is manual-only.** `codex exec --sandbox read-only` and `claude --print --no-stream` are stable enough to drive a probe. Cursor has no headless CLI in V1, so its probe returns `{ probed: false, reason: 'manual-only' }` and the wizard surfaces an instruction string for the user.
- **J5. Adapter cache is per-agent JSON, NOT a single onboarding-wide file.** `~/.echo/adapters/codex.json`, `~/.echo/adapters/claude-code.json`, `~/.echo/adapters/cursor.json`. Per-agent files are smaller and survive partial failures cleanly: if writing `claude-code.json` fails, `codex.json` is already on disk and untouched.
- **J6. `~/.echo/state/onboarding.json` mutation is wizard-owned.** 070 ships the file in initial-empty shape; 073 is the first module that writes to it. Other modules (074, etc.) read it.

## Acceptance Criteria

### AC1 — `detect-agents.ts` returns layered-confidence `DetectedAgent[]`

**AC1.1 — Public surface.**

```ts
export type AgentKind = 'codex' | 'claude-code' | 'cursor';

export interface DetectedAgentSignals {
  configFile: { path: string; exists: boolean; readableMode: boolean };
  // last-30d atom activity for this agent's SourceApp prefix. `null` when
  // the atom store could not be opened (fresh install before daemon has
  // ever run, per AC1.3) — distinct from `{ count: 0, lastSeen: null }`
  // which means "store opened, found no rows for this agent."
  atomActivity: { count: number; lastSeen: string | null } | null;
  // True when the count query hit the AC1.3 saturation limit (50_000 rows
  // returned for this agent's source_prefix). 074 surfaces this as "50k+"
  // rather than the literal number. Defaults to false on non-saturated
  // results. (codex r2 F1 / codex-ops r2 F1 — additive field.)
  atomCountSaturated: boolean;
}

export interface DetectedAgent {
  kind: AgentKind;
  // 'high'   = configFile.exists === true AND atomActivity.count > 0
  // 'medium' = exactly one of those signals is positive
  // 'none'   = no signal (or atomActivity unavailable AND configFile absent)
  confidence: 'high' | 'medium' | 'none';
  signals: DetectedAgentSignals;
}

export interface DetectAgentsDeps {
  // Override the home dir used for config-file probes; tests inject a tmpdir.
  homedir?: string;
  // Override the atom store; tests inject a fake. When undefined, the
  // production path goes through openExistingAtomStoreReadOnly() — a
  // wizard-internal helper that fs.existsSync-checks the DB path FIRST and
  // returns null if it does not exist (no FS side effects). When the file
  // exists, it opens better-sqlite3 with `{ readonly: true, fileMustExist:
  // true }` and SKIPS migrations + canonicalizeTimestamps. The wizard must
  // never construct the production `SqliteStorage` directly — that
  // constructor mkdirs the parent dir, opens/creates the DB, runs
  // migrations, and canonicalizes timestamps (codex r1 F1 / codex-ops r1
  // F4 HIGH). Tests inject a fake; production uses the helper.
  atomStore?: Storage | null;
  // The wall-clock "now"; tests pin to a fixed Date for deterministic
  // 30-day windows. Defaults to new Date().
  now?: Date;
}

export async function detectAgents(deps?: DetectAgentsDeps): Promise<DetectedAgent[]>;
```

**AC1.2 — Config-file probe targets.**

| `kind` | Config file (relative to homedir) |
|---|---|
| `codex` | `.codex/config.toml` |
| `claude-code` | `.claude/CLAUDE.md` |
| `cursor` | `.cursor/mcp.json` |

The probe calls `fs.statSync` and reports `exists` plus `readableMode` (a bit-test of the user-read bit on `stat.mode`). It does NOT parse the file; a malformed config is still "exists." Symlinks are followed.

**AC1.3 — Atom-store activity probe.** Uses the existing `Storage.query` method in `src/storage/interface.ts` (the canonical capture-event read surface; the spec earlier called this `AtomStore.queryAtoms` — that name does not exist, codex r1 F1).

**Source matching is prefix-based, NOT exact (codex r2 F1 / codex-ops r2 F1 HIGH).** Captured `CaptureEvent.source` values are not bare app names — they are FS-prefixed paths produced by the per-app extractors (e.g. `fs:$HOME/.codex/sessions/...`, `fs:$HOME/.claude/projects/...`, `fs:$HOME/Library/Application Support/Cursor/...`). The canonical mapping from `SourceApp` → source-prefix lives in `src/mcp/util/source-app.ts`'s `buildSourceAppMap()` (already consumed by `search_memories`, `wait_for_new_turns`, `echo_resolve_mru`, etc. — a single source of truth). The wizard MUST import and use `buildSourceAppMap()`; it MUST NOT inline its own copy.

For each `AgentKind` the wizard:

1. Maps `AgentKind` → `SourceApp`:
   - `codex` → `'codex'`
   - `claude-code` → `'claude_code'` (note the underscore; the SourceApp vocabulary differs from the AgentKind vocabulary)
   - `cursor` → `'cursor'`
2. Looks up the FS prefix via `buildSourceAppMap()[sourceApp]`.
3. Calls `store.query({ source_prefix: <prefix>, since: <(now − 30d) ISO>, until: <now ISO>, limit: <large enough; see below> })`.
4. Computes `count = rows.length` and `lastSeen = max(rows[i].timestamp) || null` (ISO8601 UTC).

**Bounded scan + saturation flag.** `Storage.query` returns rows, not a pre-aggregated count. To bound the probe at O(window-of-recent-atoms-for-this-app) rather than O(all-rows-since-window), the wizard passes `limit: 50_000` — large enough that every realistic indie-AI-builder machine returns the full window, while still bounded so a pathological store does not OOM the wizard. If 50_000 is hit, `count` is reported as `50_000` and a new `signals.atomCountSaturated: true` field on `DetectedAgentSignals` (additive, defaults to `false`) communicates the saturation to 074 ("50k+ atoms" UX). Pinned by AC8.1 case 9.

**Production opener (must be implementable as documented — codex r1 F1, codex-ops r1 F4 HIGH).** The wizard MUST NOT construct the production `SqliteStorage` directly: that constructor `mkdirSync(dirname(dbPath), { recursive: true })`s, opens with R/W, runs `migrate()`, and runs `canonicalizeTimestamps()` (which writes) — i.e. detection would create a daemon DB and contend with the live daemon on migrations. Instead, define a wizard-internal helper:

```ts
// src/echo-home/wizard/atom-store-readonly.ts
export function openExistingAtomStoreReadOnly(dbPath: string): Storage | null;
```

Semantics:
1. `fs.existsSync(dbPath) === false` → return `null`. No `mkdir`, no `open`, no FS writes. This is the fresh-install branch.
2. `fs.existsSync(dbPath) === true` → open via `new Database(dbPath, { readonly: true, fileMustExist: true })`. Set `db.pragma('query_only = ON')` for defense-in-depth. Do NOT run `migrate()`. Do NOT run `canonicalizeTimestamps()`. Return a `Storage` adapter that implements ONLY `query()` (the only method 073 needs); the other interface methods throw `Error('read-only storage adapter — wizard scope')` if called.
3. Any other open-time error (`EACCES`, `SQLITE_CORRUPT`, etc.) propagates.

The wizard's detect path calls this helper once, passes the returned `Storage | null` to the AC1.3 probe and AC2 detector. `null` → AC1.4 confidence-rollup's `atomActivity: null` row; AC2.3's empty-store path returns `[]`.

When the store opened successfully but a query subsequently fails (DB later corrupted, locked, etc.), the error propagates — NOT swallowed (codex r1 AC8.1 case 6 already pins this).

**DB path resolution must mirror the daemon (codex r2 F2 / codex-ops r2 F2 MED).** `dbPath` is NOT `resolveDataDir() + '/echo.db'`. The daemon's actual resolver (`resolveDbPath()` at `src/daemon/index.ts:19-25`) honors three sources in precedence order:

1. `process.env.ECHO_DB_PATH` — if non-empty, `path.resolve(ECHO_DB_PATH)`. This is the **full DB file path**, NOT a directory.
2. `process.env.ECHO_DATA_DIR` — if non-empty (and ECHO_DB_PATH unset), `path.join(path.resolve(ECHO_DATA_DIR), 'echo.db')`.
3. Default: `path.join(homedir(), 'Library', 'Application Support', 'ECHO', 'echo.db')`.

The wizard MUST consume the same resolver, not duplicate it. **Builder step (precondition for AC1.3 production path):** promote `resolveDbPath()` from `src/daemon/index.ts` to an exported helper alongside `resolveDataDir` in `src/daemon/lifecycle.ts`, then have `src/daemon/index.ts` re-import + use it. The wizard imports `resolveDbPath` from `src/daemon/lifecycle.ts`. If the daemon's resolver later evolves, the wizard inherits the change for free. Pinned by AC8.1 case 10.

**AC1.4 — Confidence rollup.**

| Signals | Confidence |
|---|---|
| configFile.exists === true AND atomActivity.count > 0 | `high` |
| configFile.exists === true AND atomActivity === null | `medium` (fresh install; benefit of the doubt to the user) |
| configFile.exists === true AND atomActivity.count === 0 | `medium` |
| configFile.exists === false AND atomActivity.count > 0 | `medium` (atoms exist but config was wiped — surface for user to investigate) |
| configFile.exists === false AND (atomActivity === null OR count === 0) | `none` |

The function always returns one entry per `AgentKind`, never filtered. The caller (074) decides what to surface.

**AC1.5 — Ordering.** The returned array is sorted by `confidence` descending (`high` < `medium` < `none`), then by `kind` ascending alphabetically as a tie-breaker. Deterministic order is load-bearing for snapshot tests in 074.

### AC2 — `detect-projects.ts` returns `DetectedProject[]` ranked by 7d activity

**AC2.1 — Public surface.**

```ts
export interface DetectedProject {
  repoRoot: string;                                                  // absolute, normalized
  atomCount: number;                                                 // total atoms in last 7d for this repo_root
  lastSeen: string;                                                  // ISO8601 UTC, max timestamp over the window
  // Per-SourceApp counts, classified by `buildSourceAppMap()` prefix
  // match against each row's CaptureEvent.source. Rows whose source
  // matches no known prefix go under the literal `'other'` key. Absent
  // keys mean zero; every present key has count > 0. (codex r2 F1 /
  // codex-ops r2 F1.)
  sourceBreakdown: Partial<Record<SourceApp | 'other', number>>;
}

export interface DetectProjectsDeps {
  // Tests inject a fake. When undefined, production uses
  // openExistingAtomStoreReadOnly() (see AC1.3 — same helper, same null-on-
  // missing semantics). Never construct production SqliteStorage directly.
  atomStore?: Storage | null;
  now?: Date;
  windowDays?: number;                               // default 7; reviewer-overridable in tests
  limit?: number;                                    // default 25 — cap on the returned list to keep wizard UX bounded
}

export async function detectProjects(deps?: DetectProjectsDeps): Promise<DetectedProject[]>;
```

**AC2.2 — Query semantics.** Group atoms with non-empty `metadata.repo_root` over the window by `repo_root`. Atoms without `metadata.repo_root` (legacy git rows, pre-037 captures, etc.) are excluded — the wizard's job is "which projects did the user actually work in", and a row without repo metadata cannot answer that. Sort the result descending by `atomCount`, then descending by `lastSeen` as tie-breaker, then ascending by `repoRoot` lexicographically.

**Source classification for `sourceBreakdown` (codex r2 F1 / codex-ops r2 F1).** Each atom's `source` field is FS-prefixed (e.g. `fs:$HOME/.codex/sessions/...`, `git:...`). The wizard classifies each row by which `buildSourceAppMap()` prefix the `source` string starts with — same canonical map AC1.3 uses. `sourceBreakdown` is keyed by `SourceApp` values (`'codex'`, `'claude_code'`, `'cursor'`, `'git'`). Rows whose `source` matches no known prefix are aggregated under the literal key `'other'`. `sourceBreakdown[k]` is the count of matched rows under that key; absent keys mean zero.

**Bounded scan.** As with AC1.3, the underlying query uses `limit: 50_000`. If saturated, the function returns the top-25 projects by count over the truncated sample. A `DetectedProject` exposes no saturation flag because `detectProjects` already caps to `limit` (default 25), so a saturated input still produces a stable top-25; 074 does not need to know.

**AC2.3 — Empty-store path.** When the production opener returns `null` (DB file does not exist, per AC1.3's `openExistingAtomStoreReadOnly` semantics) OR the store opens and returns zero matching rows, the function returns `[]`. No throw, no FS side effects on the missing-DB path. This is the fresh-install case; 074's UI is expected to render a "we couldn't find any projects yet — pick one manually" prompt.

**AC2.4 — Path normalization.** `repoRoot` is `path.resolve` of whatever string the atom carries. The wizard does not trust atom-store data to be already-normalized. Duplicate `repo_root` values that differ only in trailing slash are merged before grouping.

### AC3 — `adapter-cache.ts` owns `~/.echo/adapters/<agent>.json` read/write

This is the persistence layer 072 AC6 deferred to the caller. 073 lands it.

**AC3.1 — File path.** `path.join(ECHO_HOME_PATHS.adapters, '<kind>.json')`. The directory is created by 070's `ensureEchoHome()`; if missing at write time, the cache module recreates it via `mkdirSync(dir, { recursive: true })` (defensive — never blocks a wire run on a deleted cache dir).

**AC3.2 — Schema.**

```ts
export interface AdapterCacheRecord {
  schema_version: 1;
  agent: AgentKind;
  last_written_at: string;                              // ISO8601 UTC
  echoSection: string | null;                           // last-written markdown body inserted between BEGIN/END markers (null when this agent has no markers-managed file, e.g. cursor)
  mcpServerConfig: Record<string, unknown> | null;      // last-written mcpServers.echo block (null when not applicable, e.g. claude-code has no MCP entry at this layer)
}

export function readAdapterCache(kind: AgentKind): AdapterCacheRecord | null;
export function writeAdapterCache(record: AdapterCacheRecord): void;
export function deleteAdapterCache(kind: AgentKind): void;
```

**AC3.3 — Read behavior.**

- File missing → returns `null`. Not an error; first-install case.
- File exists but `schema_version !== 1` → throws `AdapterCacheError` with message `"~/.echo/adapters/<kind>.json: unsupported schema_version <n>; expected 1"`. The wizard does NOT auto-upgrade — schema migrations are a follow-up spec per the same discipline 070's state files use.
- File exists but `JSON.parse` fails → throws `AdapterCacheError` with the parse error wrapped.
- File exists, parses, schema_version === 1, but a required field is missing or wrong type → throws `AdapterCacheError` naming the field.

**AC3.4 — Write behavior.** Uses 072's `atomicWrite` helper (imported from `src/echo-home/adapters/atomic-write.js`) with `secretSensitive: true`. Rationale: `mcpServerConfig` MAY carry auth headers in V1.5+ (today the local daemon endpoint is unauthenticated but the contract reserves the right). Defaulting to `0600` keeps the cache from accidentally becoming a secret-leak source.

**AC3.5 — Delete behavior.** `deleteAdapterCache(kind)` unlinks the file if present; no-op if missing. Used by 074's `echo uninstall` (out of scope for 073; surface exported here so 074 can consume).

### AC4 — `render-echo-section.ts` produces the per-agent markdown body 072's markers.ts splices in

Pure function module. No I/O. Takes context, returns a string.

**AC4.1 — Public surface.**

```ts
export interface EchoSectionContext {
  agent: AgentKind;
  mcpServerUrl: string;                  // canonical ECHO daemon endpoint, e.g. http://127.0.0.1:38479
  echoVersion: string;                   // injected by caller — read from package.json at runtime; do NOT hardcode
  defaultProjectRepoRoot: string | null; // user's chosen default project, or null if skipped
  renderedAt: string;                    // ISO8601 UTC — pinned by tests; defaults to new Date().toISOString()
}

export function renderEchoSection(ctx: EchoSectionContext): string;
```

**AC4.2 — Output shape.** A short markdown block, identical across `codex` and `claude-code` (cursor receives no marker-managed file, so the wizard never calls this for cursor). Shape:

```
# ECHO

ECHO is wired to the daemon at `<mcpServerUrl>`. Default project: `<defaultProjectRepoRoot>` (or "none chosen").

Use ECHO MCP tools (`find_clusters`, `search_memories`, `get_atom`, ...) to retrieve your prior cross-tool context. See `~/.echo/state/onboarding.json` for the install record.

<!-- echo-version: <echoVersion> · rendered-at: <renderedAt> -->
```

The trailing comment line is the **version fingerprint** that lets 072's conflict detection compare exactly — if `echoVersion` or `renderedAt` differ, the rendered string differs byte-for-byte, and 072's `previousEchoSection` mechanism still catches user edits because the comparison is to the *cached* previous render, not to a hash of the inputs.

**AC4.3 — Idempotency.** Calling `renderEchoSection` twice with the same context produces byte-identical output. The wizard pins `renderedAt` via `ctx` so a retry yields the same string and 072's no-op branch fires.

**AC4.4 — Out of scope for AC4.** Markdown formatting beyond the literal block above; per-skill listings (skill names live in CLAUDE.md / AGENTS.md only by reference, not by inlining); link rewriting. The body is intentionally tiny so the user's existing file outside the markers dominates.

### AC5 — `wire.ts` orchestrates the per-agent sync via 072's `syncAll`

**AC5.1 — Public surface.**

```ts
export interface WireOpts {
  selectedAgents: AgentKind[];                     // user's confirmed subset from AC1's DetectedAgent[]
  defaultProjectRepoRoot: string | null;           // user's confirmed pick from AC2; null = skipped
  mcpServerUrl: string;                            // canonical daemon URL — caller resolves; wizard does NOT introspect the daemon
  echoVersion: string;                             // package.json version — caller passes through
  // Override for 072's `repoRoot` resolution (codex-ops r3 F4 — recovery
  // pass-through for the AC5.7 `repoRoot` sentinel). When `syncAll` returns
  // `repoRoot` populated (packaged/bundled install where the source tree
  // isn't adjacent to the engine), the caller can re-invoke `wire()` with
  // an explicit `repoRoot` and the wizard passes it through to
  // `syncAll(profiles, { repoRoot })`. Without this seam the AC5.7 sentinel
  // is observable but not recoverable. Default: undefined → 072's
  // import.meta.url walk applies.
  repoRoot?: string;
  // Test injection: override 072's syncAll. Production uses the real export.
  syncAll?: typeof import('../adapter-sync.js').syncAll;
  // Test injection: override the adapter cache module. Production uses ./adapter-cache.js exports.
  cache?: {
    read: (kind: AgentKind) => AdapterCacheRecord | null;
    write: (rec: AdapterCacheRecord) => void;
  };
  // Wall-clock for renderedAt + onboarding.json timestamps; tests pin.
  now?: Date;
}

export interface WireResult {
  syncResult: SyncResult;                          // verbatim from 072
  cacheUpdates: Array<{ agent: AgentKind; action: 'written' | 'unchanged' | 'failed'; error?: string }>;
  onboardingStateUpdated: boolean;                 // true iff ~/.echo/state/onboarding.json was rewritten this call
}

export async function wire(opts: WireOpts): Promise<WireResult>;
```

**AC5.2 — Build phase.** For each `kind` in `selectedAgents`:

1. Load `previous` = `cache.read(kind)` (may be null on first install).
2. Compute `echoSection` = `renderEchoSection({ agent: kind, mcpServerUrl, echoVersion, defaultProjectRepoRoot, renderedAt: now.toISOString() })` — but only for `kind` ∈ `{ codex, claude-code }`. Cursor gets `echoSection: undefined`.
3. Compute `mcpServerConfig` per agent:
   - `codex` → `{ url: mcpServerUrl }` (codex config writes the table inline; 074 may extend with auth in a follow-up).
   - `cursor` → `{ url: mcpServerUrl }`.
   - `claude-code` → `undefined` (claude-code's MCP wiring is not done via `~/.claude/CLAUDE.md`; the wiring is the file copy of skills to `~/.claude/commands/`, owned by 072's `syncClaudeSkills`).
4. Build `AdapterSyncProfile`:
   ```ts
   {
     kind,
     echoSection,
     previousEchoSection: previous?.echoSection ?? undefined,
     mcpServerConfig,
     previousMcpServerConfig: previous?.mcpServerConfig ?? undefined,
     // `paths` omitted — let 072's per-agent defaults handle production paths.
     //  Tests that need tmpdir paths inject via opts.syncAll override + a profile-builder helper.
   }
   ```

**AC5.3 — Dispatch phase.** Call `syncAll(profiles, opts.repoRoot ? { repoRoot: opts.repoRoot } : undefined)`. Per codex-ops r3 F4, `opts.repoRoot` is the recovery seam for the AC5.7 `repoRoot` sentinel: when 072 first returns `repoRoot` populated, the caller passes an explicit `opts.repoRoot` on retry and the wizard forwards it to `syncAll`. When unset, 072 uses its `import.meta.url`-walk default. Capture the result verbatim into `WireResult.syncResult`. Do not mutate or sanitize.

**AC5.4 — Cache-update phase.** For each profile that resulted in an agent entry with `ok: true` AND no conflicts: write the `AdapterCacheRecord` with the newly-rendered values. For `ok: false` agents OR conflict outcomes: do NOT update the cache — the previous record remains the last-known-good baseline for the next retry. Record the per-agent outcome in `cacheUpdates[]`.

The reason: if 072 returned a conflict on `~/.codex/AGENTS.md`, the user hand-edited the file; if we overwrote the cache to the would-be value, the next sync would no longer be able to distinguish the user's edit from an ECHO bump.

**AC5.5 — Onboarding-state update phase.** Read `ECHO_HOME_PATHS.stateOnboarding`. If parse fails or `schema_version !== 1`, throw (070's invariant). Otherwise mutate:

- `last_updated_at` ← `now.toISOString()`.
- For each agent in `selectedAgents`, find or create the matching `OnboardedAgentProfile` in `state.agents` (match by `id === kind`).
  - `detected_at`: set to `now.toISOString()` only if newly created; preserved on existing entries.
  - `wired_at`: set to `now.toISOString()` iff this agent's 072 entry was `ok: true` AND not a conflict; otherwise leave unchanged.
  - `probed_at`: leave unchanged. (Set by AC6's probe step, not by wire.)
  - `capabilities`: leave unchanged. (Populated by 074 from role definitions, not from wire.)
  - `wire_error`: set to the first `AdapterError.message` for this agent if `ok: false`; cleared (set to `null`) on subsequent `ok: true` writes. If a conflict but no error, set to a synthesized message: `"conflict on <filePath>: <action>"`.
- `completed`: leave `false`. The wizard does not flip `completed` here. `markCompleted()` (AC7.3) is the **only** writer of `completed: true`; `summary()` (AC7) is purely read-only. (codex r1 F3 / codex-ops r1 F6 — the earlier "flip in summary()" clarification was wrong and is removed.)

Write back via 072's `atomicWrite` (`secretSensitive: false` — `onboarding.json` is not a secret-bearing file). `onboardingStateUpdated: true`.

**AC5.6 — Error semantics.** Exceptions from `cache.read`, `cache.write`, and the onboarding-state read/write propagate out of `wire()`. Exceptions from `syncAll` are *not* expected — 072 AC6 says `syncAll` never throws — but a try/catch around the call wraps any leaked exception into `{ syncResult: { ...empty failed shape with errors[] populated }, ... }`. Pinned by AC8 wire.test.ts case 9.

**AC5.7 — No-dispatch / top-level safety failures (codex r1 F2 / codex-ops r2 F3).** 072 has three top-level sentinels that signal "no per-agent dispatch happened, no roles ran, `agents` is `[]`":

| Sentinel field | Errno code(s) | Meaning |
|---|---|---|
| `syncResult.syncLock` | `RETRY_CONFLICT`, `ENOTDIR`, `EACCES`, ... | Per-user advisory lock could not be acquired (held by another `syncAll` invocation, or filesystem setup error). 072 AC6 lines 305-361. |
| `syncResult.repoRoot` | `UNKNOWN` | `syncAll`'s upward walk did not find a `package.json + skills/` directory and the caller did not pass `opts.repoRoot`. 072 AC6 line 250. |
| `syncResult.directorySymlink` | `EEXIST` (or errno-mapped) | Preflight detected an ECHO-owned directory as a symlink (or a non-symlink preflight error). 072 AC6a lines 364-399. |

When **any** of these three fields is populated, `wire()` MUST short-circuit before AC5.4 / AC5.5 run:

- Skip the cache-update phase entirely. `cacheUpdates: []`.
- Skip the onboarding-state update phase. `onboardingStateUpdated: false`.
- Return `{ syncResult, cacheUpdates: [], onboardingStateUpdated: false }` verbatim — the caller surfaces the populated sentinel's `.message` (which is human-readable per 072's contract — shell-quoted `rm` instructions for syncLock, "caller must pass opts.repoRoot" for repoRoot, "resolve manually before re-running" for directorySymlink) to the user.

This branch is distinct from per-agent `ok: false` outcomes: there, dispatch happened but specific agents failed, and per-agent `wire_error` / cache-suppression logic still applies. Here, nothing happened, so nothing should be mutated. Pinned by AC8.5 cases 11a / 11b / 11c (one per sentinel).

The broader race window — between `cache.read` and the onboarding-state write, two concurrent `echo init` invocations could observe stale baselines or interleave their persistence — is accepted as a V1 risk (see R5). 073 does NOT add a wizard-level lock around the read-then-write sequence in V1; mitigations live at the 072 lock + idempotent-cache-write level. See R5 for the follow-up trigger condition.

### AC6 — `probe.ts` exercises each wired agent via best-effort spawn

**AC6.1 — Public surface.**

```ts
export type ProbeOutcome =
  | { agent: AgentKind; probed: true; latencyMs: number }
  | { agent: AgentKind; probed: false; reason: 'cli-unavailable' | 'timeout' | 'manual-only' | 'auth-required' | 'mcp-not-configured' | 'unexpected-output'; detail?: string };

export interface ProbeDeps {
  // Test injection: override the child-process spawner. Production uses node:child_process.spawn.
  spawn?: (cmd: string, args: string[], opts?: { timeoutMs: number }) => Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }>;
  // Per-agent timeout; default 5000ms. Codex + claude can be slow on first invocation due to model warmup;
  // 5s is long enough for echo_ping but short enough to keep the wizard UX bounded.
  timeoutMs?: number;
}

export async function probeAgents(agents: AgentKind[], deps?: ProbeDeps): Promise<ProbeOutcome[]>;
```

**AC6.2 — Per-agent probe shape.**

- **`codex`.** Spawn `codex exec --sandbox read-only -- 'Invoke the mcp tool mcp__echo__echo_ping with no arguments and return its result verbatim as JSON only — no commentary.'`. Probe succeeds iff `exitCode === 0` AND the trimmed last line of stdout JSON-parses to an object containing `ok: true` (the echo_ping schema). `latencyMs` is wall-clock time from spawn to stdout-parsed.
- **`claude-code`.** Spawn `claude --print --no-stream --output-format text -- 'Invoke the mcp tool mcp__echo__echo_ping with no arguments and return its result verbatim as JSON only — no commentary.'`. Same success criterion **conditional on Claude Code already having ECHO MCP configured** — see §"Claude Code MCP wiring gap" below (codex-ops r3 F3).
- **`cursor`.** Returns `{ agent: 'cursor', probed: false, reason: 'manual-only' }` without spawning anything. Cursor has no headless CLI in V1; the wizard's caller (074) is responsible for surfacing a "please open Cursor and try invoking ECHO" prompt to the user. The wizard does NOT mark cursor's `probed_at` in `onboarding.json` — that field stays null until 074 collects manual confirmation.

**Claude Code MCP wiring gap (codex-ops r3 F3 HIGH — V1 documented limitation).** 072's claude-code adapter writes `~/.claude/CLAUDE.md` markers + copies skill files to `~/.claude/commands/`. It does NOT write to `~/.claude.json` (the global Claude Code config) or per-project `.claude/mcp.json` — those are the only files that wire ECHO as an MCP server for Claude Code. Consequence: on a fresh machine that has never been wired to ECHO, `wire()` reports `ok: true` for claude-code (markers + skills succeeded), but the AC6.2 probe asking Claude Code to call `mcp__echo__echo_ping` fails with `unexpected-output` because Claude Code doesn't know the tool exists.

**V1 acceptance:** the wizard documents this clearly rather than adding a 4th adapter mid-flight. Claude Code MCP wiring is OUT OF SCOPE for 073 + 072 (see Out of Scope §14, new). Until a follow-up adapter lands, the user MUST run `claude mcp add echo <url>` (or equivalent UI step) before the AC6.2 probe will succeed. 074 surfaces this in the Step 5 / probe-results screen as actionable text (74 owns the copy; 073 only emits the structured `reason`).

**Per AC6.3, claude-code probe failures matching the "mcp not configured" stderr/stdout patterns map to `reason: 'mcp-not-configured'`** so 074 can render the right remediation copy. This keeps the failure observable + actionable rather than buried in a generic `unexpected-output`. Followed up by R8 + Out of Scope §14 + DoD update.

**AC6.3 — Failure mapping.** Rows are evaluated in order; first match wins.

| Observed | reason |
|---|---|
| spawn throws ENOENT (binary not on PATH) | `cli-unavailable` |
| spawn exits with non-zero and stderr contains "auth" / "login" / "not authenticated" (case-insensitive substring) | `auth-required` |
| **(claude-code only)** combined stdout+stderr (case-insensitive) contains any of: "no such tool", "unknown tool", "mcp__echo__echo_ping" + "not found"/"unavailable", "mcp server" + "not configured"/"not found" | `mcp-not-configured` (codex-ops r3 F3) |
| `timedOut === true` | `timeout` |
| `exitCode === 0` but stdout does not parse / does not contain `ok: true` | `unexpected-output` (with `detail` = first 200 chars of stdout) |
| any other spawn error | `unexpected-output` (with `detail` = error message) |

The `mcp-not-configured` row fires only for claude-code per the gap documented in AC6.2 (codex / cursor have their MCP wired by 072 or by Cursor's own UI; only claude-code is the V1-gap path). For codex / cursor, an "MCP not configured" symptom routes through `unexpected-output` as before.

**AC6.4 — Mutating onboarding-state.** `probeAgents()` does NOT directly mutate `~/.echo/state/onboarding.json`. The caller (run-wizard.ts AC7) consumes the `ProbeOutcome[]` and writes back via the same onboarding-state mutator wire.ts uses. Reason: keep probe.ts pure-spawn so it's trivially testable; persistence orchestration lives in the wizard orchestrator.

**AC6.5 — No side effects between probes.** Probes run sequentially (not parallel) so a slow codex probe does not multiply timeouts. Future optimization to parallelize is V1.5+ once probe stability data exists.

### AC7 — `run-wizard.ts` exposes the staged factory; `index.ts` is the barrel

**AC7.1 — Public surface.**

```ts
export interface CreateWizardOpts {
  mcpServerUrl: string;
  echoVersion: string;
  // All deps below are test-injection seams; production omits them and the
  // module resolves the defaults (real AtomStore, real syncAll, real spawn).
  detectAgentsDeps?: DetectAgentsDeps;
  detectProjectsDeps?: DetectProjectsDeps;
  wireDepsOverride?: Partial<WireOpts>;
  probeDeps?: ProbeDeps;
  now?: () => Date;
}

export interface WizardSummary {
  detected: DetectedAgent[] | null;
  projects: DetectedProject[] | null;
  wired: WireResult | null;
  probed: ProbeOutcome[] | null;
  onboardingStateSnapshot: OnboardingState | null;   // last-read; refreshed at summary() time
}

export interface Wizard {
  detectAgents(): Promise<DetectedAgent[]>;
  detectProjects(): Promise<DetectedProject[]>;
  wire(opts: Pick<WireOpts, 'selectedAgents' | 'defaultProjectRepoRoot' | 'repoRoot'>): Promise<WireResult>;
  probe(agents: AgentKind[]): Promise<ProbeOutcome[]>;
  // READ-ONLY snapshot of the wizard's last-known state plus a fresh re-read
  // of `onboarding.json`. summary() never mutates `completed` (or any other
  // state field) — that is exclusively markCompleted()'s job. codex r1 F3 /
  // codex-ops r1 F6.
  summary(): Promise<WizardSummary>;
  // The SOLE writer of `completed: true` to ~/.echo/state/onboarding.json.
  // 074 calls this after the user dismisses the Step 6 "Done" screen.
  markCompleted(): Promise<void>;
}

export function createWizard(opts: CreateWizardOpts): Wizard;
```

**AC7.2 — State machine.** The wizard remembers the last result of each step (`detected`, `projects`, `wired`, `probed`) so `summary()` can return all of them. Calling a step twice REPLACES the previous result (no append). Calling `wire()` before `detectAgents()` is allowed — the wizard does not enforce ordering. (074 enforces.)

**AC7.3 — `markCompleted()`.** Reads `onboarding.json`, sets `completed: true` and `last_updated_at: now()`, writes back via `atomicWrite`. Idempotent: if `completed` is already `true`, just updates `last_updated_at`.

**AC7.4 — `probe()` integration with onboarding-state.** When `probe()` completes, it mutates `onboarding.json` to set each `OnboardedAgentProfile.probed_at` to `now.toISOString()` for any agent whose outcome was `{ probed: true }`. Outcomes with `probed: false` leave `probed_at` unchanged (null on first install; preserved from earlier success on retry).

**AC7.5 — `index.ts` barrel.** Re-exports `createWizard`, `Wizard`, all `Detect*`, `WireResult`, `ProbeOutcome`, `WizardSummary`. Does NOT re-export internals like `renderEchoSection` (those stay internal to `wizard/`).

### AC8 — Tests pin each module

All under `tests/echo-home/wizard/`. Vitest. Each test uses an OS tmpdir for `ECHO_HOME` and tears down via `rmSync(..., { recursive: true })` in `afterEach`. None touches the real `~/.echo/`.

**AC8.1 — `detect-agents.test.ts` (10 cases).**

1. All three config files present + atom store rows with **realistic FS-prefixed sources** (`fs:$HOME/.codex/sessions/...`, `fs:$HOME/.claude/projects/...`, `fs:$HOME/Library/Application Support/Cursor/...`) for each agent → all three agents return `confidence: 'high'`, sorted alphabetically as tie-breaker. Uses `buildSourceAppMap()` to construct the prefixes so the test stays aligned with the production map (codex r2 F1 / codex-ops r2 F1).
2. Only `.codex/config.toml` present + empty atom store → `codex` is `medium`, others `none`.
3. Empty homedir + atom store unavailable (`atomStore: null`) → all three `none`, no throw.
4. Empty homedir + atom store has activity (with realistic FS-prefixed sources) → all three `medium` (config absent, atoms present).
5. Symlinked `.codex/config.toml` → follows the symlink; reports `exists: true`.
6. Atom store throws on query (not `ENOENT`) → exception propagates; pinned to confirm we are NOT silently swallowing real DB errors.
7. `now` injection: with `now: new Date('2026-05-01T00:00:00Z')` and an atom at `timestamp: '2026-03-25T00:00:00Z'` (≈37d earlier) → `count: 0` (outside window); with `timestamp: '2026-04-15T00:00:00Z'` (≈16d earlier) → `count: 1`. Atom carries an FS-prefixed source so the prefix-match path is exercised.
8. **Fresh-install no-FS-side-effects (codex r1 F1 / codex-ops r1 F4).** Production-path test: with `atomStore: undefined` (real production path) AND a tmpdir whose `resolveDbPath()`-derived DB path does not exist, call `detectAgents()`. Assert: `atomActivity` is `null` for all three agents (per AC1.4 fresh-install row); AND `fs.existsSync(dbPath)` is `false` after the call; AND the parent directory of `dbPath` is unchanged (no `mkdir` happened). Use `fs.readdir` on the tmpdir before/after and diff — must be identical.
9. **Saturation flag (codex r2 F1 / codex-ops r2 F1).** Inject a fake `Storage.query` that returns exactly `50_000` rows for codex's source_prefix and 1 row for claude-code. Assert codex's `signals.atomCountSaturated === true` and `signals.atomActivity.count === 50_000`; claude-code's `atomCountSaturated === false`.
10. **`ECHO_DB_PATH` env override (codex r2 F2 / codex-ops r2 F2).** With `process.env.ECHO_DB_PATH = '<tmpdir>/custom-echo.db'` and a real SQLite DB pre-seeded at that path with one codex-source atom, call `detectAgents()`. Assert: codex's `atomActivity.count === 1`; the default Application-Support location is NOT touched (use `fs.readdir` on a tmpdir-redirected location to confirm). The test imports `resolveDbPath` from `src/daemon/lifecycle.ts` so the env-precedence assertion exercises the actual resolver.

**AC8.2 — `detect-projects.test.ts` (6 cases).**

1. Atom store with 3 distinct repo_roots → returns 3 entries, sorted descending by count.
2. Atoms with `repo_root: null` are excluded from the result.
3. Empty store → returns `[]` (no throw).
4. `limit: 2` clamps a 5-repo result to the top 2.
5. Two atoms with `repo_root` differing only in trailing slash → merged into one project record with summed count.
6. **Fresh-install no-FS-side-effects (codex r1 F1 / codex-ops r1 F4).** Production-path test analogous to AC8.1 case 8: with `atomStore: undefined` and a non-existent DB path, `detectProjects()` returns `[]` and no DB file / parent directory is created.

**AC8.3 — `adapter-cache.test.ts` (6 cases).**

1. `read` on missing file → returns `null`.
2. Write a record, then read → returns the same record (byte-equal JSON).
3. Read a hand-rolled file with `schema_version: 2` → throws `AdapterCacheError` naming the field.
4. Read a hand-rolled file that JSON-parses but is missing `last_written_at` → throws naming the field.
5. Write creates the `~/.echo/adapters/` directory if it was deleted (defensive against user `rm -r adapters/`).
6. File mode after write: stat the file; assert mode bits include `0600` and exclude group/other read (validates AC3.4's `secretSensitive: true` plumbing through `atomicWrite`).

**AC8.4 — `render-echo-section.test.ts` (4 cases).**

1. Happy path: output contains `<!-- echo-version: <version>` and `· rendered-at: <iso>` exact substrings.
2. `defaultProjectRepoRoot: null` renders the literal `"none chosen"` substring.
3. Idempotency: two calls with identical context produce byte-identical strings.
4. `agent: 'cursor'` throws (cursor does not get a marker-managed file; calling renderEchoSection for cursor is a wizard-internal bug).

**AC8.5 — `wire.test.ts` (13 cases — 10 base + 11a/11b/11c).**

1. Two agents (codex + claude-code), no prior cache → both `AdapterSyncProfile.previousEchoSection` is `undefined`; `syncAll` is called once with both profiles; both cache files written after success.
2. Same as #1 but a conflict on codex → codex cache is NOT updated; claude-code cache IS updated; `wire_error` on codex's `OnboardedAgentProfile` set to the conflict message.
3. Prior cache present for codex with a different `echoSection` → profile.previousEchoSection equals the cached value (validates 072's conflict-detection hand-off).
4. Onboarding-state has an existing `OnboardedAgentProfile` for codex with `detected_at: '2026-05-20T...'` → after wire, `detected_at` is preserved (not overwritten) and `wired_at` is updated to `now`.
5. Onboarding-state has `schema_version: 2` → wire throws (070 invariant).
6. `syncAll` returns `ok: true` for an agent → that agent's `wire_error` is cleared to `null`.
7. `syncAll` returns `ok: false` with an `AdapterError` → that agent's `wire_error` is set to the first error message.
8. `selectedAgents: ['cursor']` only → no call to `renderEchoSection`; profile has `echoSection: undefined`; cache write still records `echoSection: null` per AC3.2.
9. `syncAll` throws unexpectedly (mock throws) → wire catches and returns a result with synthesized failure shape; no onboarding-state mutation; no cache update.
10. `now` injection determines the `renderedAt` substring in the rendered echoSection AND the `last_written_at` in cache writes; pinned to identical ISO8601 across both surfaces.
11a. **Lock-acquisition-failure path (AC5.7 — `syncLock` populated; codex r1 F2 + codex r3 F1 fixture fix).** Mock `syncAll` to return 072's actual top-level-sentinel `SyncResult` shape (per 072 lines 369-377; the `skillsPopulated`/`roles` fields here are NOT the "agents ran" success shape — when a top-level sentinel fires no agent or role dispatch happens, so these fields carry their "sync_skipped" sentinels):

   ```ts
   {
     overallOk: false,
     agents: [],
     skillsPopulated: { ok: false, sourceDir: '', targetDir: '', error: 'sync_skipped:lock_unavailable' },
     roles: { results: [], rolesErrors: [] },
     syncLock: {
       code: 'RETRY_CONFLICT',
       operation: 'lock',
       file: '<tmp>/state/adapter-sync.lock',
       message: "lockfile present at \"<tmp>/state/adapter-sync.lock\" — if no other ECHO sync is running, remove it with: rm -- '<tmp>/state/adapter-sync.lock'. echo doctor will automate this in a future release.",
     },
   }
   ```

   Assert: `cacheUpdates` is `[]`; `onboardingStateUpdated` is `false`; `~/.echo/state/onboarding.json` is byte-identical before and after the call (SHA-256 hash pre/post); no adapter-cache file is written for any selected agent; `wire()` does NOT throw. Fixture mirrors 072 AC9 case 11; drift fails this test — deliberate cross-spec consistency guard.

11b. **Repo-root-not-found path (AC5.7 — `repoRoot` populated; codex-ops r2 F3 + codex r3 F1 fixture + case-number fix).** Same base shape as 11a (skillsPopulated `sync_skipped:repo_root_unresolved`, roles `{ results: [], rolesErrors: [] }`, agents `[]`, overallOk false), with `repoRoot: { code: 'UNKNOWN', operation: 'stat', file: '<some-tmp-path>', message: 'could not locate repo root (no package.json + skills/ adjacent); caller must pass opts.repoRoot' }` in place of `syncLock`. Same assertions as 11a: no cache writes, no onboarding mutation, `onboardingStateUpdated: false`, no throw. Fixture mirrors 072 **AC9 case 23** (not 22 — case 22 is the claude-skill symlink case).

11c. **Directory-symlink-preflight-fail path (AC5.7 — `directorySymlink` populated; codex-ops r2 F3 + codex r3 F1 fixture fix).** Same base shape as 11a (skillsPopulated `sync_skipped:preflight_directory_symlink`, roles `{ results: [], rolesErrors: [] }`, agents `[]`, overallOk false), with `directorySymlink: { code: 'EEXIST', operation: 'stat', file: '<tmp>/.echo/skills', message: '<tmp>/.echo/skills is a symlink — refusing to operate. Resolve manually before re-running.' }` in place of `syncLock`. Same assertions: no cache writes, no onboarding mutation, `onboardingStateUpdated: false`, no throw. Fixture mirrors 072 AC9 case 30.

**Cross-spec consistency note:** the literal `sync_skipped:<reason>` strings on `skillsPopulated.error` for 11b/11c are wizard-side expectations — 072 only fully specs the `sync_skipped:lock_unavailable` string today. The builder should match the AC8.5 fixtures against whatever 072 emits at claim time; if 072's strings differ (or only one is specced), update 11b/11c's expected `error` substring rather than 072's emission. This is the bullet codex r3 F1 cautioned about: typed mocks must match real `SyncResult` output, not invented shapes.

**AC8.6 — `probe.test.ts` (8 cases).**

1. Codex spawn returns `exitCode: 0, stdout: '{"ok":true}'` → `{ probed: true, latencyMs > 0 }`.
2. Codex spawn returns `exitCode: 0, stdout: 'no clue what to do'` → `{ probed: false, reason: 'unexpected-output' }`; `detail` is the truncated stdout.
3. Codex spawn throws `ENOENT` → `{ probed: false, reason: 'cli-unavailable' }`.
4. Codex spawn returns `exitCode: 1, stderr: 'Please run codex login first'` → `{ probed: false, reason: 'auth-required' }`.
5. Codex spawn's `timedOut: true` → `{ probed: false, reason: 'timeout' }`.
6. Claude spawn happy path → `{ probed: true }`. (Same shape as codex; distinct binary name in the spawn args.)
7. Cursor → `{ probed: false, reason: 'manual-only' }`, no spawn invocation (asserted by the injected spawn fake recording zero calls).
8. Mixed array `['codex', 'cursor', 'claude-code']` → results returned in input order; sequential spawn order verified by the fake.

**AC8.7 — `run-wizard.test.ts` (5 integration cases).**

1. Full happy path: detect → projects → wire → probe → summary → markCompleted. After `markCompleted`, `onboarding.json.completed === true`.
2. `summary()` called before any step → all four fields null; `onboardingStateSnapshot` reflects 070's initial-empty shape.
3. `wire()` then `probe()` mutates `onboarding.json.agents[i].probed_at` only for agents with `probed: true`.
4. `markCompleted()` is idempotent: called twice, `last_updated_at` advances but `completed` stays true; no schema corruption.
5. `detectAgents()` returning `none` for all kinds is still callable; downstream `wire([])` is a no-op (empty profiles); `syncAll([])` is called per AC5 dispatch (072 must handle empty input — confirm by test).

**AC8.8 — All existing tests continue to pass.** No existing test rewrites.

## Out of Scope (Don't Drift)

1. **UI / TUI / Raycast surface.** 074 picks the rendering surface. 073 ships pure library code; no `console.log`, no `process.stdout.write`, no Raycast components.
2. **Welcome (step 1) + Done (step 6) screens.** Both are 074-side copywriting + UX. 073's `markCompleted()` flips the boolean; 074 prints the welcome message and the "you're ready" screen.
3. **`echo doctor` / `echo uninstall`.** Both are 074 commands. 073 exports `deleteAdapterCache` and reads `onboarding.json`, but does not provide a doctor / uninstall flow.
4. **Daemon endpoint introspection.** 073 takes `mcpServerUrl` as an input. Discovering the URL (port scan, daemon RPC, etc.) is 074's job.
5. **Running-process detection.** Dropped per J3 above. Atom-store + config-file is sufficient.
6. **Auto-resolving conflicts surfaced by 072.** When `syncAll` returns conflicts, `wire()` records the conflict and stops mutating the cache — the user must resolve the underlying file edit before retry. No auto-merge logic in 073.
7. **Per-agent MCP wiring URL templating.** The wizard writes `{ url: mcpServerUrl }` verbatim. Per-agent shape conversion (e.g. converting `url` to `command + args` for stdio MCP servers) belongs in 072's adapter modules or a follow-up.
8. **Role-runtime matching.** Comparing role TOMLs to agent capabilities to pick which agent fulfills which role is 074's `echo run` flow. 073 only writes `capabilities: []` in `OnboardedAgentProfile` (070 already exports the field; 073 leaves it empty; 074 populates).
9. **Multi-machine onboarding state.** `onboarding.json` is per-machine. Cross-machine sync is V2+.
10. **Schema migrations.** v1 only for `AdapterCacheRecord` and `OnboardingState`; future versions ship as follow-up specs that migrate explicitly.
11. **Cursor auto-probe.** Manual-only in V1. If Cursor ships a headless CLI in a future release, a follow-up spec adds the spawn path.
12. **Atom-store backfill.** If the user has no atoms (fresh install), the wizard reports empty project list. No backfilling from filesystem scans.
13. **Concurrent wizard invocations.** 073 inherits 072's per-user lock (acquired inside `syncAll`); no separate wizard-level lock in V1. When two `echo init` runs race, the second `syncAll` call returns the lock-failure `SyncResult` shape per 072 AC6 (with `syncLock` populated and `agents: []`); 073's `wire()` handles that path explicitly per AC5.7 (no cache writes, no onboarding-state mutation, `onboardingStateUpdated: false`). The broader race window outside `syncAll` is documented in R5 with a follow-up trigger.
14. **Claude Code MCP wiring (codex-ops r3 F3).** 072 does not write to `~/.claude.json` or per-project `.claude/mcp.json`; therefore 073 cannot finalize Claude Code's MCP-server registration with ECHO. The wizard's wire step is `ok: true` for claude-code on success of markers + skills copy, but the AC6 probe is conditional on the user having previously run `claude mcp add echo <url>` (or equivalent). The Step 5 results screen surfaces `reason: 'mcp-not-configured'` with actionable text. A follow-up spec (suggested 075-class — "claude-code MCP adapter") will close this gap; until then 073 + 074 ship V1 with this manual-prerequisite. Trigger: log a follow-up the moment dogfooding shows a single confused user hitting the `mcp-not-configured` path.

## Risks

- **R1 — Direct atom-store access couples wizard to internal storage.** If the SQLite schema changes in a future 037-style refactor, the wizard's queries may break. Mitigation: wizard imports through `Storage` interface (`src/storage/interface.ts`), not against raw SQL — the interface is the contract. The wizard further isolates itself through `openExistingAtomStoreReadOnly()` (AC1.3), so a future refactor of the production `SqliteStorage` constructor (e.g. new migration steps, new pragmas) does not silently change detection's read-only contract. If the interface changes, the change ripples to every consumer in one place. Acceptable.

- **R2 — Probe spawns the agent's CLI; CLI flag drift could break probes silently.** `codex exec --sandbox read-only` and `claude --print --no-stream` are the documented stable flags as of 2026-05-25. If either changes, probes fail with `unexpected-output` and onboarding still completes — the failure is observable, not silent. Mitigation: AC6.3 maps stderr to `auth-required` / `unexpected-output` so the user sees actionable text. A follow-up spec adds version-detection if drift becomes a recurring pain.

- **R3 — Cursor manual-only probe weakens the "verify wiring" guarantee for cursor users.** A user can finish the wizard with `probed: false` for cursor and never verify the wiring works. Mitigation: 074's "done" screen prints the manual-probe instructions explicitly. If dogfooding shows cursor users skip the manual probe and discover broken wiring later, a follow-up spec adds a "open Cursor and the wizard waits 30s for the daemon to log an inbound request from cursor" pattern. V1 ships best-effort.

- **R4 — `previous*` cache divergence after a manual user edit of `~/.echo/adapters/<kind>.json`.** If the user hand-edits the cache, subsequent wire runs would compare against the edited baseline and either over-detect conflicts or under-detect them. Mitigation: AC3 documents `~/.echo/adapters/` as ECHO-owned cache, not user-edit territory. Schema-version + JSON-parse failures surface as `AdapterCacheError`. We accept that a determined user can break their own cache.

- **R5 — `onboarding.json` partial-write window + broader concurrent-wizard race (codex-ops r1 F5).** 070's AC2.2 footnote acknowledges that `wx`-flag writes can leave truncated state on SIGKILL/ENOSPC. 073's mutation writes through `atomicWrite` (072's helper, which uses temp + rename and is crash-atomic for the final file). So 073 *narrows* the partial-write window 070 left open. **The broader window** — between `cache.read` and the subsequent cache+state writes — is NOT closed by 072's lock alone: 072's lock only spans `syncAll`'s internal file mutations, leaving 073-side persistence outside the critical section. Two concurrent `echo init` shells could therefore (a) both read the same stale `previous*` cache, (b) serialize through `syncAll`, (c) race on the cache write afterward (idempotent for identical content but not for divergent inputs), and (d) read-modify-write `onboarding.json` with interleaved updates. **V1 acceptance:** indie-AI-builder cohort runs `echo init` once per machine; the V1 attack surface is "user runs the same `echo init` twice in two terminals," which is a low-probability + recoverable case (re-running `echo init` converges by AC4 idempotency). **Follow-up trigger:** if dogfooding surfaces (i) a user-visible cache divergence symptom, (ii) onboarding.json schema-version corruption from interleaved writes, or (iii) coord-event evidence of repeat-wizard runs racing — file a 075-class spec that either extends 072 to expose a `withLock(callback)` surface covering caller-owned persistence, or adds a wizard-level mutex around `wire()`. Until then: per Out of Scope §13, V1 best-effort.

- **R6 — Atom-store query latency on large stores.** `detectProjects` does a group-by over 7d of atoms; on the founder's machine with ~weeks of dense data, this could be slow. Mitigation: the underlying SQLite store already has indexes on `timestamp` and `source` (from earlier items); add an index on `metadata.repo_root` if 037 didn't already. If query takes > 250ms on the founder's machine at claim time, the builder STOPS and adds the index in the same spec; do not ship a wizard that hangs onboarding.

- **R7 — `package.json` version read is a runtime import.** The caller passes `echoVersion` into `createWizard`; the wizard does not introspect `package.json`. Avoids the test-fragility of pinning version strings. 074 reads `package.json` at startup and passes it through.

- **R8 — Claude Code MCP wiring is a manual prerequisite (codex-ops r3 F3).** 072 does not write to `~/.claude.json` / per-project `.claude/mcp.json`. The wizard's claude-code wire step (markers + skills copy) succeeds, but the AC6 probe asking Claude Code to call `mcp__echo__echo_ping` fails on machines without prior `claude mcp add echo <url>` setup. **Mitigation:** AC6.3 maps the failure to `reason: 'mcp-not-configured'`; 074 surfaces remediation copy on the Step 5 screen. **DoD update:** the manual-run section below reflects this — "claude probe succeeds OR returns `mcp-not-configured` with founder having previously wired ECHO via `claude mcp add`". **Follow-up trigger:** the first time dogfooding shows a user hitting the `mcp-not-configured` path, file a 075-class "claude-code MCP adapter" spec that extends 072 with a writer for `~/.claude.json` (or whichever Claude Code config file is canonical at that point).

## Tests

All additive — no existing test rewrites.

- 10 cases — `tests/echo-home/wizard/detect-agents.test.ts`
- 6 cases — `tests/echo-home/wizard/detect-projects.test.ts`
- 6 cases — `tests/echo-home/wizard/adapter-cache.test.ts`
- 4 cases — `tests/echo-home/wizard/render-echo-section.test.ts`
- 13 cases — `tests/echo-home/wizard/wire.test.ts` (10 base + 11a/11b/11c)
- 8 cases — `tests/echo-home/wizard/probe.test.ts`
- 5 cases — `tests/echo-home/wizard/run-wizard.test.ts`

**Total: 52 new test cases across 7 files.**

Verify steps:

- `npm test -- tests/echo-home/wizard/` — all 52 pass.
- `npm test` — full suite, all tests pass (1268+ before regressions).
- `npm run lint` — clean.
- `npm run typecheck` — clean.

All four verify commands must pass before the builder moves 073 to `pending_review/`.

## Definition of Done

- AC1: `detect-agents.ts` returns one `DetectedAgent` per kind with config-file + atom-activity signals and the four-bucket confidence rollup; deterministic order.
- AC2: `detect-projects.ts` groups atoms by `metadata.repo_root` over 7d (configurable), returns sorted-by-activity list with `sourceBreakdown`; empty store → empty result, not throw.
- AC3: `adapter-cache.ts` reads/writes `~/.echo/adapters/<kind>.json` via 072's `atomicWrite` with `secretSensitive: true`; rejects bad schema_version or shape; cache directory is defensively recreated on write.
- AC4: `render-echo-section.ts` is pure, returns byte-identical markdown for identical inputs, embeds version + renderedAt fingerprint for 072's conflict-detection hand-off; throws on `agent: 'cursor'`.
- AC5: `wire.ts` builds `AdapterSyncProfile[]` from selected agents + cache + render, calls 072's `syncAll`, updates per-agent cache ONLY for successful non-conflict outcomes, mutates `onboarding.json` (detected_at preserved, wired_at on success, wire_error set on failure, completed never flipped here). On ANY of `syncResult.{syncLock|repoRoot|directorySymlink}` populated → no cache writes, no onboarding-state mutation, `onboardingStateUpdated: false` (AC5.7).
- AC6: `probe.ts` spawns each agent's CLI with a 5s timeout (codex + claude-code) and returns `manual-only` for cursor; maps spawn failures to typed `reason` codes; sequential, not parallel.
- AC7: `run-wizard.ts` exposes `createWizard()` returning a staged `Wizard` object with `detectAgents`, `detectProjects`, `wire`, `probe`, `summary`, `markCompleted`; `index.ts` re-exports the public surface.
- AC8: all 52 new test cases pass; no existing test edits.
- All four verify commands clean.
- A manual run on the founder's machine: detect returns the expected three agents at `high` confidence; project enumeration returns the expected ranked list including `Project_echo`; wire produces no-conflict outcomes against the current state of `~/.codex/config.toml` and `~/.cursor/mcp.json`; the codex probe succeeds; **the claude-code probe either succeeds (if the founder has previously run `claude mcp add echo <url>`) OR returns `reason: 'mcp-not-configured'` with the documented remediation copy — both are acceptable per R8 / Out of Scope §14**; cursor returns `manual-only`. Founder validates `onboarding.json` reflects the run.

## After Completion (Strategist Notes)

- **Wiki page candidates (post-shipment):** none for 073 alone. When 074 also ships, write `wiki/surfaces/onboarding-wizard.md` covering the 6-step arc (steps 2-5 from 073, steps 1+6 from 074) and link from `wiki/product/echo-pro.md` once that page exists.
- **Update `wiki/architecture/coord-layer.md`** (created on the second coord-layer item to land per 070's After Completion notes) with a paragraph on the wizard's library shape: staged API, no UI, `~/.echo/adapters/` cache contract.
- **`backlog/_followups.md` annotations** (appended when 073 lands in `complete/`):
  - "Cursor headless-CLI probe path" — Out of Scope §11, triggered if cursor ships a probe surface.
  - "Atom-store query index on `metadata.repo_root`" — Risks R6, file even if the builder hits the 250ms cap and lands the index inline (so the followup carries the rationale).
  - "Wizard re-run telemetry" — open question: should re-running the wizard log a coord event? Defer until dogfooding shows ambiguity.
  - "Auto-resolve trivial conflicts (e.g. timestamp-only diff in `renderedAt`)" — Out of Scope §6, triggered if 072's conflict surface generates noise.
- **Trigger to surface 074's spec:** when 073 lands in `pending_review/`, the strategist's next conversation should ask the founder whether to proceed straight to 074 or pause to dogfood 073's library shape from a hand-rolled driver script first. The codex consult on 2026-05-25 recommended `cwd`-implicit project root for 074's CLI; that recommendation is in scope for the 074 spec, not 073.
- **No new principle page.** Staged-API discipline + library-not-UX is a familiar pattern in this repo; promote on second occurrence.
