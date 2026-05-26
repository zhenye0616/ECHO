---
id: 2026-05-25-074-echo-cli-binary
title: "`echo` CLI binary — init / doctor / uninstall / run subcommands; runtime role-plugging that picks an agent per role from onboarded capabilities"
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
  - src/cli/inverse/skills.ts                           # AC4.4 — remove ~/.claude/commands/<skill>.md files (only those listed in DEFAULT_ROLE_FILENAMES → role.skills union)
  - src/cli/workflow/load.ts                            # AC5.1 — TOML loader/validator for ~/.echo/workflows/<name>.toml; reuses smol-toml from 071
  - src/cli/workflow/match.ts                           # AC5.2 — role-matcher: scans onboarded agents from onboarding.json, picks an agent per role whose capabilities ⊇ role.requires.capabilities
  - src/cli/workflow/dispatch.ts                        # AC5.3 — sequential spawn per workflow step; reuses 073's probe-style spawn shape (codex exec / claude --print)
  - src/echo-home/paths.ts                              # AC5.1 minor — extend ECHO_HOME_PATHS with `workflows: join(root, 'workflows')` + frozen invariant preserved
  - src/echo-home/scaffold.ts                           # AC5.1 minor — mkdirSync workflows/ in the recursive sweep; idempotent semantics preserved
  - package.json                                        # AC1 — add `bin: { echo: "./dist/cli/index.js" }` + a `build:cli` script that vite-node-compiles or tsc-emits src/cli/ to dist/; daemon path unchanged
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
  - src/daemon/lifecycle.ts  # resolveDataDir + resolveDbPath — `echo doctor` reuses for daemon-path attribution
  - src/daemon/index.ts:27-32  # resolveMcpPort — `echo init` mirrors this resolver to build `mcpServerUrl`
  - skills/process-backlog.md  # reviewer guidance — 074 is a CLI item, NOT a substrate item; minimal new deps
  - CLAUDE.md  # operating model — CLI touches none of the operating-model files; reference only
---

# `echo` CLI binary (init / doctor / uninstall / run)

## Why this spec exists

The 2026-05-25 ECHO Pro design (`raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md`, §"Coord layer architecture") ships the paid tier as a coord layer that lives under `~/.echo/`. 070 created the scaffold; 071 defined role TOMLs; 072 built the adapter sync engine; 073 built the UX-free wizard library. **074 is the surface** — a single `echo` binary that the user types to onboard (`init`), to verify health (`doctor`), to uninstall (`uninstall`), and to run multi-agent workflows (`run`).

The binary is small by design. The hard mechanics live downstream:

- **`init`** drives 073's `createWizard()` end-to-end. 073 ships steps 2-5; 074 wraps with Step 1 ("Welcome") + Step 6 ("Done"), surfaces user confirmation between detect → wire → probe, and renders the typed results 073 returns.
- **`doctor`** reads `~/.echo/state/`, pings the daemon's MCP endpoint, scans for orphaned `adapter-sync.lock`, and re-probes each wired agent. Reports actionable status; never mutates state.
- **`uninstall`** is the inverse of 072's writes. Strips the `<!-- BEGIN ECHO --> ... <!-- END ECHO -->` block from CLAUDE.md / AGENTS.md, removes `mcp_servers.echo` / `mcpServers.echo` from codex / cursor configs, removes the per-agent ECHO-owned skill files, and (with `--purge-state`) removes `~/.echo/` itself.
- **`run`** is the runtime role-plugging primitive. Loads a workflow TOML from `~/.echo/workflows/<name>.toml`, matches each step's `role` against the onboarded agents' capabilities, picks an agent, and dispatches a spawn. 075 will ship the first actual workflow definitions; 074 ships the **mechanism**, not the workflows.

The split rule: anything that decides *what* to onboard, sync, or wire belongs upstream (070–073). 074 owns *flow* — the user-facing arc, the human-readable error copy, and the runtime stitching that connects roles to agents.

## Architectural sketch

