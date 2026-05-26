---
role: strategist
task_id: 2026-05-25-072-adapter-sync-engine
written_at: 2026-05-26T02:20:00Z
written_by: strategist-072-r18-converged
---

## current_thesis

072 is the adapter sync engine — pure mechanics that take `AdapterSyncProfile[]` as input and idempotently mutate per-agent config + instruction files via four ownership-class postures (markers-merge, key-targeted byte-range edit, ECHO-fully-owned overwrite, user-owned after first copy). Blocked by 070 (path constants) and 071 (`DEFAULT_ROLE_FILENAMES`). **Converged at r18 (2026-05-26): both codex + codex-ops returned `proceed` with zero findings.** Spec is implementation-ready and will move to claim once 070 + 071 land in `complete/`. Final SHA: `f1148aa8ea38705a70a61d870ca1d8eb1fff9b55`.

## locked_decisions

- **TOML strategy = byte-range editor** primary path. Parser (smol-toml) is used only on the target slice for value-comparison. Comments + sibling tables preserved by structural surgery, not by library round-trip. In-tree `renderInlineKeys` for the target slice (V1 vocabulary: string/number/boolean/string[]/one-level Record<string,string>).
- `AdapterSyncProfile` (this spec) is deliberately distinct from 070's `OnboardedAgentProfile`. Sync DTOs (`AdapterSyncProfile`, `SyncResult`, `SyncConflict` [discriminated union: ConfigConflict | MarkerConflict | TargetSymlinkConflict | MalformedMarkerConflict], `SyncAllOpts`) defined inline in `adapter-sync.ts`; no shared `src/echo-home/types.ts`. `AtomicWriteError` declares its own local `AtomicWriteErrorCode` union to avoid cross-module type import.
- `populateEchoSkills` (AC4.1) runs BEFORE per-agent dispatch in `syncAll`. Failure → `skillsPopulated.ok === false` → `overallOk: false` → claude-code `syncClaudeSkills` fan-out is skipped (CLAUDE.md merge still runs). No silent stale-skill copy. Empty-eligible-source or all-skipped fans flip `overallOk: false` too.
- All adapter writes go through `atomicWrite` helper (AC7). Unique temp path = `<file>.<pid>.<8hex>.tmp`. Existing-file mode preserved; new files on the secret-sensitive allowlist (`~/.codex/config.toml`, `~/.cursor/mcp.json`) created `0600`; `secretSensitive: true` CLAMPS existing-file mode (not preserve) to 0600. `followSymlink: true` only resolves EXISTING symlinks (missing files use filePath directly — first-run create works).
- `previous*` (echoSection, serverConfig) persistence is **caller-owned**. 072 does NOT write to `~/.echo/adapters/`. 073/074 will own the cache; 072 takes the snapshots as inputs. When `previous*` is absent: current==proposed → noop, otherwise → conflict (no-clobber default).
- Conflict payloads MAY contain secrets (`headers.Authorization`, bearer tokens, role TOML bytes). 072 does NOT redact — caller responsibility at render boundary. AC8 grep-test pins that no engine code logs conflict-payload values. `TargetSymlinkConflict` deliberately has no byte payload (engine never reads symlinked targets).
- `DEFAULT_ROLE_FILENAMES` is imported from 071's `src/echo-home/roles.ts`. 072 does NOT hardcode the list.
- **Lock posture (codex-ops r2 M2 + r6 H1 removal):** advisory lock at `ECHO_HOME_PATHS.state/adapter-sync.lock` is ONE-SHOT — no retry loop, no automatic stale recovery. EEXIST → `syncLock` AdapterError with shell-quoted `rm` cleanup hint. Owner-token verification + named SIGINT/SIGTERM/exit handlers prevent stale-handler leaks. Future `echo doctor` (074) handles interactive stale-lock cleanup.
- **Directory-symlink guard (AC6a):** bounded walk from `ECHO_HOME_PATHS.root` (or agent-home dirname) down to leaf. System-level symlinks above the boundary (`/var` → `/private/var` on macOS) are ignored. Guards `~/.echo/skills`, `~/.echo/roles`, `~/.echo/state`, resolved `commandsDir`, `path.dirname(instructionsFile)`, `path.dirname(configFile)`.
- **Malformed markers → MalformedMarkerConflict** (convergent under retries — append-on-malformed would grow the file every run).

## open_questions

- R6 (Claude Code skill files fully ECHO-owned vs marker-merge) — flagged for founder review when 072 enters pending_review. Decision-archive posture is overwrite; if founder overrides, AC4.2 switches to marker-merge per file (each skill gains BEGIN/END markers).
- R2 (Cursor MCP config path stability) — 073's probe step is the canonical detection seam for breakage. Not a 072 concern.

## dont_touch

- The free-tier substrate. 072 is paid-tier-only mechanics; the daemon must continue to start + serve substrate callers if 072 is never invoked.
- 070's `~/.echo/` directory creation. 072 writes INTO the paths 070 establishes; do NOT re-create or re-validate the tree.
- 071's role TOML schema or default role files. 072 only copies bytes via `syncDefaultRoles`.
- The reserved `~/.echo/adapters/` directory. 072 explicitly defers this to 073/074. Do NOT add cache writes in 072 even if convenient.

## handoff_head_sha

Set by builder on claim. **Convergence SHA: `f1148aa8ea38705a70a61d870ca1d8eb1fff9b55`** (r18, 2026-05-26).

## review_arc

18 rounds with codex + codex-ops in parallel. Trajectory: r1=8, r2=5, r3=4, r4=6, r5=8, **r6=big stale-lock removal**, r7=6, r8=5, r9=4, r10=5, r11=4, r12=5, r13=3, r14=2, r15=5, r16=codex first `proceed`, r17=4, **r18=0/0 bilateral `proceed`**. Strategist-drift recognized at r6 (lock recovery mechanism kept generating new findings) and again at r15 (union refactor surface). Both removal/clarification passes shortened the tail.
