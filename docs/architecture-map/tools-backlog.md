# `tools/backlog/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tools/backlog/run-codex-builder.sh` — codex builder-binding launcher for the process-backlog protocol

**Purpose:** Manually-invoked wrapper that lets codex claim and execute the next ready backlog item as a builder binding, mirroring `tools/review-queue/_run_reviewer.sh`'s shared concerns (repo-root validation, PATH augmentation, log rotation, codex exec invocation) with builder-specific concerns layered on: agent-id resolution, an atomic lock directory, and argv[0]=codex preservation. It feeds `skills/process-backlog.md` as the prompt to `codex exec` inside the repo root with full-access sandbox.

**Depends on:** skills/process-backlog.md (read as prompt), tools/review-queue/_run_reviewer.sh (shape/pattern reference, not sourced), external: `codex` CLI, `git`, `uuidgen`, `mkdir`/`stat`/`date` coreutils.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/backlog/run-codex-builder.sh:1` | Resolves `REPO_ROOT` from `ECHO_BACKLOG_REPO_ROOT` (default `~/Desktop/Project_echo`) and validates it is a git repo; exits 1 with a message if missing/invalid. |
| entrypoint (PATH augmentation) | script | `tools/backlog/run-codex-builder.sh:34` | Prepends homebrew/local/nodenv/asdf/cargo bin dirs to `PATH` so `codex`, `git`, `node` resolve under launchd/minimal-env shells. |
| entrypoint (agent-id resolution) | script | `tools/backlog/run-codex-builder.sh:39` | If `ECHO_AGENT_ID` unset, reads/creates `~/.echo/agent-id` (UUID4 via `uuidgen` on first run) and exports it for builder-identity/claimed_by frontmatter. |
| entrypoint (log setup) | script | `tools/backlog/run-codex-builder.sh:51` | Creates `~/Library/Logs/echo-backlog-codex-builder.log`, rotating to a single `.1` sidecar once the file exceeds 10MB. |
| entrypoint (atomic lock) | script | `tools/backlog/run-codex-builder.sh:68` | Uses `mkdir` on `.git/echo-builder-in-progress.d` as an atomic create-or-fail lock to prevent concurrent builder invocations; writes lock-info metadata (timestamp, pid, agent) and registers a `trap` to `rm -rf` the lock dir on EXIT/INT/TERM. |
| entrypoint (prompt check) | script | `tools/backlog/run-codex-builder.sh:79` | Verifies `skills/process-backlog.md` exists, exiting 1 if the prompt file is missing. |
| entrypoint (codex invocation) | script | `tools/backlog/run-codex-builder.sh:94` | Resolves `CODEX_BIN` (default literal `codex`); branches on a `.sh` suffix to run a shebang mock inside `bash -c` (test path, preserving argv[0]="codex" via `exec -a codex`) versus the production path invoking the real `codex exec -C "$REPO_ROOT" --sandbox danger-full-access -` piped from the prompt file, logging start/end timestamps and exit code to the log file. |
