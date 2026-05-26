---
task_id: 2026-05-25-072-adapter-sync-engine
role: builder
writer: claude-code-builder
last_updated: 2026-05-26T03:06:55Z
handoff_branch: agent/adapter-sync-engine
handoff_head_sha: 0e4b20420bd0e418f8c79052b8fdf55de7a4f9b8
handoff_run_log: raw/internal/agent-runs/2026-05-26-2026-05-25-072-adapter-sync-engine.md
---

## current_thesis

Claimed 072 as Claude Code builder on 2026-05-26. Implement the adapter sync engine — seven new files under `src/echo-home/` plus seven new test files — that lets a caller idempotently mutate per-agent MCP wiring (TOML/JSON), merge an ECHO section into AGENTS.md/CLAUDE.md, populate `~/.echo/skills/` from the in-repo `skills/` directory and fan out to `~/.claude/commands/`, and copy default role TOMLs once. All file writes go through a shared `atomicWrite` helper with unique-temp filenames, mode preservation, and 0600 for secret-bearing targets. Orchestrator `syncAll` runs a directory-symlink preflight, acquires a one-shot advisory lock, runs `populateEchoSkills`, dispatches per-agent adapters, then runs `syncDefaultRoles` once. Spec converged at r18 (codex + codex-ops both `proceed`, zero findings).

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 0e4b20420bd0e418f8c79052b8fdf55de7a4f9b8.
<!-- builder-state-handoff:end -->

## locked_decisions

- TOML strategy is byte-range editor (per spec AC2); smol-toml is value-comparator only on the target slice. In-tree `renderInlineKeys` covers string / number / boolean / string[] / one-level Record<string, string>; anything else throws `UNSUPPORTED_VALUE`.
- `[mcp_servers.echo.headers]` is a descendant of `[mcp_servers.echo]` (stays inside slice). `[mcp_servers.other]` and `[projects.X]` are non-descendants (stop slice).
- All adapter writes route through `atomicWrite` (AC7). Temp suffix `<file>.<pid>.<8hex>.tmp`. New allowlist files (`~/.codex/config.toml`, `~/.cursor/mcp.json`) get 0600. `secretSensitive: true` CLAMPS existing mode to 0600 (codex-ops r16 M2). `followSymlink: true` only resolves EXISTING symlinks; missing files write to `filePath` directly (codex r17 H1).
- `previous*` (echoSection, serverConfig) persistence is CALLER-OWNED. 072 does NOT touch `~/.echo/adapters/`.
- Conflict payloads MAY contain secrets; 072 does NOT redact. AC8 grep-test pins no engine code logs payload values. `TargetSymlinkConflict` has no byte payload.
- Advisory lock is one-shot — no retry loop, no automatic stale recovery. EEXIST → syncLock AdapterError with shell-quoted `rm` cleanup hint (codex-ops r16 M3). Named SIGINT / SIGTERM / exit handlers; owner-token verification.
- Directory-symlink guard (AC6a) is a bounded walk from `ECHO_HOME_PATHS.root` (or agent-home boundary) down to leaf. macOS `/var` → `/private/var` ignored.
- Malformed markers → `MalformedMarkerConflict` (convergent — append-on-malformed would grow the file every run).
- `DEFAULT_ROLE_FILENAMES` is imported from 071's `src/echo-home/roles.ts`; 072 does NOT hardcode the list.
- No backup files. No telemetry. No agent detection. No pruning of stale skill copies.

## open_questions

- R6 (Claude Code commands fully ECHO-owned vs marker-merge per file) — surfaced in `agent_notes` at handoff for founder review.

## dont_touch

- The free-tier substrate (daemon must still serve substrate callers if 072 is never invoked).
- 070's `~/.echo/` directory creation (use the paths; do NOT re-create or re-validate the tree).
- 071's role TOML schema or default role files (only copy bytes).
- The reserved `~/.echo/adapters/` directory — deferred to 073/074.
- `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`.

## canonical_anchors

- spec: backlog/pending_review/2026-05-25-072-adapter-sync-engine.md
