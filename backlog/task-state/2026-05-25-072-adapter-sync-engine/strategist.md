---
role: strategist
task_id: 2026-05-25-072-adapter-sync-engine
written_at: 2026-05-25T23:55:00Z
written_by: strategist-072-r1-watcher
---

## current_thesis

072 is the adapter sync engine — pure mechanics that take `AdapterSyncProfile[]` as input and idempotently mutate per-agent config + instruction files via three ownership-class postures (markers-merge, key-targeted byte-range edit, ECHO-fully-owned overwrite, user-owned after first copy). Blocked by 070 (path constants) and 071 (`DEFAULT_ROLE_FILENAMES`). r1 review with codex (architectural) + codex-ops (runtime/ops) returned **pushback** (codex) / **proceed_after_patches** (codex-ops) — patched in r2. Key r1 surprises: smol-toml does NOT preserve comments (forces byte-range editor as primary, not fallback); `populateEchoSkills` failure must flip `overallOk` AND block claude-code fan-out; atomic writes must use unique-tmp + mode preservation; conflict payloads carry user secrets (caller redacts, not engine).

## locked_decisions

- **TOML strategy = byte-range editor** primary path. Parser (smol-toml) is used only on the target slice for value-comparison. Comments + sibling tables preserved by structural surgery, not by library round-trip.
- `AdapterSyncProfile` (this spec) is deliberately distinct from 070's `OnboardedAgentProfile`. Sync DTOs (`AdapterSyncProfile`, `SyncResult`, `SyncConflict`, `SyncAllOpts`) defined inline in `adapter-sync.ts`; no shared `src/echo-home/types.ts`.
- `populateEchoSkills` (AC4.1) runs BEFORE per-agent dispatch in `syncAll`. Failure → `skillsPopulated.ok === false` → `overallOk: false` → claude-code `syncClaudeSkills` fan-out is skipped (CLAUDE.md merge still runs). No silent stale-skill copy.
- All adapter writes go through `atomicWrite` helper (AC7). Unique temp path = `<file>.<pid>.<8hex>.tmp`. Existing-file mode preserved; new files on the secret-sensitive allowlist (`~/.codex/config.toml`, `~/.cursor/mcp.json`) created `0600`; others use umask default.
- `previous*` (echoSection, serverConfig) persistence is **caller-owned**. 072 does NOT write to `~/.echo/adapters/`. 073/074 will own the cache; 072 takes the snapshots as inputs.
- Conflict payloads MAY contain secrets (`headers.Authorization`, bearer tokens). 072 does NOT redact — caller responsibility at render boundary. AC8 grep-test pins that no engine code logs conflict-payload values.
- `DEFAULT_ROLE_FILENAMES` is imported from 071's `src/echo-home/roles.ts`. 072 does NOT hardcode the list.

## open_questions

- R6 (Claude Code skill files fully ECHO-owned vs marker-merge) — flagged for founder review when 072 enters pending_review. Decision-archive posture is overwrite; if founder overrides, AC4.2 switches to marker-merge per file (each skill gains BEGIN/END markers).
- R2 (Cursor MCP config path stability) — 073's probe step is the canonical detection seam for breakage. Not a 072 concern.

## dont_touch

- The free-tier substrate. 072 is paid-tier-only mechanics; the daemon must continue to start + serve substrate callers if 072 is never invoked.
- 070's `~/.echo/` directory creation. 072 writes INTO the paths 070 establishes; do NOT re-create or re-validate the tree.
- 071's role TOML schema or default role files. 072 only copies bytes via `syncDefaultRoles`.
- The reserved `~/.echo/adapters/` directory. 072 explicitly defers this to 073/074. Do NOT add cache writes in 072 even if convenient.

## handoff_head_sha

Set by builder on claim; r1 was reviewed at `4345f0a6d80be12461d1085330c52effb5b89231`.