```
$ echo init                                 $ echo doctor               $ echo uninstall          $ echo run <workflow> [--project P]
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
- **J2. `echo run` ships the runtime even though 075 has no workflows yet.** The mechanism (workflow loader + role-matcher + dispatcher) is small and self-contained; shipping it now means 075 only has to write `<workflow>.toml` files, not invent runtime semantics. When no workflow files exist OR the named workflow is not found, `echo run` errors with installation guidance (AC5.4). The pre-075 binary still type-checks and tests cleanly; the matcher's only at-runtime input is `onboarding.json`.
- **J3. Workflow file format is intentionally minimal.** V1 ships: `[workflow]` table with `name` + `description`; a `[[step]]` array where each step has `role` (a name matching a `~/.echo/roles/<name>.toml`), `prompt` (string), and optional `inputs` (string-string map). Steps run sequentially; no parallelism, no branching, no error-recovery DSL. Anything more sophisticated is a 075-or-later concern. Rationale: dogfooding will reveal what the workflow language actually needs to express; speculating now is exactly the strategist-drift failure mode that 058 named.
- **J4. Role-matcher picks the highest-capability agent deterministically; no UX prompt mid-`run`.** If multiple onboarded agents satisfy a role's `requires.capabilities`, the matcher picks the one whose `OnboardedAgentProfile` was wired earliest (`wired_at` ascending). This is stable across re-runs and trivially testable. Per-invocation override (`--agent <role>=<id>`) is supported on the `run` command for users who want to pin; without it, dispatch is silent + deterministic. A mid-run prompt would block automated workflow invocation, which is exactly the use case `run` exists to serve.
- **J5. Uninstall is destructive but explicit, and conservative by default.** `echo uninstall` removes the ECHO marker block + MCP server entries by default. It does NOT remove `~/.echo/` (state, skills, role TOMLs, adapter cache) unless `--purge-state` is passed. Reason: a user re-running `echo init` after a temporary `echo uninstall` should not lose their detected-projects history. `--purge-state` is the "I'm leaving for good" branch. Both modes require an interactive `y/N` confirmation unless `--yes` is passed. The confirmation prompt enumerates exactly which files will be touched (read from `onboarding.json`'s `agents[].wired_at`); no surprise writes.
- **J6. `echo doctor` is read-only.** It does NOT remove orphaned `adapter-sync.lock` files automatically (072's H1 disposition was "the engine never auto-removes a present lockfile"). `doctor` surfaces the lockfile's mtime + the suggested `rm` command and exits non-zero. A `--fix` flag is explicitly out of scope for V1 (075-or-later); the user runs `rm` themselves. Rationale: doctor's contract is "report"; making it a writer would either re-introduce the TOCTOU mechanism 072 r3-r6 explicitly removed, or duplicate it adjacent. Either is regression risk.
- **J7. The CLI binary is a thin shell; all integration tests use fakes.** No CLI test spawns a real daemon, real `codex exec`, or real `claude --print`. Tests inject the same dependency-injection seams 073 exposed (`detectAgentsDeps.atomStore`, `probeDeps.spawn`, etc.) plus a new `cli/io/prompt.ts` swap (`readPrompt`, `readConfirm`, `readSelect` swapped for canned answers). Production builds of the CLI dynamic-resolve the real implementations. Integration depth: each command's test asserts end-to-end behavior (exit code + stdout match) with fakes wired in.
- **J8. `--project` resolution: explicit flag > cwd's nearest git root > onboarding-state `default_project` > error.** When `--project` is passed, the CLI uses it verbatim (no validation against git-rootedness — user knows their own setup). When absent, walk upward from `cwd` until `.git/` is found; if not found, fall back to `default_project` from `projects.json`. If both are absent, the command errors with "no project context — pass `--project <path>` or run from a git repository or run `echo init` to pick a default." Per codex consult in the decision archive: "D as product model, A as CLI default."

## Acceptance Criteria

### AC1 — `src/cli/index.ts` is the entrypoint with argv-driven subcommand dispatch

**AC1.1 — Shebang + bin field.** The file's first line is `#!/usr/bin/env node`. `package.json` gains:

```json
"bin": { "echo": "./dist/cli/index.js" }
```

A new script `"build:cli": "tsc -p tsconfig.cli.json"` (or vite-node bundle equivalent — builder picks the smaller-deps option) emits `dist/cli/`. The daemon's existing `vite-node`-based scripts are unchanged. The `build:cli` script is invoked manually for now (no auto-build in `prepare`); a follow-up item will wire it into the install flow if needed.

**AC1.2 — Subcommand dispatch.** Uses `node:util`'s `parseArgs` with `allowPositionals: true` and `strict: true`. Top-level grammar:

```
echo <subcommand> [--flag ...] [positional args]
```

Recognized subcommands: `init`, `doctor`, `uninstall`, `run`, `--help`, `--version`. Anything else exits 2 with usage. `--help` / `-h` at the top level prints all subcommands; `--help` after a subcommand prints that subcommand's help only. `--version` reads `package.json`'s `version` field and prints it.

**AC1.3 — Exit codes.** Conventional UNIX exit codes:

- `0` — success
- `1` — runtime error (subcommand-specific; copy in stderr)
- `2` — usage error (bad flag, unknown subcommand, missing required positional)
- `130` / `143` — SIGINT / SIGTERM (forwarded to child processes during `echo run` dispatch)

The dispatcher catches all subcommand-thrown exceptions, prints the message + a 1-line "see `echo <cmd> --help`" pointer, and exits `1`. Uncaught exceptions outside the dispatcher (programming bugs) propagate the default Node exit `1` and stack trace.

**AC1.4 — `--quiet` and `--json` global flags.** Both default off.

