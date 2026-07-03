# `tests/cli/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 16 files.

### `tests/cli/daemon.test.ts` — echoctl daemon subcommand test suite

**Purpose:** Exercises `src/cli/commands/daemon.js` (`formatUptime`, `getDaemonUptimeSeconds`, `renderLaunchdPlist`, `runDaemon`) covering plist rendering/XML-escaping, `--repo-root` derivation and validation against the reviewer-harness marker, install/start/stop/restart/status/logs subcommands, launchd bootout/bootstrap/kickstart sequencing, kickstart failure handling, manual-daemon mode on win32/linux, and JSON status output.

**Depends on:** `src/cli/commands/daemon.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeRuntimePackage()` | function | `tests/cli/daemon.test.ts:35` | Writes a fake dist/daemon runtime package (daemon entry, migrations, review-queue schemas) under `packageRoot` for install tests. |
| `config(overrides)` | function | `tests/cli/daemon.test.ts:48` | Builds a `DaemonConfig` fixture (label, plist path, dirs, port, node/daemon paths) merged with overrides. |
| `writePlist(overrides)` | function | `tests/cli/daemon.test.ts:63` | Renders and writes a launchd plist file to `plistPath` using `renderLaunchdPlist`. |
| `installArgs(extra)` | function | `tests/cli/daemon.test.ts:68` | Builds the CLI argv array for the `install` subcommand with standard test paths. |
| `makeHarnessRepo(path)` | function | `tests/cli/daemon.test.ts:87` | Creates a directory tree containing the `tools/review-queue` marker so repo-root validation accepts it. |
| `readInstalledPlist()` | function | `tests/cli/daemon.test.ts:92` | Reads back the installed plist file contents as utf8. |
| `makeSpawnSync(calls, opts)` | function | `tests/cli/daemon.test.ts:96` | Builds a mock `spawnSync` recording calls and returning scripted results for node/git/plutil/launchctl/ps/tail commands. |
| `runWith(argv, opts)` | function | `tests/cli/daemon.test.ts:152` | Invokes `runDaemon` with mocked spawnSync/healthProbe/sleep/getuid/platform, capturing stdout/stderr/exit code/calls. |
| `describe: "daemon uptime helpers"` | test suite | `tests/cli/daemon.test.ts:192` | Covers `formatUptime` unit formatting and `getDaemonUptimeSeconds` parsing of `ps -o etime=` output including malformed/failure cases. |
| `describe: "echoctl daemon"` | test suite | `tests/cli/daemon.test.ts:240` | Covers plist XML-escaping, repo-root derivation/validation, install/start/stop/restart/status/logs behavior, launchd bootout/bootstrap/kickstart ordering, kickstart failure, manual-daemon mode on win32/linux, and JSON status/logs output. |

### `tests/cli/doctor.test.ts` — echoctl doctor subcommand test suite

**Purpose:** Exercises `src/cli/commands/doctor.js` (`runDoctor`, `buildDoctorReport`, `parseDoctorArgs`, `DOCTOR_HELP`, `codexAdapterReportFromOutcome`), verifying MCP initialize probing, `--home`/`--port`/`--label` overrides, health rollups (healthy/degraded/broken) based on pid-lock + reachability, Codex adapter drift reporting and remediation text, claude-code mcp-not-configured remediation, and a real end-to-end CLI run from a non-repo cwd with a sparse PATH.

