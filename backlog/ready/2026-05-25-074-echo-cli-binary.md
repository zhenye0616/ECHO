---
id: 2026-05-25-074-echo-cli-binary
title: "`echoctl` CLI binary — init / doctor / uninstall / run subcommands; runtime role-plugging that picks an agent per role from onboarded capabilities"
status: ready
priority: HIGH
estimate: 2-3d
created: 2026-05-25
blocked_by:
  - 2026-05-25-070-echo-global-home-scaffold
  - 2026-05-25-071-role-definition-format-and-defaults
  - 2026-05-25-072-adapter-sync-engine
  - 2026-05-25-073-onboarding-wizard
task_state_ref: 2026-05-25-074-echo-cli-binary
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/cli/index.ts                                    # AC1 — node shebang entry; arg parsing via node:util parseArgs; subcommand dispatch
  - src/cli/commands/init.ts                            # AC2 — drives 073's createWizard() with TTY prompts; emits Step 1 + Step 6 copy (UX framing)
  - src/cli/commands/doctor.ts                          # AC3 — daemon health + state-file integrity + adapter-sync.lock orphan probe + per-agent re-probe
  - src/cli/commands/uninstall.ts                       # AC4 — inverts 072's adapter writes for each wired agent; --purge-state removes ~/.echo/
  - src/cli/commands/run.ts                             # AC5 — role-plugging runtime: loads workflow TOML, matches roles → onboarded agents, dispatches sequentially
  - src/cli/io/prompt.ts                                # AC6 — minimal TTY helpers (readline-backed prompt + confirm + select); non-TTY mode auto-rejects prompts
  - src/cli/io/render.ts                                # AC6 — plain-text formatters for DetectedAgent / ProbeOutcome / DoctorReport / WireResult; NO color libs (raw ANSI escapes guarded behind isatty)
  - src/cli/inverse/markers.ts                          # AC4.2 — strip <!-- BEGIN ECHO --> ... <!-- END ECHO --> block from CLAUDE.md / AGENTS.md; preserve everything outside
  - src/cli/inverse/codex-config.ts                     # AC4.3 — TOML parse → delete `mcp_servers.echo` table → atomicWrite with secretSensitive: true
  - src/cli/inverse/cursor-config.ts                    # AC4.3 — JSON parse → delete `mcpServers.echo` key → atomicWrite with secretSensitive: true
  - src/cli/inverse/skills.ts                           # AC4.4 — remove ~/.claude/commands/<skill>.md files whose contents byte-equal their `~/.echo/skills/<skill>.md` counterpart (r2 codex F5 disposition: byte-equality ownership proof, no marker; r2 codex F3 disposition: enumerate ~/.echo/skills/*.md as the skillNames source — covers all 072-copied files including those not referenced by any default role)
  - src/cli/workflow/load.ts                            # AC5.1 — TOML loader/validator for ~/.echo/workflows/<name>.toml; reuses smol-toml from 071
  - src/cli/workflow/match.ts                           # AC5.2 — role-matcher: scans onboarded agents from onboarding.json, picks an agent per role whose capabilities ⊇ role.requires.capabilities
  - src/cli/workflow/dispatch.ts                        # AC5.3 — sequential spawn per workflow step; reuses 073's probe-style spawn shape (codex exec / claude --print)
  - src/echo-home/paths.ts                              # AC5.1 minor — extend ECHO_HOME_PATHS with `workflows: join(root, 'workflows')` + frozen invariant preserved
  - src/echo-home/scaffold.ts                           # AC5.1 minor — mkdirSync workflows/ in the recursive sweep; idempotent semantics preserved
  - package.json                                        # AC1 — add `bin: { echoctl: "./dist/cli/index.js" }` (r2 codex-ops F1 HIGH: binary renamed from `echo` to avoid POSIX shell builtin collision) + a `build:cli` script that vite-node-compiles or tsc-emits src/cli/ to dist/; daemon path unchanged
  - tests/cli/init.test.ts                              # AC7
  - tests/cli/doctor.test.ts                            # AC7
  - tests/cli/uninstall.test.ts                         # AC7
  - tests/cli/run.test.ts                               # AC7
  - tests/cli/inverse-markers.test.ts                   # AC7
  - tests/cli/inverse-codex-config.test.ts              # AC7
  - tests/cli/inverse-cursor-config.test.ts             # AC7
  - tests/cli/workflow-load.test.ts                     # AC7
  - tests/cli/workflow-match.test.ts                    # AC7
  - tests/cli/workflow-dispatch.test.ts                 # AC7
  - tests/echo-home/scaffold.test.ts                    # AC5.1 minor — extend existing scaffold test with the workflows dir creation case (no new file; append cases)

spec_refs:
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # source design — §"Coord layer architecture" (CLI commands list), §"Onboarding wizard — 6 steps" (init step framing), §"Role-plugging at runtime" (run semantics)
  - docs/BACKLOG.md  # 074 inbox row — explicit scope: init / run / doctor / uninstall + `cwd` as implicit project root if --project absent
  - backlog/complete/2026-05-25-070-echo-global-home-scaffold.md  # exports ECHO_HOME_PATHS, ensureEchoHome, OnboardingState, OnboardedAgentProfile, ProjectsState, validateOnboardingState. 074 imports paths + types + validators; minor extension adds `workflows` slot.
  - backlog/complete/2026-05-25-071-role-definition-format-and-defaults.md  # exports loadRolesFromDir, Role, Capability, DEFAULT_ROLE_FILENAMES, RoleValidationError. 074 consumes loadRolesFromDir for the role-matcher (AC5.2).
  - backlog/complete/2026-05-25-072-adapter-sync-engine.md  # exports syncAll, AdapterSyncProfile, SyncResult, SyncConflict, AdapterError, atomicWrite, mergeWithMarkers, syncCodexMcpBlock, syncCursorMcpEntry. 074 imports atomicWrite (writes-back inverse-edited files) + uses 072's adapter cache record shape for uninstall.
  - backlog/{ready,pending_review,complete}/2026-05-25-073-onboarding-wizard.md  # exports createWizard, Wizard, DetectedAgent, DetectedProject, WireResult, ProbeOutcome, WizardSummary. STAGE-STABLE — 074 is blocked_by 073, so by claim time 073 is in complete/. Builder reads via filename lookup across the three stage directories.
  - src/cli/io/prompt.ts  # NOTE: this file does not exist yet — created by AC6. The path is listed in files_to_modify above.
  - src/mcp/server.ts:363  # `http://${host}:${boundPort}/mcp` — canonical MCP URL shape; 074 reconstructs `mcpServerUrl` from `ECHO_MCP_PORT` (default 38478) for the wizard handoff
  - src/daemon/lifecycle.ts  # resolveDataDir + resolveDbPath — `echoctl doctor` reuses for daemon-path attribution
  - src/daemon/index.ts:27-32  # resolveMcpPort — `echoctl init` mirrors this resolver to build `mcpServerUrl`
  - skills/process-backlog.md  # reviewer guidance — 074 is a CLI item, NOT a substrate item; minimal new deps
  - CLAUDE.md  # operating model — CLI touches none of the operating-model files; reference only
---

# `echoctl` CLI binary (init / doctor / uninstall / run)

## Why this spec exists