- `--quiet` suppresses all non-error stdout. Useful for shell-scripting.
- `--json` switches all stdout to newline-delimited JSON. Every line is one structured event with at least `{ event: string, ... }`. Errors go to stderr as plain text regardless. Both flags can stack (`--quiet --json` prints only the final-result JSON line + drops progress events). Tests pin a small fixed set of `event` strings per subcommand (AC7).

### AC2 — `src/cli/commands/init.ts` orchestrates 073's wizard end-to-end with TTY prompts

**AC2.1 — Top-level flow.**

```ts
export async function runInit(opts: InitOpts): Promise<number>;
```

`InitOpts` includes a `wizardFactory?: typeof createWizard` test seam (default = production `createWizard`), a `prompt?: PromptImpl` seam (default = the readline-backed implementation in `cli/io/prompt.ts`), and a `now?: () => Date` (default = `() => new Date()`). Returns the exit code.

**AC2.1.0 — Non-TTY fail-closed guard (r1 codex-ops F2 HIGH).** BEFORE invoking any wizard method, `runInit` MUST check `process.stdin.isTTY`. If false (the process was piped / cron / launchd-spawned without a controlling TTY), exit `2` immediately with stderr message `"echo init: non-interactive — a TTY is required. Pipe-driven onboarding via an answer file is a future item."` and DO NOT call `wizardFactory`, `wizard.detectAgents`, or any other wizard method. This guard fires AT THE TOP of `runInit`, before `mcpServerUrl` / `echoVersion` resolution. Rationale: AC6.1's `makeTtyPrompt` falls back to prompt defaults when stdin is not a TTY (Enter ⇒ default = "all detected agents", Enter ⇒ default = "skip default project"); under a pipe, a successful default-cascade would proceed into `wizard.wire()` and mutate `~/.codex`, `~/.claude`, `~/.cursor`, and `~/.echo` WITHOUT any human confirmation. The guard makes init's "needs human confirmation" contract enforceable, independent of how the prompt library is wired. The follow-up `--answer-file` non-interactive path is logged in After-Completion; do NOT add it in this spec.

The flow (post-guard) is exactly the 6 steps of the decision archive:

1. **Welcome** — print a 1-sentence pitch + ETA. Confirm with `[Y/n]`. `n` exits 0.
2. **Detect agents** — call `wizard.detectAgents()`. Render the `DetectedAgent[]` as a numbered list with confidence bucket + signal summary. Prompt: "Confirm subset to wire (default: all `high` + `medium` confidence): [Enter / type comma-separated kinds]." Empty input = default; explicit list = the user's pick (validated against `AgentKind` union).
3. **Detect projects** — call `wizard.detectProjects()`. Render the `DetectedProject[]` ranked by activity. Prompt: "Pick default project (1-N), or Enter to skip." Skip stores `defaultProjectRepoRoot: null`.
4. **Wire** — call `wizard.wire({ selectedAgents, defaultProjectRepoRoot, repoRoot? })` (the `repoRoot?` recovery seam fires only when the AC5.7 retry path is taken — see AC2.3). Render `WireResult`: per-agent action (added/updated/conflict/error), conflict diffs if any. On any conflict, surface 072's pre-built diff + the message-quoted `rm` instruction (for `syncLock`) verbatim; do NOT paraphrase.
5. **Probe** — call `wizard.probe(selectedAgents)`. Render `ProbeOutcome[]`. For `cursor` and `mcp-not-configured` outcomes, print the corresponding remediation copy from AC2.4. Probe failures do NOT block onboarding from completing — the user can finish and address probe failures via `echo doctor` later.
6. **Done** — call `wizard.markCompleted()`. Print "You're ready" + the suggested next-action hint (V1: `echo run <workflow>` — TBD copy; 075 will populate) + the path to `~/.echo/state/onboarding.json` + the `echo uninstall` command. Exit 0.

**AC2.2 — `mcpServerUrl` + `echoVersion` plumbing.** `runInit` resolves both before calling `createWizard`:

- `mcpServerUrl` = `http://127.0.0.1:${port}/mcp` where `port` reads `ECHO_MCP_PORT` (default `38478`), mirroring `src/daemon/index.ts:27-32`'s `resolveMcpPort()`. The CLI does NOT call into the daemon module to avoid pulling in storage / chokidar deps; it reimplements the small resolver inline (~7 LOC) or imports an exported helper if the builder promotes `resolveMcpPort` to a public helper in `src/daemon/lifecycle.ts` (analogous to 073's `resolveDbPath` promotion).
- `echoVersion` reads from `package.json` via `JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).version` (r1 codex F2 HIGH fix). Reasons for this exact form: (a) `import { version } from '...json' assert { type: 'json' }` fails on Node 22 — `assert` import attributes were rejected in favor of `with`; (b) `import pkg from '...json' with { type: 'json' }` exposes `pkg.version` not a named `version` export and is gated on `--experimental-json-modules` in some Node 22 builds; (c) `fs.readFileSync` + `JSON.parse` is portable across every Node version the repo cares about, has no test-fixture fragility, and reuses the `import.meta.url`-relative URL pattern already used elsewhere in the repo. Tests pin this resolution with a fixture package.json that pins a non-default `version` string and asserts the wizard receives it via the `createWizard.echoVersion` argument.