**Depends on:** `src/cli/commands/doctor.js`, node:child_process (spawnSync), node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadDoctor()` | function | `tests/cli/doctor.test.ts:19` | Dynamically imports the doctor command module (after `vi.resetModules()`) so env vars take effect. |
| `writeState(agentReason, home)` | function | `tests/cli/doctor.test.ts:23` | Writes fixture `state/onboarding.json` and `state/projects.json` files under an echo-home dir with one agent whose id depends on the requested failure reason. |
| `describe: "runDoctor"` | test suite | `tests/cli/doctor.test.ts:64` | Covers healthy JSON output + MCP initialize headers, `--home`/`--port`/`--label` overrides, broken-vs-degraded rollup from pid-lock presence, Codex adapter drift/check-error mapping, manual-daemon healthy status on win32/linux, claude-code mcp-not-configured remediation text, human-readable Codex drift output, and a real CLI subprocess run with sparse PATH verifying no false Codex drift. |

### `tests/cli/init.test.ts` — echoctl init (onboarding wizard) subcommand test suite

**Purpose:** Exercises `src/cli/commands/init.js` (`runInit`, `parseInitArgs`, `INIT_HELP`, `AGENT_CAPABILITIES_BY_KIND`) end-to-end, covering non-interactive answer-file validation, wizard wiring for codex/cursor/claude-code adapters (including claude MCP registration success/duplicate/timeout/missing-CLI paths), profile precedence and defaulting, `--force` marker-block replacement (byte-preservation and malformed-marker refusal), and daemon bring-up (install/start/already-running/install-failure) integrated into `init`.

**Depends on:** `src/cli/commands/init.js`, `src/echo-home/adapter-sync.js`, `src/echo-home/wizard/run-wizard.js`, `src/echo-home/wizard/wire.js`, `src/echo-home/wizard/detect-agents.js`, `src/cli/io/prompt.js`, `src/echo-home/adapters/markers.js`, node:child_process types, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadInit()` | function | `tests/cli/init.test.ts:33` | Dynamically imports the init command module for each test after module reset. |
| `writeInitialState()` | function | `tests/cli/init.test.ts:37` | Writes a bare incomplete `state/onboarding.json` fixture with no agents. |
| `successWire(selected, home)` | function | `tests/cli/init.test.ts:55` | Appends wired-agent records to onboarding.json for each selected agent and returns a successful `WireResult`. |
| `writeAnswerFile(name, value)` | function | `tests/cli/init.test.ts:88` | Serializes an answer-file object to JSON under tmpRoot and returns its path. |
| `detected(kind, confidence)` | function | `tests/cli/init.test.ts:94` | Builds a `DetectedAgent` fixture with configFile/atomActivity signals for a given agent kind and confidence. |
| `spawnResult(status, stdout, stderr)` | function | `tests/cli/init.test.ts:106` | Builds a `SpawnSyncReturns<string>` fixture object. |
| `writeDaemonRuntimePackage(packageRoot)` | function | `tests/cli/init.test.ts:117` | Writes a fake dist/daemon runtime package plus review-queue schema/json fixtures, returns the daemon entry path. |
| `daemonFixture(opts)` | function | `tests/cli/init.test.ts:131` | Builds a full `DaemonFixture` (calls log, plist path, mocked spawnSync/healthProbe/etc.) simulating launchd registered/health/node/plutil states, optionally pre-writing a plist. |
| `daemonAlreadyRunning()` | function | `tests/cli/init.test.ts:219` | Returns `daemonOptions` for a fixture where launchd already reports the daemon registered. |
| `makeCodexSyncWizardFactory(opts)` | function | `tests/cli/init.test.ts:223` | Returns a wizard factory that wires codex config/instructions files to caller-supplied client-home paths via `createWizard`/`syncAll`. |
| `makeClaudeSyncWizardFactory(opts)` | function | `tests/cli/init.test.ts:264` | Returns a wizard factory wiring claude-code instructions/commands paths plus a mocked `claudeCodeMcpRegistration.spawn` and optional probe spawn/timeout overrides. |
| `successfulWizardFactory(home)` | function | `tests/cli/init.test.ts:314` | Returns a wizard factory whose `detectAgents`/`wire`/`probe`/`summary`/`markCompleted` stub a full successful codex-only onboarding flow. |
| `describe: "runInit"` | test suite | `tests/cli/init.test.ts:351` | Covers TTY-required fail-closed behavior, `--home`/`--port`/`--profile`/`--label`/`--answer-file`/`--force` arg parsing and validation errors, non-interactive wiring of codex/cursor with cache + config file assertions, claude-code MCP registration (success/duplicate/timeout/missing-CLI), CLI-profile precedence over recorded/answer-file profile, profile-less state defaulting to customer with a warning, `--force` marker-block replacement/byte-preservation/malformed-marker refusal, answer-file validation errors (missing file, malformed JSON, missing/unknown field, invalid profile, missing repo_root), daemon bring-up install/start/already-running/failure paths, and full interactive wizard flow marking onboarding complete with capability assignment. |

