---
id: 2026-05-25-072-adapter-sync-engine
title: "Adapter sync engine — merge-with-markers markdown + TOML/JSON mutators + skill/role copy + orchestrating syncAll(); conflict-detecting and idempotent"
status: ready
priority: HIGH
estimate: 1-2d
created: 2026-05-25
blocked_by: []
task_state_ref: ""
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/echo-home/adapter-sync.ts  # AC6 — new file; orchestrating syncAll(profile) + SyncResult shape; calls into the per-adapter modules below
  - src/echo-home/adapters/markers.ts  # AC1 — new file; merge-with-markers algorithm for AGENTS.md / CLAUDE.md (BEGIN/END markers, conflict detection, idempotent)
  - src/echo-home/adapters/codex-config.ts  # AC2 — new file; TOML mutator for ~/.codex/config.toml (target [mcp_servers.echo] only, preserve everything else)
  - src/echo-home/adapters/cursor-config.ts  # AC3 — new file; JSON mutator for ~/.cursor/mcp.json (target mcpServers.echo only)
  - src/echo-home/adapters/skill-sync.ts  # AC4 — new file; copies ~/.echo/skills/<name>.md → ~/.claude/commands/<name>.md (ECHO-owned, overwritten on re-sync)
  - src/echo-home/adapters/role-sync.ts  # AC5 — new file; copies default role TOMLs from assets/echo-roles/ to ~/.echo/roles/ on first install; refuses to overwrite user edits
  - src/echo-home/types.ts  # AC6 — extends 070's types with AgentProfile, SyncResult, SyncConflict; if 070 already owns this file, this AC adds types non-destructively
  - package.json  # adds the chosen TOML library dependency (see Risks R1 — library choice gated on AC2)
  - tests/echo-home/adapters/markers.test.ts  # AC7 — new file; pins append, replace (idempotent), preserve-outside, conflict-on-inside-edit
  - tests/echo-home/adapters/codex-config.test.ts  # AC7 — new file; pins add, update, no-op-on-no-change, conflict, comment/formatting preservation
  - tests/echo-home/adapters/cursor-config.test.ts  # AC7 — new file; pins add, update, no-op-on-no-change, other keys preserved
  - tests/echo-home/adapters/skill-sync.test.ts  # AC7 — new file; pins overwrite-on-resync, missing-target-dir-created, skill-removal-from-source NOT mirrored (V1 leaves stale files; see Out of Scope §3)
  - tests/echo-home/adapters/role-sync.test.ts  # AC7 — new file; pins first-install copy, user-edit refusal, missing-source-default skip
  - tests/echo-home/adapter-sync.test.ts  # AC7 — new file; pins syncAll partial-failure (some agents ok, some return conflict), result shape, per-agent isolation
spec_refs:
  - tools/sync-skills.sh  # prior art for skill-file sync (Claude Code real-file copy posture); 072 ports this logic into TypeScript with a different source root (~/.echo/skills/ vs repo skills/)
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # design archive — merge-strategy table at lines 50-55; rationale at lines 56-57
  - ~/.codex/config.toml  # canonical shape of the codex config file the TOML mutator targets; specifically the [mcp_servers.echo] block at the end of the user's existing file
  - ~/.cursor/mcp.json  # canonical shape of cursor's MCP config (mcpServers.{name} keys with url + headers, or command + args + env for stdio servers)
  - backlog/ready/2026-05-25-070-echo-home-scaffold.md  # 070 defines the ~/.echo/ directory layout this spec writes into; AgentProfile type extension lives here
  - backlog/ready/2026-05-25-071-role-definition-format.md  # 071 defines the role TOML schema and the canonical asset path that role-sync copies from
  - .claude/commands/  # current adapter target for skills (real-file copies); 072 generalizes this to per-user ~/.claude/commands/ at runtime
  - src/echo-home/  # 070's home for this module family (this spec assumes 070 creates the directory and base types.ts)

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

# Adapter sync engine

## Why this spec exists

