---
id: 2026-05-25-072-adapter-sync-engine
title: "Adapter sync engine — merge-with-markers markdown + TOML/JSON mutators + skill/role copy + orchestrating syncAll(); conflict-detecting and idempotent"
status: ready
priority: HIGH
estimate: 1-2d
created: 2026-05-25
blocked_by:
  - 2026-05-25-070-echo-global-home-scaffold
  - 2026-05-25-071-role-definition-format-and-defaults
task_state_ref: 2026-05-25-072-adapter-sync-engine
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/echo-home/adapter-sync.ts  # AC6 — new file; orchestrating syncAll(profile) + SyncResult shape; calls into the per-adapter modules below
  - src/echo-home/adapters/markers.ts  # AC1 — new file; merge-with-markers algorithm for AGENTS.md / CLAUDE.md (BEGIN/END markers, conflict detection, idempotent)
  - src/echo-home/adapters/codex-config.ts  # AC2 — new file; TOML mutator for ~/.codex/config.toml (target [mcp_servers.echo] only, preserve everything else)
  - src/echo-home/adapters/cursor-config.ts  # AC3 — new file; JSON mutator for ~/.cursor/mcp.json (target mcpServers.echo only)
  - src/echo-home/adapters/skill-sync.ts  # AC4 — new file; copies ~/.echo/skills/<name>.md → ~/.claude/commands/<name>.md (ECHO-owned, overwritten on re-sync). Also exports populateEchoSkills() which copies the in-repo skills/ source-of-truth into ~/.echo/skills/ — called by syncAll before agent dispatch.
  - src/echo-home/adapters/role-sync.ts  # AC5 — new file; copies default role TOMLs from assets/echo-roles/ to ~/.echo/roles/ on first install; refuses to overwrite user edits
  - src/echo-home/adapters/atomic-write.ts  # AC7 — new file; unique-tmp + mode-preserving atomic write helper; ALL adapters use this (no per-adapter inline writeFile+rename)
  - tests/echo-home/adapters/atomic-write.test.ts  # AC9 — new file; pins unique-tmp suffix shape, mode preservation on existing file, 0600 for new secret-sensitive paths, umask default for non-sensitive paths, concurrent-overlap (two parallel calls do not stomp each other)
  - package.json  # adds smol-toml dep (per AC2 byte-range editor primary path)
  - tests/echo-home/adapters/markers.test.ts  # AC9 — new file; pins append, replace (idempotent), preserve-outside, conflict-on-inside-edit
  - tests/echo-home/adapters/codex-config.test.ts  # AC9 — new file; pins add, update, no-op-on-no-change, conflict, comment/formatting preservation
  - tests/echo-home/adapters/cursor-config.test.ts  # AC9 — new file; pins add, update, no-op-on-no-change, other keys preserved
  - tests/echo-home/adapters/skill-sync.test.ts  # AC9 — new file; pins overwrite-on-resync, missing-target-dir-created, skill-removal-from-source NOT mirrored (V1 leaves stale files; see Out of Scope §3)
  - tests/echo-home/adapters/role-sync.test.ts  # AC9 — new file; pins first-install copy, user-edit refusal, missing-source-default skip
  - tests/echo-home/adapter-sync.test.ts  # AC9 — new file; pins syncAll partial-failure (some agents ok, some return conflict), result shape, per-agent isolation
spec_refs:
  - tools/sync-skills.sh  # prior art for skill-file sync (Claude Code real-file copy posture); 072 ports this logic into TypeScript and runs it twice: once to populate ~/.echo/skills/ from the in-repo skills/, then again to fan out from ~/.echo/skills/ to per-user ~/.claude/commands/
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # design archive — merge-strategy table at lines 50-55; rationale at lines 56-57
  - ~/.codex/config.toml  # canonical shape of the codex config file the TOML mutator targets; specifically the [mcp_servers.echo] block at the end of the user's existing file
  - ~/.cursor/mcp.json  # canonical shape of cursor's MCP config (mcpServers.{name} keys with url + headers, or command + args + env for stdio servers)
  - backlog/{ready,pending_review,complete}/2026-05-25-070-echo-global-home-scaffold.md  # 070 defines the ~/.echo/ directory layout this spec writes into, and exports ECHO_HOME_PATHS + OnboardedAgentProfile. STAGE-STABLE: 072 is blocked on 070, so by claim time 070 will be in complete/. Builder reads via filename lookup across the three stage directories.
  - backlog/{ready,pending_review,complete}/2026-05-25-071-role-definition-format-and-defaults.md  # 071 defines the role TOML schema, exports DEFAULT_ROLE_FILENAMES (consumed by AC5/AC6), and ships the canonical asset path that role-sync copies from. STAGE-STABLE: 072 is blocked on 071, so by claim time 071 will be in complete/. Builder reads via filename lookup across the three stage directories.
  - .claude/commands/  # current adapter target for skills (real-file copies); 072 generalizes this to per-user ~/.claude/commands/ at runtime
  - src/echo-home/  # 070's home for this module family — 070 ships paths.ts + scaffold.ts; 071 adds roles.ts + index.ts; 072 adds adapter-sync.ts + adapters/*.ts (no shared types.ts — each module defines its own DTOs)

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

072 is that engine. It is purely mechanics — no UX, no agent detection, no decision-making about *which* agents to wire. It takes a list of `AdapterSyncProfile`s as input and returns a `SyncResult` describing per-agent outcomes.

The decision-archive merge-strategy table at lines 50-55 of the design archive is the spec for what each adapter must do. This file is the implementation contract.