### `tests/cli/inverse-codex-config.test.ts` — Codex config MCP-entry removal test suite

**Purpose:** Exercises `removeCodexMcpEntry` from `src/cli/inverse/codex-config.js`, the inverse/uninstall-path helper that strips ECHO's `[mcp_servers.echo]` TOML table from a Codex `config.toml` without disturbing surrounding user tables.

**Depends on:** `src/cli/inverse/codex-config.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "removeCodexMcpEntry"` | test suite | `tests/cli/inverse-codex-config.test.ts:9` | Verifies removal of the `[mcp_servers.echo]` table leaves other tables (`[model]`, `[profiles.work]`) intact, preserves CRLF line endings and absence of trailing newline, returns `{action:'conflict', reason:'parse-error'}` on malformed TOML, and returns `{action:'noop', reason:'entry-missing'}` when the entry is absent. |

### `tests/cli/inverse-cursor-config.test.ts` — Cursor mcp.json MCP-entry removal test suite

**Purpose:** Exercises `removeCursorMcpEntry` from `src/cli/inverse/cursor-config.js`, the inverse/uninstall-path helper that removes only the `mcpServers.echo` key from a Cursor `mcp.json` file while preserving other servers and top-level keys.

**Depends on:** `src/cli/inverse/cursor-config.js`, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "removeCursorMcpEntry"` | test suite | `tests/cli/inverse-cursor-config.test.ts:9` | Verifies removing `mcpServers.echo` leaves sibling `mcpServers.other` and top-level `keep` key untouched, and returns `{action:'conflict', reason:'parse-error'}` on malformed JSON or `{action:'noop', reason:'entry-missing'}` when `mcpServers` has no `echo` key. |

### `tests/cli/inverse-markers.test.ts` — ECHO marker-block stripping test suite

**Purpose:** Exercises `stripEchoMarkers` from `src/cli/inverse/markers.js`, the inverse/uninstall-path helper that removes an ECHO-owned `BEGIN_MARKER`/`END_MARKER` block from an instructions file (e.g. AGENTS.md) while preserving surrounding user content, and safely refuses on malformed markers or symlinked targets.

**Depends on:** `src/cli/inverse/markers.js`, `src/echo-home/adapters/markers.js`, node:fs (symlinkSync), node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "stripEchoMarkers"` | test suite | `tests/cli/inverse-markers.test.ts:10` | Verifies stripping the marker block leaves "user before"/"user after" content joined correctly, returns `{action:'conflict', reason:'malformed-markers'}` when an END_MARKER is missing, and returns `{action:'conflict', reason:'symlink-target'}` when the target file path is a symlink. |

### `tests/cli/orchestration.test.ts` — echoctl orchestration init command tests

**Purpose:** Exercises `src/cli/commands/orchestration.js`'s `runOrchestration(['init', ...])` flow: scaffolding the backlog pipeline directories, writing `.echo/project.json`, and registering the repo in `~/.echo/state/projects.json`, including idempotency and custom coord-ref/reviews-root/reviewers/spec-dir flags and non-git-repo rejection.