The 2026-05-25 ECHO Pro design (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`, §"Coord layer architecture") ships the paid tier as a coord layer that lives under `~/.echo/`. 070 created the scaffold; 071 defined role TOMLs; 072 built the adapter sync engine; 073 built the UX-free wizard library. **074 is the surface** — a single `echoctl` binary that the user types to onboard (`init`), to verify health (`doctor`), to uninstall (`uninstall`), and to run multi-agent workflows (`run`).

**Binary rename rationale (r2 codex-ops F1 HIGH fix; supersedes the decision-archive `echo` reference).** The decision archive at `raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` lists `/usr/local/bin/echo` as the CLI path. That was wrong: `echo` is a POSIX shell builtin in bash, zsh, and dash; `npm link` cannot make `echo init` invoke this CLI because the shell intercepts the builtin before PATH lookup (resulting in `echo init` printing literally `"init\n"`). The binary is renamed to `echoctl` here — following the `kubectl` / `systemctl` / `launchctl` convention — to be (a) reachable from any standard shell, (b) distinctive (no builtin collision), (c) self-documenting ("ECHO control"). The product name "ECHO" is unchanged; only the verb the user types moves. After-Completion logs the decision-archive update.

The binary is small by design. The hard mechanics live downstream:

- **`init`** drives 073's `createWizard()` end-to-end. 073 ships steps 2-5; 074 wraps with Step 1 ("Welcome") + Step 6 ("Done"), surfaces user confirmation between detect → wire → probe, and renders the typed results 073 returns.
- **`doctor`** reads `~/.echo/state/`, pings the daemon's MCP endpoint, scans for orphaned `adapter-sync.lock`, and re-probes each wired agent. Reports actionable status; never mutates state.
- **`uninstall`** is the inverse of 072's writes. Strips the `<!-- BEGIN ECHO --> ... <!-- END ECHO -->` block from CLAUDE.md / AGENTS.md, removes `mcp_servers.echo` / `mcpServers.echo` from codex / cursor configs, removes the per-agent ECHO-owned skill files, and (with `--purge-state`) removes `~/.echo/` itself.
- **`run`** is the runtime role-plugging primitive. Loads a workflow TOML from `~/.echo/workflows/<name>.toml`, matches each step's `role` against the onboarded agents' capabilities, picks an agent, and dispatches a spawn. 075 will ship the first actual workflow definitions; 074 ships the **mechanism**, not the workflows.

The split rule: anything that decides *what* to onboard, sync, or wire belongs upstream (070–073). 074 owns *flow* — the user-facing arc, the human-readable error copy, and the runtime stitching that connects roles to agents.

## Architectural sketch

```
$ echoctl init                                 $ echoctl doctor               $ echoctl uninstall          $ echoctl run <workflow> [--project P]
       │                                          │                          │                            │
       ▼                                          ▼                          ▼                            ▼
  cli/commands/init.ts                       cli/commands/doctor.ts     cli/commands/uninstall.ts    cli/commands/run.ts
       │                                          │                          │                            │
       │ createWizard()  (073)                    │ readState (070)          │ readState (070)            │ workflow/load.ts
       │ wizard.detectAgents()                    │ MCP /mcp ping            │ for each wired agent:       │ workflow/match.ts
       │  ── prompt: confirm subset               │ lockfile probe           │   inverse/markers.ts       │   loadRolesFromDir (071)
       │ wizard.detectProjects()                  │ wizard.probe (073)       │   inverse/codex-config.ts   │   readState (070)
       │  ── prompt: pick default                 │ render report            │   inverse/cursor-config.ts  │ workflow/dispatch.ts
       │ wizard.wire({selected, project})         │                          │   inverse/skills.ts        │   spawn-per-step
       │ wizard.probe(agents)                     │                          │ optional --purge-state:    │
       │  ── render outcomes                      │                          │   rm -rf ~/.echo/          │
       │ wizard.markCompleted()                   │                          │                            │
```

`init` is the orchestrator that gives 073's library API its UX framing. `doctor` is read-only. `uninstall` is the inverse-write counterpart of 072. `run` is the runtime; the workflow library is 075's domain.

## Judgment calls flagged for r1 reviewer

The decision archive leaves several mechanics underspecified. The calls below are the spec author's picks; reviewers should push back if any feels wrong.

- **J1. No third-party CLI framework.** No `commander`, no `yargs`, no `inquirer`, no `chalk`. Arg parsing uses `node:util`'s `parseArgs` (built-in since Node 18, already used elsewhere in the repo's tooling shape). Prompts use `node:readline/promises`. Color is raw ANSI escape sequences gated on `process.stdout.isTTY`. Rationale: the substrate keeps deps tight (the repo today has 7 runtime deps — ajv, ajv-formats, better-sqlite3, chokidar, mcp-sdk, smol-toml; CLI frameworks would ~triple that surface for marginal UX gain). If `parseArgs` proves limiting in dogfooding, the swap-in is bounded; it can happen later.
- **J2. `echoctl run` ships the runtime even though 075 has no workflows yet.** The mechanism (workflow loader + role-matcher + dispatcher) is small and self-contained; shipping it now means 075 only has to write `<workflow>.toml` files, not invent runtime semantics. When no workflow files exist OR the named workflow is not found, `echoctl run` errors with installation guidance (AC5.4). The pre-075 binary still type-checks and tests cleanly; the matcher's only at-runtime input is `onboarding.json`.
- **J3. Workflow file format is intentionally minimal.** V1 ships: `[workflow]` table with `name` + `description`; a `[[step]]` array where each step has `role` (a name matching a `~/.echo/roles/<name>.toml`), `prompt` (string), and optional `inputs` (string-string map). Steps run sequentially; no parallelism, no branching, no error-recovery DSL. Anything more sophisticated is a 075-or-later concern. Rationale: dogfooding will reveal what the workflow language actually needs to express; speculating now is exactly the strategist-drift failure mode that 058 named.
- **J4. Role-matcher picks the highest-capability agent deterministically; no UX prompt mid-`run`.** If multiple onboarded agents satisfy a role's `requires.capabilities`, the matcher picks the one whose `OnboardedAgentProfile` was wired earliest (`wired_at` ascending). This is stable across re-runs and trivially testable. Per-invocation override (`--agent <role>=<id>`) is supported on the `run` command for users who want to pin; without it, dispatch is silent + deterministic. A mid-run prompt would block automated workflow invocation, which is exactly the use case `run` exists to serve.
- **J5. Uninstall is destructive but explicit, and conservative by default.** `echoctl uninstall` removes the ECHO marker block + MCP server entries by default. It does NOT remove `~/.echo/` (state, skills, role TOMLs, adapter cache) unless `--purge-state` is passed. Reason: a user re-running `echoctl init` after a temporary `echoctl uninstall` should not lose their detected-projects history. `--purge-state` is the "I'm leaving for good" branch. Both modes require an interactive `y/N` confirmation unless `--yes` is passed. The confirmation prompt enumerates exactly which files will be touched (read from `onboarding.json`'s `agents[].wired_at`); no surprise writes.
- **J6. `echoctl doctor` is read-only.** It does NOT remove orphaned `adapter-sync.lock` files automatically (072's H1 disposition was "the engine never auto-removes a present lockfile"). `doctor` surfaces the lockfile's mtime + the suggested `rm` command and exits non-zero. A `--fix` flag is explicitly out of scope for V1 (075-or-later); the user runs `rm` themselves. Rationale: doctor's contract is "report"; making it a writer would either re-introduce the TOCTOU mechanism 072 r3-r6 explicitly removed, or duplicate it adjacent. Either is regression risk.
- **J7. The CLI binary is a thin shell; all integration tests use fakes.** No CLI test spawns a real daemon, real `codex exec`, or real `claude --print`. Tests inject the same dependency-injection seams 073 exposed (`detectAgentsDeps.atomStore`, `probeDeps.spawn`, etc.) plus a new `cli/io/prompt.ts` swap (`readPrompt`, `readConfirm`, `readSelect` swapped for canned answers). Production builds of the CLI dynamic-resolve the real implementations. Integration depth: each command's test asserts end-to-end behavior (exit code + stdout match) with fakes wired in.
- **J8. `--project` resolution: explicit flag > cwd's nearest git root > onboarding-state `default_project` > error.** When `--project` is passed, the CLI uses it verbatim (no validation against git-rootedness — user knows their own setup). When absent, walk upward from `cwd` until `.git/` is found; if not found, fall back to `default_project` from `projects.json`. If both are absent, the command errors with "no project context — pass `--project <path>` or run from a git repository or run `echoctl init` to pick a default." Per codex consult in the decision archive: "D as product model, A as CLI default."

## Acceptance Criteria

### AC1 — `src/cli/index.ts` is the entrypoint with argv-driven subcommand dispatch

**AC1.1 — Shebang + bin field + files allowlist.** The file's first line is `#!/usr/bin/env node`. `package.json` gains:

```json
"bin": { "echoctl": "./dist/cli/index.js" },
"files": ["dist/cli/**/*.js", "dist/cli/**/*.d.ts", "package.json", "README.md"]
```

The `files` allowlist (r5 codex F2 MED fix — was missing) is LOAD-BEARING: `dist/` is in `.gitignore`, AC1.1 produces a multi-file emit (`dist/cli/index.js` + `dist/cli/commands/*.js` + `dist/cli/workflow/*.js` + `dist/cli/inverse/*.js` + `dist/cli/io/*.js`), and without `files`, `npm pack` would include ONLY the `bin` target itself (per npm's default-includes rules) — meaning a packed/global install would have `echoctl --version` succeed (the bin entry resolves) but `echoctl doctor` fail with `ERR_MODULE_NOT_FOUND` for `./commands/doctor.js`. **npm semantics: when `files` is set, it SUPERSEDES `.gitignore`** — gitignored paths still get packed if the allowlist names them. AC1.5 smoke test covers this end-to-end by invoking a subcommand against a freshly-packed install.

A new script `"build:cli": "tsc -p tsconfig.cli.json"` (or vite-node bundle equivalent — builder picks the smaller-deps option) emits `dist/cli/`. The daemon's existing `vite-node`-based scripts are unchanged. The `build:cli` script is invoked manually for now (no auto-build in `prepare`); the AC1.5 smoke test runs it explicitly before packing.

**AC1.2 — Subcommand dispatch.** Uses `node:util`'s `parseArgs` with `allowPositionals: true` and `strict: true`. Top-level grammar:

```
echoctl <subcommand> [--flag ...] [positional args]
```

Recognized subcommands: `init`, `doctor`, `uninstall`, `run`, `--help`, `--version`. Anything else exits 2 with usage. `--help` / `-h` at the top level prints all subcommands; `--help` after a subcommand prints that subcommand's help only. `--version` reads `package.json`'s `version` field and prints it.

**AC1.3 — Exit codes.** Conventional UNIX exit codes:

- `0` — success
- `1` — runtime error (subcommand-specific; copy in stderr)
- `2` — usage error (bad flag, unknown subcommand, missing required positional)
- `130` / `143` — SIGINT / SIGTERM (forwarded to child processes during `echoctl run` dispatch)

The dispatcher catches all subcommand-thrown exceptions, prints the message + a 1-line "see `echoctl <cmd> --help`" pointer, and exits `1`. Uncaught exceptions outside the dispatcher (programming bugs) propagate the default Node exit `1` and stack trace.

**AC1.4 — `--quiet` and `--json` global flags.** Both default off.

- `--quiet` suppresses all non-error stdout. Useful for shell-scripting.
- `--json` switches all stdout to newline-delimited JSON. Every line is one structured event with at least `{ event: string, ... }`. Errors go to stderr as plain text regardless. Both flags can stack (`--quiet --json` prints only the final-result JSON line + drops progress events). Tests pin a small fixed set of `event` strings per subcommand (AC7).

**AC1.5 — Shell-reachability smoke test (r2 codex-ops F1 HIGH).** A NEW test at `tests/cli/shell-reachable.test.ts` pins that the linked binary is actually reachable from a real shell. The test:

1. **Build first (r3 codex F2 MED — hermeticity fix).** Run `child_process.spawnSync('npm', ['run', 'build:cli'], { cwd: repoRoot })` BEFORE the install step. AC1.1 deliberately omits a `prepare`/`postinstall` hook (would slow every `npm install` for non-CLI dev paths); the smoke test owns the build. Without this step, a fresh-clone CI run would install a missing `dist/cli/index.js` (broken bin) OR a re-run after `dist/` was deleted would silently pass against stale local build output. Assert build exit status === 0; assert `dist/cli/index.js` exists post-build; assert at least one sibling file exists at `dist/cli/commands/doctor.js` (regression-pin for AC1.1's multi-file `files` allowlist).
2. In a tmpdir, runs `npm pack` then `npm install -g --prefix <tmp-prefix> <packed-tarball>` to install the just-built bin into an isolated prefix.
3. **Reach + subcommand smoke (r5 codex F2 MED — extended to catch the multi-file packaging gap).** Invoke two commands against the installed binary, both via `child_process.spawnSync('bash', ['-c', '<cmd>'], { env: { ...process.env, PATH: '<tmp-prefix>/bin:' + process.env.PATH } })`:
   - **(3a) `--version` reach:** `echoctl --version` → assert `result.status === 0` AND `result.stdout.trim() === <expected version from package.json>`. This pins the bin entry resolution (regression-pin against the shell-builtin collision).
   - **(3b) Subcommand resolution:** `echoctl doctor --help` → assert `result.status === 0` AND the output contains the expected help-text marker (e.g., `"echoctl doctor"` substring). This pins that `dist/cli/commands/doctor.js` ACTUALLY made it into the npm tarball — if AC1.1's `files` allowlist is missing or wrong, this will fail with `ERR_MODULE_NOT_FOUND`, NOT with a help-text mismatch.
4. Negative case: assert `bash -c 'echo --version'` does NOT invoke the CLI (it invokes the shell builtin). This is the regression-pin against future re-renames to a builtin-collision shape.

The test runs only on CI environments where `npm` is on PATH; on local dev runs without that prerequisite, it's gated to a `vitest.skipUnless(hasNpm)` and reported as `skipped` rather than failing. Builder note: this is the single test that catches `bin`-collision class bugs across the npm + shell + PATH stack. If this test is too slow for the default suite (~5s for `npm run build:cli` + ~5s for `npm pack` + `npm install -g`), tag it as `slow` and run on CI only.

### AC2 — `src/cli/commands/init.ts` orchestrates 073's wizard end-to-end with TTY prompts

**AC2.1 — Top-level flow.**

```ts
export async function runInit(opts: InitOpts): Promise<number>;
```

`InitOpts` includes a `wizardFactory?: typeof createWizard` test seam (default = production `createWizard`), a `prompt?: PromptImpl` seam (default = the readline-backed implementation in `cli/io/prompt.ts`), and a `now?: () => Date` (default = `() => new Date()`). Returns the exit code.

**AC2.1.0 — Non-TTY fail-closed guard (r1 codex-ops F2 HIGH).** BEFORE invoking any wizard method, `runInit` MUST check `process.stdin.isTTY`. If false (the process was piped / cron / launchd-spawned without a controlling TTY), exit `2` immediately with stderr message `"echoctl init: non-interactive — a TTY is required. Pipe-driven onboarding via an answer file is a future item."` and DO NOT call `wizardFactory`, `wizard.detectAgents`, or any other wizard method. This guard fires AT THE TOP of `runInit`, before `mcpServerUrl` / `echoVersion` resolution. Rationale: AC6.1's `makeTtyPrompt` falls back to prompt defaults when stdin is not a TTY (Enter ⇒ default = "all detected agents", Enter ⇒ default = "skip default project"); under a pipe, a successful default-cascade would proceed into `wizard.wire()` and mutate `~/.codex`, `~/.claude`, `~/.cursor`, and `~/.echo` WITHOUT any human confirmation. The guard makes init's "needs human confirmation" contract enforceable, independent of how the prompt library is wired. The follow-up `--answer-file` non-interactive path is logged in After-Completion; do NOT add it in this spec.

The flow (post-guard) is exactly the 6 steps of the decision archive:

1. **Welcome** — print a 1-sentence pitch + ETA. Confirm with `[Y/n]`. `n` exits 0.
2. **Detect agents** — call `wizard.detectAgents()`. Render the `DetectedAgent[]` as a numbered list with confidence bucket + signal summary. Prompt: "Confirm subset to wire (default: all `high` + `medium` confidence): [Enter / type comma-separated kinds]." Empty input = default; explicit list = the user's pick (validated against `AgentKind` union).
3. **Detect projects** — call `wizard.detectProjects()`. Render the `DetectedProject[]` ranked by activity. Prompt: "Pick default project (1-N), or Enter to skip." Skip stores `defaultProjectRepoRoot: null`.
4. **Wire** — call `wizard.wire({ selectedAgents, defaultProjectRepoRoot, repoRoot? })` (the `repoRoot?` recovery seam fires only when the AC5.7 retry path is taken — see AC2.3). Render `WireResult`: per-agent action (added/updated/conflict/error), conflict diffs if any. On any conflict, surface 072's pre-built diff + the message-quoted `rm` instruction (for `syncLock`) verbatim; do NOT paraphrase.
5. **Probe** — call `wizard.probe(selectedAgents)`. Render `ProbeOutcome[]`. For `cursor` and `mcp-not-configured` outcomes, print the corresponding remediation copy from AC2.4. Probe failures do NOT block onboarding from completing — the user can finish and address probe failures via `echoctl doctor` later.
6. **Done** — call `wizard.markCompleted()`. Print "You're ready" + the suggested next-action hint (V1: `echoctl run <workflow>` — TBD copy; 075 will populate) + the path to `~/.echo/state/onboarding.json` + the `echoctl uninstall` command. Exit 0.

**AC2.2 — `mcpServerUrl` + `echoVersion` plumbing.** `runInit` resolves both before calling `createWizard`:

- `mcpServerUrl` = `http://127.0.0.1:${port}/mcp` where `port` reads `ECHO_MCP_PORT` (default `38478`), mirroring `src/daemon/index.ts:27-32`'s `resolveMcpPort()`. The CLI does NOT call into the daemon module to avoid pulling in storage / chokidar deps; it reimplements the small resolver inline (~7 LOC) or imports an exported helper if the builder promotes `resolveMcpPort` to a public helper in `src/daemon/lifecycle.ts` (analogous to 073's `resolveDbPath` promotion).
- `echoVersion` reads from `package.json` via `JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).version` (r1 codex F2 HIGH fix). Reasons for this exact form: (a) `import { version } from '...json' assert { type: 'json' }` fails on Node 22 — `assert` import attributes were rejected in favor of `with`; (b) `import pkg from '...json' with { type: 'json' }` exposes `pkg.version` not a named `version` export and is gated on `--experimental-json-modules` in some Node 22 builds; (c) `fs.readFileSync` + `JSON.parse` is portable across every Node version the repo cares about, has no test-fixture fragility, and reuses the `import.meta.url`-relative URL pattern already used elsewhere in the repo. Tests pin this resolution with a fixture package.json that pins a non-default `version` string and asserts the wizard receives it via the `createWizard.echoVersion` argument.

**AC2.3 — Conflict recovery loop.** When `WireResult.syncResult.repoRoot` is populated (072 AC5.7 — `import.meta.url` walk failed in a packaged install), `init` prompts: "ECHO could not locate its source tree. Pass an explicit path: " and re-invokes `wizard.wire({ ...prev, repoRoot: <userInput> })` once. A second failure surfaces the error and exits 1. The `syncLock` and `directorySymlink` sentinels are NOT retried — they need user action (rm the lockfile / resolve the symlink) outside the wizard; `init` prints 072's message verbatim and exits 1.

**AC2.4 — Probe remediation copy (data-driven).** A small constant table in `cli/commands/init.ts` maps each `ProbeOutcome.reason` to a 1-2-line remediation string:

| Reason | Copy |
|---|---|
| `cli-unavailable` | "<binary> not found on PATH. Install it (see <vendor docs URL>) and run `echoctl doctor` to re-probe." |
| `auth-required` | "<binary> is not logged in. Run `<binary> login` and then `echoctl doctor`." |
| `manual-only` (cursor) | "Cursor has no headless CLI. Open Cursor and run any prompt to confirm ECHO MCP is reachable." |
| `mcp-not-configured` (claude-code) | "Claude Code does not have ECHO MCP configured. Run `claude mcp add echo <url>` and then `echoctl doctor`." (the URL is `mcpServerUrl` from AC2.2) |
| `timeout` | "<binary> took longer than 5s to respond. Re-run `echoctl doctor` once if this persists." |
| `unexpected-output` | "<binary> responded but did not echo `pong`. Detail: <first 200 chars>. Run `echoctl doctor` to retry." |

The exact copy is reviewer-tunable; the spec invariant is that every `ProbeOutcome.reason` has a single, deterministic remediation string. Tests assert presence of the binary name + the relevant remediation hint string for each reason.

**AC2.5 — Populate `OnboardedAgentProfile.capabilities` from a static per-agent map (r1 C1 — codex F1 + codex-ops F1, both HIGH).**

073's `wizard.wire()` writes `OnboardedAgentProfile.capabilities: []` for every newly-wired agent (070 schema only requires `string[]`; 073 doesn't populate it). The default role TOMLs at `assets/echo-roles/` declare non-empty `[role.requires].capabilities` (e.g., builder requires `fs.write`, `git.write`, `mcp.echo.write`). Consequence: 074's `echoctl run` matcher reads `capabilities: []`, computes `capabilities ⊇ role.requires.capabilities → false`, and EVERY workflow step fails with `no-onboarded-agent` or `capability-mismatch`. The role-plugging mechanism is dead on arrival after a successful `echoctl init`.

Resolution: 074's `init` is the SOLE writer of `capabilities`. After `wizard.wire()` returns successfully (any subset of `ok: true` agents), and BEFORE `wizard.probe()`, `runInit` reads `~/.echo/state/onboarding.json`, joins each successfully-wired agent's profile to the static map below, and writes the merged state back via `atomicWrite` (`secretSensitive: false`).

```ts
// in src/cli/commands/init.ts
export const AGENT_CAPABILITIES_BY_KIND: Readonly<Record<AgentKind, readonly Capability[]>> = Object.freeze({
  codex: Object.freeze([
    'fs.read', 'fs.write',
    'git.read', 'git.write',
    'network',
    'mcp.echo.read', 'mcp.echo.write',
  ]),
  'claude-code': Object.freeze([
    'fs.read', 'fs.write',
    'git.read', 'git.write',
    'network',
    'mcp.echo.read', 'mcp.echo.write',
  ]),
  // Cursor has no headless CLI in V1; capability is bounded to MCP-read
  // (Cursor's UI is the only path that invokes ECHO MCP for a cursor
  // session, and writes from that path are inherently user-confirmed
  // through the IDE).
  cursor: Object.freeze(['mcp.echo.read']),
});
```

Properties (asserted by AC7.1 and a new AC7.7 case):
- Every entry value is a subset of 071's `Capability` union (`fs.read|fs.write|git.read|git.write|network|mcp.echo.read|mcp.echo.write`); typecheck enforces this via the `Readonly<Record<AgentKind, readonly Capability[]>>` type.
- Order is canonical (the order shown above); the merge writes back in canonical order regardless of prior state so a re-run is byte-stable.
- Re-running `echoctl init` with an agent already wired AND already-populated capabilities → no change if the agents' kinds AND the map are unchanged (idempotent mutation).
- If 073's wire reports `ok: false` for an agent (conflict / error), 074's init does NOT populate that agent's capabilities (keeps the existing `[]` or prior value); the failed agent will be skipped by the matcher until a successful re-wire.

070 + 073 stay unchanged — 074's CLI surface owns the capability decision, not the substrate. This keeps 070's schema generic (`capabilities: string[]`) and preserves 073's "wizard library is UX-free" posture (073 still records the agents; it just doesn't claim to know which capabilities they grant).