**Implementation dependency on other items:** this spec is `blocked_by` 070 and 071 in the frontmatter — the deterministic selector will not hand 072 to a builder until both are in `complete/`. The code in this spec writes into `~/.echo/` paths (070's `ECHO_HOME_PATHS`), copies role TOMLs from 071's `assets/echo-roles/` location, and imports `DEFAULT_ROLE_FILENAMES` from 071's `src/echo-home/roles.ts`. If for any reason a builder finds this spec in `claimed/` before 070 + 071 are in `complete/`, STOP and escalate via `pending_review/` rather than guessing the schemas.

**Naming discipline — `AdapterSyncProfile` not `AgentProfile`.** 070 exports `OnboardedAgentProfile` (a persistent record of which agents were detected + wired during onboarding, written into `~/.echo/state/onboarding.json`). 072 exports `AdapterSyncProfile` (a transient per-call DTO passed into `syncAll`). Both live under `src/echo-home/`; the deliberately distinct names prevent a future barrel-export collision and make it obvious to a reader which one a function consumes.

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
- **Append branch (markers absent in current file):** the file is read; if it does not contain `BEGIN_MARKER`, the function appends `\n` + `BEGIN_MARKER` + `\n` + `echoSection` + `\n` + `END_MARKER` + `\n` to the existing content and writes the result via the unique-tmp atomic-write pattern in AC7 (do NOT use a fixed `<filePath>.tmp` — see AC7 for the per-call temp path + mode-preservation rules). If the file does not exist, it is created with just the ECHO section + markers (no leading newline). Returns `{ action: 'append', filePath }`.
- **Replace branch (markers present, content inside equals `previousEchoSection`):** the inside-markers content is replaced with `echoSection`. Everything outside the markers is preserved byte-for-byte. Atomic write. Returns `{ action: 'replace', filePath }`. If `previousEchoSection` is omitted, this branch is unreachable — see Conflict branch.
- **No-op branch (markers present, content inside equals `echoSection`):** the file is not written. Returns `{ action: 'noop', filePath }`. This is what makes re-running idempotent.
- **Conflict branch (markers present, content inside differs from BOTH `previousEchoSection` AND `echoSection`):** the function does **not** write. Returns `{ action: 'conflict', filePath, conflict: { currentInside: string, expectedInside: string, proposedInside: string, unifiedDiff: string } }`. The `unifiedDiff` is a plain-text diff between `currentInside` and `proposedInside` produced by a small in-tree diff routine (no external library dependency for this — line-by-line is sufficient; see R4).
- **Idempotency requirement.** Calling `mergeWithMarkers` twice in a row with identical inputs produces: first call → `action: 'replace'` (or `'append'` on a fresh file), second call → `action: 'noop'`. Pinned by AC9's markers.test.ts.
- The function never reads or writes any file other than `filePath` and the per-call unique temp path (see AC7). No backup files in V1 (see Out of Scope §6).

### AC2 — `src/echo-home/adapters/codex-config.ts` implements TOML mutator for `~/.codex/config.toml`

- Exports `syncCodexMcpBlock(opts: { filePath: string; serverConfig: { url: string; enabled?: boolean; [k: string]: unknown }; previousServerConfig?: Record<string, unknown> }): TomlMutatorResult`.
- Targets exactly the `[mcp_servers.echo]` table. All other tables (`[mcp_servers.<otherName>]`, `[projects.*]`, top-level keys like `model`, `personality`) are preserved **byte-for-byte** including comments, blank lines, and table order.
- **TOML strategy — key-targeted byte-range editor (primary path).** Codex r1 review (2026-05-25) verified that `smol-toml@1.6.1` does NOT preserve comments through parse/stringify — it round-trips as a value-only parser. Therefore comment-preserving parse-and-restringify is infeasible with any TOML library currently in the dependency surface. The implementation uses string-range surgery with an explicit unwrap/render contract:
  1. **Slice identification.** Scan the file's bytes line-by-line to locate the `[mcp_servers.echo]` table header line and the byte offset of the NEXT table header line (or EOF if none follows). The byte range `[headerLineStart, nextHeaderLineStart)` is the "target slice" — it includes the header line itself plus all subsequent lines until (but not including) the next table.
  2. **Comparison unwrap.** Parse the target slice with `smol-toml` into a plain JS object. The result has the shape `{ mcp_servers: { echo: { ...innerKeys } } }`. **Compare against `previousServerConfig` / `serverConfig` using the unwrapped inner object: `parsed.mcp_servers.echo`.** This is the value-equality check that drives noop/update/conflict branching. (The wrap exists because `smol-toml` parses table headers into the corresponding nested-object path; do NOT compare the wrapped form.)
  3. **Render contract for add/update.** Emit the new slice as the literal string `'[mcp_servers.echo]\n' + renderInlineKeys(serverConfig) + '\n'`, where `renderInlineKeys` produces one `<key> = <smol-toml-stringified-value>` line per top-level key of `serverConfig`. Splice this rendered slice into the original byte stream at the target range; everything outside the slice is preserved verbatim, byte-for-byte. **Critical: the table header `[mcp_servers.echo]` MUST appear in the rendered output.** Stringifying `serverConfig` alone via `smol-toml.stringify()` would produce top-level `url = "..."` keys without the header — that breaks the file. AC9 codex-config case 2 asserts the header line is present post-update.
  4. **Missing target slice (add branch).** When no `[mcp_servers.echo]` header is found, the target range is `[EOF, EOF)` (empty); the rendered slice is prefixed with `\n\n` if the file does not already end with a blank line.
  5. **No-op / conflict branches.** No write occurs and the rest of the file is never touched.
- This means the parser is used as a value-comparator on a tiny scoped slice, not as a whole-file document model. The "lossy parser preserves outside region" guarantee comes from byte-range surgery, not the parser. No external dependency beyond `smol-toml` (pure-JS, ESM-native, ~25kB; already chosen by 071 for its own loader).
- **Add branch:** file exists but no `[mcp_servers.echo]` table → append the table at the end of the file (after a trailing blank line if not already present). Atomic write via AC7's unique-tmp pattern, preserving the existing file mode. Returns `{ action: 'add' }`.
- **Update branch:** table exists, current contents match `previousServerConfig` (key-by-key deep equal of the parsed slice) → replace the byte slice covering the target table with the new stringified table. AC7 atomic write + mode preservation. Returns `{ action: 'update' }`.
- **No-op branch:** table exists, contents already match `serverConfig` → no write. Returns `{ action: 'noop' }`. (Idempotency.)
- **Conflict branch:** table exists, contents match neither `previousServerConfig` nor `serverConfig` → no write. Returns `{ action: 'conflict', conflict: { currentValue, expectedValue, proposedValue, unifiedDiff } }`. **Conflict payloads may carry secret-bearing fields (e.g. an `Authorization` header in a future serverConfig); 072 does NOT redact them — see AC8 (caller redaction contract).**
- **Missing file:** if `filePath` does not exist, the function creates it with just the target table, mode `0600` (see AC7 mode rules). Returns `{ action: 'add' }`. (Onboarding-first-run case where the user has never run codex.)
- The function does NOT touch any other `[mcp_servers.<name>]` table even when one happens to share fields with echo's. The byte-range editor guarantees this structurally.
- **Adapter-to-atomicWrite contract:** every call from `syncCodexMcpBlock` to `atomicWrite` MUST pass `secretSensitive: true` (regardless of whether `filePath` is the real `~/.codex/config.toml` or a test-injected tmpdir path). The adapter knows its file class; the helper should not have to infer it. This guarantees codex config gets `0600` even when 073 / 074 / tests pass a non-allowlisted absolute path (the AC7 allowlist is for the missing-file branch when the caller hasn't already declared the class).

### AC3 — `src/echo-home/adapters/cursor-config.ts` implements JSON mutator for `~/.cursor/mcp.json`

- Exports `syncCursorMcpEntry(opts: { filePath: string; serverConfig: { url: string; headers?: Record<string, string>; [k: string]: unknown }; previousServerConfig?: Record<string, unknown> }): JsonMutatorResult`.
- Targets exactly `mcpServers.echo` (nested object). All other entries in `mcpServers.*` and any sibling top-level keys are preserved.
- Path is `~/.cursor/mcp.json` on macOS (verified against founder's machine — file exists with this exact shape: `{ "mcpServers": { "dart": {...}, "supabase": {...}, "echo": {...} } }`). Document at the top of the file: "Cursor does not yet publish a stable contract for the per-user MCP config path. If Cursor renames or relocates this file in a future release, the cursor-config adapter must be updated." See R2.
- **Add / Update / No-op / Conflict branches** mirror AC2's TOML branches: same semantics, same return shape. Conflict payloads may carry secret-bearing fields (`headers.Authorization`, bearer tokens, etc.); 072 does NOT redact — see AC8.
- **Formatting preservation:** parse with `JSON.parse`, mutate the target subtree, write back with `JSON.stringify(obj, null, 2) + '\n'`. Existing whitespace exotica (tabs, trailing commas — which JSON.parse rejects anyway) is not preserved; this is a known tradeoff because no widely-used JSON-with-comments parser is in the project's dependency surface. Add a one-line note in the file's header comment block of `cursor-config.ts` documenting the tradeoff.
- **All writes** use AC7's unique-tmp atomic-write pattern with mode preservation. Existing `~/.cursor/mcp.json` files often start at `0600` because Cursor writes auth headers; downgrading to `0644` on update would be a security regression.
- **Missing file:** create with `{ "mcpServers": { "echo": <serverConfig> } }`, mode `0600`. Returns `{ action: 'add' }`.
- **Adapter-to-atomicWrite contract:** every call from `syncCursorMcpEntry` to `atomicWrite` MUST pass `secretSensitive: true` (mirrors AC2's contract — cursor mcp.json frequently contains auth headers; the adapter knows its file class).

### AC4 — `src/echo-home/adapters/skill-sync.ts` populates `~/.echo/skills/` from the repo, then fans out to Claude Code's per-user commands directory

The skill library has two hops: in-repo `skills/*.md` (the source of truth, vendor-neutral, committed) → `~/.echo/skills/*.md` (per-user canonical copy, daemon-readable) → `~/.claude/commands/*.md` (per-vendor adapter copy, real-file because Claude Code does not read from `~/.echo/`). 072 owns both hops. 070 creates `~/.echo/skills/` empty; nothing else populates it.

**AC4.1 — `populateEchoSkills(opts: { sourceDir: string; targetDir: string }): SkillSyncResult`.** First-hop copy.

- `sourceDir` is the in-repo `<repo>/skills/` (the call site resolves the repo root — `syncAll` uses the same resolution as 071's role-asset path; see AC6).
- `targetDir` is canonically `ECHO_HOME_PATHS.skills` (= `~/.echo/skills/`).
- Reads all `*.md` files from `sourceDir`. For each, copies to `targetDir/<name>.md`. Existing files at the target are overwritten unconditionally — `~/.echo/skills/` is ECHO-fully-owned per the decision-archive merge-strategy table (same posture as the second-hop copy in AC4.2).
- Creates `targetDir` if it does not exist (`mkdir -p` equivalent — defensive; 070's `ensureEchoHome()` already created it).
- Returns `{ copied: string[], skipped: string[], targetDir }` matching AC4.2's return shape.
- Stale files in `targetDir` not present in `sourceDir` are LEFT IN PLACE (same posture as AC4.2; see Out of Scope §3).

**AC4.2 — `syncClaudeSkills(opts: { sourceDir: string; targetDir: string }): SkillSyncResult`.** Second-hop copy.

- `sourceDir` is canonically `ECHO_HOME_PATHS.skills` (= `~/.echo/skills/`).
- `targetDir` is canonically `~/.claude/commands/`.
- For each `*.md` in `sourceDir`, copies to `targetDir/<name>.md`. Existing files at the target are overwritten unconditionally — these are ECHO-owned per the decision-archive merge-strategy table.
- Creates `targetDir` if it does not exist (`mkdir -p` equivalent).
- Returns `{ copied: string[], skipped: string[], targetDir }` where `copied` is filenames written and `skipped` is empty in V1 (placeholder for future "user hand-edited, refuse" mode behind a flag).
- **Skills present in `targetDir` but not in `sourceDir` are LEFT IN PLACE in V1.** Stale skill files from prior ECHO versions or other tooling do not cause a removal. This is a deliberate non-feature; document at the top of `skill-sync.ts`. Removal becomes a follow-up spec if dogfooding shows stale skills cause confusion. See Out of Scope §3.
- The function never reads or writes outside `sourceDir` and `targetDir`.
- **Idempotency:** because targets are ECHO-owned and overwritten on every run, the second run produces byte-identical files. The function does not skip on identical-content; the overwrite is cheap. (Different posture from AC1's `noop`-branch optimization because skill files have no conflict-detection cost to amortize.)

Both functions share the same return shape and same overwrite posture; the only difference is which source-target pair they connect.

### AC5 — `src/echo-home/adapters/role-sync.ts` copies default role TOMLs on first install

- Exports `syncDefaultRoles(opts: { sourceDir: string; targetDir: string; defaults: readonly string[] }): RoleSyncResult`.
- `defaults` is the list of role filenames to copy. The caller passes it in; this engine does NOT hardcode the list. The canonical value is `DEFAULT_ROLE_FILENAMES` exported by 071's `src/echo-home/roles.ts`; `syncAll` (AC6) imports that constant and forwards it as the default. If a future spec adds a 4th role TOML to `assets/echo-roles/`, updating `DEFAULT_ROLE_FILENAMES` in 071 is sufficient — 072 picks it up automatically.
- `sourceDir` is the in-repo canonical path where 071 ships the default role TOMLs: `<repo>/assets/echo-roles/`. The caller resolves the repo root (see AC6's repo-root resolution note); this engine does not own that constant.
- `targetDir` is canonically `ECHO_HOME_PATHS.roles` (= `~/.echo/roles/`).
- **Note on `skillsRoot` handoff for downstream consumers.** When 073/074 later call `loadRolesFromDir(ECHO_HOME_PATHS.roles)` (071's loader), they MUST pass `skillsRoot: ECHO_HOME_PATHS.skills`. Reason: after `populateEchoSkills` (AC4.1) runs, `~/.echo/skills/` is the canonical user-machine skill location; the loader's default "walk-upward to `<repo>/skills/`" behavior does not work from `~/.echo/roles/`. This is documented here because 072 is the first spec that materializes `~/.echo/roles/`; 073/074 inherit the convention.
- For each role in `defaults`:
  - If `targetDir/<role>` does not exist → copy from `sourceDir/<role>`. Returns `{ role, action: 'copied' }`.
  - If `targetDir/<role>` exists and content is byte-identical to `sourceDir/<role>` → no write. Returns `{ role, action: 'noop' }` (idempotent re-run).
  - If `targetDir/<role>` exists and content differs → **do not overwrite**. Returns `{ role, action: 'user-modified', conflict: { filePath, sourceBytes, userBytes } }`. The user owns the file after first install; their edits win permanently. The caller surfaces the result; the engine never overwrites. To reset, the user `rm`s the file and re-runs sync.
  - If `sourceDir/<role>` does not exist → `{ role, action: 'source-missing' }`. (Defensive — 071 should ship all three; this branch is a sentinel for an upstream bug.)
- Aggregate return: `{ results: RolePerFileResult[] }`.

### AC6 — `src/echo-home/adapter-sync.ts` orchestrates per-agent sync via `syncAll(profiles)`

- Exports `syncAll(profiles: AdapterSyncProfile[], opts?: SyncAllOpts): Promise<SyncResult>`.
- `AdapterSyncProfile`, `SyncAllOpts`, `SyncResult`, `SyncConflict` are all defined inline in `src/echo-home/adapter-sync.ts` (no shared `src/echo-home/types.ts`). `AdapterSyncProfile` is deliberately named to NOT collide with 070's `OnboardedAgentProfile` (the persistent onboarding-state record); they describe different things.
  ```ts
  type AgentKind = 'codex' | 'claude-code' | 'cursor';
  interface AdapterSyncProfile {
    kind: AgentKind;
    // Adapter paths — caller-provided for testability; if `paths` itself is OMITTED, each adapter
    // resolves the per-agent default below. If `paths` is provided but a specific field is omitted,
    // the same per-agent default applies for THAT field (mix-and-match supported for test ergonomics).
    paths?: {
      configFile?: string;        // codex default: path.resolve(os.homedir(), '.codex/config.toml'); cursor default: path.resolve(os.homedir(), '.cursor/mcp.json'); claude-code: unused
      instructionsFile?: string;  // codex default: path.resolve(os.homedir(), '.codex/AGENTS.md'); claude-code default: path.resolve(os.homedir(), '.claude/CLAUDE.md'); cursor: unused
      commandsDir?: string;       // claude-code default: path.resolve(os.homedir(), '.claude/commands/'); codex + cursor: unused
    };
    // What ECHO section content to merge into the instructions file (per-agent rendered upstream)
    echoSection?: string;
    previousEchoSection?: string;  // last-known ECHO write, for conflict detection (caller-owned persistence — see "previous* persistence" note below)
    // What MCP server config to wire (URL is the daemon endpoint)
    mcpServerConfig?: { url: string; [k: string]: unknown };
    previousMcpServerConfig?: Record<string, unknown>;  // caller-owned persistence (see below)
  }
  interface SyncAllOpts {
    echoMcpUrl?: string;
    repoRoot?: string;              // resolves repoSkillsDir + rolesSourceDir below; defaults to walk-upward from import.meta.url
    repoSkillsDir?: string;         // default <repoRoot>/skills/   — source for populateEchoSkills (AC4.1)
    rolesSourceDir?: string;        // default <repoRoot>/assets/echo-roles/ — source for syncDefaultRoles (AC5)
    defaultRoles?: readonly string[];  // default = DEFAULT_ROLE_FILENAMES imported from src/echo-home/roles.ts (071); do NOT hardcode the list in this module
    allowUserModifiedRoles?: boolean;  // default false; if true, user-modified roles in ~/.echo/roles/ do not flip overallOk to false
  }
  ```
- **Repo-root resolution.** `syncAll` resolves `repoRoot` by walking upward from `import.meta.url` until a directory containing `package.json` AND a `skills/` directory is found (same convention as 071's role-loader). This is how the engine locates both the in-repo `skills/` source (for AC4.1) and the in-repo `assets/echo-roles/` source (for AC5). 072 does NOT depend on any helper from 070 for this; the resolution is local to `adapter-sync.ts`.
- **`previous*` persistence is caller-owned.** The conflict-detection model needs the last ECHO-rendered `echoSection` / `serverConfig` to distinguish an ECHO version-bump from a user hand-edit (per parent design merge-strategy table). 072 does NOT persist these values. Persistence of last-known wiring belongs to the caller (073's wizard + 074's CLI), which will use `~/.echo/adapters/` (the directory 070 reserves for this purpose; 073 writes; 074 reads on subsequent re-sync). 072 ships pure mechanics: the caller passes `previous*` in if it has them; if absent, the conflict branch is unreachable and the adapter falls through to the append/add branch on first install or the noop branch on identical bytes. This is the explicit deferral codex r1 asked for — `~/.echo/adapters/` is NOT 072's responsibility, and the call-graph is unambiguous: 073 reads → calls 072 → writes back → 073 caches.
- **Execution order inside `syncAll`** (deterministic, single-process):
  1. `populateEchoSkills({ sourceDir: <repoRoot>/skills, targetDir: ECHO_HOME_PATHS.skills })` — runs ONCE before any agent dispatch. This is the load-bearing fix for the "nothing populates `~/.echo/skills/`" gap: it must happen before `syncClaudeSkills` so the second-hop copy has bytes to read. The function does NOT throw; failure is captured into the `skillsPopulated` field. **If `skillsPopulated.ok === false`**, the engine SKIPS the claude-code second-hop copy (`syncClaudeSkills`) but still runs the markers merge for the claude-code instructions file (CLAUDE.md is safe to update even when skill copy fails). All other agent kinds dispatch normally. `overallOk` becomes `false`.
  2. For each profile, dispatch on `kind`:
     - `codex` → `markers.mergeWithMarkers` for `instructionsFile`, `codex-config.syncCodexMcpBlock` for `configFile`.
     - `claude-code` → `markers.mergeWithMarkers` for `instructionsFile`, `skill-sync.syncClaudeSkills` for `commandsDir` (sourceDir = `ECHO_HOME_PATHS.skills`) — **skipped if `skillsPopulated.ok === false`**.
     - `cursor` → `cursor-config.syncCursorMcpEntry` for `configFile`.
  3. After per-agent dispatch, call `role-sync.syncDefaultRoles` ONCE (roles are global to `~/.echo/`, not per-agent). Pass `sourceDir = opts.rolesSourceDir`, `targetDir = ECHO_HOME_PATHS.roles`, `defaults = opts.defaultRoles ?? DEFAULT_ROLE_FILENAMES` (imported from 071).
- Aggregate into `SyncResult`:
  ```ts
  type SkillsPopulatedResult =
    | (SkillSyncResult & { ok: true })
    | { ok: false; sourceDir: string; targetDir: string; error: string };

  interface AdapterError {
    code: 'EACCES' | 'ENOSPC' | 'ENOTDIR' | 'ENOENT' | 'EISDIR' | 'PARSE_ERROR' | 'RETRY_CONFLICT' | 'UNKNOWN';
    file: string;                 // path the adapter was working on when it failed
    operation: 'read' | 'parse' | 'write' | 'rename' | 'stat';
    message: string;              // human-readable; safe to render (does NOT echo file contents — see AC8)
  }

  interface SyncResult {
    skillsPopulated: SkillsPopulatedResult;  // first-hop populate; failure does NOT throw and DOES flip overallOk
    agents: Array<
      | { agent: AgentKind; ok: true; files_written: string[]; actions: Array<{ file: string; action: string }>; skipped?: string[] }
      | { agent: AgentKind; ok: false; conflicts: SyncConflict[]; errors: AdapterError[]; files_written: string[]; skipped?: string[] }
    >;
    roles: RoleSyncResult;
    syncLock?: AdapterError;  // populated ONLY when lock acquisition failed (timeout or corruption). When set, agents/roles run did not happen and `overallOk` is false. See "lock-timeout result shape" below.
    overallOk: boolean;  // true iff syncLock is absent AND skillsPopulated.ok === true AND every agent.ok === true AND no role result is 'user-modified' (unless opts.allowUserModifiedRoles)
  }
  ```
  - When the claude-code fan-out is skipped due to populate failure, the claude-code agent entry sets `skipped: ['syncClaudeSkills']` and remains `ok: true` for the parts that did run (markers merge). `overallOk` is still `false` because `skillsPopulated.ok === false` already flipped it.
  - **No exception escapes `syncAll`.** Every per-profile call is wrapped in try/catch. Filesystem errors (`EACCES`, `ENOSPC`, `ENOTDIR`, `ENOENT`, `EISDIR`), parse errors (malformed `~/.cursor/mcp.json`, malformed `~/.codex/config.toml`), and lost-update conflicts (`RETRY_CONFLICT` — see "concurrency" below) are caught and converted into `AdapterError` entries on the failing agent. The agent is then `ok: false` with the relevant `errors[]`. **Earlier agents in the loop that succeeded keep their writes**; no transactional rollback. The wizard/CLI sees a complete `SyncResult` describing exactly which agents succeeded and which need retry. `AdapterError.message` is human-readable but never includes serverConfig values, instruction-file content, or any other potentially-secret bytes (AC8 contract).
- **Partial-failure is normal**, not a failure of `syncAll`. If codex returns a conflict on `~/.codex/config.toml` but cursor and claude-code both succeed, the result reports two `ok: true` agents and one `ok: false` agent. The caller (wizard / CLI) decides whether to proceed, retry, or abort.
- **No transactional rollback.** Files that were written successfully stay written even if a later agent in the loop fails. This is acceptable because each file write is itself atomic (AC7 unique-tmp + rename) and conflict-detecting; a half-applied run is recoverable by re-running after the conflict is resolved.
- **Concurrency: per-user advisory lock.** Per codex-ops r2 M2 (lost-update race between overlapping `syncAll` invocations): `syncAll` acquires an advisory lock at `path.join(ECHO_HOME_PATHS.state, 'adapter-sync.lock')` at entry and releases it at exit. Mechanism uses the `tmp-write-then-link` atomic-metadata pattern (per codex-ops r3 M1 — protects against crash between `openSync` and metadata write):
  1. Write `{pid: process.pid, hostname: os.hostname(), started_at: new Date().toISOString()}` JSON to `<lockPath>.<pid>.<randomUuid8>.tmp` (a fresh temp path each acquisition attempt).
  2. Call `fs.linkSync(tempPath, lockPath)` — atomic on the same filesystem; succeeds iff `lockPath` does not exist; fails with `EEXIST` if it does.
  3. On success, unlink the temp; on `EEXIST` apply the stale-lock recovery rules below; on other errors, unlink the temp and propagate.
- **Stale-lock recovery (three independent rules; any of them removes the lock):**
  1. **Dead PID.** Parse the lockfile JSON; if `process.kill(parsedPid, 0)` returns ESRCH (PID not alive on this host) AND `hostname` matches `os.hostname()`, the lock is stale. Remove and retry.
  2. **Corrupt or empty lockfile (codex-ops r3 M1).** If `JSON.parse(lockfileBytes)` throws OR the parsed object is missing `pid`/`hostname`/`started_at` OR `lockfileBytes.length === 0`, AND `fs.statSync(lockPath).mtimeMs` is older than `corruptLockFreshnessMs` (default 5 minutes — comfortably longer than any legitimate sync should take), the lock is stale. Remove and retry. (A crash between `link` and metadata-readability is the corruption window; the 5-min freshness gate avoids removing a lock that another process just acquired but has not yet had time to be read.)
  3. **Foreign-host lock older than 1 hour.** If `hostname` does NOT match `os.hostname()` (the lock came from a different machine — possible if `~/.echo/` is on shared storage) AND mtime is older than 1 hour, treat as stale. Remove and retry. (1 hour is conservative; production-shared-home users probably do not exist in V1.)
- **Retry budget.** On `EEXIST` after stale-lock check, sleep 250ms and retry. Wall-clock budget: 30 seconds. On timeout, return `SyncResult` with `syncLock` populated (see lock-timeout result shape below).
- **Lock release.** Always `unlinkSync(lockPath)` in a `finally` block at the end of `syncAll`; additionally register `process.on('exit', () => { try { unlinkSync(lockPath); } catch {} })` for the SIGINT / unhandled-exception cases.
- **Lock-timeout result shape (codex r3 M1 — pinned in the public contract):** when lock acquisition fails (timeout, corruption-with-fresh-mtime, or foreign-host-lock-too-recent), `syncAll` returns:
  ```ts
  {
    skillsPopulated: { ok: false, sourceDir: '', targetDir: '', error: 'sync_skipped:lock_unavailable' },
    agents: [],   // empty — no agent dispatch happened
    roles: { results: [] },  // empty
    syncLock: { code: 'RETRY_CONFLICT', operation: 'stat', file: lockPath, message: <human-readable; never includes lockfile bytes> },
    overallOk: false,
  }
  ```
  The caller (074 / 073) can distinguish "lock timeout" (`result.syncLock !== undefined`) from "populate failure" (`result.syncLock === undefined && result.skillsPopulated.ok === false`) and render different UX (e.g. "another sync is in progress — try again in 30s" vs "skill source directory unreadable").
- `syncAll` is the ONLY public entrypoint; per-adapter functions are also exported for direct test use but the wizard / CLI must go through `syncAll` so cross-agent ordering + populate-skills-first + roles-once + populate-failure-blocks-fanout + per-user-lock invariants are preserved.

### AC7 — Atomic-write contract: unique temp path + file mode preservation

Every adapter that writes (markers.ts, codex-config.ts, cursor-config.ts, skill-sync.ts, role-sync.ts) MUST use the same atomic-write helper exported from `src/echo-home/adapters/atomic-write.ts` (new file shipped under AC7 — sixth file in `src/echo-home/adapters/`). The helper is a single ~40-line module; centralizing it prevents per-adapter drift.

**AC7.1 — Public surface.**

```ts
export interface AtomicWriteOpts {
  filePath: string;        // canonical target
  content: string | Buffer;
  // mode rules (see AC7.3):
  //  - if filePath already exists: ALWAYS preserve existing mode via fs.statSync(filePath).mode before write
  //  - if filePath is new and EXACT-MATCH (post path.resolve) against SECRET_SENSITIVE_ALLOWLIST, write at 0600
  //  - if opts.secretSensitive === true, write at 0600 unconditionally
  //  - otherwise new files use the umask default
  secretSensitive?: boolean;  // override the allowlist; true forces 0600 even for new files. Tests that want 0600 in a tmpdir MUST use this flag (suffix matching is not supported — see AC7.3).
}
export function atomicWrite(opts: AtomicWriteOpts): void;
```

**AC7.2 — Unique temp path.** The temp filename uses the shape `<filePath>.<process.pid>.<crypto.randomUUID().slice(0, 8)>.tmp`. This prevents the collision codex-ops r1 surfaced: two overlapping `syncAll` invocations on the same machine (e.g. a wizard retry while `echo init` is still running) writing to the same `<filePath>.tmp` and one process renaming the other's bytes onto the final path. The PID + random suffix makes the temp path per-invocation unique. After successful rename, the temp file does not exist; on caught exception the helper attempts a best-effort `unlinkSync` of the temp path.

**AC7.3 — Mode preservation rules.**

1. **Existing-file path.** Before opening the temp file, read the existing file's mode via `fs.statSync(filePath).mode`. Open the temp file with that mode (`fs.openSync(tmp, 'w', mode)`). The subsequent `rename` swaps inodes but preserves the temp file's mode bits. Result: if the existing file was `0600`, the new file is `0600`. **No silent downgrade.**

2. **Missing-file path, secret-bearing target.** If `filePath` does not exist AND `opts.secretSensitive === true` OR `filePath` is exactly equal to one of the resolved allowlist paths, create with mode `0600`. **Allowlist matching is exact equality after `path.resolve(filePath)`** (NOT suffix matching — per codex r2 M2, suffix matching has divergent security semantics for tmpdir paths). The allowlist values are computed at module load:
   ```ts
   const SECRET_SENSITIVE_ALLOWLIST: readonly string[] = [
     path.resolve(os.homedir(), '.codex/config.toml'),
     path.resolve(os.homedir(), '.cursor/mcp.json'),
   ];
   ```
   Tests that write to tmpdir paths and want `0600` MUST pass `secretSensitive: true` explicitly. Tests that exercise the allowlist itself MUST monkey-patch `os.homedir()` (via `vi.spyOn(os, 'homedir')` then `vi.resetModules()` to force re-eval) before importing `atomic-write.ts`. Both files can contain `Authorization` headers, bearer tokens, or auth env-strings — hence the `0600` default for new creates.

3. **Missing-file path, non-secret target.** AGENTS.md, CLAUDE.md, skills, role TOMLs — use the umask default (typically `0644`). These files are intended to be world-readable instructions; forcing `0600` would break editor file-watchers and feels needlessly opaque.

**AC7.4 — Refactor instruction.** Each adapter ships with its AC1–AC5 contract phrasing referencing "atomic write" — those calls go through `atomicWrite()`, NOT through a per-adapter inline `writeFile + rename`. The header comments of each adapter file note this delegation.

### AC8 — Conflict-payload secret-redaction contract is caller-owned

Per codex-ops r1: `cursor-config.ts` and `codex-config.ts` conflict payloads can carry secret-bearing fields (`headers.Authorization`, bearer tokens, future env-pinned secrets). 072 deliberately does **NOT** redact these values — redaction belongs at the render boundary, not in the engine, because:

- The engine has no general way to identify what's secret in arbitrary user-extensible `serverConfig` shapes (today: `url`, `headers`; tomorrow: who knows).
- Different callers want different rendering: a CLI may want partial display ("[REDACTED bearer token]"), a log line may want fully omitted, an `echo doctor` output may want a hash for fingerprinting.
- Redacting at the engine layer would force callers to opt-OUT of safety, which is the wrong default.

**AC8.1 — Contract.** The `SyncConflict` interface includes a deliberate comment:

```ts
interface SyncConflict {
  filePath: string;
  // currentValue/expectedValue/proposedValue MAY contain user-bearing secrets
  // (e.g. Authorization headers in mcpServers.echo). Callers MUST redact before
  // rendering to terminal output, log lines, or any external surface. See
  // 074's render-conflicts module for the canonical redaction pattern.
  currentValue?: unknown;
  expectedValue?: unknown;
  proposedValue?: unknown;
  unifiedDiff?: string;
}
```

**AC8.2 — Drift catch.** No code in 072 ever writes a conflict-payload value to a logger, `console.log`, or any output stream. The only place such values appear is in the returned `SyncResult`. AC9 includes one negative test that grep-scans the built adapter bundle for `console.` calls inside the adapter source — if any appear, the test fails. (Defensive: prevents a future patch from "helpfully" logging conflict details.)

**AC8.3 — Followup pointer.** The on-completion strategist note files a follow-up in `backlog/_followups.md` to require 074 to ship `redactConflictPayload(conflict): SyncConflict` before any user-facing render. 072 documents the requirement; 074 implements it.

### AC9 — Tests pin the contract

Each adapter has its own test file; the orchestrator has one integration test. All tests use temp directories (`fs.mkdtemp(os.tmpdir() + '/echo-072-')`) — no test reads or writes the founder's real `~/.codex/`, `~/.claude/`, or `~/.cursor/`.

- `tests/echo-home/adapters/markers.test.ts` — six cases:
  1. Fresh file → `action: 'append'`, file ends with `BEGIN…END` block and the ECHO section between.
  2. File with markers + matching `previousEchoSection`, new `echoSection` differs → `action: 'replace'`; content outside markers byte-identical to before.
  3. File with markers + matching `echoSection` (idempotent re-run) → `action: 'noop'`, file mtime unchanged (or at minimum: file content byte-identical).
  4. File with markers but inside-content differs from BOTH previous and new → `action: 'conflict'`, no write, conflict object has `currentInside`, `expectedInside`, `proposedInside`, and a non-empty `unifiedDiff`.
  5. File with user content above and below the markers → after a replace, the above/below content is byte-identical (preservation invariant).
  6. Marker present but malformed (e.g., `BEGIN` without matching `END`) → treated as no-markers-present (append branch). Pins R3.

- `tests/echo-home/adapters/codex-config.test.ts` — seven cases:
  1. File has no `[mcp_servers.echo]` → `action: 'add'`; file now contains the table; all other tables byte-identical.
  2. Existing `[mcp_servers.echo]` matches `previousServerConfig`, new `serverConfig` differs → `action: 'update'`; only that table changes; other tables AND inline comments preserved byte-for-byte (the test fixture must include a `[projects.X]` table and at least one inline `# comment` to validate the preservation claim against the byte-range editor — this is the regression pin for codex r1 H1). **Additionally assert the post-update file STILL contains the literal line `[mcp_servers.echo]` as its target table header (pins codex r3 H1 — guards against a literal implementation that stringifies only `serverConfig` and loses the header).**
  3. Existing matches new `serverConfig` → `action: 'noop'`, no write.
  4. Existing differs from both → `action: 'conflict'`, no write.
  5. File does not exist → file is created with just `[mcp_servers.echo]`, mode `0600` (codex config is on the secret-sensitive allowlist).
  6. File contains a `[mcp_servers.other]` block; after sync, the `other` block is byte-identical (zero collateral damage on sibling MCP servers).
  7. **Mode preservation on existing file** — `chmod 0600 <fixture>` before sync; perform an update; assert post-sync mode is still `0600` (pin AC7 / codex-ops r1 H3).

- `tests/echo-home/adapters/cursor-config.test.ts` — seven cases mirroring AC2 (add / update / noop / conflict / missing-file). Plus one preservation case: file contains `mcpServers.dart` (stdio shape) and `mcpServers.supabase` (URL shape); after `mcpServers.echo` is added, both sibling entries are unchanged. Plus one mode-preservation case: `chmod 0600` fixture before sync; assert mode preserved post-update (pin AC7).

- `tests/echo-home/adapters/skill-sync.test.ts` — eight cases (four per function, since both `populateEchoSkills` (AC4.1) and `syncClaudeSkills` (AC4.2) share the overwrite-posture contract and both must be exercised):
  Per-function cases (parameterized over the two exports):
  1. Target dir does not exist → created; all source skills copied.
  2. Target dir exists with skill files matching source → re-run produces byte-identical files (idempotency-by-overwrite).
  3. Target dir exists with a stale skill file (not in source) → stale file is LEFT IN PLACE (pin R5 / Out of Scope §3).
  4. Target dir contains a user-hand-edited skill file matching one of the source filenames → file is OVERWRITTEN (pin AC4's overwrite posture; surfaces R6 to documentation, not to code).

- `tests/echo-home/adapters/role-sync.test.ts` — four cases:
  1. Target dir empty → all three default roles copied.
  2. Target dir has all three roles byte-identical to source → all three return `action: 'noop'`.
  3. Target dir has `reviewer.toml` hand-edited (differs from source) → `reviewer.toml` returns `action: 'user-modified'`, file is NOT overwritten; `strategist.toml` and `builder.toml` return `'noop'` or `'copied'` as appropriate.
  4. Source dir missing `builder.toml` → `builder.toml` returns `action: 'source-missing'`; the other two are unaffected.

- `tests/echo-home/adapters/atomic-write.test.ts` — seven cases (pins AC7):
  1. **Unique temp suffix** — call `atomicWrite` 100 times in a tight loop against the same `filePath` (synchronously), capture every temp filename observed via `fs.readdirSync(dirname)` during a stubbed-out rename. Assert every temp name is unique AND matches the regex `^<basename>\.\d+\.[a-f0-9]{8}\.tmp$`.
  2. **Mode preservation on existing file** — `chmod 0600 <file>` before sync; call `atomicWrite`; assert post-rename mode is still `0600` (use `fs.statSync(file).mode & 0o777`).
  3. **0600 for new allowlisted file** — monkey-patch `os.homedir()` to return a tmpdir; `vi.resetModules()` then dynamic-import `atomic-write.ts`; `filePath = path.join(<tmpdir-home>, '.codex/config.toml')`; call `atomicWrite` with no `secretSensitive` opt; assert post-create mode is `0600`. (Pins exact-match allowlist behavior under controlled HOME.)
  4. **0600 for explicit `secretSensitive: true`** — `filePath` is a plain tmpdir path that does NOT match the allowlist; call with `secretSensitive: true`; assert mode `0600`. (Pins the test-ergonomics escape hatch from AC7.3.)
  5. **NOT 0600 for non-allowlisted tmpdir without flag** — `filePath` is a tmpdir path whose basename happens to be `config.toml` but whose absolute path is NOT in the allowlist; call with no `secretSensitive` opt; assert mode equals the umask default. (Negative pin against the rejected-suffix-matching alternative from codex r2 M2.)
  6. **Umask default for new non-sensitive file** — `filePath` is e.g. a fresh CLAUDE.md path; call without `secretSensitive`; assert mode equals `0o666 & ~umask` (typically `0o644`).
  7. **Concurrent-overlap is safe** — spawn two `atomicWrite` calls concurrently (using `Promise.all` over two synchronous-style wrappers in different async ticks) targeting the same `filePath` with different content. Assert: both calls complete without exception; the final file content equals exactly one of the two payloads (no garbled mix); both temp paths were unlinked by end of test. (Pins the codex-ops r1 M3 collision finding. NOTE: lost-update guard at the syncAll level is AC6's per-user lock; this atomic-write test only proves NO-CORRUPTION, not lost-update prevention.)

- `tests/echo-home/adapter-sync.test.ts` — seven cases:
  1. Three agents (codex, claude-code, cursor) all succeed → `overallOk: true`, three `ok: true` entries, `files_written` lists every file actually touched.
  2. Codex returns conflict on `config.toml`; claude-code and cursor succeed → `overallOk: false`, codex entry has `ok: false` with a populated `conflicts` array; the other two are `ok: true`; the files that were successfully written by claude-code and cursor are NOT rolled back (pin "no transactional rollback").
  3. All three agents succeed but `reviewer.toml` is user-modified in `~/.echo/roles/` → agents are all `ok: true`, but `result.roles.results` includes the `'user-modified'` entry; `overallOk` is true iff caller opted-in via `opts.allowUserModifiedRoles` (default false — `overallOk: false` when the option is off).
  4. **Populate-skills-runs-first** (pins AC6 ordering invariant). `repoSkillsDir` contains 5 .md skill files; `ECHO_HOME_PATHS.skills` starts empty; the `claude-code` profile's `commandsDir` also starts empty. After `syncAll`, `~/.echo/skills/` contains all 5 files AND `~/.claude/commands/` contains all 5 files. Pin via execution-order assertion: a mock or instrumented version of `populateEchoSkills` records its invocation timestamp, and `syncClaudeSkills` records its invocation timestamp; `populateEchoSkills` must be strictly earlier.
  5. **Default-role list comes from 071's constant.** With `opts.defaultRoles` omitted, `syncAll` calls `syncDefaultRoles` with a `defaults` array byte-equal to `DEFAULT_ROLE_FILENAMES` imported from `src/echo-home/roles.ts`.
  6. **Populate-skills failure blocks claude-code fan-out + flips overallOk** (pins AC6 failure path / codex-ops r1 H2). `opts.repoSkillsDir` is set to a path that does not exist. `populateEchoSkills` returns the `{ ok: false, error }` variant; `syncAll` does NOT throw; `result.skillsPopulated.ok === false`; the claude-code agent entry exists with `skipped: ['syncClaudeSkills']` (CLAUDE.md merge still ran); codex + cursor agents are `ok: true`; `result.overallOk === false`. The test additionally asserts that the claude-code `commandsDir` was NEVER touched (no partial-write of stale bytes from an earlier sync).
  7. **Conflict payload is not logged** (pins AC8 redaction caller-contract / codex-ops r1 M4). Capture `process.stderr` + `process.stdout` during a `syncAll` call that produces a cursor-config conflict whose `serverConfig.headers.Authorization` is `'Bearer secret-token-xyz'`. Assert the captured streams contain NEITHER the literal token NOR the surrounding header string. The conflict object IS in the returned `SyncResult` (callers can render with redaction); 072 itself does not emit.
  8. **Malformed Cursor JSON does not throw** (pins AC6 non-conflict error variant / codex r2 H2 + codex-ops r2 H1). Pre-seed `~/.cursor/mcp.json` (via temp HOME) with `{ "mcpServers": { broken syntax`. Run `syncAll` with cursor + codex + claude-code profiles. Assert: syncAll resolves (does not throw); cursor entry is `ok: false` with `errors: [{ code: 'PARSE_ERROR', operation: 'parse', file: '<resolved path>', message: <non-empty, does not contain the file's bytes> }]`; codex + claude-code agents are `ok: true` with files actually written (no transactional rollback); `overallOk: false`. Additionally assert the captured stderr/stdout contains no fragment of the malformed JSON (AC8 redaction extends to error messages).
  9. **EACCES on instructions file does not throw** (companion pin for AC6). Pre-seed CLAUDE.md fixture at mode `0444` (read-only) so the rename fails; assert the claude-code agent entry is `ok: false` with `errors: [{ code: 'EACCES', operation: 'write' | 'rename', ... }]`; other agents are unaffected; `overallOk: false`.
  10. **Per-user lock acquired and released** (pins AC6 concurrency / codex-ops r2 M2). With `ECHO_HOME_PATHS.state` pointed at a tmpdir, run `syncAll` and during its execution (by mocking one of the adapter functions to delay) assert that `path.join(state, 'adapter-sync.lock')` EXISTS. After the call resolves, assert the lock file is gone. After resolution, a second `syncAll` call succeeds (lock was properly released).
  11. **Overlapping syncAll → second returns RETRY_CONFLICT** (pins AC6 lost-update prevention). Start `syncAll` A with a 5s delay injected via mock; while A is mid-flight (lock held), start `syncAll` B with the lock-acquire retry budget reduced to 500ms for test speed. Assert: B resolves (does not throw); B's `SyncResult.overallOk: false`; B has at least one `AdapterError({ code: 'RETRY_CONFLICT', file: '<lock path>', message: 'another sync in progress' })` recorded at the SyncResult level (a new top-level `result.syncLock?: AdapterError` field, OR injected into every agent's errors — choose the simpler shape; spec the chosen shape inline at the top of `adapter-sync.ts`). A still completes successfully and writes its files.
  12. **Stale-lock recovery — dead PID** (pins AC6 stale-lock rule 1). Pre-create the lock file with `pid: 999999` (assumed-dead PID — production code calls `process.kill(pid, 0)` and gets ESRCH), matching `hostname`, and a recent `started_at`. Call `syncAll`. Assert it succeeds (the stale lock was detected and removed before retry).
  13. **Stale-lock recovery — corrupt/empty lockfile** (pins AC6 stale-lock rule 2 / codex-ops r3 M1). Pre-create the lock file with content `''` (empty) AND set its mtime to 10 minutes ago (older than the 5-min `corruptLockFreshnessMs` gate). Call `syncAll`. Assert it succeeds (corrupt lock with old mtime treated as stale). Companion negative case: same empty content but mtime set to NOW. Call `syncAll`. Assert it returns the lock-timeout `SyncResult` shape (corrupt-with-fresh-mtime is NOT treated as stale — protects against false-positive removal of a lock just acquired by another process).
  14. **Lock-timeout `SyncResult` shape** (pins AC6 lock-timeout result shape / codex r3 M1). Pre-create the lock file with a live PID (use `process.pid` of the test runner itself). Call `syncAll` with retry budget reduced to 500ms. Assert: `result.syncLock` is defined with `code === 'RETRY_CONFLICT'`; `result.agents === []`; `result.roles.results === []`; `result.skillsPopulated.ok === false` with error `'sync_skipped:lock_unavailable'`; `result.overallOk === false`.

Run convention: `npm test -- tests/echo-home/`.

## Out of Scope (Don't Drift)

1. **Agent detection.** Deciding which agents are installed on the machine is 073's job. 072 takes `AdapterSyncProfile[]` as input. If you find yourself writing `process.exec('which codex')` or scanning for `~/.codex/` existence as a precondition, STOP — that work belongs in 073.
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

- **R1 — TOML library choice may not preserve formatting + comments.** `smol-toml` is the lead candidate based on its docs claim of round-trip fidelity, but no one on the team has stress-tested it against a real ~30-table user config. The first builder action on AC2 is a verification: parse the founder's actual `~/.codex/config.toml` (copy to a temp file for testing), then stringify, then diff. If the diff is non-trivial in any way that loses user data, escalate before adding `smol-toml` to dependencies. Fallback library: `@iarna/toml` (lossier, but lossless on the small block ECHO actually mutates) combined with a string-range patch that inserts/replaces only the `[mcp_servers.echo]` block via line-offset surgery — leaving the rest of the file as raw bytes the library never touches. If the fallback is chosen, AC9's codex-config.test.ts case 2 (preserve sibling tables + comments) MUST still pass.

- **R2 — Cursor's MCP config path stability.** `~/.cursor/mcp.json` is the path on the founder's machine today, but Cursor has not published a long-term contract for it. If Cursor renames or relocates this file in a future release, the cursor-config adapter breaks silently. Mitigation: AC3's missing-file branch creates the path if absent, which means an updated Cursor that uses a new path will leave the old file dormant rather than crashing — the wizard / CLI will report `ok: true` but the wiring won't be active. Detecting this requires probing (item 073's step 5); 072 cannot detect it from the sync side alone. Flagged here so future Cursor breakage has a known landing zone for the fix.

- **R3 — Marker malformation edge cases.** If a user hand-edits an AGENTS.md to have `BEGIN` but no `END` (or vice versa, or nested), the markers.ts treats the file as having no markers (append branch). This is intentionally permissive — refusing to act would block onboarding for the rare malformed-markers case — but it does mean the user's broken markers persist alongside a new correct block. Documented in AC9 case 6; users self-resolve by removing the malformed markers.

- **R4 — In-tree diff library vs. external dependency.** `unifiedDiff` in conflict results is a line-by-line plain-text diff produced by an in-tree routine. The routine does not need to be a full Myers-diff — a simple "lines in current but not proposed / lines in proposed but not current" listing is sufficient for the wizard to render a preview. Adding a real diff library (`diff`, `jsdiff`) is a follow-up if the simple form proves unreadable in dogfooding. Builder must NOT add a diff library without escalation per drift rule 3.

- **R5 — Skill removal not mirrored.** A skill removed from `~/.echo/skills/<name>.md` is not removed from `~/.claude/commands/<name>.md`. If a future ECHO release drops a skill that becomes load-bearing-by-its-absence (e.g., a deprecated reviewer skill is removed because it causes loops), stale copies in `~/.claude/commands/` could cause user confusion. Mitigation: low likelihood in V1 (the canonical skill set is stable); revisit if it bites.

- **R6 — User hand-edits to `~/.claude/commands/*.md` are silently overwritten.** This is by design per the decision archive but is a judgment call worth surfacing to the founder. If users routinely hand-tune skill prompts (e.g., to add their preferred verbosity), V1's "fully ECHO-owned" posture is wrong and these files should also use the marker-merge strategy. The spec ships the decision-archive posture; the judgment call is flagged here for the founder to confirm or override before AC4 is implemented. (See "Judgment calls" in the agent_notes when this lands in pending_review.)

## Tests

All test files are listed in `files_to_modify`. Coverage targets:

- `markers.ts` — 6 cases pinning append / replace / noop / conflict / outside-preservation / malformed-markers.
- `codex-config.ts` — 7 cases pinning add / update (with comment preservation) / noop / conflict / missing-file-0600 / sibling-table-preservation / mode-preservation.
- `cursor-config.ts` — 7 cases mirroring + sibling-entry-preservation + mode-preservation.
- `skill-sync.ts` — 8 cases (4 per exported function: `populateEchoSkills` and `syncClaudeSkills`), pinning create-target-dir / idempotent-overwrite / stale-file-preservation / hand-edit-overwrite for both hops.
- `role-sync.ts` — 4 cases pinning first-install-copy / noop / user-modified-refusal / source-missing.
- `atomic-write.ts` — 7 cases pinning unique-temp-suffix / mode-preservation-existing / 0600-for-allowlist-exact-match / 0600-for-explicit-secret / NOT-0600-for-non-allowlist-suffix / umask-default-for-non-secret / concurrent-overlap-no-corruption.
- `adapter-sync.ts` — 14 cases pinning all-ok / partial-failure-conflict / user-modified-role-and-overallOk / populate-runs-first / default-roles-from-071 / populate-failure-blocks-fanout / conflict-not-logged / malformed-cursor-json-error-variant / EACCES-error-variant / per-user-lock-acquire-release / overlapping-sync-RETRY_CONFLICT / stale-lock-dead-pid / stale-lock-corrupt-empty / lock-timeout-result-shape.

Verify commands (root only — no Raycast package edits in this spec):

- `npm test -- tests/echo-home/`
- `npm test`
- `npm run lint`
- `npm run typecheck`

All four must pass before the builder moves 072 to `pending_review/`.

## Definition of Done

- AC1: `markers.ts` exports `mergeWithMarkers` with the four-action contract; idempotent re-run produces `'noop'`; user content outside markers preserved byte-for-byte.
- AC2: `codex-config.ts` exports `syncCodexMcpBlock` using the **byte-range editor primary path** (per codex r1 H1 verification: smol-toml does NOT preserve comments through parse/stringify, so parse-and-restringify is structurally not the path); five-action contract (add/update/noop/conflict/missing-file); sibling tables + comments preserved byte-for-byte.
- AC3: `cursor-config.ts` exports `syncCursorMcpEntry` with the same five-action contract; sibling `mcpServers.*` entries preserved.
- AC4: `skill-sync.ts` exports `populateEchoSkills` (in-repo `skills/` → `~/.echo/skills/`) and `syncClaudeSkills` (`~/.echo/skills/` → `~/.claude/commands/`); both create target dir if missing, copy all skills (overwrite posture), leave stale target files in place.
- AC5: `role-sync.ts` exports `syncDefaultRoles`; first-install copies defaults; user-modified roles refused; source-missing sentinel returned; `skillsRoot` handoff for 073/074 is documented (= `ECHO_HOME_PATHS.skills`).
- AC6: `adapter-sync.ts` exports `syncAll(profiles, opts)` returning `SyncResult`; `AdapterSyncProfile` (NOT `AgentProfile` — collision avoidance vs 070's `OnboardedAgentProfile`) and all sync DTOs are defined inline; populate-skills runs BEFORE per-agent dispatch; populate-failure flips `overallOk` to false AND skips the claude-code `syncClaudeSkills` fan-out (CLAUDE.md merge still runs); per-agent dispatch wires the right adapters; **every per-profile call wrapped in try/catch — no exception escapes `syncAll`** — filesystem and parse errors land in the per-agent `errors[]` array with `AdapterError` shape; partial-failure reported per-agent without rollback; roles synced once at the end with `defaults = DEFAULT_ROLE_FILENAMES` imported from 071; `previous*` persistence is explicitly caller-owned (073 + 074 will cache via `~/.echo/adapters/`; 072 does not touch that directory); `paths` field defaults documented per-agent (`os.homedir()`-based) and resolved at adapter call time; **per-user advisory lock at `ECHO_HOME_PATHS.state/adapter-sync.lock`** prevents lost-update race between overlapping `syncAll` invocations (30s retry budget, stale-lock recovery via `process.kill(pid, 0)` ESRCH probe).
- AC7: `atomic-write.ts` exports `atomicWrite` with unique-tmp filename (`<file>.<pid>.<8hex>.tmp`), mode preservation on existing-file path, `0600` for new files that **exact-match** (post `path.resolve`) the `SECRET_SENSITIVE_ALLOWLIST` (codex config + cursor mcp.json under the runtime-resolved `os.homedir()`), `0600` when `opts.secretSensitive === true`, umask-default otherwise. All AC1–AC5 adapters delegate to this helper (no inline `writeFile + rename` in any adapter).
- AC8: `SyncConflict` interface documents that payloads may contain user-bearing secrets; the inline comment names `Authorization` headers explicitly; no 072 code logs conflict-payload values; a grep-based negative test pins this.
- AC9: All test files pass (markers ×6, codex-config ×7, cursor-config ×7, skill-sync ×8, role-sync ×4, atomic-write ×7, adapter-sync ×14 — 53 cases total). Existing tests in `tests/` (root Vitest) continue to pass.
- All four verify commands above clean.
- `task_state_ref` set to `2026-05-25-072-adapter-sync-engine` AND `backlog/task-state/2026-05-25-072-adapter-sync-engine/strategist.md` exists pinning the spec at the artifact SHA.
- TOML strategy decision (byte-range editor primary path; smol-toml used only for value-comparison on the target slice) documented in `src/echo-home/adapters/codex-config.ts` header comment, including the codex r1 verification result against the founder's real config.

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