**AC2.3 — Conflict recovery loop.** When `WireResult.syncResult.repoRoot` is populated (072 AC5.7 — `import.meta.url` walk failed in a packaged install), `init` prompts: "ECHO could not locate its source tree. Pass an explicit path: " and re-invokes `wizard.wire({ ...prev, repoRoot: <userInput> })` once. A second failure surfaces the error and exits 1. The `syncLock` and `directorySymlink` sentinels are NOT retried — they need user action (rm the lockfile / resolve the symlink) outside the wizard; `init` prints 072's message verbatim and exits 1.

**AC2.4 — Probe remediation copy (data-driven).** A small constant table in `cli/commands/init.ts` maps each `ProbeOutcome.reason` to a 1-2-line remediation string:

| Reason | Copy |
|---|---|
| `cli-unavailable` | "<binary> not found on PATH. Install it (see <vendor docs URL>) and run `echo doctor` to re-probe." |
| `auth-required` | "<binary> is not logged in. Run `<binary> login` and then `echo doctor`." |
| `manual-only` (cursor) | "Cursor has no headless CLI. Open Cursor and run any prompt to confirm ECHO MCP is reachable." |
| `mcp-not-configured` (claude-code) | "Claude Code does not have ECHO MCP configured. Run `claude mcp add echo <url>` and then `echo doctor`." (the URL is `mcpServerUrl` from AC2.2) |
| `timeout` | "<binary> took longer than 5s to respond. Re-run `echo doctor` once if this persists." |
| `unexpected-output` | "<binary> responded but did not echo `pong`. Detail: <first 200 chars>. Run `echo doctor` to retry." |

The exact copy is reviewer-tunable; the spec invariant is that every `ProbeOutcome.reason` has a single, deterministic remediation string. Tests assert presence of the binary name + the relevant remediation hint string for each reason.

**AC2.5 — Populate `OnboardedAgentProfile.capabilities` from a static per-agent map (r1 C1 — codex F1 + codex-ops F1, both HIGH).**

073's `wizard.wire()` writes `OnboardedAgentProfile.capabilities: []` for every newly-wired agent (070 schema only requires `string[]`; 073 doesn't populate it). The default role TOMLs at `assets/echo-roles/` declare non-empty `[role.requires].capabilities` (e.g., builder requires `fs.write`, `git.write`, `mcp.echo.write`). Consequence: 074's `echo run` matcher reads `capabilities: []`, computes `capabilities ⊇ role.requires.capabilities → false`, and EVERY workflow step fails with `no-onboarded-agent` or `capability-mismatch`. The role-plugging mechanism is dead on arrival after a successful `echo init`.

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
- Re-running `echo init` with an agent already wired AND already-populated capabilities → no change if the agents' kinds AND the map are unchanged (idempotent mutation).
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

**AC3.2 — Daemon probe.** Resolve port via the same logic as AC2.2. Send a single HTTP POST to `http://127.0.0.1:<port>/mcp` with a minimal MCP `initialize` request body; treat any 2xx response (within 2s) as `mcpReachable: true`. Connection-refused / ENOTFOUND / timeout → `false`. Also stat the PID lock file at `<dataDir>/daemon.pid` (the canonical filename per `src/daemon/lifecycle.ts:55`; r1 codex-ops F5 MED fix — earlier spec text said `echo.pid` which the daemon does NOT write, so `pidLockHeld` would have been permanently `false`); `pidLockHeld: true` if the file exists AND is readable. The two signals are reported independently; a stale PID lock without a reachable daemon is the recoverable-stale-lock shape (`overall = 'degraded'` per AC3.6's truth table).

**AC3.3 — `~/.echo/` integrity.** Stat `ECHO_HOME_PATHS.root`. Read `stateOnboarding` and `stateProjects` via 070's `validateOnboardingState` / `validateProjectsState`. Any validation failure → `schemaVersion: 'mismatch'`. Missing files → `'missing'`. Otherwise `1`. Does NOT auto-recreate; that's `echo init`'s job.

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
  purgeState?: boolean;            // --purge-state: also rm -rf ~/.echo/
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
   - Errors per agent are non-fatal: log + continue. Final summary reports per-agent outcome.
4. If `--purge-state`: prompt a second time ("This will permanently remove `~/.echo/` including all detected-projects history and adapter caches. Continue? [y/N]"), then `rmSync(ECHO_HOME_PATHS.root, { recursive: true, force: true })`.
5. Print a 1-line summary + the path to `~/.echo/state/onboarding.json` if it still exists (for transparency).

Exit `0` on success (including partial-failure summary), `1` only on a programming-level error (e.g., prompt impl threw).

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

`skillNames` is computed by the caller as the union of `role.skills` across all three default role TOMLs loaded via `loadRolesFromDir(ECHO_HOME_PATHS.roles)`. If `~/.echo/roles/` is empty or missing, fall back to a hardcoded set: the canonical V1 list as it appears in 071's `assets/echo-roles/*.toml` (the spec MUST resolve this list at write-time, not embed it — query the in-tree role TOMLs).

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
}