If a future spec needs the static map to be data-driven (e.g., per-org capability overrides), the right pattern is a `~/.echo/capabilities.json` overlay that 074's init reads if present and merges over the defaults. That mechanism is OUT OF SCOPE for 074; it's a follow-up.

### AC3 — `src/cli/commands/doctor.ts` is read-only health-check + remediation surface

**AC3.1 — Public surface.**

```ts
export interface DoctorReport {
  daemon: { running: boolean; port: number; mcpReachable: boolean; pidLockPath: string; pidLockHeld: boolean };
  echoHome: { root: string; exists: boolean; onboardingValid: boolean; projectsValid: boolean; schemaVersion: 1 | 'mismatch' | 'missing' };
  syncLock: { present: boolean; path: string; mtimeIso?: string; cleanupCommand?: string };
  agents: { kind: AgentKind; profile: OnboardedAgentProfile | null; probeOutcome: ProbeOutcome | null }[];
  overall: 'healthy' | 'degraded' | 'broken';
}

export async function runDoctor(opts: DoctorOpts): Promise<number>;
```

`DoctorOpts` includes test seams for `probeAgents`, `fetch` (for MCP /mcp HTTP probe), and `now`. Returns exit code: `0` if `overall === 'healthy'`, `1` if `'degraded'` or `'broken'`.