**Depends on:** `src/cli/commands/orchestration.js`, `node:child_process`, `node:fs`, `node:os`, `node:path`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadOrchestration()` | function | `tests/cli/orchestration.test.ts:22` | Dynamically imports the orchestration command module. |
| `makeRepo()` | function | `tests/cli/orchestration.test.ts:28` | Creates and git-inits a temp repo with an initial commit, returns its realpath. |
| `runOrchestration(argv)` | function | `tests/cli/orchestration.test.ts:39` | Invokes `runOrchestration` with fixed `now`, capturing stdout/stderr into arrays. |
| `readJson(path)` | function | `tests/cli/orchestration.test.ts:55` | Reads and parses a JSON file synchronously. |
| `describe: "echoctl orchestration init"` | describe block | `tests/cli/orchestration.test.ts:59` | Covers first-run scaffolding + project.json + projects.json registration, idempotent re-init not clobbering existing config, custom flags (coord-ref/reviews-root/reviewers/spec-dir), and rejection of non-git repo paths (exit code 2). |

### `tests/cli/project.test.ts` — echoctl project add/list/remove command tests

**Purpose:** Exercises `src/cli/commands/project.js`'s `runProject` for adding/listing/removing captured git repos against `~/.echo/state/capture-sources.json`, validating path/git checks and JSON output shape.

**Depends on:** `src/cli/commands/project.js`, `src/capture/sources.js` (`DEFAULT_GIT_REPOS`, `CaptureSourcesConfig`), `node:fs`, `node:os`, `node:path`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadProject()` | function | `tests/cli/project.test.ts:21` | Dynamically imports the project command module. |
| `makeRepo(name)` | function | `tests/cli/project.test.ts:25` | Creates a directory with a `.git` subdirectory to simulate a git repo. |
| `readConfig()` | function | `tests/cli/project.test.ts:31` | Reads and parses `state/capture-sources.json` from the temp ECHO home. |
| `runProject(argv, opts)` | function | `tests/cli/project.test.ts:37` | Runs `runProject` with fixed `now` and JSON flag, capturing stdout/stderr. |
| `describe: "echoctl project"` | describe block | `tests/cli/project.test.ts:53` | Covers adding a repo (atomic persist + list-back), rejecting non-existent/non-git paths, rejecting duplicate adds, JSON list output shape, removing a repo and rejecting unknown removal, and requiring `.git` to be a directory (not a file/gitlink). |

### `tests/cli/prompt.test.ts` — TTY prompt implementation tests

**Purpose:** Exercises `makeTtyPrompt` from `src/cli/io/prompt.js`, verifying `readPrompt` question-text formatting for default-value hints, empty-default skip hints, and no-default prompts, by mocking `node:readline/promises`.

**Depends on:** `src/cli/io/prompt.js`, `node:readline/promises` (mocked), vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadTtyPrompt(answers)` | function | `tests/cli/prompt.test.ts:5` | Mocks `readline/promises.createInterface` to queue canned answers, sets `process.stdin.isTTY = true`, and returns a fresh `makeTtyPrompt()` instance plus captured question strings. |
| `describe: "makeTtyPrompt"` | describe block | `tests/cli/prompt.test.ts:24` | Covers `readPrompt` formatting: nonempty default hint (`[default: X; Enter to accept]`), empty default (`[Enter to skip]`), and no-default clean `label: ` prompt. |

### `tests/cli/run.test.ts` — echoctl run command tests

**Purpose:** Exercises `src/cli/commands/run.js`'s `runRun`, which resolves a workflow, matches roles to onboarded agents, and dispatches via a spawn function; covers project resolution (via `--project` flag or `.git` cwd walk or `projects.json` default), capability-mismatch short-circuiting, SIGTERM exit-code gating, human-readable stdout/stderr rendering, `--timeout` propagation and enforcement (via fake timers + hanging spawn), and CLI-level `--timeout` argv parsing/validation through `src/cli/index.js`.

**Depends on:** `src/cli/commands/run.js`, `src/cli/workflow/dispatch.js` (`DispatchSpawn` type), `src/cli/index.js`, `node:events`, `node:fs`, `node:os`, `node:path`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadRun()` | function | `tests/cli/run.test.ts:13` | Dynamically imports the run command module. |
| `writeSkill(name)` | function | `tests/cli/run.test.ts:17` | Writes a minimal skill markdown file under `echoHome/skills`. |
| `writeRole(name, sandbox, capabilities)` | function | `tests/cli/run.test.ts:22` | Writes a role TOML file (builder/reviewer/strategist) requiring the `echo` MCP server and given capabilities, referencing the `process-backlog` skill. |
| `writeDefaults()` | function | `tests/cli/run.test.ts:35` | Writes builder, reviewer, and strategist role fixtures. |
| `writeState(capabilities)` | function | `tests/cli/run.test.ts:41` | Writes `state/onboarding.json` (one wired `codex` agent) and `state/projects.json` (with `projectRoot` as default) fixtures. |
| `writeWorkflow()` | function | `tests/cli/run.test.ts:73` | Writes a single-step `review` workflow TOML requiring the `reviewer` role. |
| `fakeSpawn(calls, result)` | function | `tests/cli/run.test.ts:81` | Returns a `DispatchSpawn` stub that records `{args, cwd}` calls and emits async `close`/stdout/stderr per `result`. |
| `hangingSpawn(kills)` | function | `tests/cli/run.test.ts:104` | Returns a `DispatchSpawn` stub whose child never closes until `.kill(signal)` is called, recording the signal and then emitting `close(-1)`. |
| `describe: "runRun"` | describe block | `tests/cli/run.test.ts:122` | Covers: dispatching a matched workflow via `--project` cwd; reporting capability-mismatch before spawning (exit 1, no spawn calls); falling back to `projects.json` default project when cwd has no git root, and exiting 143 on a post-final SIGTERM signal gate; human-mode stdout printing captured dispatch stdout; human-mode stdout printing a stderr block for nonzero outcomes; `timeoutMs` override forwarding to dispatch verified via fake timers + SIGTERM kill; CLI argv `--timeout` (seconds) parsed and forwarded as milliseconds to `runRun` (mocked); and invalid `--timeout` values rejected as usage errors (exit 2). |

