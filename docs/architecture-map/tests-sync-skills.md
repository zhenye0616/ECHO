# `tests/sync-skills/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tests/sync-skills/install-echo-codex-skills.test.ts` — test suite for the Codex skill-installer script

**Purpose:** Exercises `tools/install-echo-codex-skills.sh`, the script that renders canonical `skills/*.md` bodies into `~/.codex/skills/ECHO:<name>/SKILL.md`. Covers install/refresh/drift-detection (`--check`), namespace and underscore-name variants, dry-run, non-managed-target refusal, and remediation-command generation for stale sentinels vs true orphans.

**Depends on:** `tools/install-echo-codex-skills.sh` (external script under test), `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(cwd, args)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:27` | Runs a git command synchronously in the given cwd, throwing with stderr on non-zero exit. |
| `initFixture()` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:34` | Builds a throwaway repo (with `tools/` copy of the install script and two seed `skills/*.md` files) plus a fake `$HOME`, commits the seed, and returns their paths. |
| `writeSkill(repoRoot, name, description, body)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:56` | Writes a canonical `skills/<name>.md` file with frontmatter (`name`, `description`) and a body. |
| `runInstall(repoRoot, tmpHome, args, opts)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:63` | Spawns `bash tools/install-echo-codex-skills.sh` with the fixture's `HOME` env pointed at `tmpHome`, optional extra args/cwd/env. |
| `runCheck(repoRoot, tmpHome, opts)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:76` | Convenience wrapper calling `runInstall` with `--check`. |
| `skillPath(tmpHome, name)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:84` | Returns `~/.codex/skills/<name>` path under the fake home. |
| `sentinelPath(tmpHome, name)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:88` | Returns the `.echo-managed` sentinel file path inside an installed skill dir. |
| `rewriteSentinelSource(tmpHome, name, source)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:92` | Rewrites the `source=` line of an installed sentinel file to simulate a stale/moved canonical source, to test stale-sentinel detection. |
| `remediationCommands(output)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:98` | Parses `--check` stdout for lines matching `remediation: (.+)` and returns the extracted shell commands. |
| `runShell(command, tmpHome, cwd)` | function | `tests/sync-skills/install-echo-codex-skills.test.ts:105` | Runs an arbitrary shell command (e.g. a printed remediation command) via `bash -lc` with the fake `HOME` set. |
| `describe: "install-echo-codex-skills.sh"` | test suite | `tests/sync-skills/install-echo-codex-skills.test.ts:126` | Full behavior suite for the installer: installs all canonical skills under an `ECHO:` namespace with Codex-shaped frontmatter and a `.echo-managed` sentinel (source, commit, content hash, installer name); refreshes on canonical content change; refuses to clobber non-ECHO-managed targets; supports `--dry-run`, `--namespace`, and `--underscore-names`; `--check` reports clean/drifted/absent states with exit codes 0/1/2, isolates its temp stage under `$TMPDIR` without touching `~/.codex` on success, and fails cleanly (exit 2) if the temp stage can't be created; prints cwd-safe, directly-runnable remediation commands for namespace drift, mixed-namespace drift, stale sentinels (distinct from true orphaned managed dirs, which get an `rm -rf` remediation), and reports exit 2 when the installed skills tree is unreadable/untraversable. |