export function matchRolesToAgents(opts: {
  steps: readonly WorkflowStep[];
  roles: readonly Role[];           // loaded via 071's loadRolesFromDir
  onboarded: readonly OnboardedAgentProfile[];
  override?: ReadonlyMap<string, AgentKind>;   // from `--agent <role>=<id>` CLI flag
}): readonly AgentMatch[];
```

For each step:

1. Look up `Role` by `step.role` in `roles[]`. Not found → `reason: 'role-unknown'`.
2. If `override.has(step.role)`: pick the override directly. Validate the override agent is in `onboarded[]` AND its `capabilities` ⊇ `role.requires.capabilities`; otherwise `reason: 'capability-mismatch'`.
3. Otherwise: filter `onboarded[]` to those with `capabilities` ⊇ `role.requires.capabilities`. Empty → `reason: 'no-onboarded-agent'`. Non-empty → pick the one with earliest `wired_at` (deterministic; J4). `reason: 'matched'`.

The matcher does NOT spawn anything; it's pure. The dispatcher (AC5.3) reads its output.

**AC5.3 — Dispatcher at `cli/workflow/dispatch.ts`.**

```ts
export interface DispatchOutcome {
  step: WorkflowStep;
  match: AgentMatch;
  spawn: { exitCode: number; stdout: string; stderr: string; timedOut: boolean; elapsedMs: number } | null;
  error?: string;
}

export async function dispatchWorkflow(opts: {
  workflow: Workflow;
  matches: readonly AgentMatch[];
  spawn?: typeof import('node:child_process').spawn;   // test seam
  timeoutMs?: number;                                   // default 60_000 — longer than probe's 5s; real work
  projectRoot: string;                                  // resolved per J8
  signal?: AbortSignal;                                 // SIGINT forwarding from the CLI
}): Promise<DispatchOutcome[]>;
```

For each step (sequential, no parallelism per J3):

1. If the corresponding `AgentMatch.pickedAgent` is null: skip with `error: <match.reason>`; do NOT spawn. Append to outcomes.
2. Look up the `Role` for `step.role` to compute the sandbox flag (r1 codex-ops F1 HIGH fix — earlier spec hardcoded `--sandbox read-only` even when default builder/strategist roles declare `sandbox = "workspace-write"`, so the child agent would run under WEAKER permissions than its role contract requires). The mapping is:
   - `role.sandbox === 'workspace-write'` → spawn arg `--sandbox workspace-write` (codex) / no equivalent flag for claude (claude's permissions are global and out-of-scope to constrain per-step in V1).
   - `role.sandbox === 'read-only'` → spawn arg `--sandbox read-only` (codex) / no equivalent flag for claude.
   The sandbox value is taken FROM THE MATCHED ROLE, not from a workflow-step field; future workflow-step-level overrides are out of scope.
3. Spawn per agent kind (mirrors 073's probe AC6.2 commands; the prompt is the step's `prompt` with `${VAR}` substituted from `inputs`). **All spawns MUST pass `{ cwd: opts.projectRoot, env: process.env }`** (r1 codex-ops F4 MED fix — earlier spec resolved `projectRoot` per J8 but never threaded it into the spawn, so `echo run --project /repo` from a different cwd would launch the child against the caller's cwd instead of `/repo`).
   - `codex` → `spawn('codex', ['exec', '--sandbox', <fromStep2>, '--', <prompt>], { cwd: projectRoot, env: process.env })`.
   - `claude-code` → `spawn('claude', ['--print', '--no-stream', '--output-format', 'text', '--', <prompt>], { cwd: projectRoot, env: process.env })`.
   - `cursor` → never matched in practice (cursor's role profile has no automatable capability surface in V1). If somehow matched, skip with `error: 'cursor-not-dispatchable'`.
4. Wait for exit (or `timeoutMs` — SIGTERM the child, set `timedOut: true`). Append the outcome.
5. **Step failure handling:** if a step's `spawn.exitCode !== 0`, the dispatcher STOPS — subsequent steps are not run. The outcome array is returned with all completed steps + the failing step (subsequent steps are not in the array). This is the V1 posture; 075-or-later may add `[step].continue_on_failure` if dogfooding shows the need.
6. `signal.aborted` mid-step: SIGTERM the child, exit the loop, return the partial outcome array.

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
  spawn?: typeof import('node:child_process').spawn;
  now?: () => Date;
}): Promise<number>;
```