### `tests/cli/selftest.test.ts` — echoctl selftest command tests

**Purpose:** Exercises `src/cli/commands/selftest.js`'s `runSelftest`, an ephemeral daemon-lifecycle self-check that spins up a sandboxed ECHO home/daemon on a random port, runs init/project/doctor and MCP tool calls (`echo_ping`, `search_memories`, `find_clusters`) through injected `SelfTestDeps`, and reports a stable check-id inventory (`SELFTEST_CHECK_IDS`). Covers CLI `--help` wiring, full-pass JSON report shape, CAP-02 daemon-restart retry/timeout diagnostics, capture-sources path-normalization (INIT-06), failure propagation, avoidance of production port 38478, concurrency safety, sandbox cleanup on success/failure/timeout, and `--keep-sandbox`.

**Depends on:** `src/cli/commands/selftest.js` (`SELFTEST_CHECK_IDS`, `runSelftest`, `SelfTestDeps`, `SelfTestReport`, `SelfTestSandbox`), `src/cli/index.js`, `node:http`, `node:fs`, `node:os`, `node:path`, `node:url`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tmpRoot(name)` | function | `tests/cli/selftest.test.ts:23` | Creates a tracked mkdtemp dir for later cleanup in `afterEach`. |
| `writeInitArtifacts(sandbox)` | function | `tests/cli/selftest.test.ts:29` | Seeds onboarding.json and per-agent adapter files (Claude, Codex) into a fake sandbox to simulate a completed `echoctl init`. |
| `makeDeps(opts)` | function | `tests/cli/selftest.test.ts:50` | Builds a fake `SelfTestDeps` with stubbed `startDaemon`/`stopDaemon`/`mcpRequest`/`runCommand`, recording start attempts, ports, stops, and sandboxes; supports injected failure modes (`failCapture`, `hangAfterStart`, `restartStartFailures`) and path-normalization override (`captureRepoPath`). |
| `parseReport(stdout)` | function | `tests/cli/selftest.test.ts:157` | Joins and JSON-parses captured stdout chunks into a `SelfTestReport`. |
| `tryListen38478()` | function | `tests/cli/selftest.test.ts:161` | Attempts to bind a sentinel HTTP server on port 38478 to detect whether selftest ever touches the production port; returns null if already in use. |
| `describe: "echoctl selftest command"` | describe block | `tests/cli/selftest.test.ts:177` | Covers: `--help` wiring; full JSON report with stable check-id list and two daemon start/stop cycles on port 0; CAP-02 polling through transient restart failures; bounded CAP-02 timeout diagnostic (15000ms) when daemon never restarts; INIT-06 path normalization tolerance for backslash-style repo paths; exit 1 + failedIds on injected capture failure; never touching port 38478 (URLs/commands) even with a sentinel listener; concurrent runs without port collision; sandbox/daemon cleanup across success/failure/timeout (`it.each`); and `--keep-sandbox` retaining the sandbox directory. |

### `tests/cli/shell-reachable.test.ts` — packaged echoctl binary + launchd daemon smoke test

**Purpose:** End-to-end smoke test that builds the CLI (`npm run build:cli`), packs it (`npm pack`), globally installs the tarball into a temp prefix, and verifies the `echoctl` binary is reachable from bash, doesn't shadow shell builtins, and that packaged tarball contents include required dist/assets/docs while excluding backlog/raw/wiki/skills/src/tests/py/sh files. On macOS with launchctl available, additionally drives a full `daemon install/start/stop/uninstall` cycle against a labeled test LaunchAgent, verifying MCP `initialize` and `coord_invoke` calls, `daemon status`/`daemon logs` output, and that production daemon state (PID, data dir) is left untouched.

**Depends on:** `node:fs`, `node:net`, `node:os`, `node:path`, `node:child_process` (`spawnSync`), vitest; shells out to `npm`, `bash`, `tar`, `launchctl`, `echoctl`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "echoctl shell reachability"` | describe block | `tests/cli/shell-reachable.test.ts:20` | Single long-running `maybeIt` (skipped without npm/bash) test: build → pack → tarball content assertions → global install → `--version`/`doctor --json` via bash → (macOS+launchctl only) full daemon lifecycle smoke including MCP initialize, status, logs, and coord_invoke, with before/after production-daemon snapshot equality checks. |
| `shellQuote(value)` | function | `tests/cli/shell-reachable.test.ts:241` | Single-quotes and escapes a string for safe embedding in a bash `-c` command. |
| `shellArgs(args)` | function | `tests/cli/shell-reachable.test.ts:245` | Maps an args array through `shellQuote` and joins with spaces. |
| `launchctlPrint(label)` | function | `tests/cli/shell-reachable.test.ts:249` | Runs `launchctl print gui/<uid>/<label>` and returns the spawnSync result. |
| `launchctlDomainPrint()` | function | `tests/cli/shell-reachable.test.ts:255` | Runs `launchctl print gui/<uid>` (whole domain) and returns the spawnSync result. |
| `launchctlDomainMatches(label)` | function | `tests/cli/shell-reachable.test.ts:261` | Filters the domain print output to lines containing `label`, returning status/stderr/matching lines. |
| `parseLaunchdPid(stdout)` | function | `tests/cli/shell-reachable.test.ts:272` | Regex-extracts a `pid = N` value from launchctl print output. |
| `snapshotProductionDataDir(productionWasLoaded)` | function | `tests/cli/shell-reachable.test.ts:277` | Captures mtime+size fingerprints of the production ECHO data dir/db (or null if daemon was already loaded), used to assert the test didn't mutate production state. |
| `postMcp(port, payload)` | function | `tests/cli/shell-reachable.test.ts:292` | POSTs a JSON-RPC payload to `http://127.0.0.1:<port>/mcp`, parsing SSE `data:` line or raw JSON body. |
| `waitForDaemonStatus(env, overrides)` | function | `tests/cli/shell-reachable.test.ts:307` | Polls `echoctl daemon status` up to 40 times (250ms apart) until exit code 0. |
| `findFreePort()` | function | `tests/cli/shell-reachable.test.ts:325` | Randomly probes ports 40000-49999 for one that's free to listen on. |
| `canListen(port)` | function | `tests/cli/shell-reachable.test.ts:334` | Resolves true if a TCP server can bind+listen on the given port. |
| `expectLaunchdGone(label)` | function | `tests/cli/shell-reachable.test.ts:344` | Polls up to 100×100ms for the launchd label to disappear from the domain print, then asserts it is gone. |

