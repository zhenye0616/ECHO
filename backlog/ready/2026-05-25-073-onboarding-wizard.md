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
  - src/echo-home/wizard/adapter-cache.ts          # AC3 — read/write ~/.echo/adapters/<agent>.json (the previous* cache 072 AC6 said is caller-owned)
  - src/echo-home/wizard/render-echo-section.ts    # AC4 — per-agent markdown renderer for the BEGIN ECHO / END ECHO body 072's markers.ts splices in
  - src/echo-home/wizard/wire.ts                   # AC5 — orchestrator: load previous*, build AdapterSyncProfile[], call 072's syncAll, persist new previous*, mutate ~/.echo/state/onboarding.json
  - src/echo-home/wizard/probe.ts                  # AC6 — per-agent best-effort spawn-and-check (codex / claude-code automated; cursor manual-only)
  - src/echo-home/wizard/run-wizard.ts             # AC7 — top-level createWizard() factory returning a staged API; 074 drives flow
  - src/echo-home/wizard/index.ts                  # AC7 — barrel re-export of the public surface
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
  - src/storage/interface.ts  # AtomStore interface — 073 imports for direct SQLite atom queries (atom-store activity + repo_root group-by). The MCP path is not used in the wizard; direct read is faster and avoids requiring the daemon to be up.
  - src/storage/sqlite.ts  # concrete SqliteAtomStore — wizard test rigs construct an in-memory variant of this for fake-atom-store tests
  - src/mcp/request-log.ts  # lines 220-340 reference: echo_ping is the canonical no-op probe tool (defined here). The wizard's probe (AC6) invokes it via per-agent spawn.
  - src/daemon/lifecycle.ts  # resolveDataDir() at lines 18-22 — the data dir env+homedir pattern, reused by wizard to locate the existing atom-store DB
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
- **J2. Atom-store access via direct SQLite, not MCP.** 073 imports `AtomStore` from `src/storage/interface.ts` and opens the existing SQLite DB at `resolveDataDir()`-based path. The MCP route would force the daemon to be running and would route reads through HTTP+JSON for no benefit. Tests inject a fake `AtomStore` impl.
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
  // last-30d atom activity for this agent's source_app. `null` when the
  // atom store is empty OR the store could not be opened (fresh install
  // before daemon has ever run) — distinct from `{ count: 0, lastSeen: null }`
  // which means "store opened, found no rows for this agent."
  atomActivity: { count: number; lastSeen: string | null } | null;
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

**AC1.3 — Atom-store activity probe.** Uses the existing `Storage.query` method in `src/storage/interface.ts` (the canonical capture-event read surface; the spec earlier called this `AtomStore.queryAtoms` — that name does not exist, codex r1 F1). For each agent, the wizard queries with `source === kind` (translation: `claude-code` agent → `source: 'claude_code'`; `codex` → `'codex'`; `cursor` → `'cursor'`) and `since >= now - 30d`. The probe records `count` (rows matched) and `lastSeen` (the max `timestamp` of matched rows, ISO8601 UTC). Field-name mapping: `CaptureEvent.timestamp` is the time column; `CaptureEvent.source` is the agent identifier — the spec's earlier `ts` / `source_app` references were wrong and are corrected here.

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
  repoRoot: string;                                  // absolute, normalized
  atomCount: number;                                 // total atoms in last 7d for this repo_root
  lastSeen: string;                                  // ISO8601 UTC, max ts over the window
  sourceBreakdown: Record<string, number>;           // { claude_code: 12, codex: 5, git: 7, cursor: 3 }
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

**AC5.3 — Dispatch phase.** Call `syncAll(profiles, { /* no opts; defaults are correct */ })`. Capture the result verbatim into `WireResult.syncResult`. Do not mutate or sanitize.

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