The ECHO Pro coord-layer design (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`) sends the user's chosen agents through an onboarding wizard that, for each agent, must write MCP wiring, merge an ECHO-owned section into the agent's instruction file, and (for Claude Code) sync the skill library. The wizard itself (item 073) is a UX layer; the `echo` CLI (item 074) is an entrypoint. **Both call into one sync engine** that knows how to safely mutate three file formats (markdown with markers, TOML, JSON), copy files (skills, default roles), and refuse to clobber user edits.

072 is that engine. It is purely mechanics — no UX, no agent detection, no decision-making about *which* agents to wire. It takes a list of `AgentProfile`s as input and returns a `SyncResult` describing per-agent outcomes.

The decision-archive merge-strategy table at lines 50-55 of the design archive is the spec for what each adapter must do. This file is the implementation contract.

**Implementation dependency on other items:** the code in this spec assumes 070 has landed (it writes into `~/.echo/` paths and extends `src/echo-home/types.ts`) and 071 has landed (it copies the default role TOMLs from a canonical asset location). Spec-writing has no dependencies; implementation is gated on 070 + 071. State explicitly in the run log if a builder picks this up before 070 + 071 are in `complete/` — escalate via `pending_review/` rather than guessing the schemas.

## Architectural invariant

The sync engine never silently overwrites user-edited content. Every file the engine writes is in one of three ownership classes, and the class determines the conflict posture:

| Ownership class | Files | Conflict posture |
|---|---|---|
| **ECHO-section-only** (markers delimit) | `~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md` | Replace inside markers; preserve outside verbatim; if inside-markers content was hand-edited away from a previous ECHO write, return conflict. |
| **ECHO-key-only** (parse + mutate one key) | `~/.codex/config.toml` (`[mcp_servers.echo]`), `~/.cursor/mcp.json` (`mcpServers.echo`) | Mutate target key only; preserve all sibling keys + (TOML) formatting/comments. If user hand-edited the target key away from a previous ECHO write, return conflict. |
| **ECHO-fully-owned (overwrite)** | `~/.claude/commands/*.md` | Overwritten on every re-sync. Users are documented not to hand-edit these. No conflict detection. |
| **User-owned after first copy** | `~/.echo/roles/<default>.toml` | Copied on first install only. If file exists, do not overwrite — even if engine could detect a hand-edit, the user's edit wins. |

Re-running `syncAll(...)` with identical inputs is a no-op for every file. This is the idempotency contract: a watcher, retry loop, or wizard re-run must converge without flapping content.

## Acceptance Criteria

### AC1 — `src/echo-home/adapters/markers.ts` implements merge-with-markers for AGENTS.md / CLAUDE.md

- Exports `mergeWithMarkers(opts: { filePath: string; echoSection: string; previousEchoSection?: string }): MarkerResult`.
- Constants: `BEGIN_MARKER = '<!-- BEGIN ECHO -->'`, `END_MARKER = '<!-- END ECHO -->'`. Literal strings; no whitespace tolerance in V1 (a hand-edit that changes the markers themselves is treated as no-markers-present, which falls into the append branch — see R3).
- **Append branch (markers absent in current file):** the file is read; if it does not contain `BEGIN_MARKER`, the function appends `\n` + `BEGIN_MARKER` + `\n` + `echoSection` + `\n` + `END_MARKER` + `\n` to the existing content and writes the result atomically (write to `<filePath>.tmp` + `rename`). If the file does not exist, it is created with just the ECHO section + markers (no leading newline). Returns `{ action: 'append', filePath }`.
- **Replace branch (markers present, content inside equals `previousEchoSection`):** the inside-markers content is replaced with `echoSection`. Everything outside the markers is preserved byte-for-byte. Atomic write. Returns `{ action: 'replace', filePath }`. If `previousEchoSection` is omitted, this branch is unreachable — see Conflict branch.
- **No-op branch (markers present, content inside equals `echoSection`):** the file is not written. Returns `{ action: 'noop', filePath }`. This is what makes re-running idempotent.
- **Conflict branch (markers present, content inside differs from BOTH `previousEchoSection` AND `echoSection`):** the function does **not** write. Returns `{ action: 'conflict', filePath, conflict: { currentInside: string, expectedInside: string, proposedInside: string, unifiedDiff: string } }`. The `unifiedDiff` is a plain-text diff between `currentInside` and `proposedInside` produced by a small in-tree diff routine (no external library dependency for this — line-by-line is sufficient; see R4).
- **Idempotency requirement.** Calling `mergeWithMarkers` twice in a row with identical inputs produces: first call → `action: 'replace'` (or `'append'` on a fresh file), second call → `action: 'noop'`. Pinned by AC7's markers.test.ts.
- The function never reads or writes any file other than `filePath` and `<filePath>.tmp`. No backup files in V1 (see Out of Scope §6).

### AC2 — `src/echo-home/adapters/codex-config.ts` implements TOML mutator for `~/.codex/config.toml`

- Exports `syncCodexMcpBlock(opts: { filePath: string; serverConfig: { url: string; enabled?: boolean; [k: string]: unknown }; previousServerConfig?: Record<string, unknown> }): TomlMutatorResult`.
- Targets exactly the `[mcp_servers.echo]` table. All other tables (`[mcp_servers.<otherName>]`, `[projects.*]`, top-level keys like `model`, `personality`) are preserved byte-for-byte including comments and blank lines wherever the library allows.
- **TOML library choice.** Use `smol-toml` (preserves comments + formatting; actively maintained; pure TS; works in node). The builder MUST verify on first read that `smol-toml`'s parse/stringify round-trips a copy of the founder's real `~/.codex/config.toml` (which has 15+ `[projects.*]` tables, a top-level `[notice.model_migrations]`, and the existing `[mcp_servers.echo]` block) without losing keys, comments, or table order. If round-trip is lossy in ways material to this spec, the builder escalates with a recommendation to use `@iarna/toml` (lossier but stable) + a hand-rolled key-targeted patch that uses string-range editing to preserve formatting outside the target table. See R1.
- **Add branch:** file exists but no `[mcp_servers.echo]` table → append the table at the end of the file (after a trailing blank line if not already present). Atomic write. Returns `{ action: 'add' }`.
- **Update branch:** table exists, current contents match `previousServerConfig` (key-by-key deep equal) → replace the table contents with `serverConfig`. Atomic write. Returns `{ action: 'update' }`.
- **No-op branch:** table exists, contents already match `serverConfig` → no write. Returns `{ action: 'noop' }`. (Idempotency.)
- **Conflict branch:** table exists, contents match neither `previousServerConfig` nor `serverConfig` → no write. Returns `{ action: 'conflict', conflict: { currentValue, expectedValue, proposedValue, unifiedDiff } }`.
- **Missing file:** if `filePath` does not exist, the function creates it with just the target table. Returns `{ action: 'add' }`. (Onboarding-first-run case where the user has never run codex.)
- The function does NOT touch any other `[mcp_servers.<name>]` table even when one happens to share fields with echo's.

### AC3 — `src/echo-home/adapters/cursor-config.ts` implements JSON mutator for `~/.cursor/mcp.json`

- Exports `syncCursorMcpEntry(opts: { filePath: string; serverConfig: { url: string; headers?: Record<string, string>; [k: string]: unknown }; previousServerConfig?: Record<string, unknown> }): JsonMutatorResult`.
- Targets exactly `mcpServers.echo` (nested object). All other entries in `mcpServers.*` and any sibling top-level keys are preserved.
- Path is `~/.cursor/mcp.json` on macOS (verified against founder's machine — file exists with this exact shape: `{ "mcpServers": { "dart": {...}, "supabase": {...}, "echo": {...} } }`). Document at the top of the file: "Cursor does not yet publish a stable contract for the per-user MCP config path. If Cursor renames or relocates this file in a future release, the cursor-config adapter must be updated." See R2.
- **Add / Update / No-op / Conflict branches** mirror AC2's TOML branches: same semantics, same return shape.
- **Formatting preservation:** parse with `JSON.parse`, mutate the target subtree, write back with `JSON.stringify(obj, null, 2) + '\n'`. Existing whitespace exotica (tabs, trailing commas — which JSON.parse rejects anyway) is not preserved; this is a known tradeoff because no widely-used JSON-with-comments parser is in the project's dependency surface. Add a one-line note in the file's header comment block of `cursor-config.ts` documenting the tradeoff.
- **Missing file:** create with `{ "mcpServers": { "echo": <serverConfig> } }` and write atomically. Returns `{ action: 'add' }`.

### AC4 — `src/echo-home/adapters/skill-sync.ts` copies skills into Claude Code's per-user commands directory

- Exports `syncClaudeSkills(opts: { sourceDir: string; targetDir: string }): SkillSyncResult`.
- Reads all `*.md` files from `sourceDir` (canonically `~/.echo/skills/`).
- For each, copies to `targetDir/<name>.md` (canonically `~/.claude/commands/<name>.md`). Existing files at the target are overwritten unconditionally — these are ECHO-owned per the decision-archive merge-strategy table.
- Creates `targetDir` if it does not exist (`mkdir -p` equivalent).
- Returns `{ copied: string[], skipped: string[], targetDir }` where `copied` is filenames written and `skipped` is empty in V1 (placeholder for future "user hand-edited, refuse" mode behind a flag).
- **Skills present in `targetDir` but not in `sourceDir` are LEFT IN PLACE in V1.** Stale skill files from prior ECHO versions or other tooling do not cause a removal. This is a deliberate non-feature; document at the top of `skill-sync.ts`. Removal becomes a follow-up spec if dogfooding shows stale skills cause confusion. See Out of Scope §3.
- The function never reads or writes outside `sourceDir` and `targetDir`.
- **Idempotency:** because targets are ECHO-owned and overwritten on every run, the second run produces byte-identical files. The function does not skip on identical-content; the overwrite is cheap. (Different posture from AC1's `noop`-branch optimization because skill files have no conflict-detection cost to amortize.)

### AC5 — `src/echo-home/adapters/role-sync.ts` copies default role TOMLs on first install

- Exports `syncDefaultRoles(opts: { sourceDir: string; targetDir: string; defaults: string[] }): RoleSyncResult`.
- `defaults` is the list of role filenames to copy (canonically `['strategist.toml', 'reviewer.toml', 'builder.toml']`, supplied by 073 / 074 — this engine does not hardcode the list).
- `sourceDir` is the in-repo canonical path where 071 ships the default role TOMLs (assume `assets/echo-roles/` — if 071 picks a different path, the call site passes the correct one; 072 does not own this constant).
- `targetDir` is canonically `~/.echo/roles/`.
- For each role in `defaults`:
  - If `targetDir/<role>` does not exist → copy from `sourceDir/<role>`. Returns `{ role, action: 'copied' }`.
  - If `targetDir/<role>` exists and content is byte-identical to `sourceDir/<role>` → no write. Returns `{ role, action: 'noop' }` (idempotent re-run).
  - If `targetDir/<role>` exists and content differs → **do not overwrite**. Returns `{ role, action: 'user-modified', conflict: { filePath, sourceBytes, userBytes } }`. The user owns the file after first install; their edits win permanently. The caller surfaces the result; the engine never overwrites. To reset, the user `rm`s the file and re-runs sync.
  - If `sourceDir/<role>` does not exist → `{ role, action: 'source-missing' }`. (Defensive — 071 should ship all three; this branch is a sentinel for an upstream bug.)
- Aggregate return: `{ results: RolePerFileResult[] }`.

### AC6 — `src/echo-home/adapter-sync.ts` orchestrates per-agent sync via `syncAll(profiles)`

- Exports `syncAll(profiles: AgentProfile[], opts?: { echoMcpUrl?: string; rolesSourceDir?: string; defaultRoles?: string[] }): Promise<SyncResult>`.
- `AgentProfile` (extended from 070's types if it already exports a base shape; otherwise defined in `src/echo-home/types.ts`):
  ```ts
  type AgentKind = 'codex' | 'claude-code' | 'cursor';
  interface AgentProfile {
    kind: AgentKind;
    // Adapter paths — caller-provided for testability; default to per-user $HOME locations
    paths: {
      configFile?: string;        // codex: ~/.codex/config.toml; cursor: ~/.cursor/mcp.json; claude-code: unused
      instructionsFile?: string;  // codex: ~/.codex/AGENTS.md; claude-code: ~/.claude/CLAUDE.md; cursor: unused
      commandsDir?: string;       // claude-code only: ~/.claude/commands/
    };
    // What ECHO section content to merge into the instructions file (per-agent rendered upstream)
    echoSection?: string;
    previousEchoSection?: string;  // last-known ECHO write, for conflict detection
    // What MCP server config to wire (URL is the daemon endpoint)
    mcpServerConfig?: { url: string; [k: string]: unknown };
    previousMcpServerConfig?: Record<string, unknown>;
  }
  ```
- For each profile, dispatch on `kind`:
  - `codex` → call `markers.mergeWithMarkers` for `instructionsFile`, `codex-config.syncCodexMcpBlock` for `configFile`.
  - `claude-code` → call `markers.mergeWithMarkers` for `instructionsFile`, `skill-sync.syncClaudeSkills` for `commandsDir` (sourceDir = `~/.echo/skills/`).
  - `cursor` → call `cursor-config.syncCursorMcpEntry` for `configFile`.
- **After per-agent dispatch**, call `role-sync.syncDefaultRoles` ONCE (not per-agent — roles are global to `~/.echo/`). Use `opts.rolesSourceDir` (default `<repo>/assets/echo-roles/` resolved via the same mechanism 070 uses to find repo-bundled assets) and `opts.defaultRoles` (default `['strategist.toml', 'reviewer.toml', 'builder.toml']`).
- Aggregate into `SyncResult`:
  ```ts
  interface SyncResult {
    agents: Array<
      | { agent: AgentKind; ok: true; files_written: string[]; actions: Array<{ file: string; action: string }> }
      | { agent: AgentKind; ok: false; conflicts: SyncConflict[]; files_written: string[] }
    >;
    roles: RoleSyncResult;
    overallOk: boolean;  // true iff every agent.ok === true AND no role result is 'user-modified' that the caller has not opted-in to ignore
  }
  ```
- **Partial-failure is normal**, not a failure of `syncAll`. If codex returns a conflict on `~/.codex/config.toml` but cursor and claude-code both succeed, the result reports two `ok: true` agents and one `ok: false` agent. The caller (wizard / CLI) decides whether to proceed, retry, or abort.
- **No transactional rollback.** Files that were written successfully stay written even if a later agent in the loop fails. This is acceptable because each file write is itself atomic (tmp + rename) and conflict-detecting; a half-applied run is recoverable by re-running after the conflict is resolved.
- `syncAll` is the ONLY public entrypoint; per-adapter functions are also exported for direct test use but the wizard / CLI must go through `syncAll` so cross-agent ordering + roles-once invariants are preserved.

### AC7 — Tests pin the contract

Each adapter has its own test file; the orchestrator has one integration test. All tests use temp directories (`fs.mkdtemp(os.tmpdir() + '/echo-072-')`) — no test reads or writes the founder's real `~/.codex/`, `~/.claude/`, or `~/.cursor/`.

- `tests/echo-home/adapters/markers.test.ts` — six cases:
  1. Fresh file → `action: 'append'`, file ends with `BEGIN…END` block and the ECHO section between.
  2. File with markers + matching `previousEchoSection`, new `echoSection` differs → `action: 'replace'`; content outside markers byte-identical to before.
  3. File with markers + matching `echoSection` (idempotent re-run) → `action: 'noop'`, file mtime unchanged (or at minimum: file content byte-identical).
  4. File with markers but inside-content differs from BOTH previous and new → `action: 'conflict'`, no write, conflict object has `currentInside`, `expectedInside`, `proposedInside`, and a non-empty `unifiedDiff`.
  5. File with user content above and below the markers → after a replace, the above/below content is byte-identical (preservation invariant).
  6. Marker present but malformed (e.g., `BEGIN` without matching `END`) → treated as no-markers-present (append branch). Pins R3.

- `tests/echo-home/adapters/codex-config.test.ts` — six cases:
  1. File has no `[mcp_servers.echo]` → `action: 'add'`; file now contains the table; all other tables byte-identical.
  2. Existing `[mcp_servers.echo]` matches `previousServerConfig`, new `serverConfig` differs → `action: 'update'`; only that table changes; other tables and comments preserved (the test fixture must include a `[projects.X]` table and at least one comment to validate the preservation claim).
  3. Existing matches new `serverConfig` → `action: 'noop'`, no write.
  4. Existing differs from both → `action: 'conflict'`, no write.
  5. File does not exist → file is created with just `[mcp_servers.echo]`.
  6. File contains a `[mcp_servers.other]` block; after sync, the `other` block is byte-identical (zero collateral damage on sibling MCP servers).

- `tests/echo-home/adapters/cursor-config.test.ts` — five cases mirroring AC2 (add / update / noop / conflict / missing-file). Plus one preservation case: file contains `mcpServers.dart` (stdio shape) and `mcpServers.supabase` (URL shape); after `mcpServers.echo` is added, both sibling entries are unchanged.

- `tests/echo-home/adapters/skill-sync.test.ts` — four cases:
  1. Target dir does not exist → created; all source skills copied.
  2. Target dir exists with two existing skill files matching source → re-run produces byte-identical files (idempotency-by-overwrite).
  3. Target dir exists with a stale skill file (not in source) → stale file is LEFT IN PLACE (pin R5 / Out of Scope §3).
  4. Target dir contains a user-hand-edited skill file matching one of the source filenames → file is OVERWRITTEN (pin AC4's overwrite posture; surfaces R6 to documentation, not to code).

- `tests/echo-home/adapters/role-sync.test.ts` — four cases:
  1. Target dir empty → all three default roles copied.
  2. Target dir has all three roles byte-identical to source → all three return `action: 'noop'`.
  3. Target dir has `reviewer.toml` hand-edited (differs from source) → `reviewer.toml` returns `action: 'user-modified'`, file is NOT overwritten; `strategist.toml` and `builder.toml` return `'noop'` or `'copied'` as appropriate.
  4. Source dir missing `builder.toml` → `builder.toml` returns `action: 'source-missing'`; the other two are unaffected.

- `tests/echo-home/adapter-sync.test.ts` — three cases:
  1. Three agents (codex, claude-code, cursor) all succeed → `overallOk: true`, three `ok: true` entries, `files_written` lists every file actually touched.
  2. Codex returns conflict on `config.toml`; claude-code and cursor succeed → `overallOk: false`, codex entry has `ok: false` with a populated `conflicts` array; the other two are `ok: true`; the files that were successfully written by claude-code and cursor are NOT rolled back (pin "no transactional rollback").
  3. All three agents succeed but `reviewer.toml` is user-modified in `~/.echo/roles/` → agents are all `ok: true`, but `result.roles.results` includes the `'user-modified'` entry; `overallOk` is true iff caller opted-in via `opts.allowUserModifiedRoles` (default false — `overallOk: false` when the option is off).

Run convention: `npm test -- tests/echo-home/`.

## Out of Scope (Don't Drift)

1. **Agent detection.** Deciding which agents are installed on the machine is 073's job. 072 takes `AgentProfile[]` as input. If you find yourself writing `process.exec('which codex')` or scanning for `~/.codex/` existence as a precondition, STOP — that work belongs in 073.
2. **Wizard UX / progress reporting / confirmation gates.** No UI, no readline prompts, no console spinners. `syncAll` returns a `SyncResult`; the caller renders it. The conflict objects carry enough structured detail (currentInside, proposedInside, unifiedDiff) for the wizard to render previews without re-doing the diff.
3. **Pruning stale skill files in `~/.claude/commands/`.** Files present in the target but absent from the source are left in place. Removal is a follow-up if dogfooding shows it's needed.
4. **Per-project `.echo/config.toml` overrides.** V1.5+. Global home only.
5. **The `~/.echo/` directory layout itself.** Owned by 070. 072 writes into the paths 070 establishes; if a needed path is missing or unclear, escalate rather than invent.
6. **Backup files.** No `.bak` files, no rotated copies, no journaling beyond the atomic tmp-rename. If a user wants a backup before re-sync, they make one themselves. Adding backup mechanics is a future spec if dogfooding shows in-place writes feel risky.
7. **Telemetry / metrics emission.** No daemon emit calls, no atom-log writes, no MCP calls. Sync is a pure file-system operation. If observability is needed, the caller can wrap `syncAll` and log its return value.
8. **`mcp__echo__get_skill(name)` dynamic skill serving.** The decision archive defers this to V1.5+; do not stub the interface even if convenient.
9. **The role TOML schema and the three default role files.** 071 owns these; 072 only copies bytes.
10. **The `echo` CLI binary.** 074 owns the user-facing `echo init` / `echo doctor` commands; this engine is a TypeScript module they import.

## Risks

- **R1 — TOML library choice may not preserve formatting + comments.** `smol-toml` is the lead candidate based on its docs claim of round-trip fidelity, but no one on the team has stress-tested it against a real ~30-table user config. The first builder action on AC2 is a verification: parse the founder's actual `~/.codex/config.toml` (copy to a temp file for testing), then stringify, then diff. If the diff is non-trivial in any way that loses user data, escalate before adding `smol-toml` to dependencies. Fallback library: `@iarna/toml` (lossier, but lossless on the small block ECHO actually mutates) combined with a string-range patch that inserts/replaces only the `[mcp_servers.echo]` block via line-offset surgery — leaving the rest of the file as raw bytes the library never touches. If the fallback is chosen, AC7's codex-config.test.ts case 2 (preserve sibling tables + comments) MUST still pass.

- **R2 — Cursor's MCP config path stability.** `~/.cursor/mcp.json` is the path on the founder's machine today, but Cursor has not published a long-term contract for it. If Cursor renames or relocates this file in a future release, the cursor-config adapter breaks silently. Mitigation: AC3's missing-file branch creates the path if absent, which means an updated Cursor that uses a new path will leave the old file dormant rather than crashing — the wizard / CLI will report `ok: true` but the wiring won't be active. Detecting this requires probing (item 073's step 5); 072 cannot detect it from the sync side alone. Flagged here so future Cursor breakage has a known landing zone for the fix.

- **R3 — Marker malformation edge cases.** If a user hand-edits an AGENTS.md to have `BEGIN` but no `END` (or vice versa, or nested), the markers.ts treats the file as having no markers (append branch). This is intentionally permissive — refusing to act would block onboarding for the rare malformed-markers case — but it does mean the user's broken markers persist alongside a new correct block. Documented in AC7 case 6; users self-resolve by removing the malformed markers.

- **R4 — In-tree diff library vs. external dependency.** `unifiedDiff` in conflict results is a line-by-line plain-text diff produced by an in-tree routine. The routine does not need to be a full Myers-diff — a simple "lines in current but not proposed / lines in proposed but not current" listing is sufficient for the wizard to render a preview. Adding a real diff library (`diff`, `jsdiff`) is a follow-up if the simple form proves unreadable in dogfooding. Builder must NOT add a diff library without escalation per drift rule 3.

- **R5 — Skill removal not mirrored.** A skill removed from `~/.echo/skills/<name>.md` is not removed from `~/.claude/commands/<name>.md`. If a future ECHO release drops a skill that becomes load-bearing-by-its-absence (e.g., a deprecated reviewer skill is removed because it causes loops), stale copies in `~/.claude/commands/` could cause user confusion. Mitigation: low likelihood in V1 (the canonical skill set is stable); revisit if it bites.

- **R6 — User hand-edits to `~/.claude/commands/*.md` are silently overwritten.** This is by design per the decision archive but is a judgment call worth surfacing to the founder. If users routinely hand-tune skill prompts (e.g., to add their preferred verbosity), V1's "fully ECHO-owned" posture is wrong and these files should also use the marker-merge strategy. The spec ships the decision-archive posture; the judgment call is flagged here for the founder to confirm or override before AC4 is implemented. (See "Judgment calls" in the agent_notes when this lands in pending_review.)

## Tests

All test files are listed in `files_to_modify`. Coverage targets:

- `markers.ts` — 6 cases pinning append / replace / noop / conflict / outside-preservation / malformed-markers.
- `codex-config.ts` — 6 cases pinning add / update / noop / conflict / missing-file / sibling-table-preservation.
- `cursor-config.ts` — 5 cases mirroring + 1 sibling-entry-preservation.
- `skill-sync.ts` — 4 cases pinning create-target-dir / idempotent-overwrite / stale-file-preservation / hand-edit-overwrite.
- `role-sync.ts` — 4 cases pinning first-install-copy / noop / user-modified-refusal / source-missing.
- `adapter-sync.ts` — 3 cases pinning all-ok / partial-failure / user-modified-role-and-overallOk-semantics.

Verify commands (root only — no Raycast package edits in this spec):

- `npm test -- tests/echo-home/`
- `npm test`
- `npm run lint`
- `npm run typecheck`

All four must pass before the builder moves 072 to `pending_review/`.

## Definition of Done

- AC1: `markers.ts` exports `mergeWithMarkers` with the four-action contract; idempotent re-run produces `'noop'`; user content outside markers preserved byte-for-byte.
- AC2: `codex-config.ts` exports `syncCodexMcpBlock` with the five-action contract (add/update/noop/conflict/missing-file); TOML library choice verified against founder's real config; sibling tables + comments preserved.
- AC3: `cursor-config.ts` exports `syncCursorMcpEntry` with the same five-action contract; sibling `mcpServers.*` entries preserved.
- AC4: `skill-sync.ts` exports `syncClaudeSkills`; target dir created if missing; all skills copied (overwrite posture); stale target files left in place.
- AC5: `role-sync.ts` exports `syncDefaultRoles`; first-install copies defaults; user-modified roles refused; source-missing sentinel returned.
- AC6: `adapter-sync.ts` exports `syncAll(profiles, opts)` returning `SyncResult`; per-agent dispatch wires the right adapters; partial-failure reported per-agent without rollback; roles synced once at the end.
- AC7: All test files pass. Existing tests in `tests/` (root Vitest) continue to pass.
- All four verify commands above clean.
- TOML library decision documented in `src/echo-home/adapters/codex-config.ts` header comment, including the verification result against the founder's real config.

## After Completion (Strategist Notes)

- **Wiki page candidate (post-shipment, contingent on 073 + 074 also shipping):** `wiki/architecture/coord-layer.md` — covers the `~/.echo/` layout + adapter sync engine + role definition format together. Do not write the page on 072's merge alone; wait for at least 073 to land so the architecture page has a real entrypoint surface to describe.
- **Update `wiki/architecture/system-architecture.md`** with one paragraph after 072 + 073 + 074 all land: "ECHO Pro extends the substrate with a coord layer in `~/.echo/`; the adapter sync engine wires each onboarded agent's MCP + instruction-file + skill set via merge-with-markers (markdown) / key-targeted mutation (TOML/JSON) / overwrite (ECHO-fully-owned files). Conflict detection prevents silent clobber of user edits." Until 073 lands, this paragraph would describe vapor; defer.
- **`backlog/_followups.md` annotations on landing:**
  - "Stale skill file pruning in `~/.claude/commands/`" (Out of Scope §3 — V1.5+ if dogfooding shows confusion)
  - "Backup-on-write for adapter sync" (Out of Scope §6 — V1.5+ if in-place writes feel risky)
  - "Diff library for richer conflict previews" (R4 — V1.5+ if simple form is unreadable)
  - "Cursor MCP config path drift detection" (R2 — bind to 073's probe step rather than the sync engine if it ever becomes an issue)
- **Judgment-call follow-up to founder:** Confirm or override the "Claude Code commands are fully ECHO-owned" posture (R6 + design archive line 53). If overridden, `skill-sync.ts` switches to using `markers.ts` per file — which means each skill file gains its own BEGIN/END markers around the ECHO-owned content. Spec the migration separately if so.
- **Trigger for `assets/echo-roles/` path canonicalization:** if 071 picks a different in-repo path for default role TOMLs, update this spec's `spec_refs` and AC5's `sourceDir` default. The current assumption (`assets/echo-roles/`) is provisional.