### `tests/cli/uninstall.test.ts` — echoctl uninstall command tests

**Purpose:** Exercises `src/cli/commands/uninstall.js`'s `runUninstall`, verifying it strips ECHO-managed marker blocks (`BEGIN_MARKER`/`END_MARKER`) from per-agent adapter files (Claude `CLAUDE.md`, Codex `AGENTS.md`/`config.toml`, Cursor `mcp.json`) for all known agents regardless of which are recorded wired in state, preserves onboarding state by default, and gates `--purge-state` behind conflict detection (symlinked config files) unless `--force-purge` is set.

**Depends on:** `src/cli/commands/uninstall.js`, `src/echo-home/adapters/markers.js` (`BEGIN_MARKER`, `END_MARKER`), `src/cli/io/prompt.js` (`makeNonInteractivePrompt`), `node:fs`, `node:os`, `node:path`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadUninstall()` | function | `tests/cli/uninstall.test.ts:13` | Dynamically imports the uninstall command module. |
| `writeState(agents)` | function | `tests/cli/uninstall.test.ts:17` | Writes `state/onboarding.json` with the given agent-profile list. |
| `describe: "runUninstall"` | describe block | `tests/cli/uninstall.test.ts:35` | Covers: cleaning wired adapters (Codex) while keeping onboarding state by default; stripping stale ECHO blocks from Claude/Codex/Cursor adapters even when state only tracks one wired agent; and blocking `--purge-state` when a symlinked config conflict remains (exit 1) unless `--force-purge` + non-interactive prompt is supplied (exit 0, state file removed). |

### `tests/cli/workflow-dispatch.test.ts` — workflow dispatch engine tests

**Purpose:** Exercises `dispatchWorkflow` and `renderPrompt` from `src/cli/workflow/dispatch.js`: per-step prompt templating, spawning the picked agent's CLI with the right args/cwd per agent kind (codex `exec --sandbox`, claude-code `--print --output-format text`), aborting remaining steps via a signal gate, enforcing a 300s default timeout that kills the child with SIGTERM, and throwing on missing prompt inputs.

**Depends on:** `src/cli/workflow/dispatch.js` (`dispatchWorkflow`, `renderPrompt`, `DispatchSpawn`), `src/cli/workflow/load.js` (`Workflow` type), `src/cli/workflow/match.js` (`AgentMatch` type), `node:events`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `workflow()` | function | `tests/cli/workflow-dispatch.test.ts:11` | Builds a fixture two-step `review` workflow (`reviewer` then `builder` role). |
| `match(role)` | function | `tests/cli/workflow-dispatch.test.ts:24` | Builds an `AgentMatch` picking `codex` with `workspace-write` sandbox for the given role. |
| `claudeMatch(role)` | function | `tests/cli/workflow-dispatch.test.ts:28` | Builds an `AgentMatch` picking `claude-code` with `workspace-write` sandbox for the given role. |
| `fakeSpawn(calls)` | function | `tests/cli/workflow-dispatch.test.ts:37` | Returns a `DispatchSpawn` stub recording `{cmd, args, cwd}` and emitting `close(0)` on next microtask. |
| `hangingSpawn(kills)` | function | `tests/cli/workflow-dispatch.test.ts:53` | Returns a `DispatchSpawn` stub whose child hangs until `.kill(signal)`, recording the signal and then emitting `close(-1)`. |
| `describe: "dispatchWorkflow"` | describe block | `tests/cli/workflow-dispatch.test.ts:71` | Covers: input substitution + codex sandbox spawn args/cwd; claude-code print-mode args without a streaming flag; aborting before the next spawn via `signalGate.beforeNextSpawn` (records `SIGTERM`, outcome `{error:'interrupted', signal}`); default 300s timeout killing the spawned agent via fake timers (`SIGTERM`, `timedOut:true`, `exitCode:-1`); and `renderPrompt` throwing `'missing workflow input'` for an unresolved `${missing}` template variable. |

### `tests/cli/workflow-load.test.ts` — workflow TOML loader tests

**Purpose:** Exercises `loadWorkflow` and `listWorkflows` from `src/cli/workflow/load.js`, validating schema_version 1 parsing/steps exposure, rejection of unknown keys/version mismatch/empty steps/filename-name mismatch via `WorkflowValidationError`, and pins exact prompt-text invariants of the shipped `assets/echo-workflows/change-review.toml` asset (ordering of `gh pr view` / `git diff` fallback commands, required MCP tool mentions, word-count instruction, frozen empty inputs).

**Depends on:** `src/cli/workflow/load.js` (`listWorkflows`, `loadWorkflow`, `WorkflowValidationError`), `assets/echo-workflows/change-review.toml`, `node:fs`, `node:os`, `node:path`, `node:url`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeWorkflow(name, body)` | function | `tests/cli/workflow-load.test.ts:16` | Writes a `<name>.toml` fixture file under the temp root and returns its path. |
| `describe: "workflow loader"` | describe block | `tests/cli/workflow-load.test.ts:22` | Covers: loading a valid schema_version 1 workflow and its step shape via `listWorkflows`; rejecting unknown top-level keys, wrong `schema_version`, zero steps, and filename/name mismatch (each throwing `WorkflowValidationError` with a specific message substring); and loading the shipped `change-review.toml` asset, asserting single reviewer step, ordered fallback-command mentions (`gh pr view` → `git diff @{upstream}..HEAD` → `git diff HEAD` → `git diff HEAD~1..HEAD`), required no-findings/no-diff-source/priority-unavailable/MCP-tool/word-limit prompt substrings, and that `inputs` is an empty frozen object. |