**AC5.7 — Lock-acquisition-failure / no-dispatch path (codex r1 F2).** When `syncResult.syncLock` is populated (072's per-user lock could not be acquired), no per-agent dispatch happened — `syncResult.agents` is `[]`. `wire()` MUST short-circuit at this point:

- Skip the cache-update phase entirely. `cacheUpdates: []`.
- Skip the onboarding-state update phase. `onboardingStateUpdated: false`.
- Return `{ syncResult, cacheUpdates: [], onboardingStateUpdated: false }` verbatim — the caller surfaces `syncResult.syncLock.message` (which includes the lock-holder's pid / since-time per 072 AC6) to the user.

This branch is distinct from per-agent `ok: false` outcomes: there, dispatch happened but specific agents failed, and per-agent `wire_error` / cache-suppression logic still applies. Here, nothing happened, so nothing should be mutated. Pinned by AC8.5 case 11 (new).

The broader race window — between `cache.read` and the onboarding-state write, two concurrent `echo init` invocations could observe stale baselines or interleave their persistence — is accepted as a V1 risk (see R5). 073 does NOT add a wizard-level lock around the read-then-write sequence in V1; mitigations live at the 072 lock + idempotent-cache-write level. See R5 for the follow-up trigger condition.

### AC6 — `probe.ts` exercises each wired agent via best-effort spawn

**AC6.1 — Public surface.**

```ts
export type ProbeOutcome =
  | { agent: AgentKind; probed: true; latencyMs: number }
  | { agent: AgentKind; probed: false; reason: 'cli-unavailable' | 'timeout' | 'manual-only' | 'auth-required' | 'unexpected-output'; detail?: string };

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
- **`claude-code`.** Spawn `claude --print --no-stream --output-format text -- 'Invoke the mcp tool mcp__echo__echo_ping with no arguments and return its result verbatim as JSON only — no commentary.'`. Same success criterion.
- **`cursor`.** Returns `{ agent: 'cursor', probed: false, reason: 'manual-only' }` without spawning anything. Cursor has no headless CLI in V1; the wizard's caller (074) is responsible for surfacing a "please open Cursor and try invoking ECHO" prompt to the user. The wizard does NOT mark cursor's `probed_at` in `onboarding.json` — that field stays null until 074 collects manual confirmation.

**AC6.3 — Failure mapping.**

| Observed | reason |
|---|---|
| spawn throws ENOENT (binary not on PATH) | `cli-unavailable` |
| spawn exits with non-zero and stderr contains "auth" / "login" / "not authenticated" (case-insensitive substring) | `auth-required` |
| `timedOut === true` | `timeout` |
| `exitCode === 0` but stdout does not parse / does not contain `ok: true` | `unexpected-output` (with `detail` = first 200 chars of stdout) |
| any other spawn error | `unexpected-output` (with `detail` = error message) |

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
  wire(opts: Pick<WireOpts, 'selectedAgents' | 'defaultProjectRepoRoot'>): Promise<WireResult>;
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

**AC8.1 — `detect-agents.test.ts` (8 cases).**

1. All three config files present + atom store with rows for each agent → all three agents return `confidence: 'high'`, sorted alphabetically as tie-breaker.
2. Only `.codex/config.toml` present + empty atom store → `codex` is `medium`, others `none`.
3. Empty homedir + atom store unavailable (`atomStore: null`) → all three `none`, no throw.
4. Empty homedir + atom store has activity → all three `medium` (config absent, atoms present).
5. Symlinked `.codex/config.toml` → follows the symlink; reports `exists: true`.
6. Atom store throws on query (not `ENOENT`) → exception propagates; pinned to confirm we are NOT silently swallowing real DB errors.
7. `now` injection: with `now: new Date('2026-05-01T00:00:00Z')` and an atom at `timestamp: '2026-03-25T00:00:00Z'` (≈37d earlier) → `count: 0` (outside window); with `timestamp: '2026-04-15T00:00:00Z'` (≈16d earlier) → `count: 1`.
8. **Fresh-install no-FS-side-effects (codex r1 F1 / codex-ops r1 F4).** Production-path test: with `atomStore: undefined` (real production path) AND a tmpdir whose `resolveDataDir()`-derived DB path does not exist, call `detectAgents()`. Assert: `atomActivity` is `null` for all three agents (per AC1.4 fresh-install row); AND `fs.existsSync(dbPath)` is `false` after the call; AND the parent directory of `dbPath` is unchanged (no `mkdir` happened). Use `fs.readdir` on the tmpdir before/after and diff — must be identical. This is the regression guard for the spec's earlier "direct SqliteStorage construction" hazard.

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

**AC8.5 — `wire.test.ts` (11 cases).**

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
11. **Lock-acquisition-failure path (AC5.7 / codex r1 F2).** Mock `syncAll` to return the 072 lock-failure shape: `{ overallOk: false, agents: [], skillsPopulated: { ok: true, ... }, roles: { ok: true, ... }, syncLock: { code: 'EEXIST', operation: 'lock', file: '~/.echo/locks/sync.lock', message: 'lock held by pid 12345 since 2026-05-25T...Z' } }`. Assert: `cacheUpdates` is `[]`; `onboardingStateUpdated` is `false`; `~/.echo/state/onboarding.json` is byte-identical before and after the call (read SHA-256 hash pre/post); no adapter-cache file is written for any selected agent; `wire()` does NOT throw.

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

## Risks

- **R1 — Direct atom-store access couples wizard to internal storage.** If the SQLite schema changes in a future 037-style refactor, the wizard's queries may break. Mitigation: wizard imports through `Storage` interface (`src/storage/interface.ts`), not against raw SQL — the interface is the contract. The wizard further isolates itself through `openExistingAtomStoreReadOnly()` (AC1.3), so a future refactor of the production `SqliteStorage` constructor (e.g. new migration steps, new pragmas) does not silently change detection's read-only contract. If the interface changes, the change ripples to every consumer in one place. Acceptable.

- **R2 — Probe spawns the agent's CLI; CLI flag drift could break probes silently.** `codex exec --sandbox read-only` and `claude --print --no-stream` are the documented stable flags as of 2026-05-25. If either changes, probes fail with `unexpected-output` and onboarding still completes — the failure is observable, not silent. Mitigation: AC6.3 maps stderr to `auth-required` / `unexpected-output` so the user sees actionable text. A follow-up spec adds version-detection if drift becomes a recurring pain.

- **R3 — Cursor manual-only probe weakens the "verify wiring" guarantee for cursor users.** A user can finish the wizard with `probed: false` for cursor and never verify the wiring works. Mitigation: 074's "done" screen prints the manual-probe instructions explicitly. If dogfooding shows cursor users skip the manual probe and discover broken wiring later, a follow-up spec adds a "open Cursor and the wizard waits 30s for the daemon to log an inbound request from cursor" pattern. V1 ships best-effort.

- **R4 — `previous*` cache divergence after a manual user edit of `~/.echo/adapters/<kind>.json`.** If the user hand-edits the cache, subsequent wire runs would compare against the edited baseline and either over-detect conflicts or under-detect them. Mitigation: AC3 documents `~/.echo/adapters/` as ECHO-owned cache, not user-edit territory. Schema-version + JSON-parse failures surface as `AdapterCacheError`. We accept that a determined user can break their own cache.

- **R5 — `onboarding.json` partial-write window + broader concurrent-wizard race (codex-ops r1 F5).** 070's AC2.2 footnote acknowledges that `wx`-flag writes can leave truncated state on SIGKILL/ENOSPC. 073's mutation writes through `atomicWrite` (072's helper, which uses temp + rename and is crash-atomic for the final file). So 073 *narrows* the partial-write window 070 left open. **The broader window** — between `cache.read` and the subsequent cache+state writes — is NOT closed by 072's lock alone: 072's lock only spans `syncAll`'s internal file mutations, leaving 073-side persistence outside the critical section. Two concurrent `echo init` shells could therefore (a) both read the same stale `previous*` cache, (b) serialize through `syncAll`, (c) race on the cache write afterward (idempotent for identical content but not for divergent inputs), and (d) read-modify-write `onboarding.json` with interleaved updates. **V1 acceptance:** indie-AI-builder cohort runs `echo init` once per machine; the V1 attack surface is "user runs the same `echo init` twice in two terminals," which is a low-probability + recoverable case (re-running `echo init` converges by AC4 idempotency). **Follow-up trigger:** if dogfooding surfaces (i) a user-visible cache divergence symptom, (ii) onboarding.json schema-version corruption from interleaved writes, or (iii) coord-event evidence of repeat-wizard runs racing — file a 075-class spec that either extends 072 to expose a `withLock(callback)` surface covering caller-owned persistence, or adds a wizard-level mutex around `wire()`. Until then: per Out of Scope §13, V1 best-effort.

- **R6 — Atom-store query latency on large stores.** `detectProjects` does a group-by over 7d of atoms; on the founder's machine with ~weeks of dense data, this could be slow. Mitigation: the underlying SQLite store already has indexes on `timestamp` and `source` (from earlier items); add an index on `metadata.repo_root` if 037 didn't already. If query takes > 250ms on the founder's machine at claim time, the builder STOPS and adds the index in the same spec; do not ship a wizard that hangs onboarding.

- **R7 — `package.json` version read is a runtime import.** The caller passes `echoVersion` into `createWizard`; the wizard does not introspect `package.json`. Avoids the test-fragility of pinning version strings. 074 reads `package.json` at startup and passes it through.

## Tests

All additive — no existing test rewrites.

- 8 cases — `tests/echo-home/wizard/detect-agents.test.ts`
- 6 cases — `tests/echo-home/wizard/detect-projects.test.ts`
- 6 cases — `tests/echo-home/wizard/adapter-cache.test.ts`
- 4 cases — `tests/echo-home/wizard/render-echo-section.test.ts`
- 11 cases — `tests/echo-home/wizard/wire.test.ts`
- 8 cases — `tests/echo-home/wizard/probe.test.ts`
- 5 cases — `tests/echo-home/wizard/run-wizard.test.ts`

**Total: 48 new test cases across 7 files.**

Verify steps:

- `npm test -- tests/echo-home/wizard/` — all 48 pass.
- `npm test` — full suite, all tests pass (1268+ before regressions).
- `npm run lint` — clean.
- `npm run typecheck` — clean.

All four verify commands must pass before the builder moves 073 to `pending_review/`.

## Definition of Done

- AC1: `detect-agents.ts` returns one `DetectedAgent` per kind with config-file + atom-activity signals and the four-bucket confidence rollup; deterministic order.
- AC2: `detect-projects.ts` groups atoms by `metadata.repo_root` over 7d (configurable), returns sorted-by-activity list with `sourceBreakdown`; empty store → empty result, not throw.
- AC3: `adapter-cache.ts` reads/writes `~/.echo/adapters/<kind>.json` via 072's `atomicWrite` with `secretSensitive: true`; rejects bad schema_version or shape; cache directory is defensively recreated on write.
- AC4: `render-echo-section.ts` is pure, returns byte-identical markdown for identical inputs, embeds version + renderedAt fingerprint for 072's conflict-detection hand-off; throws on `agent: 'cursor'`.
- AC5: `wire.ts` builds `AdapterSyncProfile[]` from selected agents + cache + render, calls 072's `syncAll`, updates per-agent cache ONLY for successful non-conflict outcomes, mutates `onboarding.json` (detected_at preserved, wired_at on success, wire_error set on failure, completed never flipped here). On `syncResult.syncLock` populated → no cache writes, no onboarding-state mutation, `onboardingStateUpdated: false` (AC5.7).
- AC6: `probe.ts` spawns each agent's CLI with a 5s timeout (codex + claude-code) and returns `manual-only` for cursor; maps spawn failures to typed `reason` codes; sequential, not parallel.
- AC7: `run-wizard.ts` exposes `createWizard()` returning a staged `Wizard` object with `detectAgents`, `detectProjects`, `wire`, `probe`, `summary`, `markCompleted`; `index.ts` re-exports the public surface.
- AC8: all 48 new test cases pass; no existing test edits.
- All four verify commands clean.
- A manual run on the founder's machine: detect returns the expected three agents at `high` confidence; project enumeration returns the expected ranked list including `Project_echo`; wire produces no-conflict outcomes against the current state of `~/.codex/config.toml` and `~/.cursor/mcp.json`; probes against codex + claude succeed; cursor returns `manual-only`. Founder validates `onboarding.json` reflects the run.

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