1. Resolve project root per J8.
2. Locate workflow file: `path.join(workflowsDir, `${workflowName}.toml`)`. Missing → error: "no workflow `<name>` — installed workflows: <listWorkflows()>" (exit 1).
3. If `workflowsDir` itself is empty or missing → error: "no workflows installed. The 075 backlog item ships the first one; until then, `echo run` has nothing to dispatch." Exit 1.
4. `loadWorkflow()` (AC5.1). Validation error → exit 1 with the error message.
5. `loadRolesFromDir(rolesDir, { assertDefaults: true })` (071). Failure → exit 1.
6. Read `onboarding.json` via 070's validator. Validation error → exit 1.
7. `matchRolesToAgents()` (AC5.2). If any `AgentMatch.reason !== 'matched'`, print the unmatched roles' reasons and exit 1 WITHOUT spawning anything (no partial dispatches when the plan is broken).
8. `dispatchWorkflow()` (AC5.3). Print outcomes (or JSON-emit if `--json`). Exit 0 iff every dispatched step's `spawn.exitCode === 0`; otherwise exit 1.

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
6. `~/.echo/` does not exist → `broken`, exit 1, suggests `echo init`.
7. `--json` mode → emits the `DoctorReport` on one line.
8. Cursor has `wired_at: null` (detected but skipped during init) → `probeOutcome: null`; not counted as failure.
9. **Cursor probe outcome `manual-only` → counted as healthy** (per AC3.6 row: manual-only is NOT a failure).

**AC7.3 — `uninstall.test.ts` (9 cases).**

1. No onboarding state → "Nothing to uninstall" + exit 0.
2. Two wired agents → prompt enumerates exactly those files; `y` confirms; both adapters inverted; exit 0.
3. `--yes` skips the prompt → same result.
4. Marker file missing → `stripEchoMarkers` returns noop; uninstall reports it but continues; exit 0.
5. Marker file is a symlink → reports conflict, does NOT touch; exit 0 (non-fatal per-agent).
6. `--purge-state` → second prompt confirms; `~/.echo/` removed; `rm -rf` is recursive + force.
7. `--purge-state` + `--yes` → both prompts auto-confirmed.
8. Codex config has hand-edited `[mcp_servers.echo]` (key reordered) → AC4.3 still deletes the table; the inverse does NOT diff-and-conflict (uninstall is "remove regardless").
9. **Skills directory contains a user-modified `<skill>.md` (target byte-differs from `~/.echo/skills/<skill>.md`) → skipped with `reason: 'user-modified'`; byte-equal files removed** (r1 codex F5 MED verification — earlier wording said `reason: 'not-owned'` against a first-line marker which was dropped; AC4.4 now uses byte-equality so the reason set is `'missing' | 'source-missing' | 'user-modified' | 'symlink'`).
10. **Skills directory contains a `<skill>.md` whose `~/.echo/skills/` counterpart is absent → skipped with `reason: 'source-missing'`** (r1 codex F5 MED verification).

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
11. **Sandbox mapping from role (r1 C1 verification — codex-ops F1 HIGH).** Workflow with one step whose role has `sandbox = "workspace-write"` and `requires.capabilities = ["fs.write", "git.write"]` → matched agent is codex (whose capabilities ⊇ those required per AC2.5); fake spawn receives `args` containing `['exec', '--sandbox', 'workspace-write', '--', <prompt>]`. Repeat with `sandbox = "read-only"` → `args` contains `'--sandbox', 'read-only'`.

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

**AC7.7 — Workflow matcher tests (8 cases — was 6).** 6 cases covering each branch of the `AgentMatch.reason` enum + the override-precedence + the wired_at tie-breaker determinism. Plus 2 new cases (r1 C1 verification):

