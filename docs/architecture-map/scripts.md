# `scripts/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 3 files.

### `scripts/copy-sql-migrations.js` — build step that copies SQL migration files into dist

**Purpose:** Node ESM build script that copies all `.sql` migration files from `src/storage/migrations` into `dist/storage/migrations` so the compiled build ships raw SQL alongside transpiled JS.

**Depends on:** `node:fs`, `node:path`, `node:url` (external/built-in only); none internal beyond repo path conventions.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| (script entrypoint) | script | `scripts/copy-sql-migrations.js:1` | Resolves repo root from `import.meta.url`, verifies `src/storage/migrations` exists and is a directory (exits 1 with an error if not), creates `dist/storage/migrations` recursively, copies every `.sql` file (sorted, files only) from source to target, and logs a count of files copied. |

### `scripts/launchd/install.sh` — installs the ECHO daemon as a macOS LaunchAgent

**Purpose:** Thin wrapper that locates the built CLI at `dist/cli/index.js` relative to the repo root and delegates to its `daemon install` subcommand to register the macOS LaunchAgent; fails fast if the CLI hasn't been built.

**Depends on:** `dist/cli/index.js` (built CLI, invoked via `node`); none internal at the shell-script level.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| (script entrypoint) | script | `scripts/launchd/install.sh:1` | Computes `ROOT` as two directories above the script, checks `dist/cli/index.js` exists (else errors telling the user to run `npm run build:cli`), then execs `node "$CLI" daemon install "$@"` forwarding all script args. |

### `scripts/launchd/uninstall.sh` — removes the ECHO daemon LaunchAgent

**Purpose:** Idempotent uninstall script that unloads the ECHO daemon's macOS LaunchAgent via `launchctl bootout` and deletes its plist file, preserving logs.

**Depends on:** `launchctl` (macOS system tool); none internal.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| (script entrypoint) | script | `scripts/launchd/uninstall.sh:1` | Sets `LABEL` (default `com.echo.daemon`, overridable via `ECHO_DAEMON_LABEL` env var) and `PLIST_PATH` (default `~/Library/LaunchAgents/${LABEL}.plist`, overridable via `ECHO_DAEMON_PLIST_PATH` env var), runs `launchctl bootout gui/$(id -u)/${LABEL}` ignoring failure, removes the plist file, and prints confirmation plus a note that logs under `~/Library/Logs/echo/` are preserved. |