### `tests/cli/workflow-match.test.ts` — role-to-agent matching tests

**Purpose:** Exercises `matchRolesToAgents` from `src/cli/workflow/match.js`, verifying it picks the earliest-wired capable agent per role, distinguishes `role-unknown`/`no-onboarded-agent`/`capability-mismatch` failure reasons, validates explicit role→agent overrides against wiring/capabilities, and correctly matches the shipped `change-review` workflow + `assets/echo-roles` against onboarded codex/cursor/claude-code profiles (including wired_at tie-breaking).

**Depends on:** `src/cli/workflow/match.js` (`matchRolesToAgents`), `src/cli/workflow/load.js` (`loadWorkflow`, `WorkflowStep` type), `src/echo-home/roles.js` (`loadRolesFromDir`, `Role` type), `src/echo-home/paths.js` (`OnboardedAgentProfile` type), `src/cli/commands/init.js` (`AGENT_CAPABILITIES_BY_KIND`), `assets/echo-workflows/change-review.toml`, `assets/echo-roles/`, `node:path`, `node:url`, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `role(name)` | function | `tests/cli/workflow-match.test.ts:14` | Builds a fixture `Role` (`reviewer` by default) requiring the `echo` MCP server and `fs.write`/`mcp.echo.write` capabilities. |
| `agent(id, wiredAt, capabilities)` | function | `tests/cli/workflow-match.test.ts:26` | Builds a fixture `OnboardedAgentProfile` with given id/wired_at/capabilities. |
| `step` | const | `tests/cli/workflow-match.test.ts:41` | Shared fixture `WorkflowStep` for the `reviewer` role with prompt `'x'`. |
| `describe: "matchRolesToAgents"` | describe block | `tests/cli/workflow-match.test.ts:43` | Covers: picking the earliest-wired capable agent among cursor/claude-code/codex and carrying its sandbox; distinguishing `role-unknown` (no roles), `no-onboarded-agent` (no agents), and `capability-mismatch` (insufficient capabilities) reasons with undefined `resolvedSandbox`; validating role→agent overrides succeed when wired+capable and fail (`capability-mismatch`) when not; matching the shipped `change-review` workflow/roles to `codex` with `read-only` sandbox; and `wired_at`-ordering tie-breaks between codex and claude-code for the shipped workflow. |