7. **`AGENT_CAPABILITIES_BY_KIND` matcher path.** With three onboarded agents whose `capabilities` were populated per AC2.5 + a workflow step whose role requires `['fs.write', 'mcp.echo.write']`, the matcher returns `pickedAgent: 'codex'` (or `'claude-code'` depending on earliest `wired_at`); never `'cursor'` (cursor's `['mcp.echo.read']` lacks the required write capabilities).
8. **Capabilities-empty matcher path.** With an `OnboardedAgentProfile.capabilities: []` (e.g., from an `ok: false` agent that 074's init left unpopulated per AC2.5), the matcher returns `reason: 'capability-mismatch'` against any non-empty-`requires.capabilities` role. Pins the load-bearing C1 invariant: an unsuccessfully-wired agent is NEVER picked.

### AC8 — Builder doc updates

- `docs/BACKLOG.md` row for 074 → moved from Inbox to Active section once claimed (the slash-command `process-backlog` handles this).
- A new short page section: in the existing `wiki/` is NOT touched here (per CLAUDE.md — strategist promotes wiki post-shipment). The After-Completion section below lists candidate wiki pages.
- README/CLAUDE.md → unchanged. The operating-model files are not affected by adding a user-facing binary.

## Out of Scope (Don't Drift)

1. **No daemon-side changes.** The CLI is a pure consumer of 070-073's surfaces. If the builder finds a missing daemon hook, file a follow-up; do not edit `src/daemon/`.
2. **No interactive `--fix` in doctor.** The reviewer-debated lockfile auto-cleanup from 072 r3-r6 stays gone. `echo doctor` reports; the user runs `rm`.
3. **No workflow library content.** 074 ships the runtime; the actual `<workflow>.toml` files (cross-vendor change review, etc.) are 075's domain.
4. **No new dependencies.** `parseArgs` + `readline/promises` + raw ANSI + the existing `smol-toml` for TOML loading. No commander/yargs/inquirer/chalk/picocolors.
5. **No `init --resume` flag.** 073's `createWizard` is idempotent within a session, but re-entry from an interrupted prior `echo init` is a follow-up if dogfooding surfaces the need. V1 path: re-run `echo init` from the top.
6. **No global `echo` install logic.** `echo init` does NOT add the binary to PATH, install a launchd plist, or change `~/.zshrc`. The install topology decision is explicitly deferred in the design archive ("After wizard UX is implemented; install is the wrapper around the wizard"). For V1, users run `npm run build:cli && npm link` themselves. A follow-up item will handle distribution.
7. **No upgrade / migration path.** The CLI does not detect "I am newer than the previously-installed CLI" and reconcile state-file schema versions. Schema version mismatches are surfaced by `doctor`; the user reinstalls or runs the migration tool (which does not yet exist) themselves.
8. **No telemetry / usage reporting.** The CLI emits no network requests except the local MCP probe in `doctor`. The "feedback / report-an-issue" copy in the Done step is a printed string, not a callback.
9. **No `--verbose` / log-level tuning.** Logging is a single level: progress events to stdout (suppressible via `--quiet`), errors to stderr, structured events via `--json`. If dogfooding surfaces the need for debug logging, it's a follow-up.
10. **No multi-host / remote-daemon support.** `mcpServerUrl` is always `http://127.0.0.1:<port>/mcp`. Remote ECHO daemons (team / shared) are V2+ per the 2026-05-17 memory note ("Defer team-shape ... to V2+").
11. **No `acquirePidLockPath()` export from `src/daemon/lifecycle.ts`** (r1 codex-ops F5 MED). The PID lock filename `'daemon.pid'` is duplicated in 074's `doctor.ts` rather than imported from the daemon module — this is intentional. Reason: 074 is supposed to be a pure consumer of the daemon's filesystem outputs (per Out-of-Scope #1 "no daemon-side changes"). If the daemon ever renames `daemon.pid`, that change is owned by the daemon item making the rename; updating both sites (daemon + doctor) is a one-line PR-time edit. The alternative — exporting a constant — would force every PR-touching daemon paths to coordinate across modules, which is exactly the coupling 074 is supposed to avoid.
12. **No `--answer-file` non-interactive path** (r1 codex-ops F2 HIGH disposition). AC2.1.0's non-TTY guard fails closed; supporting unattended `echo init` is a follow-up item once dogfooding produces real demand (CI install scripts, immutable-infra provisioning, etc.). Until then: TTY required.

## Risks + open questions

- **R1 — `package.json` `bin` + the test runner.** Adding `bin` may interact with `npm link` and the test suite's module resolution. Validation: the builder runs `npm test` end-to-end before claiming AC8; if `bin` triggers vitest module-resolution changes, the builder bounces back with an `agent_notes` question rather than guessing a fix.
- **R2 — TOML round-trip preservation for codex config inversion.** smol-toml does NOT preserve formatting/comments. AC4.3's string-level table-elision approach (find the `[mcp_servers.echo]` header line + the next `[*]` header) is the simpler, more robust alternative; the test fixture pins "user comments outside the ECHO block survive byte-for-byte." Reviewers should pressure-test the edge cases (trailing whitespace, no-trailing-newline files, BOM, CRLF).
- **R3 — `dist/cli/` build path.** The builder picks between `tsc --outDir dist/cli` and a vite-node bundler. Both work; the spec defers to the builder's judgment as long as the bin entry resolves and the produced JS is Node 22+ ESM. If a bundler choice adds a dep, that's a J1 violation — use tsc.
- **R4 — `<!-- echo-owned-skill -->` marker addition to 072 — DROPPED in r1 disposition** (r1 codex F5 MED). The originally-proposed first-line marker conflicted with existing skill YAML frontmatter; AC4.4 now uses byte-equality against `~/.echo/skills/<skill>.md` as the ownership proof, requiring zero 072 change. The byte-equality approach is robust under: ECHO updating skill contents (re-sync rewrites both; byte-equality holds), user-edited targets (differ; preserved), third-party skills (no source counterpart; `source-missing`). Documented here for reviewer audit trail; no live risk remaining.
- **R5 — Workflow file format collisions with 075.** 075 will write the first `<workflow>.toml`. If 075's spec process surfaces fields that 074's loader rejects (strict-unknown-keys), 074 needs an additive update. The format is intentionally minimal in V1; 075 may add fields. Builder note: adding fields is reviewer-prerogative on 075, not 074. Don't over-design upfront.
- **R6 — Non-TTY `init` behavior.** AC7.1 case 10 says non-TTY init exits 2. But a CI-style "install ECHO non-interactively with these answers" use case might emerge in dogfooding. Out of scope for V1; reopen if surfaced.
- **R7 — `echo doctor` MCP probe via raw HTTP.** Doctor doesn't use the `@modelcontextprotocol/sdk` client — it sends a single HTTP POST with a minimal `initialize` body. Why: the SDK client adds session-lifecycle complexity (subscribe / list_tools / etc.) that doctor doesn't need. The risk is that a future MCP spec change to the initialize handshake breaks the probe. Mitigation: doctor's MCP probe is a smoke-test ("any 2xx within 2s = reachable"), not a strict-conformance check.
- **R8 — Shell-quoting consistency.** `echo doctor`'s `cleanupCommand` and 072's `syncLock.message` both shell-quote a path. The CLI MUST use the SAME shell-quote helper that 072 uses (codex-ops r16 M3). The builder either imports it from 072 (if exported) or duplicates the POSIX single-quote-wrap-with-`'\''` shape EXACTLY. Tests pin byte-equality with a path containing spaces + quotes + brackets.

## Definition of done

1. All 7 ACs pass — full Vitest suite green (including the 1351 existing tests post-073 merge), lint clean, typecheck clean, prettier clean.
2. `npm run build:cli && node dist/cli/index.js --help` prints the subcommand list with no runtime errors.
3. The four-subcommand acceptance: `echo init` runs end-to-end against a tmpdir ECHO_HOME with fake atom store + fake spawn and exits 0; `echo doctor` against the same returns `healthy`; `echo uninstall --yes` cleans up; `echo run <name>` errors cleanly when no workflows exist.
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
- **Trigger to reopen the deferred questions (decision-archive § "What's deferred"):** after 074 ships AND founder completes their own `echo init` as a customer, surface the first-demo question (→ 075) and install-topology question (brew vs pkg vs Raycast Store) in the strategist conversation that follows. Per the decision archive, this is the unblocking trigger for 075.
- **Update `docs/BACKLOG.md`:** remove the "*Note: IDs 074-075 are reserved...*" line about 074 once 074 is in `complete/` (075 is still reserved).
- **Drift watchlist:** the `run` subcommand is the most likely strategist-drift surface in follow-up rounds (workflow file format expansion, parallel steps, error-recovery DSL, capability/sandbox flags). Per 058's disposition-discipline rule: when reviewers propose mechanism here, ask first "could the workflow simply be split / rewritten instead?" Prefer removal of complexity over deeper patching.

## R-flagged points for reviewer pushback

Items I am least sure about; reviewers should pressure-test:

- **R1 (J1 — no CLI framework).** Defensible if you accept the dep-tightness premise; reviewers from a CLI-UX background may disagree. Counter-argument: indie AI builders dogfooding the CLI for hours will hit `parseArgs`'s rough edges (no auto `--help` generation, error messages are sparse). If reviewers push back HARD, the swap-in is to `commander` (single dep, well-maintained, no peer-dep cascade). Don't engineer for both.
- **R2 (J4 — deterministic agent picking).** A "round-robin" or "least-recently-used" picker is theoretically more parallelizable. V1: deterministic is testable + debuggable; non-determinism is V1.5+ at the earliest.
- **R3 (AC4.4 — skill-file marker).** The "<!-- echo-owned-skill -->" marker is a defensible safety net, but it does retroactively require a 072 change. Reviewers should confirm 072's `syncClaudeSkills` doesn't already emit something equivalent (e.g., a frontmatter `owner: echo` field). If it does, the spec text should reference that marker shape instead.
- **R4 (AC5.4 — workflow runtime without workflows).** Shipping a `run` command that always errors until 075 lands feels weird. The alternative is splitting 074 → "074a init/doctor/uninstall" + "074b run" — but that fragments the CLI's first impression. Single-binary is cleaner; the error message just has to be good.
- **R5 (R7 — raw HTTP MCP probe).** Reviewers familiar with MCP spec evolution should flag if the SDK is moving toward a different initialize-handshake.