**AC3.2 — Daemon probe.** Resolve port via the same logic as AC2.2. Send a single HTTP POST to `http://127.0.0.1:<port>/mcp` with the headers + JSON-RPC `initialize` envelope below (r3 codex F4 MED fix — the daemon's `StreamableHTTPServerTransport` content-negotiates and 406-rejects POSTs missing either header):

```ts
// Required headers
{
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
}

// JSON-RPC initialize body (matches src/mcp/server.ts contract — uses the same shape the existing watcher dispatch helper uses for active-trigger calls)
{
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'echoctl-doctor', version: <echoVersion from AC2.2> },
  },
  id: 1,
}
```

Treat any 2xx response (within 2s) as `mcpReachable: true`. Connection-refused / ENOTFOUND / timeout / 406 (missing-header bug regression catch) → `false`. AC7.2 fixtures pin both headers' presence by intercepting the fake `fetch` and asserting `init.headers['Accept']` + `init.headers['Content-Type']` exactly match the strings above.

Also stat the PID lock file at `<dataDir>/daemon.pid` (the canonical filename per `src/daemon/lifecycle.ts:55`; r1 codex-ops F5 MED fix — earlier spec text said `echo.pid` which the daemon does NOT write, so `pidLockHeld` would have been permanently `false`); `pidLockHeld: true` if the file exists AND is readable. The two signals are reported independently; a stale PID lock without a reachable daemon is the recoverable-stale-lock shape (`overall = 'degraded'` per AC3.6's truth table).

**AC3.3 — `~/.echo/` integrity.** Stat `ECHO_HOME_PATHS.root`. Read `stateOnboarding` and `stateProjects` via 070's `validateOnboardingState` / `validateProjectsState`. Any validation failure → `schemaVersion: 'mismatch'`. Missing files → `'missing'`. Otherwise `1`. Does NOT auto-recreate; that's `echoctl init`'s job.

**AC3.4 — Sync-lock probe.** Stat `path.join(ECHO_HOME_PATHS.state, 'adapter-sync.lock')`. If present, populate `syncLock.mtimeIso` (so the user can judge staleness) and `syncLock.cleanupCommand` with the shell-quoted `rm -- '<path>'` form (mirroring 072's `syncLock.message` shape). Doctor does NOT remove the file (J6).

**AC3.5 — Per-agent re-probe.** Reads `onboarding.json`'s `agents[]`; for each `OnboardedAgentProfile` with `wired_at !== null`, calls `probeAgents([kind])` (reusing 073's `probeAgents` exactly — same spawn shape, same timeout, same failure mapping). Returns the outcomes. Agents with `wired_at === null` (detected-but-not-wired) report `probeOutcome: null`.

**AC3.6 — Overall rollup (truth table; r1 codex F4 MED fix — earlier wording was contradictory).** The rollup is computed via the explicit table below; ambiguity between AC3.2's "stale lock = degraded" and the earlier "daemon-unreachable = broken" wording is resolved by distinguishing stale-but-recoverable from completely-gone:

| Condition (evaluated top to bottom; first match wins) | `overall` |
|---|---|
| `echoHome.exists === false` OR `echoHome.schemaVersion === 'mismatch'` OR `echoHome.schemaVersion === 'missing'` | `'broken'` |
| `daemon.pidLockHeld === false` AND `daemon.mcpReachable === false` | `'broken'` (daemon completely gone — process killed AND lock unlinked, OR never ran) |
| `daemon.pidLockHeld === true` AND `daemon.mcpReachable === false` | `'degraded'` (stale lock from crashed prior run — recoverable by user re-launching the daemon) |
| `syncLock.present === true` | `'degraded'` (orphaned adapter-sync lock — user must `rm` it; surfaced with the shell-quoted cleanup command per AC3.4) |
| Any agent with `wired_at !== null` has `probeOutcome.probed === false` AND `probeOutcome.reason !== 'manual-only'` (cursor's manual-only is healthy) | `'degraded'` |
| Otherwise | `'healthy'` |

The table is encoded in a `computeOverall(report: DoctorReport): 'healthy' \| 'degraded' \| 'broken'` pure function in `src/cli/commands/doctor.ts`; AC7.2 exercises each row of the table independently with a tailored fixture (one case per row, plus the healthy baseline).

**AC3.7 — Output.** Default human-readable: a 1-line summary + per-section breakdown + (if degraded/broken) a "Recommended actions:" block. `--json` emits the `DoctorReport` verbatim on one line.

### AC4 — `src/cli/commands/uninstall.ts` inverts 072's adapter writes (and optionally `~/.echo/`)

**AC4.1 — Public surface.**

```ts
export interface UninstallOpts {
  purgeState?: boolean;            // --purge-state: also rm -rf ~/.echo/ (gated by zero cleanup conflicts; see AC4.1 step 5)
  forcePurge?: boolean;            // --force-purge: overrides the conflict-safety gate on --purge-state (r2 codex-ops F4 MED)
  yes?: boolean;                    // --yes: skip the interactive confirmation
  // test seams
  prompt?: PromptImpl;
  now?: () => Date;
}

export async function runUninstall(opts: UninstallOpts): Promise<number>;
```

Reads `OnboardingState` from `~/.echo/state/onboarding.json`. If the state file is missing or invalid, prints "Nothing to uninstall — no onboarding state found" and exits 0. If `agents` is empty (no agents were ever wired), same exit. Otherwise:

1. Enumerate the per-agent files that WILL be touched (computed from `agents[].id` + 072's adapter cache records).
2. Print the enumeration. Prompt `[y/N]` (unless `--yes`).
3. For each wired agent (in `onboarding.json` order):
   - `codex` → call `inverse/markers.ts` on `~/.codex/AGENTS.md`; call `inverse/codex-config.ts` on `~/.codex/config.toml`.
   - `claude-code` → call `inverse/markers.ts` on `~/.claude/CLAUDE.md`; call `inverse/skills.ts` for the skill files (see AC4.4 for which).
   - `cursor` → call `inverse/cursor-config.ts` on `~/.cursor/mcp.json`.
   - Per-agent errors do NOT abort the loop (continue to the next agent), but they ARE tracked into `cleanupConflicts: { agent: AgentKind; file: string; reason: string }[]` for exit-code derivation + the `--purge-state` safety gate.
4. **Exit code derivation (r2 codex-ops F4 MED fix — earlier spec exited 0 even on partial-failure summaries, hiding the residual-config risk from automation):**
   - `cleanupConflicts.length === 0` AND no programming-level errors → exit 0.
   - `cleanupConflicts.length > 0` → exit 1; the human-readable summary names each unresolved file + its reason; the JSON output lists `cleanupConflicts` verbatim.
5. **`--purge-state` safety gate (r2 codex-ops F4 MED).** Only proceeds if `cleanupConflicts.length === 0`. Branch:
   - **No conflicts:** prompt a second time ("This will permanently remove `~/.echo/` including all detected-projects history and adapter caches. Continue? [y/N]"), then `rmSync(ECHO_HOME_PATHS.root, { recursive: true, force: true })`.
   - **Conflicts present AND `--purge-state` requested AND `--force-purge` NOT requested:** refuse with stderr message naming the un-cleaned files + the AgentKind they belong to + the recommendation to resolve manually (or re-run with `--force-purge`). Exit 1. `~/.echo/` is NOT removed; the in-progress cleanup state is preserved for the user to triage.
   - **Conflicts present AND `--force-purge` requested:** print a stern warning enumerating the residual ECHO config in `~/.codex` / `~/.claude` / `~/.cursor` (read from the conflict list), prompt `[y/N]` (skipped on `--yes`), then `rmSync(ECHO_HOME_PATHS.root, ...)`. Exit 0 (the user explicitly accepted the residual-config risk).
6. Print a 1-line summary + the path to `~/.echo/state/onboarding.json` if it still exists (for transparency).

`UninstallOpts` gains `forcePurge?: boolean` (the `--force-purge` flag).

**AC4.2 — `inverse/markers.ts`.**

```ts
export interface StripMarkersOpts { filePath: string; }
export type StripMarkersResult =
  | { action: 'stripped'; filePath: string; bytesBefore: number; bytesAfter: number }
  | { action: 'noop'; filePath: string; reason: 'file-missing' | 'no-markers' }
  | { action: 'conflict'; filePath: string; reason: 'malformed-markers' | 'symlink-target' };

export function stripEchoMarkers(opts: StripMarkersOpts): StripMarkersResult;
```

Reads `filePath` with `readFileSync(filePath, 'utf8')` after an `lstatSync` symlink check (matches 072's markers.ts containment posture). If the file is a symlink → `action: 'conflict'`. If neither `BEGIN_MARKER` nor `END_MARKER` appears → `action: 'noop'` with `reason: 'no-markers'`. If exactly one marker appears (mismatched) → `action: 'conflict'` with `reason: 'malformed-markers'`. If both markers appear: remove everything from the BEGIN line through the END line inclusive, AND collapse the surrounding blank lines so the result doesn't leave a double-blank gap. Use 072's exported `BEGIN_MARKER` / `END_MARKER` constants for the literal strings. Write back via `atomicWrite` with `secretSensitive: false` (these files are not secret-bearing).

**AC4.3 — `inverse/codex-config.ts` and `inverse/cursor-config.ts`.** Each exports a single function:

```ts
// codex-config (TOML)
export function removeCodexMcpEntry(opts: { filePath: string }): {
  action: 'removed' | 'noop' | 'conflict';
  reason?: 'file-missing' | 'entry-missing' | 'parse-error' | 'symlink-target';
};

// cursor-config (JSON)
export function removeCursorMcpEntry(opts: { filePath: string }): {
  action: 'removed' | 'noop' | 'conflict';
  reason?: 'file-missing' | 'entry-missing' | 'parse-error' | 'symlink-target';
};
```

- Parse the file (smol-toml for codex; JSON.parse for cursor). On parse error: `action: 'conflict'` with `reason: 'parse-error'` and message redaction per 072's r15 M2 posture (no slice content in the error).
- If `mcp_servers.echo` (codex) / `mcpServers.echo` (cursor) is absent: `action: 'noop'` / `reason: 'entry-missing'`. Do NOT write the file.
- Otherwise: delete the key, serialize, write back via `atomicWrite` with `secretSensitive: true` (these files frequently contain auth headers — mirrors 072's adapter-to-atomicWrite contract).
- The TOML serializer for codex needs to preserve the rest of the file; smol-toml doesn't do round-trip formatting, so the codex inverse uses a **string-level table-elision approach** (r1 codex-ops F3 HIGH fix — earlier "stop at next `[mcp_servers.<next>]`" was wrong and would delete unrelated user tables like `[profiles.work]` / `[model]` / `[tools]` that commonly follow `[mcp_servers.echo]` in real `~/.codex/config.toml` files; that's production data loss in a secret-bearing config):

  1. Find the line containing `[mcp_servers.echo]` (the ECHO block's start). The match is on a regex `^\s*\[mcp_servers\.echo\]\s*(#.*)?$` evaluated line-by-line; the match must be exact-table-header (not `[mcp_servers.echo.foo]` which is a sub-table the user owns).
  2. Find the next line (after the ECHO start) whose pattern matches `^\s*\[\[?[^\]]+\]\]?\s*(#.*)?$` — i.e., the next TOML **table OR array-of-tables header of ANY name** (not just `[mcp_servers.<next>]`). This is the boundary: everything from the ECHO start line through the line BEFORE this next-header inclusive is the deletable range. If no next header exists, the deletable range runs to EOF.
  3. Delete the range. Preserve everything outside it byte-for-byte: leading-and-trailing whitespace lines, user comments (`# ...`), CRLF vs LF line endings, BOM if present, and absence of trailing newline if the file lacked one.
  4. Collapse exactly one immediately-preceding AND one immediately-following blank line (if present); if the ECHO block was the first table in the file, the result file may start with whitespace from the preserved preamble — leave it. The goal is "diff outside the ECHO block is empty"; idempotent re-run on a file without `[mcp_servers.echo]` is `action: 'noop'`.

  AC7 fixtures pin: (a) ECHO block followed by `[profiles.work]` → ECHO removed, `[profiles.work]` survives byte-for-byte; (b) ECHO block at EOF → file ends with preceding content byte-for-byte; (c) ECHO block followed by `[[tools]]` (array-of-tables header) → ECHO removed, `[[tools]]` survives; (d) CRLF line endings preserved; (e) BOM preserved; (f) no-trailing-newline file stays no-trailing-newline after deletion; (g) comment lines outside the ECHO block survive byte-for-byte.

**AC4.4 — `inverse/skills.ts`.** Removes the per-user Claude Code command files that 072's `syncClaudeSkills` wrote. **Ownership proof is byte-equality against `~/.echo/skills/<skill>.md` — NOT a first-line marker** (r1 codex F5 MED fix per 058 disposition-discipline: the originally-proposed `<!-- echo-owned-skill -->` marker would push existing skills' YAML frontmatter `---` delimiter off line 1 — every skill in this repo opens with frontmatter — breaking metadata parsers. Per the "prefer removal over deeper patching of a recently-added mechanism" rule, the marker mechanism is dropped entirely; byte-equality is sufficient proof of ownership AND requires no paired 072 change).

```ts
export function removeEchoClaudeSkills(opts: {
  targetDir?: string;        // default: path.join(homedir(), '.claude/commands')
  echoSkillsDir?: string;    // default: ECHO_HOME_PATHS.skills — the canonical source-of-truth for "what ECHO wrote"
  skillNames: readonly string[];
}): {
  removed: string[];
  skipped: { filename: string; reason: 'missing' | 'source-missing' | 'user-modified' | 'symlink' }[];
};
```

For each `<skill>.md` filename:
1. Target `<targetDir>/<skill>.md` absent → skipped with `reason: 'missing'`.
2. Target is a symlink (`lstatSync` discriminator) → skipped with `reason: 'symlink'`. Mirrors 072's symlink-guard posture; we never delete through symlinks.
3. Source `<echoSkillsDir>/<skill>.md` absent → skipped with `reason: 'source-missing'`. (The user has a stray `~/.claude/commands/<skill>.md` whose ECHO source has been deleted — possibly from a partial uninstall + `--purge-state`; defer to the user.)
4. Read both files; if byte-equal → `unlinkSync(target)` and push to `removed[]`. If they differ → skipped with `reason: 'user-modified'`. (The user has hand-edited their `~/.claude/commands/<skill>.md` since last sync; do not delete their work.)

Rationale for byte-equality as the ownership proof: `~/.echo/skills/<skill>.md` is the canonical source-of-truth that 072's `syncClaudeSkills` copied FROM. If the target byte-matches the source, the target is verifiably what ECHO wrote (no marker required); if it differs, the user edited it post-sync (or it was never written by ECHO). The check is robust under: (a) ECHO updating skill contents over time (re-sync rewrites both; byte-equality holds), (b) user-edited targets (differ; preserved), (c) third-party skills the user installed alongside ECHO's (no `<echoSkillsDir>` counterpart; source-missing). No mutation of 072 needed.

**`skillNames` source: enumerate `~/.echo/skills/*.md`** (r2 codex F3 MED fix — earlier spec scoped to "union of `role.skills` across default role TOMLs" but 072's `syncClaudeSkills` copies EVERY `.md` from `~/.echo/skills/` to `~/.claude/commands/`, not just the role-referenced subset. At the pinned SHA, `~/.echo/skills/review-queue-cursor.md` is copied even though no default role names it — under the role.skills enumeration, uninstall would leave that file orphaned). The runUninstall caller computes `skillNames` as `readdirSync(ECHO_HOME_PATHS.skills).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))` — the source-of-truth for what ECHO actually copied. **Degenerate cases:**

- `~/.echo/skills/` missing → `skillNames: []`; `removeEchoClaudeSkills` is a no-op (empty `removed[]`, empty `skipped[]`); not an error.
- `~/.echo/skills/` empty → same as missing; no-op.
- `~/.echo/skills/<x>.md` exists but `~/.claude/commands/<x>.md` does NOT exist → that filename ends up in `skipped` with `reason: 'missing'`; not an error.

This enumeration source also REMOVES 074's uninstall-path dependency on a valid `loadRolesFromDir` (one less failure mode at uninstall time). The role-TOML load is no longer relevant to AC4.4; it's only used by AC5 (which has its own `skillsRoot: ECHO_HOME_PATHS.skills` per r2 codex F1 disposition).

### AC5 — `src/cli/commands/run.ts` loads a workflow, matches roles to agents, dispatches

**AC5.1 — Workflow file format (TOML).**

Workflows live at `ECHO_HOME_PATHS.workflows` (a new slot in 070's frozen `ECHO_HOME_PATHS` — small 070 extension, also covered by `ensureEchoHome()` mkdir). Filename grammar mirrors 071's role-file rule: `^[a-z][a-z0-9-]*\.toml$`. Schema:

```toml
[workflow]
name = "review-pending"           # MUST equal filename minus .toml; mismatch → ValidationError
description = "..."               # free-form prose
schema_version = 1                # MUST be 1 in V1; mismatch throws (r1 codex F3 MED — unified on the same `schema_version` vocabulary 070's `OnboardingState.schema_version` uses; the earlier `version = 1` spelling is removed)

[[step]]
role = "reviewer"                 # MUST correspond to ~/.echo/roles/<name>.toml
prompt = "Review the diff at..."  # the spawn payload; ${VAR} substitution from `inputs` is allowed
inputs = { ref = "HEAD", base = "main" }   # optional; string-string map

[[step]]
role = "strategist"
prompt = "..."
```

Loader at `cli/workflow/load.ts` exports:

```ts
export interface Workflow {
  readonly name: string;
  readonly description: string;
  readonly schemaVersion: 1;        // typed-exposed; NOT silently discarded (r1 codex F3 MED — earlier spec had the loader drop the field, which would fail strict-unknown-key from any builder fixture that included it)
  readonly steps: readonly WorkflowStep[];
  readonly sourcePath: string;
}
export interface WorkflowStep {
  readonly role: string;
  readonly prompt: string;
  readonly inputs: Readonly<Record<string, string>>;
}
export function loadWorkflow(filePath: string): Workflow;
export function listWorkflows(workflowsDir: string): Workflow[];
```

Validation parallels 071: strict-unknown-key rejection, `schema_version === 1` pin (mismatch throws `WorkflowValidationError` naming the file + the offending version), filename ↔ name agreement, non-empty `steps[]`, role-name grammar `^[a-z][a-z0-9-]*$`. Errors throw a typed `WorkflowValidationError` with file path + field name.

**AC5.2 — Role-matcher at `cli/workflow/match.ts`.**

```ts
export interface AgentMatch {
  role: string;                   // workflow step's role name
  pickedAgent: AgentKind | null;  // null if no onboarded agent satisfies
  reason: 'matched' | 'no-onboarded-agent' | 'role-unknown' | 'capability-mismatch';
  resolvedSandbox?: 'read-only' | 'workspace-write';   // r2 codex F2 HIGH fix — carries Role.sandbox so the dispatcher needs no roles[] reference; populated iff reason === 'matched'
}

export function matchRolesToAgents(opts: {
  steps: readonly WorkflowStep[];
  roles: readonly Role[];           // loaded via 071's loadRolesFromDir
  onboarded: readonly OnboardedAgentProfile[];
  override?: ReadonlyMap<string, AgentKind>;   // from `--agent <role>=<id>` CLI flag
}): readonly AgentMatch[];
```

For each step (reason taxonomy clarified per r2 codex F4 MED — the r1 ambiguity between AC5.2 and AC7.7 case 8 is resolved by the explicit rules below):

1. Look up `Role` by `step.role` in `roles[]`. Not found → `reason: 'role-unknown'`; do NOT populate `resolvedSandbox`.
2. If `override.has(step.role)`: pick the override directly. Validate (a) the override agent IS in `onboarded[]` AND (b) its `capabilities` ⊇ `role.requires.capabilities`. If (a) fails → `reason: 'no-onboarded-agent'`; if (b) fails → `reason: 'capability-mismatch'`. Otherwise → `reason: 'matched'` + `resolvedSandbox: role.sandbox`.
3. Otherwise (no override):
   - **Step 3a — collect the agent pool.** Filter `onboarded[]` to entries whose `wired_at !== null` AND whose `kind` is one of the AgentKinds the role could plausibly accept (V1 = all three; future capability-typed roles may scope further). Call this `pool`.
   - **Step 3b — `no-onboarded-agent` branch.** If `pool` is empty → `reason: 'no-onboarded-agent'`. **Semantic:** the user has zero wired agents capable of any role of this shape. Distinct from 3c.
   - **Step 3c — capability filter.** Filter `pool` to entries whose `capabilities` ⊇ `role.requires.capabilities`. If the filtered set is empty (pool was non-empty; agents exist but are under-permissioned) → `reason: 'capability-mismatch'`. **Semantic:** agents are wired but their populated capabilities (per AC2.5's `AGENT_CAPABILITIES_BY_KIND`) lack what the role requires — typical when a role requires a capability not in the V1 vocabulary.
   - **Step 3d — pick.** Non-empty filtered set → pick the entry with earliest `wired_at` (deterministic; J4). `reason: 'matched'` + `resolvedSandbox: role.sandbox`.

The two-stage filtering (3b before 3c) is load-bearing: it lets callers distinguish "wire more agents" (3b) from "this role's capability requirement is unsatisfiable with the current default capability map" (3c) — two genuinely different remediation paths.

The matcher does NOT spawn anything; it's pure. The dispatcher (AC5.3) reads `match.resolvedSandbox` directly — no `roles[]` parameter needed.

**AC5.3 — Dispatcher at `cli/workflow/dispatch.ts`.**

```ts
export interface DispatchOutcome {
  step: WorkflowStep;
  match: AgentMatch;
  spawn: { exitCode: number; stdout: string; stderr: string; timedOut: boolean; elapsedMs: number } | null;
  error?: string;
  signal?: 'SIGINT' | 'SIGTERM';                        // r2 codex-ops F2 — populated on interrupted outcomes; runRun reads this to derive the 130/143 exit code
}

export async function dispatchWorkflow(opts: {
  workflow: Workflow;
  matches: readonly AgentMatch[];
  spawn?: typeof import('node:child_process').spawn;   // test seam
  timeoutMs?: number;                                   // default 60_000 — longer than probe's 5s; real work
  projectRoot: string;                                  // resolved per J8
  signal?: AbortSignal;                                 // SIGINT forwarding from the CLI; AC5.4 step 9 installs the handlers that abort this controller
  receivedSignal?: { current: 'SIGINT' | 'SIGTERM' | null };  // r2 codex-ops F2 — mutable ref the parent SIGINT/SIGTERM handler writes the signal name into before calling controller.abort(); the dispatcher reads it to populate DispatchOutcome.signal
  signalGate?: {                                        // r4 codex F3 MED — TEST-ONLY scheduler hook for AC7.4 cases 12a/12b; r5 C1 fix — semantics revised so the gate fires at iteration TAIL (not top), guaranteeing the next iteration's step 0 aborted check observes any signal emitted from the gate
    beforeNextSpawn?: () => Promise<void>;              // awaited at the END of each loop iteration (AFTER step 6's outcome push, BEFORE looping back to the next iteration's step 0); production defaults to Promise.resolve()
  };
}): Promise<DispatchOutcome[]>;
```

**`signalGate` test seam (r4 codex F3 MED + r5 C1 placement fix).** `signalGate` is purely a test scaffolding hook — production never sets it; the default no-op adds no observable behavior. Its job is to give the AC7.4 cases 12a/12b a DETERMINISTIC point to inject `process.emit('SIGTERM')` AFTER step N's outcome is recorded but BEFORE step N+1's iteration begins. **Placement (r5 C1 fix):** the gate fires at the **TAIL** of each iteration (after step 6's outcome push, before the loop returns to step 0 for the next iteration), NOT at the iteration top. The earlier r4 spec placed it at the top after step 0's aborted check, which created an ambiguity — if the gate emits SIGTERM on the first call it fires before step 1 (wrong window); if it emits only on the second call it fires AFTER the aborted check for step 2 so step 2 spawns anyway. Tail placement closes both ambiguities: the gate-emitted signal arrives BEFORE iteration N+1's step 0 aborted check, which then catches it and produces an `interrupted` outcome for step N+1 (or breaks before it if step N was the last). A symmetric `runRun`-side gate (`beforeExitDerivation`) handles case 12b's post-final-step injection — see AC5.4.

The seam is intentionally narrow: only the between-iteration boundary (one hook) + one runRun-side post-final-step hook. Mid-step signal delivery uses the existing `signal: AbortSignal` (no gate needed). This bounded surface is what keeps the seam from becoming a generic scheduler/test framework.

For each step (sequential, no parallelism per J3):

0. **Pre-iteration `signal.aborted` check (r3 codex-ops F1 HIGH — defense-in-depth for the between-step gap).** Before processing the step (i.e., at the top of each loop iteration), check `opts.signal?.aborted === true`. If true, append `DispatchOutcome` for the current step with `spawn: null, error: 'interrupted', signal: opts.receivedSignal?.current ?? 'SIGTERM'` and BREAK the loop (no further steps). Combined with `runRun`'s AC5.4 step 10 priority check, this closes the between-step gap where SIGTERM arrives after step N exits 0 but before step N+1's spawn() call. NOTE: the load-bearing primary closure for this gap is AC5.4 step 10's `receivedSignal.current` priority check (which fires regardless of outcomes); step 0 here is defense-in-depth so the outcome array correctly records the interrupted step for observability.

1. If the corresponding `AgentMatch.pickedAgent` is null: skip with `error: <match.reason>`; do NOT spawn. Append to outcomes.
2. **Read the sandbox flag from `match.resolvedSandbox`** (r2 codex F2 HIGH fix — earlier spec told the dispatcher to "look up the Role" but the public signature accepts only `workflow + matches`, breaking the data flow; carrying `resolvedSandbox` on `AgentMatch` keeps the dispatcher pure-from-matches). The mapping into spawn args:
   - `resolvedSandbox === 'workspace-write'` → spawn arg `--sandbox workspace-write` (codex) / no equivalent flag for claude (claude's permissions are global; constraining per-step is out-of-scope for V1).
   - `resolvedSandbox === 'read-only'` → spawn arg `--sandbox read-only` (codex) / no equivalent flag for claude.
   - `resolvedSandbox === undefined` (only possible when `reason !== 'matched'`, which Step 1 already returned on): unreachable; if hit, throw a programmer-error.
   The sandbox value is taken FROM THE MATCHED ROLE (carried via `AgentMatch.resolvedSandbox`), NOT from a workflow-step field; future workflow-step-level overrides are out of scope.
3. Spawn per agent kind (mirrors 073's probe AC6.2 commands; the prompt is the step's `prompt` with `${VAR}` substituted from `inputs`). **All spawns MUST pass `{ cwd: opts.projectRoot, env: process.env }`** (r1 codex-ops F4 MED fix — earlier spec resolved `projectRoot` per J8 but never threaded it into the spawn, so `echoctl run --project /repo` from a different cwd would launch the child against the caller's cwd instead of `/repo`).
   - `codex` → `spawn('codex', ['exec', '--sandbox', <fromStep2>, '--', <prompt>], { cwd: projectRoot, env: process.env })`.
   - `claude-code` → `spawn('claude', ['--print', '--no-stream', '--output-format', 'text', '--', <prompt>], { cwd: projectRoot, env: process.env })`.
   - `cursor` → never matched in practice (cursor's role profile has no automatable capability surface in V1). If somehow matched, skip with `error: 'cursor-not-dispatchable'`.
   **On `ENOENT`** (binary not on the spawn's effective PATH; r2 codex-ops F3 MED): catch the spawn error, append `DispatchOutcome` with `spawn: null, error: 'cli-unavailable: <agent> not found on PATH'`. Do NOT auto-normalize PATH (Heisenbug across shells); do NOT persist binary paths in onboarding.json (scope creep); the actionable error message + the documented limitation are sufficient. Per AC5.3 step 5, the workflow then STOPS — subsequent steps skipped — and `runRun` returns non-zero. **PATH requirement (r3 codex F3 + codex-ops F3 — replaces the earlier false `--agent <abs-path>` escape-hatch claim per 058 disposition-discipline removal):** `echoctl run` under launchd / cron / Raycast / minimal-PATH launching contexts requires the agent binaries (`codex`, `claude`) on the launching environment's PATH. The launchd plist pattern used by 072's daemon install (which sets PATH explicitly) is the reference recipe. A future `--agent <role>=<absolute-path>` override is a follow-up item if dogfooding surfaces real demand; the current `agentOverrides: ReadonlyMap<string, AgentKind>` does NOT support paths, and adding path support would mean a new override type + parser regex + matcher validation + dispatch wiring + new test cases — out of V1 scope.
4. Wait for exit (or `timeoutMs` — SIGTERM the child, set `timedOut: true`). Append the outcome.
5. **Step failure handling:** if a step's `spawn.exitCode !== 0` OR `spawn === null` (the ENOENT branch above), the dispatcher STOPS — subsequent steps are not run. The outcome array is returned with all completed steps + the failing step (subsequent steps are not in the array). V1 posture; 075-or-later may add `[step].continue_on_failure` if dogfooding shows the need.
6. **`signal.aborted` mid-step (r2 codex-ops F2 HIGH fix — earlier spec returned partial outcomes silently so `runRun` could exit 0 on a SIGTERM-interrupted workflow):** kill the in-flight child (SIGTERM), append `DispatchOutcome` with `spawn: { ...partialSpawn, exitCode: -1, timedOut: false }, error: 'interrupted', signal: opts.receivedSignal` (the signal name is set by `runRun`'s SIGINT/SIGTERM handler before calling `controller.abort()`). The outcome array contains all completed steps + the interrupted step. `runRun` (AC5.4 step 9) reads the `error: 'interrupted'` outcome and exits with the corresponding shell signal exit code (130 / 143), never 0.

7. **Iteration-tail gate await (r5 C1 placement fix).** After the outcome for the current step has been pushed to the outcomes array AND BEFORE the loop returns to step 0 for the next iteration, `await (opts.signalGate?.beforeNextSpawn?.() ?? Promise.resolve())`. In production the gate is undefined → single microtask, no observable effect. In tests, the fixture's gate implementation can `process.emit('SIGTERM')` here; the gate-emitted signal then triggers `controller.abort()` BEFORE iteration N+1's step 0 aborted check runs, so step 0 catches it and produces the `interrupted` outcome for step N+1 (or breaks before any iteration when there is no step N+1). This placement closes the r5 C1 ambiguity around iteration-top placement.

**AC5.4 — Top-level `runRun()` orchestrator.**

```ts
export async function runRun(opts: {
  workflowName: string;
  projectFlag?: string;                                  // --project <path>
  agentOverrides?: ReadonlyMap<string, AgentKind>;       // --agent reviewer=codex (repeatable)
  json?: boolean;
  // test seams
  workflowsDir?: string;                                 // default ECHO_HOME_PATHS.workflows
  rolesDir?: string;                                     // default ECHO_HOME_PATHS.roles
  stateOnboardingPath?: string;                          // default ECHO_HOME_PATHS.stateOnboarding
  stateProjectsPath?: string;                            // r4 codex F2 MED fix — default ECHO_HOME_PATHS.stateProjects; J8 needs this to fall back to `default_project` when --project absent + cwd-git-root absent
  spawn?: typeof import('node:child_process').spawn;
  now?: () => Date;
  signalGate?: {                                        // r4 codex F3 MED — TEST-ONLY scheduler hook; forwards `beforeNextSpawn` to dispatchWorkflow; adds `beforeExitDerivation` for the post-final-step case 12b injection point
    beforeNextSpawn?: () => Promise<void>;              // forwarded to dispatchWorkflow opts.signalGate
    beforeExitDerivation?: () => Promise<void>;         // awaited AFTER dispatchWorkflow resolves + outcomes rendered, BEFORE step 10's computeExitCode runs; production no-op
  };
}): Promise<number>;
```

1. Resolve project root per J8 — explicit flag > cwd's nearest git root > onboarding-state `default_project` > error. Implementation (r4 codex F2 MED fix — earlier spec said "fall back to `default_project` from `projects.json`" but `runRun` didn't read `projects.json`): (a) if `opts.projectFlag` is non-empty → use it verbatim. (b) else walk upward from `process.cwd()` until `.git/` is found → use that directory. (c) else read `opts.stateProjectsPath` (default `ECHO_HOME_PATHS.stateProjects`) via 070's `validateProjectsState`; if `projects.default_project` is a non-empty string → use it. (d) else error with the J8 copy ("no project context — pass `--project <path>` or run from a git repository or run `echoctl init` to pick a default") and exit 1. The resolved `projectRoot` flows into `dispatchWorkflow` per AC5.3's `cwd: projectRoot` invariant.
2. Locate workflow file: `path.join(workflowsDir, `${workflowName}.toml`)`. Missing → error: "no workflow `<name>` — installed workflows: <listWorkflows()>" (exit 1).
3. If `workflowsDir` itself is empty or missing → error: "no workflows installed. The 075 backlog item ships the first one; until then, `echoctl run` has nothing to dispatch." Exit 1.
4. `loadWorkflow()` (AC5.1). Validation error → exit 1 with the error message.
5. `loadRolesFromDir(rolesDir, { skillsRoot: ECHO_HOME_PATHS.skills, assertDefaults: true })` (r2 codex F1 HIGH fix — 071's loader walks upward from `sourcePath` searching for `package.json + skills/`; from `~/.echo/roles/` no such ancestor exists, so the load fails before any matching. Passing `skillsRoot` explicitly bypasses the walk and resolves skill files under the canonical `~/.echo/skills/` directory populated by 072's `populateEchoSkills`). Failure → exit 1 with the error message.
6. Read `onboarding.json` via 070's validator. Validation error → exit 1.
7. `matchRolesToAgents()` (AC5.2). If any `AgentMatch.reason !== 'matched'`, print the unmatched roles' reasons (using the explicit `no-onboarded-agent` vs `capability-mismatch` taxonomy from AC5.2 — `no-onboarded-agent` ⇒ "no wired agents at all" remediation; `capability-mismatch` ⇒ "agents wired but under-permissioned" remediation) and exit 1 WITHOUT spawning anything (no partial dispatches when the plan is broken).
8. **Install SIGINT/SIGTERM handlers (r2 codex-ops F2 HIGH + r4 codex-ops F1 MED handler-lifetime fix).** BEFORE calling `dispatchWorkflow`, create `const controller = new AbortController()` and `const receivedSignal = { current: null as 'SIGINT' | 'SIGTERM' | null }`. Register handlers AND wrap THE ENTIRE flow (dispatch + render + exit-code derivation) in the try/finally — `process.off` MUST fire ONLY after the return value is computed (r4 codex-ops F1 MED fix — earlier sketch unregistered handlers BEFORE the exit-code derivation, opening a window where a SIGTERM arriving between dispatch resolution and step 10 evaluation would not be observed by `receivedSignal.current`):
   ```ts
   const onSig = (sig: 'SIGINT' | 'SIGTERM') => () => {
     receivedSignal.current = sig;
     controller.abort();
   };
   const onSigInt = onSig('SIGINT');
   const onSigTerm = onSig('SIGTERM');
   process.on('SIGINT', onSigInt);
   process.on('SIGTERM', onSigTerm);
   try {
     const outcomes = await dispatchWorkflow({ ..., signal: controller.signal, receivedSignal,
       signalGate: opts.signalGate ? { beforeNextSpawn: opts.signalGate.beforeNextSpawn } : undefined });
     // Render BEFORE exit-code derivation so the JSON / human output reflects the full outcome set
     // even when the signal-flag check is about to override the exit code.
     renderOutcomes(outcomes, { json: opts.json });
     // Test-only gate (r4 codex F3 MED) — production no-op; AC7.4 case 12b injects SIGTERM here.
     await (opts.signalGate?.beforeExitDerivation?.() ?? Promise.resolve());
     // Step 10 (below) reads receivedSignal.current as its FIRST priority — handlers must still
     // be installed here for any post-render-pre-return SIGTERM to be observable.
     return computeExitCode(outcomes, receivedSignal);
   } finally {
     process.off('SIGINT', onSigInt);
     process.off('SIGTERM', onSigTerm);
   }
   ```
   The named-handler pattern is mandatory (Node `removeListener` matches by function identity; anonymous wrappers cannot be unregistered — matches the 072 lock-release discipline). The finally-after-return-value-computed ordering is load-bearing for the r3 + r4 SIGTERM-gap closures — the handler MUST outlive the exit-code derivation.
9. `dispatchWorkflow` invocation is INSIDE the try block (see step 8's sketch). It receives `{ ..., signal: controller.signal, receivedSignal }`. Print outcomes (or JSON-emit if `--json`) inside the try block, BEFORE the exit-code derivation.
10. **Exit code derivation (r3 codex-ops F1 HIGH closure — closes the between-step + post-final-step SIGTERM gaps the r2 patch left open; `computeExitCode` runs INSIDE the try block per step 8):** The priority order below is load-bearing — the `receivedSignal.current` check fires FIRST, BEFORE any outcome inspection:
    - **First priority — signal flag wins regardless of outcomes:** If `receivedSignal.current === 'SIGTERM'` → exit 143. If `receivedSignal.current === 'SIGINT'` → exit 130. This check fires even when ALL dispatched outcomes are successful — it closes the gap where SIGTERM arrives in the between-step gap OR after the final child exits 0 but before this exit-code derivation runs (in either case `controller.abort()` fired and set `receivedSignal.current`, but no in-flight child existed to produce an `interrupted` outcome). The signal flag is the single source of truth for "this process was interrupted."
    - **Second priority — interrupted outcome derived signals (defense-in-depth):** If any `DispatchOutcome.error === 'interrupted'` AND `signal === 'SIGTERM'` → exit 143. SIGINT → 130. (Reached only if the first-priority check missed somehow — e.g., a future code change unsets `receivedSignal.current` between abort and exit derivation.)
    - **Third priority — normal success:** If every dispatched outcome has `spawn !== null && spawn.exitCode === 0` AND `receivedSignal.current === null` → exit 0.
    - **Otherwise** → exit 1.
    
    The first-priority check is the load-bearing primary; the second-priority check is defense-in-depth from the r2 disposition. Together: NO path exists where an interrupted process exits 0, regardless of WHEN the signal arrived (mid-step, between-step, post-final-step).

### AC6 — `src/cli/io/prompt.ts` + `src/cli/io/render.ts` are the only I/O primitives

**AC6.1 — `prompt.ts` public surface.**

```ts
export interface PromptImpl {
  readPrompt(message: string, opts?: { default?: string }): Promise<string>;
  readConfirm(message: string, opts?: { default?: boolean }): Promise<boolean>;
  readSelect<T extends string>(message: string, choices: readonly T[]): Promise<T>;
}

export function makeTtyPrompt(): PromptImpl;
export function makeNonInteractivePrompt(defaults: { [key: string]: unknown }): PromptImpl;
```

`makeTtyPrompt()` uses `node:readline/promises` against stdin/stdout. If `!process.stdin.isTTY`, the function returned by `makeTtyPrompt()` instead returns the value of `opts.default` (for prompt/confirm) or the FIRST choice (for select) — **but only if a default is available**; otherwise it throws `NonInteractiveError`. Rationale: piping to the CLI must not hang waiting for input.

`makeNonInteractivePrompt(defaults)` is the test seam. It looks up the prompt's `message` against the `defaults` map; missing entries throw. Tests use this exclusively.

**AC6.2 — `render.ts` public surface.** Each command's renderable type gets one formatter:

```ts
export function renderDetectedAgents(agents: readonly DetectedAgent[], opts: { color: boolean }): string;
export function renderDetectedProjects(projects: readonly DetectedProject[], opts: { color: boolean }): string;
export function renderWireResult(result: WireResult, opts: { color: boolean }): string;
export function renderProbeOutcomes(outcomes: readonly ProbeOutcome[], opts: { color: boolean; remediation: ReturnType<typeof buildRemediationCopy> }): string;
export function renderDoctorReport(report: DoctorReport, opts: { color: boolean }): string;
```

Color is raw ANSI escape sequences (`\x1b[<n>m`), enabled iff `process.stdout.isTTY && !process.env['NO_COLOR']`. The CLI exposes `--no-color` to force-disable. Tests pass `color: false` and assert byte-exact strings.

**AC6.3 — JSON mode.** When `--json` is set, the formatters are skipped — commands directly `process.stdout.write(JSON.stringify(payload) + '\n')` for each event. The JSON event shapes are stable: `{ event: 'init.detect-agents', agents: DetectedAgent[] }`, `{ event: 'init.wire', result: WireResult }`, etc. Tests pin the exact `event` strings (AC7).

### AC7 — Tests pin each command

All under `tests/cli/`. Vitest. Each test sets a tmpdir as `ECHO_HOME` and tears it down in `afterEach`. None touches the real `~/.echo/`, the real daemon, or any real CLI binary.

**AC7.1 — `init.test.ts` (10 cases).**

1. Happy path, all three agents detected (medium+high confidence) → wire OK + probe success for codex + claude-code, manual-only for cursor; exits 0; `onboarding.json` has `completed: true`; **each successfully-wired `OnboardedAgentProfile.capabilities` equals the AC2.5 `AGENT_CAPABILITIES_BY_KIND` entry for that agent's kind, in canonical order** (r1 C1 verification).
2. User declines at Welcome (`n`) → exits 0; no wizard methods called.
3. User picks subset at detect step (`codex` only) → only codex passed to `wire`; cursor + claude-code skipped.
4. User picks no default project at detect-projects step → `defaultProjectRepoRoot: null` passed.
5. `WireResult` returns a marker conflict → renders the diff; exits 0 (probe still runs); `wire_error` recorded; **conflicting agent's `capabilities` NOT populated (stays `[]` from 073's wire)** (r1 C1 verification — only `ok: true` agents get capability writes).
6. `syncLock` sentinel returned by `syncAll` → prints the message verbatim INCLUDING the shell-quoted `rm` command; exits 1 (no probe, no markCompleted).
7. `repoRoot` sentinel returned → prompts the user for an explicit path; one retry succeeds.
8. Probe returns `mcp-not-configured` for claude-code → AC2.4 remediation copy printed naming `claude mcp add echo <url>` with the resolved URL.
9. `--json` mode → emits exactly the documented event stream; no human-readable lines.
10. **Non-TTY guard (r1 codex-ops F2 HIGH verification).** With `process.stdin.isTTY = false` mocked, exits 2 with the AC2.1.0 message; **assert ZERO wizard methods invoked** via a spy on `wizardFactory` — neither `detectAgents`, `detectProjects`, `wire`, `probe`, `summary`, nor `markCompleted` may be called. The fail-closed assertion is the load-bearing one; merely checking exit code is insufficient.
11. **AC2.2 package.json read (r1 codex F2 verification).** With a fixture tmpdir replacing the resolved `package.json` path, write `{ "version": "0.99.99-test" }`; assert `createWizard` is invoked with `echoVersion: '0.99.99-test'`. Repeat with a malformed JSON file → `runInit` exits 1 with a parse-error message naming the file.
12. **AC2.2 mcpServerUrl resolution.** With `ECHO_MCP_PORT = "39999"`, assert `createWizard` is invoked with `mcpServerUrl: 'http://127.0.0.1:39999/mcp'`. With `ECHO_MCP_PORT` unset, assert the default `38478`.

**AC7.2 — `doctor.test.ts` (10 cases — patched per r1).**

1. Healthy state (daemon up + MCP reachable + state files valid + no lockfile + all probes succeed) → `overall: 'healthy'`, exit 0.
2. **`daemon.pid` present + MCP unreachable → `degraded`** (r1 codex F4 MED + codex-ops F5 MED — fixture name corrected from `echo.pid` to `daemon.pid`; outcome matches AC3.6 truth-table row for stale-but-recoverable lock).
2b. **`daemon.pid` absent + MCP unreachable → `broken`** (r1 codex F4 MED — new case for the truth-table's daemon-completely-gone row).
3. `~/.echo/state/onboarding.json` has `schema_version: 2` → `schemaVersion: 'mismatch'`, `broken`, exit 1.
4. `adapter-sync.lock` present with mtime → `syncLock.present: true`, `cleanupCommand` includes shell-quoted `rm`, `overall: 'degraded'`, exit 1.
5. One agent probe fails (`auth-required`) → `degraded`, exit 1, report names the agent + reason.
6. `~/.echo/` does not exist → `broken`, exit 1, suggests `echoctl init`.
7. `--json` mode → emits the `DoctorReport` on one line.
8. Cursor has `wired_at: null` (detected but skipped during init) → `probeOutcome: null`; not counted as failure.
9. **Cursor probe outcome `manual-only` → counted as healthy** (per AC3.6 row: manual-only is NOT a failure).
10. **MCP probe headers + envelope (r3 codex F4 MED verification).** Fake `fetch` records the call; assert `init.headers['Accept'] === 'application/json, text/event-stream'` AND `init.headers['Content-Type'] === 'application/json'`. Assert body parses as JSON-RPC with `method === 'initialize'`, `params.protocolVersion === '2025-06-18'`, `params.clientInfo.name === 'echoctl-doctor'`. Negative case: with the headers omitted, a real-mode test against the daemon's transport returns 406; this assertion is run only when the integration suite is active (gated).

**AC7.3 — `uninstall.test.ts` (9 cases).**

1. No onboarding state → "Nothing to uninstall" + exit 0.
2. Two wired agents → prompt enumerates exactly those files; `y` confirms; both adapters inverted; exit 0.
3. `--yes` skips the prompt → same result.
4. Marker file missing → `stripEchoMarkers` returns noop; uninstall reports it but continues; exit 0.
5. **Marker file is a symlink → cleanupConflicts entry + ECHO block NOT touched + exit 1** (r4 C1 fix — both reviewers caught this case 5 contradicting AC4.1 step 4's "any cleanupConflicts → exit 1" contract; the earlier wording "exit 0 non-fatal per-agent" was a pre-r2-disposition leftover). Per-agent isolation IS preserved: any NON-symlinked sibling files (e.g., another agent's marker file in the same uninstall) ARE still cleaned up; the conflict is reported per-file via `cleanupConflicts: [{ agent: 'claude-code', file: '~/.claude/CLAUDE.md', reason: 'symlink-target' }]`. The load-bearing assertion is observability: automation sees exit 1 and can act on the residual config rather than treating uninstall as complete.
6. `--purge-state` → second prompt confirms; `~/.echo/` removed; `rm -rf` is recursive + force.
7. `--purge-state` + `--yes` → both prompts auto-confirmed.
8. Codex config has hand-edited `[mcp_servers.echo]` (key reordered) → AC4.3 still deletes the table; the inverse does NOT diff-and-conflict (uninstall is "remove regardless").
9. **Skills directory contains a user-modified `<skill>.md` (target byte-differs from `~/.echo/skills/<skill>.md`) → skipped with `reason: 'user-modified'`; byte-equal files removed** (r1 codex F5 MED verification — earlier wording said `reason: 'not-owned'` against a first-line marker which was dropped; AC4.4 now uses byte-equality so the reason set is `'missing' | 'source-missing' | 'user-modified' | 'symlink'`).
10. **Skills directory contains a `<skill>.md` whose `~/.echo/skills/` counterpart is absent → skipped with `reason: 'source-missing'`** (r1 codex F5 MED verification).
11. **`review-queue-cursor.md` removal (r2 codex F3 MED verification).** Fixture: `~/.echo/skills/review-queue-cursor.md` exists + byte-equal copy at `~/.claude/commands/review-queue-cursor.md` + NO default role lists `review-queue-cursor` in its `[role].skills`. Uninstall removes `~/.claude/commands/review-queue-cursor.md` (proving AC4.4's `skillNames` source enumerates `~/.echo/skills/*.md` rather than the role.skills union).
12. **Partial-failure exit 1 (r2 codex-ops F4 MED verification).** Fixture: 072-stripped marker file is a symlink (cleanup conflict) → uninstall exits 1; `cleanupConflicts` contains the entry; ECHO block in non-symlinked sibling files IS still removed (per-agent isolation preserved). Without `--purge-state` requested, `~/.echo/` is NOT touched.
13. **`--purge-state` blocked by conflict (r2 codex-ops F4 MED verification).** Same conflict fixture as #12, but `--purge-state --yes` requested → uninstall refuses the purge with stderr message naming the un-cleaned file; exit 1; `~/.echo/` still exists; no `rmSync` call.
14. **`--force-purge` overrides the safety gate (r2 codex-ops F4 MED verification).** Same fixture + `--force-purge --yes` → prints the stern warning + the residual-config list, then `rmSync(ECHO_HOME_PATHS.root, ...)` fires; exit 0; `~/.echo/` is gone; per-agent residuals (the unresolved symlinked marker file) remain in place AS DOCUMENTED.

**AC7.4 — `run.test.ts` (10 cases).**

1. Happy path — workflow with two steps, both roles match, both spawns exit 0 → exit 0; outcomes JSON shows two `matched` entries.
2. Workflow name not found → "no workflow `<name>` — installed: [...]"; exit 1.
3. Empty workflows directory → "no workflows installed" message; exit 1.
4. Workflow with role that no onboarded agent satisfies → exits 1 BEFORE any spawn; outcome reports `no-onboarded-agent`.
5. `--agent reviewer=codex` override is satisfied → that step dispatches to codex regardless of `wired_at` ordering.
6. `--agent reviewer=cursor` override where cursor lacks capability → `capability-mismatch`; exit 1, no spawn.
7. Step 1 succeeds, step 2's spawn exits non-zero → step 3 NOT run; outcomes array has steps 1+2 only; exit 1.
8. Step timeout (5s spawn returns `timedOut: true`) → outcome records `timedOut: true`; subsequent steps skipped; exit 1.
9. **`--project /fixture/repo` from a git-rootless cwd → fake spawn receives `opts.cwd === '/fixture/repo'`** (r1 codex-ops F4 MED verification — load-bearing assertion is the `cwd` field, not just J8's resolution).
10. `${VAR}` substitution: prompt `"Review at ${ref}"` with `inputs = { ref = "HEAD" }` → spawn receives `"Review at HEAD"`. Missing var → ValidationError pre-dispatch.
11. **Sandbox mapping carried via AgentMatch.resolvedSandbox (r2 codex F2 HIGH verification — was r1 C1).** Workflow with one step whose role has `sandbox = "workspace-write"` and `requires.capabilities = ["fs.write", "git.write"]` → matched agent is codex; **assert `match.resolvedSandbox === 'workspace-write'`** (proves the matcher populated the field); fake spawn receives `args` containing `['exec', '--sandbox', 'workspace-write', '--', <prompt>]` (proves the dispatcher reads from `match.resolvedSandbox`, NOT from a `roles[]` parameter — no `roles` arg is passed to `dispatchWorkflow` in this test). Repeat with `sandbox = "read-only"` → `match.resolvedSandbox === 'read-only'` + args contain `'--sandbox', 'read-only'`.
12. **SIGTERM mid-workflow → exit 143, NOT exit 0 (r2 codex-ops F2 HIGH verification).** Fixture: two-step workflow; step 1's fake spawn exits 0; while step 2's fake spawn is in flight (a controllable promise), the test triggers `process.emit('SIGTERM')`. Assert: `runRun` returns 143 (NOT 0); outcomes array contains step 1 (success) + step 2 (`error: 'interrupted', signal: 'SIGTERM'`); the in-flight child got a SIGTERM (verified via the fake spawn's `kill` recorder). Repeat with SIGINT → exit 130. **The load-bearing assertion is that exit is NEVER 0 on a signal-interrupted workflow regardless of how many earlier steps succeeded.**
12a. **SIGTERM between steps → exit 143, NOT exit 0 (r3 codex-ops F1 HIGH verification — closes the between-step gap r2 left open; r4 codex F3 MED + r5 C1 — uses the `signalGate.beforeNextSpawn` test seam at iteration TAIL for deterministic timing).** Fixture: two-step workflow; step 1's fake spawn exits 0; the test passes `signalGate: { beforeNextSpawn: () => { process.emit('SIGTERM'); return Promise.resolve(); } }` to `runRun`. The `dispatchWorkflow` loop awaits `signalGate.beforeNextSpawn()` at the TAIL of each iteration (AFTER step 6's outcome push, BEFORE looping back to step 0). Semantics: iteration 1 runs steps 0-6 for step 1 (no signal yet — step 0's aborted check returns false), records step 1's success outcome, then awaits the gate which emits SIGTERM. The signal handler runs `controller.abort()`. Iteration 2 begins with step 0's aborted check, which now sees `signal.aborted === true` and appends `DispatchOutcome` for step 2 with `error: 'interrupted', signal: 'SIGTERM'`, then breaks the loop. Assert: `runRun` returns 143; outcomes array contains step 1 (success) + step 2 (interrupted); **step 2's spawn was NEVER called** (verified via the fake-spawn `wasCalledForStep(2) === false` recorder — load-bearing assertion that catches the r5 C1 ambiguity where step 2 could still spawn after SIGTERM under the wrong gate placement); AC5.4 step 10's first-priority `receivedSignal.current === 'SIGTERM'` check fires regardless. Single-step variant: one-step workflow → iteration 1 runs, gate emits SIGTERM at tail, loop checks (no iteration 2 to enter), `dispatchWorkflow` returns with just step 1's success outcome but `receivedSignal.current === 'SIGTERM'` → exit 143 via the first-priority check.
12b. **SIGTERM after final step succeeds → exit 143, NOT exit 0 (r3 codex-ops F1 HIGH verification — closes the post-final-step gap; r4 codex F3 MED + r4 codex-ops F1 MED + r5 codex-ops F2 LOW — uses `signalGate.beforeExitDerivation` test seam AND verifies handler outlives derivation via baseline-relative listener-count).** Fixture: ONE-step workflow; step 1's fake spawn exits 0; the test passes `signalGate: { beforeExitDerivation: () => { process.emit('SIGTERM'); return Promise.resolve(); } }` to `runRun`. `runRun`'s AC5.4 step 8 awaits this gate AFTER `dispatchWorkflow` resolves + outcomes are rendered AND BEFORE `computeExitCode` runs — the EXACT post-final-step window. Assertions:
    - **(a) Exit code:** `runRun` returns 143 even though every outcome in the array is successful — the load-bearing first-priority `receivedSignal.current` check fires.
    - **(b) Handler lifetime (r5 codex-ops F2 LOW fix — baseline-relative, NOT zero-absolute):** capture `const baseline = process.listenerCount('SIGTERM')` BEFORE invoking `runRun`. During the `beforeExitDerivation` gate's execution, assert `process.listenerCount('SIGTERM') >= baseline + 1` (runRun's handler is installed alongside any pre-existing listeners — e.g., from a Vitest worker or future embedded caller). After `runRun` returns, assert `process.listenerCount('SIGTERM') === baseline` (runRun restored the count it found, not zero — does NOT disturb listeners it didn't own). The baseline-relative shape makes the test order-independent and embed-friendly. This sub-assertion is the load-bearing case 12b pin — it catches a regression where the handler is unregistered before the gate's SIGTERM fires OR where runRun leaks a listener after returning.
13. **Spawn ENOENT → cli-unavailable outcome (r2 codex-ops F3 MED verification).** Fixture: fake spawn throws ENOENT for `codex`. Assert: `DispatchOutcome.spawn === null`, `error === 'cli-unavailable: codex not found on PATH'`; subsequent steps skipped; exit 1. The error message contains the literal binary name.
14. **K4 matcher reason taxonomy in runRun output (r2 codex F4 MED verification).** Two sub-fixtures:
    - (a) Zero onboarded agents wired (empty `onboarded[]`) + a workflow needing `reviewer` role → `runRun` exits 1 with `match.reason === 'no-onboarded-agent'` for the step.
    - (b) One onboarded codex with `capabilities: ['mcp.echo.read']` only + a role requiring `['fs.write']` → `runRun` exits 1 with `match.reason === 'capability-mismatch'` (NOT `no-onboarded-agent` — agents exist but are under-permissioned).
15. **J8 default-project fallback (r4 codex F2 MED verification).** Fixture: cwd is a tmpdir with NO `.git/` (git-rootless), `opts.projectFlag` is unset, `opts.stateProjectsPath` points to a `projects.json` with `default_project: '/fixture/repo'`. Assert: `runRun` resolves `projectRoot` to `/fixture/repo`; the fake spawn receives `opts.cwd === '/fixture/repo'`. Negative sub-case: same fixture but `default_project: null` → `runRun` exits 1 with the J8 error copy ("no project context — pass `--project <path>` or run from a git repository or run `echoctl init` to pick a default"). Pins the missing-since-r3 `projects.json` read in `runRun` step 1.

**AC7.5 — Inverse-adapter tests.** One file per inverse module. Each pins the round-trip invariant: a file that 072 wrote (with markers / MCP entry), passed through the inverse, equals the same file MINUS the ECHO-owned region, byte-for-byte outside that region. Negative cases: parse errors → conflict; missing entries → noop; symlinks → conflict.

**Codex-config inverse-test fixtures pin the AC4.3 elision rule (r1 codex-ops F3 HIGH verification — 7 sub-cases):**

1. ECHO block followed by `[profiles.work]` table → ECHO block removed; `[profiles.work]` survives byte-for-byte.
2. ECHO block at EOF → file ends with the preceding content byte-for-byte; no trailing artifacts.
3. ECHO block followed by `[[tools]]` (array-of-tables header) → ECHO removed; `[[tools]]` survives.
4. CRLF line endings throughout → output preserves CRLF on every surviving line.
5. BOM at file start → BOM preserved on output.
6. File without trailing newline → output also without trailing newline.
7. Comment lines (`# user config`) outside the ECHO block → survive byte-for-byte; only the deletable range is removed.

**AC7.6 — Workflow loader tests.** All strict-validation behaviors mirrored from 071's pattern: unknown keys, **`schema_version === 1` round-trip + `schema_version: 2` mismatch throws** (r1 codex F3 MED verification — using `schema_version` not `version`, and the typed `Workflow.schemaVersion` field is exposed by the loader, not silently discarded), filename/name disagreement, empty steps, role name grammar, missing required fields.

**AC7.7 — Workflow matcher tests (10 cases — was 8).** 6 cases covering each branch of the `AgentMatch.reason` enum + the override-precedence + the wired_at tie-breaker determinism. Plus 4 new cases (r1 C1 + r2 K2/K4 verification):

7. **`AGENT_CAPABILITIES_BY_KIND` matcher path.** With three onboarded agents whose `capabilities` were populated per AC2.5 + a workflow step whose role requires `['fs.write', 'mcp.echo.write']`, the matcher returns `pickedAgent: 'codex'` (or `'claude-code'` depending on earliest `wired_at`); never `'cursor'` (cursor's `['mcp.echo.read']` lacks the required write capabilities). **AND `match.resolvedSandbox` equals `role.sandbox`** (r2 K2 verification).
8. **K4 distinction (r2 codex F4 MED verification).** With `onboarded: []` + a role with non-empty `requires.capabilities` → `reason: 'no-onboarded-agent'` (NOT `capability-mismatch`). With `onboarded: [{ kind: 'codex', capabilities: [] }]` + the SAME role → `reason: 'capability-mismatch'` (pool non-empty after step 3a; capability filter at step 3c yields empty). The two cases differ ONLY in whether `onboarded[]` is empty; both used to wrongly return the same reason in the r1 spec.
9. **`resolvedSandbox` undefined when not matched (r2 K2 verification).** `reason: 'role-unknown'` → `resolvedSandbox === undefined`. `reason: 'no-onboarded-agent'` → `resolvedSandbox === undefined`. `reason: 'capability-mismatch'` → `resolvedSandbox === undefined`. Only `reason: 'matched'` populates it. Pins the load-bearing invariant: the dispatcher (AC5.3) can rely on `resolvedSandbox` being present iff it would actually spawn.
10. **Override path populates resolvedSandbox (r2 K2 verification).** With `override: new Map([['reviewer', 'codex']])` + a valid pick → `reason: 'matched'` + `resolvedSandbox === role.sandbox` (the override doesn't skip the sandbox lookup).

### AC8 — Builder doc updates

- `docs/BACKLOG.md` row for 074 → moved from Inbox to Active section once claimed (the slash-command `process-backlog` handles this).
- A new short page section: in the existing `wiki/` is NOT touched here (per CLAUDE.md — strategist promotes wiki post-shipment). The After-Completion section below lists candidate wiki pages.
- README/CLAUDE.md → unchanged. The operating-model files are not affected by adding a user-facing binary.

## Out of Scope (Don't Drift)

1. **No daemon-side changes.** The CLI is a pure consumer of 070-073's surfaces. If the builder finds a missing daemon hook, file a follow-up; do not edit `src/daemon/`.
2. **No interactive `--fix` in doctor.** The reviewer-debated lockfile auto-cleanup from 072 r3-r6 stays gone. `echoctl doctor` reports; the user runs `rm`.
3. **No workflow library content.** 074 ships the runtime; the actual `<workflow>.toml` files (cross-vendor change review, etc.) are 075's domain.
4. **No new dependencies.** `parseArgs` + `readline/promises` + raw ANSI + the existing `smol-toml` for TOML loading. No commander/yargs/inquirer/chalk/picocolors.
5. **No `init --resume` flag.** 073's `createWizard` is idempotent within a session, but re-entry from an interrupted prior `echoctl init` is a follow-up if dogfooding surfaces the need. V1 path: re-run `echoctl init` from the top.
6. **No global `echo` install logic.** `echoctl init` does NOT add the binary to PATH, install a launchd plist, or change `~/.zshrc`. The install topology decision is explicitly deferred in the design archive ("After wizard UX is implemented; install is the wrapper around the wizard"). For V1, users run `npm run build:cli && npm link` themselves. A follow-up item will handle distribution.
7. **No upgrade / migration path.** The CLI does not detect "I am newer than the previously-installed CLI" and reconcile state-file schema versions. Schema version mismatches are surfaced by `doctor`; the user reinstalls or runs the migration tool (which does not yet exist) themselves.
8. **No telemetry / usage reporting.** The CLI emits no network requests except the local MCP probe in `doctor`. The "feedback / report-an-issue" copy in the Done step is a printed string, not a callback.
9. **No `--verbose` / log-level tuning.** Logging is a single level: progress events to stdout (suppressible via `--quiet`), errors to stderr, structured events via `--json`. If dogfooding surfaces the need for debug logging, it's a follow-up.
10. **No multi-host / remote-daemon support.** `mcpServerUrl` is always `http://127.0.0.1:<port>/mcp`. Remote ECHO daemons (team / shared) are V2+ per the 2026-05-17 memory note ("Defer team-shape ... to V2+").
11. **No `acquirePidLockPath()` export from `src/daemon/lifecycle.ts`** (r1 codex-ops F5 MED). The PID lock filename `'daemon.pid'` is duplicated in 074's `doctor.ts` rather than imported from the daemon module — this is intentional. Reason: 074 is supposed to be a pure consumer of the daemon's filesystem outputs (per Out-of-Scope #1 "no daemon-side changes"). If the daemon ever renames `daemon.pid`, that change is owned by the daemon item making the rename; updating both sites (daemon + doctor) is a one-line PR-time edit. The alternative — exporting a constant — would force every PR-touching daemon paths to coordinate across modules, which is exactly the coupling 074 is supposed to avoid.
12. **No `--answer-file` non-interactive path** (r1 codex-ops F2 HIGH disposition). AC2.1.0's non-TTY guard fails closed; supporting unattended `echoctl init` is a follow-up item once dogfooding produces real demand (CI install scripts, immutable-infra provisioning, etc.). Until then: TTY required.

## Risks + open questions

- **R1 — `package.json` `bin` + the test runner.** Adding `bin` may interact with `npm link` and the test suite's module resolution. Validation: the builder runs `npm test` end-to-end before claiming AC8; if `bin` triggers vitest module-resolution changes, the builder bounces back with an `agent_notes` question rather than guessing a fix.
- **R2 — TOML round-trip preservation for codex config inversion.** smol-toml does NOT preserve formatting/comments. AC4.3's string-level table-elision approach (find the `[mcp_servers.echo]` header line + the next `[*]` header) is the simpler, more robust alternative; the test fixture pins "user comments outside the ECHO block survive byte-for-byte." Reviewers should pressure-test the edge cases (trailing whitespace, no-trailing-newline files, BOM, CRLF).
- **R3 — `dist/cli/` build path.** The builder picks between `tsc --outDir dist/cli` and a vite-node bundler. Both work; the spec defers to the builder's judgment as long as the bin entry resolves and the produced JS is Node 22+ ESM. If a bundler choice adds a dep, that's a J1 violation — use tsc.
- **R4 — `<!-- echo-owned-skill -->` marker addition to 072 — DROPPED in r1 disposition** (r1 codex F5 MED). The originally-proposed first-line marker conflicted with existing skill YAML frontmatter; AC4.4 now uses byte-equality against `~/.echo/skills/<skill>.md` as the ownership proof, requiring zero 072 change. The byte-equality approach is robust under: ECHO updating skill contents (re-sync rewrites both; byte-equality holds), user-edited targets (differ; preserved), third-party skills (no source counterpart; `source-missing`). Documented here for reviewer audit trail; no live risk remaining.
- **R5 — Workflow file format collisions with 075.** 075 will write the first `<workflow>.toml`. If 075's spec process surfaces fields that 074's loader rejects (strict-unknown-keys), 074 needs an additive update. The format is intentionally minimal in V1; 075 may add fields. Builder note: adding fields is reviewer-prerogative on 075, not 074. Don't over-design upfront.
- **R6 — Non-TTY `init` behavior.** AC7.1 case 10 says non-TTY init exits 2. But a CI-style "install ECHO non-interactively with these answers" use case might emerge in dogfooding. Out of scope for V1; reopen if surfaced.
- **R7 — `echoctl doctor` MCP probe via raw HTTP.** Doctor doesn't use the `@modelcontextprotocol/sdk` client — it sends a single HTTP POST with a minimal `initialize` body. Why: the SDK client adds session-lifecycle complexity (subscribe / list_tools / etc.) that doctor doesn't need. The risk is that a future MCP spec change to the initialize handshake breaks the probe. Mitigation: doctor's MCP probe is a smoke-test ("any 2xx within 2s = reachable"), not a strict-conformance check.
- **R8 — Shell-quoting consistency.** `echoctl doctor`'s `cleanupCommand` and 072's `syncLock.message` both shell-quote a path. The CLI MUST use the SAME shell-quote helper that 072 uses (codex-ops r16 M3). The builder either imports it from 072 (if exported) or duplicates the POSIX single-quote-wrap-with-`'\''` shape EXACTLY. Tests pin byte-equality with a path containing spaces + quotes + brackets.

## Definition of done

1. All 7 ACs pass — full Vitest suite green (including the 1351 existing tests post-073 merge), lint clean, typecheck clean, prettier clean.
2. `npm run build:cli && node dist/cli/index.js --help` prints the subcommand list with no runtime errors.
3. The four-subcommand acceptance: `echoctl init` runs end-to-end against a tmpdir ECHO_HOME with fake atom store + fake spawn and exits 0; `echoctl doctor` against the same returns `healthy`; `echoctl uninstall --yes` cleans up + exits 0 only if zero cleanup conflicts; `echoctl run <name>` errors cleanly when no workflows exist. **`echoctl --version` from a real `bash -c` invocation against an npm-linked install returns the package version + exits 0** (AC1.5 shell-reachability pin).
4. No new runtime dependencies in `package.json` beyond what 070-073 already pulled in.
5. `inverse/skills.ts` byte-equality check verified against the real `~/.echo/skills/` populated by 072 (no 072 changes needed; r1 codex F5 disposition).
6. Agent run-log entry at `raw/internal/agent-runs/<run-date>-2026-05-25-074-echo-cli-binary.md` documenting drift events (if any), AC mapping, and final test counts.
7. Item moved to `pending_review/` with `head_sha` set to the full 40-char SHA (per the memory note `feedback_head_sha_must_be_full_40_char.md`), branch pushed.

## After Completion (Strategist Notes)

- **Wiki page candidates (post-shipment):**
  - `wiki/surfaces/echo-cli.md` — the four subcommands, flag taxonomy, exit codes, `--json` event shapes. Lives next to `wiki/surfaces/mcp-*.md` etc.
  - `wiki/surfaces/onboarding-wizard.md` — UPDATE from 073's pending wiki promotion to include the Step 1 / Step 6 UX framing that 074 added.
  - `wiki/architecture/coord-layer.md` — UPDATE to add `~/.echo/workflows/` to the directory layout + a "Role-plugging at runtime" subsection citing 074's matcher behavior (J4 deterministic tie-break).
- **Workflow-file-format documentation.** Once 075 ships its first workflow, the format gets a `wiki/architecture/workflow-format.md` page. Until then, the format lives only in 074's spec body.
- **Trigger to reopen the deferred questions (decision-archive § "What's deferred"):** after 074 ships AND founder completes their own `echoctl init` as a customer, surface the first-demo question (→ 075) and install-topology question (brew vs pkg vs Raycast Store) in the strategist conversation that follows. Per the decision archive, this is the unblocking trigger for 075.
- **Update the decision archive** (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md` §"Coord layer architecture"): the `/usr/local/bin/echo` path should be updated to `/usr/local/bin/echoctl` post-shipment to match the bin entry. The product-name "ECHO" framing is preserved; only the CLI verb moves. r2 codex-ops F1 HIGH binary-rename rationale lives in this spec's "Binary rename rationale" section; the decision-archive update is just a one-line path correction.
- **Update `docs/BACKLOG.md`:** remove the "*Note: IDs 074-075 are reserved...*" line about 074 once 074 is in `complete/` (075 is still reserved).
- **Drift watchlist:** the `run` subcommand is the most likely strategist-drift surface in follow-up rounds (workflow file format expansion, parallel steps, error-recovery DSL, capability/sandbox flags). Per 058's disposition-discipline rule: when reviewers propose mechanism here, ask first "could the workflow simply be split / rewritten instead?" Prefer removal of complexity over deeper patching.

## R-flagged points for reviewer pushback

Items I am least sure about; reviewers should pressure-test:

- **R1 (J1 — no CLI framework).** Defensible if you accept the dep-tightness premise; reviewers from a CLI-UX background may disagree. Counter-argument: indie AI builders dogfooding the CLI for hours will hit `parseArgs`'s rough edges (no auto `--help` generation, error messages are sparse). If reviewers push back HARD, the swap-in is to `commander` (single dep, well-maintained, no peer-dep cascade). Don't engineer for both.
- **R2 (J4 — deterministic agent picking).** A "round-robin" or "least-recently-used" picker is theoretically more parallelizable. V1: deterministic is testable + debuggable; non-determinism is V1.5+ at the earliest.
- **R3 (AC4.4 — skill-file ownership proof) — RESOLVED in r1.** The originally-proposed `<!-- echo-owned-skill -->` first-line marker was dropped per 058 disposition-discipline (conflicted with existing YAML frontmatter); r1 disposition replaced it with byte-equality ownership against `~/.echo/skills/<skill>.md`. r2 disposition further corrected the enumeration source (from `role.skills` union to `enumerate ~/.echo/skills/*.md`). Both r1 + r2 corrections require ZERO 072 changes; the byte-equality + directory-enumeration approach is robust. Documented here for the convergence audit trail; no live decision remaining.
- **R4 (AC5.4 — workflow runtime without workflows).** Shipping a `run` command that always errors until 075 lands feels weird. The alternative is splitting 074 → "074a init/doctor/uninstall" + "074b run" — but that fragments the CLI's first impression. Single-binary is cleaner; the error message just has to be good.
- **R5 (R7 — raw HTTP MCP probe).** Reviewers familiar with MCP spec evolution should flag if the SDK is moving toward a different initialize-handshake.
