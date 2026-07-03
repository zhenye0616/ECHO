# `src/cli/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 18 files.

### `src/cli/commands/daemon.ts` — launchd/manual daemon lifecycle control CLI

**Purpose:** Implements `echoctl daemon <verb>` (install/start/stop/restart/status/logs/uninstall) — renders and lints a launchd plist, bootstraps/kickstarts/boots-out the launchd job via `launchctl`, health-probes the MCP endpoint, and falls back to manual (no-launchd) behavior on non-macOS platforms. Also exports programmatic `installDaemon`/`startDaemon`/`getDaemonStatus`/`ensureDaemonRunning` used by `init.ts`.

**Depends on:** `../../daemon/lifecycle.js` (resolveDataDir, resolveDbPath), `../../echo-home/paths.js` (ECHO_HOME_PATHS), `./init.js` (readPackageVersion, resolveMcpPort), `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:url`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DaemonCommandError` | class | `src/cli/commands/daemon.ts:102` | Error subclass carrying the failing verb and numeric exit code for daemon control failures. |
| `writeLine(stream, line)` | function | `src/cli/commands/daemon.ts:149` | Writes a line to a stream, appending `\n` if missing. |
| `runtimePlatform(deps)` | function | `src/cli/commands/daemon.ts:153` | Returns injected or actual `process.platform`. |
| `isLaunchdPlatform(deps)` | function | `src/cli/commands/daemon.ts:157` | True only when runtime platform is darwin. |
| `pathJoinFor(deps, ...parts)` | function | `src/cli/commands/daemon.ts:161` | Joins path parts using win32 or POSIX join depending on platform. |
| `pathResolveFor(deps, path)` | function | `src/cli/commands/daemon.ts:165` | Resolves a path using win32 or POSIX resolve depending on platform. |
| `expandHome(path, deps)` | function | `src/cli/commands/daemon.ts:169` | Expands a leading `~` or `~/` to the home directory. |
| `abs(path, deps)` | function | `src/cli/commands/daemon.ts:175` | Expands home then resolves to an absolute path for the target platform. |
| `installCwd(deps)` | function | `src/cli/commands/daemon.ts:179` | Returns injected cwd or `process.cwd()`. |
| `absFromInstallCwd(path, deps)` | function | `src/cli/commands/daemon.ts:183` | Resolves a path relative to the install cwd (platform-aware) after home expansion. |
| `defaultPlistPath(label)` | function | `src/cli/commands/daemon.ts:190` | Computes `~/Library/LaunchAgents/<label>.plist`. |
| `defaultDaemonPath()` | function | `src/cli/commands/daemon.ts:194` | Resolves the compiled daemon entrypoint path relative to this module. |
| `parsePort(value)` | function | `src/cli/commands/daemon.ts:198` | Parses `--port`, defaulting via `resolveMcpPort()`, validating 0–65535. |
| `parseTail(value)` | function | `src/cli/commands/daemon.ts:207` | Parses `--tail`, default 50, must be a positive integer. |
| `isDirectory(path)` | function | `src/cli/commands/daemon.ts:218` | Safe stat-based directory check. |
| `hasReviewerHarness(repoRoot, deps)` | function | `src/cli/commands/daemon.ts:226` | Checks for `tools/review-queue` directory marker under a repo root. |
| `validateExplicitRepoRoot(value, deps)` | function | `src/cli/commands/daemon.ts:230` | Validates and resolves an explicit `--repo-root`, requiring existence and reviewer-harness marker. |
| `deriveGitRepoRoot(deps)` | function | `src/cli/commands/daemon.ts:244` | Derives repo root via `git rev-parse --show-toplevel`, gated on reviewer-harness marker. |
| `resolveRepoRoot(values, deps)` | function | `src/cli/commands/daemon.ts:253` | Resolves `--repo-root` explicitly or derives from git; returns undefined if neither applies. |
| `resolveConfig(values, deps, options)` | function | `src/cli/commands/daemon.ts:262` | Builds a full `DaemonConfig` from parsed CLI flag values and deps, resolving all default paths. |
| `run(deps, command, args, options)` | function | `src/cli/commands/daemon.ts:293` | Runs a subprocess synchronously (via injectable `spawnSync`) and normalizes result/status/error. |
| `commandMissing(result)` | function | `src/cli/commands/daemon.ts:311` | True if the underlying command failed with ENOENT (missing binary). |
| `uid(deps)` | function | `src/cli/commands/daemon.ts:315` | Returns injected or real process uid, falling back to 501. |
| `userTarget(deps)` | function | `src/cli/commands/daemon.ts:319` | Builds the launchd `gui/<uid>` domain target. |
| `jobTarget(config, deps)` | function | `src/cli/commands/daemon.ts:323` | Builds the launchd `gui/<uid>/<label>` job target. |
| `launchctl(deps, args)` | function | `src/cli/commands/daemon.ts:327` | Runs the `launchctl` binary with given args. |
| `launchdLoaded(config, deps)` | function | `src/cli/commands/daemon.ts:331` | Runs `launchctl print <jobTarget>` to check if the job is loaded. |
| `parseNonNegativeInt(value)` | function | `src/cli/commands/daemon.ts:335` | Parses a string of digits into a safe non-negative integer or null. |
| `parsePsElapsedTimeSeconds(raw)` | function | `src/cli/commands/daemon.ts:341` | Parses `ps -o etime=` output (`[[dd-]hh:]mm:ss`) into total seconds. |
| `getDaemonUptimeSeconds(pid, deps)` | function | `src/cli/commands/daemon.ts:373` | Runs `ps -o etime=` for a pid and converts to seconds via `parsePsElapsedTimeSeconds`. |
| `formatUptime(seconds)` | function | `src/cli/commands/daemon.ts:387` | Formats seconds into a human string like `2d 3h 4m` / `5m 6s`. |
| `packageRootFromDaemonPath(daemonPath)` | function | `src/cli/commands/daemon.ts:400` | Walks up three directories from the daemon binary path to the package root. |
| `ensureWritableDir(path)` | function | `src/cli/commands/daemon.ts:404` | Creates a directory recursively and asserts it is writable. |
| `assertReadableFile(path, label)` | function | `src/cli/commands/daemon.ts:409` | Throws if a required file is missing or unreadable. |
| `runPreflight(config)` | function | `src/cli/commands/daemon.ts:416` | Verifies daemon binary, SQL migrations, reviewer harness configs/schemas exist, and log/data/db dirs are writable before install/start. |
| `verifyNodeVersion(config, deps)` | function | `src/cli/commands/daemon.ts:443` | Runs `node --version` and requires major version ≥22. |
| `xmlEscape(value)` | function | `src/cli/commands/daemon.ts:456` | Escapes XML special characters for plist string values. |
| `renderRepoRootEnv(config)` | function | `src/cli/commands/daemon.ts:465` | Renders the optional `ECHO_REPO_ROOT` plist env-var XML block. |
| `renderLaunchdPlist(config)` | function | `src/cli/commands/daemon.ts:472` | Renders the full launchd plist XML (ProgramArguments, KeepAlive, log paths, env vars) for the daemon config. |
| `xmlUnescape(value)` | function | `src/cli/commands/daemon.ts:515` | Reverses `xmlEscape` for reading back plist strings. |
| `stringsIn(block)` | function | `src/cli/commands/daemon.ts:524` | Extracts all `<string>` element contents from an XML block. |
| `stringAfterKey(xml, key)` | function | `src/cli/commands/daemon.ts:528` | Extracts the string value following a given `<key>` in plist XML. |
| `readPlistConfig(base)` | function | `src/cli/commands/daemon.ts:533` | Parses an installed plist file back into a `DaemonConfig`, overriding base fields with what's on disk. |
| `writeAndLintPlist(config, deps)` | function | `src/cli/commands/daemon.ts:557` | Writes plist to a temp file, lints with `plutil -lint`, then atomically renames into place. |
| `probeOnce(port, deps)` | function | `src/cli/commands/daemon.ts:573` | Sends one MCP `initialize` JSON-RPC POST with a 2s abort timeout; returns whether the response was 2xx. |
| `waitForHealthy(config, deps)` | function | `src/cli/commands/daemon.ts:604` | Polls `probeOnce` with exponential backoff up to a deadline (default 10s). |
| `bootout(config, deps)` | function | `src/cli/commands/daemon.ts:619` | Runs `launchctl bootout` for the job target. |
| `bootstrap(config, deps)` | function | `src/cli/commands/daemon.ts:623` | Runs `launchctl bootstrap` with the plist path. |
| `kickstart(config, deps)` | function | `src/cli/commands/daemon.ts:627` | Runs `launchctl kickstart -k` to force-restart the job. |
| `isLaunchdNotFound(result)` | function | `src/cli/commands/daemon.ts:631` | Regex-detects "not found"/"No such process" in launchctl output to distinguish benign bootout failures. |
| `controlValues(opts)` | function | `src/cli/commands/daemon.ts:635` | Converts a `DaemonControlOptions` object into the flag-keyed values record used by `resolveConfig`. |
| `resolveDaemonControlConfig(opts)` | function | `src/cli/commands/daemon.ts:648` | Public helper resolving a `DaemonConfig` from `DaemonControlOptions` without repo-root resolution. |
| `captureStream(out)` | function | `src/cli/commands/daemon.ts:652` | Creates a Writable that pushes chunks into an array (for capturing sub-call output). |
| `capturedOutput(stdout, stderr)` | function | `src/cli/commands/daemon.ts:656` | Joins and trims captured stdout+stderr arrays into one string. |
| `manualDaemonStatus(config, deps, stdout)` | function | `src/cli/commands/daemon.ts:660` | Prints manual (non-launchd) daemon status by probing health directly. |
| `manualDaemonNoop(verb, deps, stdout)` | function | `src/cli/commands/daemon.ts:692` | Prints a no-op message for daemon verbs that don't apply outside launchd platforms. |
| `runDaemonControlVerb(verb, config, deps)` | function | `src/cli/commands/daemon.ts:697` | Runs `install` or `start` capturing output, throwing `DaemonCommandError` on non-zero exit. |
| `getDaemonStatus(opts)` | function | `src/cli/commands/daemon.ts:717` | Public API: returns `DaemonServiceStatus` (installed/running/healthy/launchdRegistered) for launchd or manual platforms. |
| `installDaemon(opts)` | function | `src/cli/commands/daemon.ts:754` | Public API: resolves repo-root-aware config and runs the `install` verb, returning the config. |
| `startDaemon(opts)` | function | `src/cli/commands/daemon.ts:762` | Public API: resolves config and runs the `start` verb, returning the config. |
| `ensureDaemonRunning(opts)` | function | `src/cli/commands/daemon.ts:768` | Public API used by `init.ts`: installs if not installed, starts if not running, else reports already-running. |
| `bootstrapAndProbe(config, deps, stderr)` | function | `src/cli/commands/daemon.ts:798` | Runs launchctl bootstrap + kickstart, waits for health, boots out and reports failure if unhealthy. |
| `install(config, deps, stdout, stderr)` | function | `src/cli/commands/daemon.ts:826` | Full install flow: node-version check, preflight, plist write+lint, bootout any existing job, bootstrap+probe, print summary. |
| `start(base, deps, stdout, stderr)` | function | `src/cli/commands/daemon.ts:857` | Starts an existing plist-based job if not already loaded/healthy, running preflight against the on-disk plist config. |
| `restart(base, deps, stdout, stderr)` | function | `src/cli/commands/daemon.ts:892` | Boots out then bootstraps+probes the existing plist job. |
| `stop(config, deps, stdout, stderr)` | function | `src/cli/commands/daemon.ts:919` | Boots out the launchd job, tolerating "not found" as success. |
| `status(config, deps, stdout, stderr)` | function | `src/cli/commands/daemon.ts:933` | Prints/JSON-emits running state, pid, uptime (via `ps`), and health for the launchd job. |
| `logs(config, deps, stdout, stderr, tail, follow)` | function | `src/cli/commands/daemon.ts:998` | Tails or follows (`tail -f`) the daemon's stdout/stderr log files. |
| `uninstall(config, deps, stdout, stderr)` | function | `src/cli/commands/daemon.ts:1020` | Boots out the job and removes the plist file. |
| `runDaemon(opts)` | function | `src/cli/commands/daemon.ts:1035` | CLI entrypoint: parses argv via `parseArgs`, validates verb/help, resolves config, dispatches to `runVerb` (optionally silencing stdout under `--quiet`). |
| `runVerb(verb, config, deps, stdout, stderr, tail, follow, explicitLogDir)` | function | `src/cli/commands/daemon.ts:1110` | Dispatches to the manual-platform handlers or the launchd verb implementations (install/start/stop/restart/status/logs/uninstall). |

### `src/cli/commands/doctor.ts` — health-check CLI (`echoctl doctor`)

**Purpose:** Implements `echoctl doctor`, which builds a `DoctorReport` covering daemon reachability, ECHO_HOME state validity, sync-lock staleness, the Codex adapter drift check, and per-agent onboarding/probe status, then renders it as text or JSON and computes an overall healthy/degraded/broken verdict.

**Depends on:** `../../daemon/lifecycle.js` (resolveDataDir), `../../echo-home/paths.js` (ECHO_HOME_PATHS, setEchoHomeRoot, validateOnboardingState, validateProjectsState), `../../echo-home/wizard/detect-agents.js` (AgentKind), `../../echo-home/wizard/probe.js` (probeAgents, ProbeOutcome), `../io/render.js` (renderDoctorReport), `./init.js` (buildRemediationCopy, parsePort, readPackageVersion, resolveMcpPort), `node:child_process`, `node:fs`, `node:path`, `node:url`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeLine(stream, line)` | function | `src/cli/commands/doctor.ts:74` | Writes a line to a stream appending `\n`. |
| `shellQuote(s)` | function | `src/cli/commands/doctor.ts:78` | Single-quotes a string for safe shell interpolation, escaping embedded quotes. |
| `isAgentKind(value)` | function | `src/cli/commands/doctor.ts:82` | Type guard for `codex`/`claude-code`/`cursor`. |
| `parseNonEmptyOption(value, flag)` | function | `src/cli/commands/doctor.ts:86` | Validates a CLI flag value is present and non-empty, else throws. |
| `parseDoctorArgs(args)` | function | `src/cli/commands/doctor.ts:92` | Parses `--home`/`--port`/`--label` doctor CLI flags via `parseArgs`. |
| `resolveDoctorPort(port)` | function | `src/cli/commands/doctor.ts:114` | Resolves the MCP port from opts (string/number) or default. |
| `readValidOnboarding()` | function | `src/cli/commands/doctor.ts:120` | Reads and schema-validates the onboarding state file, returning null on any failure. |
| `repoRootFromModule()` | function | `src/cli/commands/doctor.ts:131` | Resolves the repo root by walking up from this module's compiled location. |
| `resolveCodexInstallerPath()` | function | `src/cli/commands/doctor.ts:135` | Builds the path to `tools/install-echo-codex-skills.sh` relative to the repo root. |
| `runCodexInstallerCheck(installerPath)` | function | `src/cli/commands/doctor.ts:147` | Runs `tools/install-echo-codex-skills.sh --check` via `execFile` with a locked-down PATH and 30s timeout, capturing exit code/signal/stdout/stderr. |
| `nonEmptyDetail(primary, fallback)` | function | `src/cli/commands/doctor.ts:174` | Returns trimmed primary text or a fallback if empty. |
| `codexAdapterReportFromOutcome(outcome, installerPath)` | function | `src/cli/commands/doctor.ts:179` | Maps a codex-installer child-process outcome (exit 0/1/other, signal, spawn error) to a `codexAdapter` status of ok/drifted/check-error with detail+remediation. |
| `checkCodexAdapter()` | function | `src/cli/commands/doctor.ts:206` | Resolves the installer script path and runs the full check-and-map flow. |
| `renderCodexAdapterLines(report)` | function | `src/cli/commands/doctor.ts:211` | Renders the codex-adapter status/detail/remediation as text lines. |
| `renderDoctorWithCodexAdapter(report, opts)` | function | `src/cli/commands/doctor.ts:221` | Combines the base doctor report rendering with the codex-adapter lines. |
| `stateVersion()` | function | `src/cli/commands/doctor.ts:228` | Reads and validates onboarding + projects state files, computing schemaVersion (1/mismatch/missing) and install profile. |
| `probeMcp(fetchImpl, port)` | function | `src/cli/commands/doctor.ts:261` | Sends an MCP `initialize` JSON-RPC POST with a 2s abort timeout, returns whether it got a 2xx response. |
| `computeOverall(report)` | function | `src/cli/commands/doctor.ts:291` | Derives healthy/degraded/broken from echoHome existence/schema, daemon pidlock+MCP reachability, sync-lock presence, codex-adapter status, and per-agent probe outcomes. |
| `buildDoctorReport(opts)` | function | `src/cli/commands/doctor.ts:311` | Assembles the full `DoctorReport`: daemon health, ECHO_HOME state, sync lock staleness, codex adapter check, per-agent probes, and overall verdict. |
| `runDoctor(opts)` | function | `src/cli/commands/doctor.ts:378` | CLI entrypoint: resolves ECHO_HOME/port, builds the report, prints text or JSON (unless quiet), and returns 0 (healthy) or 1. |

### `src/cli/commands/init.ts` — onboarding wizard CLI (`echoctl init`)

**Purpose:** Implements `echoctl init`, the interactive/non-interactive onboarding flow that detects installed AI agents and git projects, wires ECHO adapters into them, records onboarding + capability state, brings up the daemon, and reports results as text or JSON. Also hosts shared helpers (`parsePort`, `resolveMcpPort`, `readPackageVersion`, `buildRemediationCopy`) reused by `daemon.ts` and `doctor.ts`.

**Depends on:** `../../echo-home/adapters/atomic-write.js`, `../../echo-home/paths.js` (ECHO_HOME_PATHS, setEchoHomeRoot, validateOnboardingState, validateProjectsState, types), `../../echo-home/roles.js` (Capability), `../../echo-home/wizard/run-wizard.js` (createWizard, Wizard), `../../echo-home/wizard/wire.js` (WireResult), `../../echo-home/wizard/detect-agents.js` (AGENT_KINDS, AgentKind), `../../echo-home/wizard/probe.js` (ProbeOutcome), `../io/render.js` (renderDetectedAgents, renderDetectedProjects, renderProbeOutcomes, renderWireResult), `../io/prompt.js` (makeTtyPrompt, PromptImpl), `../../echo-home/scaffold.js` (ensureEchoHome), `./daemon.js` (DaemonCommandError, ensureDaemonRunning, types), `../../echo-home/adapters/claude-code-mcp.js` (claudeCodeMcpAddCommand), `../../util/json.js` (parseJson, readJsonFile), `node:fs`, `node:path`, `node:url`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AGENT_CAPABILITIES_BY_KIND` | const | `src/cli/commands/init.ts:40` | Frozen map of per-agent-kind capability lists granted after successful wiring (codex/claude-code get full read/write+network, cursor gets mcp.echo.read only). |
| `isRecord(value)` | function | `src/cli/commands/init.ts:135` | Type guard for non-null, non-array plain objects. |
| `isErrnoException(err)` | function | `src/cli/commands/init.ts:139` | Type guard for `NodeJS.ErrnoException`. |
| `failAnswerFile(filePath, field, message)` | function | `src/cli/commands/init.ts:143` | Throws a formatted answer-file validation error referencing `--help`. |
| `parsePort(value, flag)` | function | `src/cli/commands/init.ts:147` | Validates a port string is digits-only and in 1–65535 range. |
| `resolveMcpPort()` | function | `src/cli/commands/init.ts:156` | Reads `ECHO_MCP_PORT` env var, falling back to 38478 on missing/invalid value. |
| `parseNonEmptyOption(value, flag)` | function | `src/cli/commands/init.ts:166` | Validates a CLI flag value is present and non-empty. |
| `parseProfile(value, flag)` | function | `src/cli/commands/init.ts:172` | Validates `--profile` is `customer` or `dogfood`. |
| `parseInitArgs(args)` | function | `src/cli/commands/init.ts:178` | Parses `echoctl init` CLI flags (home/port/profile/label/answer-file/force) via `parseArgs`. |
| `validateAnswerFile(filePath, value)` | function | `src/cli/commands/init.ts:206` | Validates the non-interactive answer-file JSON shape: required/optional fields, agent kinds, project root type. |
| `loadAnswerFile(path)` | function | `src/cli/commands/init.ts:254` | Reads and JSON-parses an answer file, mapping read/parse errors to `failAnswerFile`. |
| `readPackageVersion(packageJsonPath)` | function | `src/cli/commands/init.ts:275` | Reads the ECHO package.json version field (used in MCP client-info handshakes). |
| `buildRemediationCopy(mcpServerUrl)` | function | `src/cli/commands/init.ts:283` | Builds per-probe-failure-reason remediation message templates (cli-unavailable, auth-required, manual-only, mcp-not-configured, timeout, unexpected-output). |
| `writeLine(stream, line)` | function | `src/cli/commands/init.ts:300` | Writes a line to a stream appending `\n`. |
| `emitJson(opts, payload, final)` | function | `src/cli/commands/init.ts:304` | Writes a JSON event line to stdout unless quiet (unless it's the final event). |
| `emitText(opts, text)` | function | `src/cli/commands/init.ts:309` | Writes a text line to stdout unless quiet. |
| `isAgentKind(value)` | function | `src/cli/commands/init.ts:314` | Type guard checking membership in `AGENT_KINDS`. |
| `parseAgentSelection(input, fallback)` | function | `src/cli/commands/init.ts:318` | Parses a comma-separated agent-kind list, or returns the fallback set if input is blank. |
| `readOnboardingState()` | function | `src/cli/commands/init.ts:331` | Reads and validates the onboarding state JSON file, throwing on invalid shape. |
| `writeOnboardingState(state)` | function | `src/cli/commands/init.ts:339` | Atomically writes the onboarding state JSON file. |
| `readRecordedProfile()` | function | `src/cli/commands/init.ts:348` | Reads the existing onboarding file (if any) to recover a previously recorded install profile, tracking validity. |
| `resolveInstallProfile(input)` | function | `src/cli/commands/init.ts:367` | Picks install profile by precedence: CLI flag > answer-file > recorded > `customer` default. |
| `persistInstallProfile(profile, now)` | function | `src/cli/commands/init.ts:375` | Updates and writes the onboarding state's profile + last_updated_at. |
| `successfulAgents(result, selected)` | function | `src/cli/commands/init.ts:382` | Filters selected agents down to those the wire step reported `ok` for. |
| `populateCapabilitiesForWiredAgents(result, selectedAgents)` | function | `src/cli/commands/init.ts:389` | Updates each successfully-wired agent's onboarding-state capabilities to match `AGENT_CAPABILITIES_BY_KIND`, persisting if changed. |
| `topLevelFailure(result)` | function | `src/cli/commands/init.ts:408` | Extracts a top-level sync-lock or directory-symlink failure message from a wire result, if any. |
| `renderDaemonBringup(result)` | function | `src/cli/commands/init.ts:416` | Renders a human message for the daemon bringup action (installed-and-started/started/already-running). |
| `daemonFailureCopy(err)` | function | `src/cli/commands/init.ts:427` | Formats a daemon-command failure message with manual-retry guidance. |
| `runInit(opts)` | function | `src/cli/commands/init.ts:431` | Full CLI entrypoint: resolves ECHO_HOME/port/profile, requires TTY or answer-file, scaffolds ECHO_HOME, runs the wizard (detect agents/projects, confirm selection+default project, wire adapters, probe, bring up daemon, mark completed), emitting text/JSON progress events and returning an exit code. |

### `src/cli/commands/orchestration.ts` — per-repo orchestration onboarding CLI (`echoctl orchestration init`)

**Purpose:** Implements `echoctl orchestration init <repo>`, which resolves a target git repo, writes (or reuses) its `.echo/project.json`-style `ProjectConfig` (coord ref, reviews root, reviewers, spec dir), scaffolds the backlog pipeline directories, and registers the project in ECHO_HOME's `projects.json`.

**Depends on:** `../../echo-home/paths.js` (DEFAULT_PROJECT_CONFIG, loadProjectConfig, resolveEchoHomePaths, setEchoHomeRoot, upsertProjectRegistration, writeProjectConfig, ProjectConfig), `node:child_process` (execFileSync), `node:fs`, `node:os`, `node:path`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `OrchestrationUsageError` | class | `src/cli/commands/orchestration.ts:40` | Error subclass for CLI usage errors, mapped to exit code 2. |
| `writeLine(stream, line)` | function | `src/cli/commands/orchestration.ts:57` | Writes a line to a stream appending `\n`. |
| `expandHome(path)` | function | `src/cli/commands/orchestration.ts:61` | Expands leading `~`/`~/` to the home directory. |
| `parseNonEmpty(value, flag)` | function | `src/cli/commands/orchestration.ts:67` | Validates a CLI flag value is present and non-empty. |
| `parseReviewerList(value)` | function | `src/cli/commands/orchestration.ts:73` | Parses a comma-separated `--reviewers` list into a non-empty array. |
| `parseOrchestrationArgs(args)` | function | `src/cli/commands/orchestration.ts:83` | Parses and validates `orchestration init <repo>` positionals/flags (home, coord-ref, reviews-root, reviewers, spec-dir, json, quiet). |
| `resolveGitRoot(repoArg)` | function | `src/cli/commands/orchestration.ts:117` | Resolves the repo argument to its absolute path and confirms it's a git repo via `git rev-parse --show-toplevel`. |
| `scaffoldPipeline(repoRoot, config)` | function | `src/cli/commands/orchestration.ts:129` | Creates the backlog pipeline stage directories (proposed/ready/claimed/pending_review/complete) and the reviews root. |
| `desiredConfig(parsed)` | function | `src/cli/commands/orchestration.ts:137` | Builds the target `ProjectConfig` from parsed flags, falling back to `DEFAULT_PROJECT_CONFIG` values. |
| `emitJson(opts, payload)` | function | `src/cli/commands/orchestration.ts:147` | Writes a JSON payload to stdout unless quiet. |
| `emitText(opts, line)` | function | `src/cli/commands/orchestration.ts:152` | Writes a text line to stdout unless quiet. |
| `runOrchestration(opts)` | function | `src/cli/commands/orchestration.ts:157` | CLI entrypoint: parses args, resolves repo root, loads-or-writes the project config, scaffolds pipeline dirs, upserts project registration, and reports initialized/already-onboarded status. |

### `src/cli/commands/project.ts` — user-added git-capture-source CLI (`echoctl project`)

**Purpose:** Implements `echoctl project add|list|remove <path>`, managing user-added git repositories in the capture-sources config (merged with built-in defaults) that the daemon's git capture watches on next restart.

**Depends on:** `../../capture/sources.js` (DEFAULT_GIT_REPOS, mergeGitRepos, normalizeRepoPath, readCaptureSourcesConfig, CaptureSourcesConfig), `../../echo-home/adapters/atomic-write.js` (atomicWrite), `../../echo-home/paths.js` (ECHO_HOME_PATHS, setEchoHomeRoot), `../../echo-home/scaffold.js` (ensureEchoHome), `node:fs`, `node:os`, `node:path`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ProjectUsageError` | class | `src/cli/commands/project.ts:36` | Error subclass for CLI usage errors, mapped to exit code 2. |
| `writeLine(stream, line)` | function | `src/cli/commands/project.ts:54` | Writes a line to a stream appending `\n`. |
| `parseNonEmptyOption(value, flag)` | function | `src/cli/commands/project.ts:58` | Validates a CLI flag value is present and non-empty. |
| `parseProjectArgs(args)` | function | `src/cli/commands/project.ts:64` | Parses and validates the `add`/`list`/`remove` verb, path positional, and home/json/quiet flags. |
| `expandHome(path)` | function | `src/cli/commands/project.ts:95` | Expands leading `~`/`~/` to the home directory. |
| `resolveRepoArg(path)` | function | `src/cli/commands/project.ts:101` | Expands home and resolves a repo path argument to an absolute path. |
| `usage(message)` | function | `src/cli/commands/project.ts:105` | Throws a `ProjectUsageError` with the given message. |
| `assertGitRepo(repoRoot)` | function | `src/cli/commands/project.ts:109` | Validates the path exists, is a directory, and contains a `.git` directory. |
| `configPath()` | function | `src/cli/commands/project.ts:128` | Returns the capture-sources config file path from `ECHO_HOME_PATHS`. |
| `readUserRepos()` | function | `src/cli/commands/project.ts:132` | Reads user-added git repos from the capture-sources config, defaulting to empty array. |
| `containsRepo(repos, repoRoot)` | function | `src/cli/commands/project.ts:136` | Checks whether a normalized repo path already exists in a repo list. |
| `writeConfig(gitRepos, now)` | function | `src/cli/commands/project.ts:141` | Builds and atomically writes the capture-sources config with a merged, deduped git_repos list and timestamp. |
| `emitJson(opts, payload)` | function | `src/cli/commands/project.ts:156` | Writes a JSON payload to stdout unless quiet. |
| `emitText(opts, line)` | function | `src/cli/commands/project.ts:161` | Writes a text line to stdout unless quiet. |
| `effectiveRepos(userRepos)` | function | `src/cli/commands/project.ts:166` | Merges built-in default git repos with user-added ones. |
| `addProject(repoRoot, opts)` | function | `src/cli/commands/project.ts:170` | Validates the repo, rejects duplicates against the effective set, writes updated config, and reports the addition. |
| `listProjects(opts)` | function | `src/cli/commands/project.ts:192` | Lists the effective (default + user) captured git repos as text or JSON. |
| `removeProject(repoRoot, opts)` | function | `src/cli/commands/project.ts:206` | Removes a user-added repo from config, rejecting removal of built-in repos or repos not currently captured. |
| `runProject(opts)` | function | `src/cli/commands/project.ts:232` | CLI entrypoint: parses args, sets ECHO_HOME, ensures it's scaffolded, and dispatches to add/list/remove, returning an exit code. |

### `src/cli/commands/run.ts` — workflow dispatch CLI (`echoctl run <workflow>`)

**Purpose:** Implements `echoctl run <workflow>`, which resolves the current project root, loads an installed TOML workflow definition, matches its role steps to onboarded agents, dispatches each step as a subprocess (with signal handling for SIGINT/SIGTERM), and computes a process exit code from the outcomes.

**Depends on:** `../../echo-home/paths.js` (ECHO_HOME_PATHS, validateOnboardingState, validateProjectsState), `../../echo-home/roles.js` (loadRolesFromDir), `../../echo-home/wizard/detect-agents.js` (AgentKind), `../workflow/dispatch.js` (dispatchWorkflow, DispatchOutcome, DispatchSpawn), `../workflow/load.js` (listWorkflows, loadWorkflow), `../workflow/match.js` (matchRolesToAgents), `node:fs`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeLine(stream, line)` | function | `src/cli/commands/run.ts:40` | Writes a line to a stream appending `\n`. |
| `workflowNames(dir)` | function | `src/cli/commands/run.ts:44` | Lists installed workflow names by scanning for `<name>.toml` files matching a kebab-case pattern. |
| `findGitRoot(start)` | function | `src/cli/commands/run.ts:52` | Walks upward from a starting directory to find the nearest `.git` ancestor. |
| `readDefaultProject(path)` | function | `src/cli/commands/run.ts:62` | Reads the projects-state file and returns its `default_project` field if valid. |
| `resolveProjectRoot(opts)` | function | `src/cli/commands/run.ts:74` | Resolves the active project root: explicit `--project` flag, else git root of cwd, else the recorded default project. |
| `readOnboarded(path)` | function | `src/cli/commands/run.ts:82` | Reads and validates the onboarding-state file, returning its `agents` array. |
| `renderOutcomes(outcomes, opts)` | function | `src/cli/commands/run.ts:88` | Renders per-step dispatch outcomes (exit code, stdout, stderr on failure) as text or a single JSON event. |
| `computeExitCode(outcomes, receivedSignal)` | function | `src/cli/commands/run.ts:114` | Derives the process exit code: 143 for SIGTERM, 130 for SIGINT (from live signal or any interrupted outcome), else 0 if every step exited 0 without timeout, else 1. |
| `runRun(opts)` | function | `src/cli/commands/run.ts:131` | CLI entrypoint: resolves project root, validates a workflow is installed and named, loads it, matches roles to onboarded agents, dispatches with SIGINT/SIGTERM handling and an AbortController, renders outcomes, and returns the computed exit code. |

### `src/cli/commands/selftest.ts` — cross-platform onboarding smoke test runner

**Purpose:** Implements `echoctl selftest`: spins up a fully isolated sandbox (HOME/ECHO_HOME/CODEX_HOME/data dir), starts a throwaway daemon on `ECHO_MCP_PORT=0`, and runs 23 numbered checks (INS/DAE/MCP/INIT/WIR/SKILL/CAP/REC/DOC/SELF ids) covering daemon startup, init wiring, capture-recall round trip, daemon restart, and doctor output, never touching the production port 38478.

**Depends on:** `../../capture/sources.js` (normalizeRepoPath, readCaptureSourcesConfig), `node:child_process`, `node:fs`, `node:os`, `node:path`, `node:url`, `node:util`, `better-sqlite3` (via createRequire)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SELFTEST_CHECK_IDS` | const | `src/cli/commands/selftest.ts:12` | Ordered tuple of the 23 check ids the runner must record or skip. |
| `SELFTEST_HELP` | const | `src/cli/commands/selftest.ts:141` | Usage text describing the sandboxed selftest behavior and exit-code contract. |
| `DEFAULT_PATHS` | const | `src/cli/commands/selftest.ts:154` | Resolves cliEntry/daemonEntry/packageRoot from `import.meta.url` for the compiled dist layout. |
| `SelfTestTimeout` | class | `src/cli/commands/selftest.ts:162` | Error subtype thrown when the whole selftest run exceeds its timeout. |
| `parseSelfTestArgs(args)` | function | `src/cli/commands/selftest.ts:169` | Parses `--keep-sandbox` flag via node:util parseArgs. |
| `writeLine(stream, line)` | function | `src/cli/commands/selftest.ts:181` | Writes a line to a stream ensuring trailing newline. |
| `defaultSleep(ms)` | function | `src/cli/commands/selftest.ts:185` | Promise-based delay helper. |
| `defaultRunCommand(ctx)` | function | `src/cli/commands/selftest.ts:196` | Runs a CLI subprocess synchronously via execFileSync, capturing combined stdout/stderr and exit code. |
| `safeRead(path)` | function | `src/cli/commands/selftest.ts:210` | Reads a file, returning empty string on any error. |
| `readPidLockPid(sandbox)` | function | `src/cli/commands/selftest.ts:218` | Parses `daemon.pid` from the sandbox data dir. |
| `isProcessAlive(pid)` | function | `src/cli/commands/selftest.ts:227` | Checks liveness of a pid via `process.kill(pid, 0)`, treating EPERM as alive. |
| `captureSourcesIncludesRepo(filePath, repo)` | function | `src/cli/commands/selftest.ts:236` | Checks whether a normalized repo path appears in the capture-sources.json git_repos list. |
| `defaultLoadSqlite()` | function | `src/cli/commands/selftest.ts:247` | Verifies better-sqlite3 native binding loads and can run a trivial query. |
| `defaultHasEventsTable(dbPath)` | function | `src/cli/commands/selftest.ts:260` | Opens the sandbox db read-only and checks sqlite_master for an `events` table. |
| `defaultMcpRequest(url, method, params)` | function | `src/cli/commands/selftest.ts:277` | POSTs a JSON-RPC MCP request and extracts the response, unwrapping SSE `data:` lines if present. |
| `toolCall(mcpRequest, url, name, args)` | function | `src/cli/commands/selftest.ts:299` | Wraps `tools/call` JSON-RPC invocation with name/arguments. |
| `pollUntilRecall(args)` | function | `src/cli/commands/selftest.ts:308` | Polls `search_memories` with a token until it appears in results or times out. |
| `priorDaemonReleaseStatus(args)` | function | `src/cli/commands/selftest.ts:335` | Checks whether the pid-lock from a prior daemon has been released. |
| `pollUntilPriorDaemonReleased(args)` | function | `src/cli/commands/selftest.ts:353` | Polls `priorDaemonReleaseStatus` until true or timeout. |
| `withTimeout(label, timeoutMs, work)` | function | `src/cli/commands/selftest.ts:376` | Races a promise against a timeout, rejecting with a labeled error. |
| `daemonReadyStatus(args)` | function | `src/cli/commands/selftest.ts:393` | Confirms pid-lock present and MCP `tools/list` returns all REQUIRED_ECHO_TOOLS. |
| `startDaemonUntilReady(args)` | function | `src/cli/commands/selftest.ts:424` | Retries starting + readiness-checking the daemon until ready or timeout budget exhausted. |
| `parseLifecyclePort(line)` | function | `src/cli/commands/selftest.ts:479` | Parses a daemon stdout JSON line for a `daemon.lifecycle`/`started` event and extracts mcp_port/mcp_url. |
| `defaultStartDaemon(ctx)` | function | `src/cli/commands/selftest.ts:498` | Spawns the daemon entry as a detached child process and resolves once a lifecycle-started line is parsed from stdout or timeout/exit occurs. |
| `waitForChildExit(child, ms)` | function | `src/cli/commands/selftest.ts:543` | Waits for a child process to exit within a bound, resolving early on the 'exit' event. |
| `defaultStopDaemon({handle, sandbox})` | function | `src/cli/commands/selftest.ts:554` | Sends SIGTERM (then SIGKILL if needed) to both the pid-lock pid and the spawned child/process-group. |
| `makeSandbox(deps)` | function | `src/cli/commands/selftest.ts:580` | Creates the temp sandbox directory tree (home, data, launchd, logs) and computes all sandbox paths. |
| `makeDaemonEnv(sandbox)` | function | `src/cli/commands/selftest.ts:596` | Builds the daemon's process env pointed at sandbox HOME/ECHO_HOME/CODEX_HOME/DB with `ECHO_MCP_PORT=0`. |
| `makeClientEnv(daemonEnv, port)` | function | `src/cli/commands/selftest.ts:611` | Derives the client (echoctl) env by overriding ECHO_MCP_PORT with the resolved port. |
| `runSelftest(opts)` | function | `src/cli/commands/selftest.ts:618` | Orchestrates the full selftest: builds sandbox/deps, races `performChecks()` against a global timeout, always tears down the daemon and (unless keepSandbox) the sandbox dir, then prints/returns a `SelfTestReport`. |
| `performChecks()` | function | `src/cli/commands/selftest.ts:671` | Inner async routine (closure in runSelftest) executing the 23 checks in sequence: binary presence, sqlite load, daemon start, pid-lock, events table, MCP tools, git init, `init` with BOM answer file, onboarding.json, CLAUDE.md/AGENTS.md/config.toml/SKILL.md markers, capture-sources registration, commit+recall, find_clusters, doctor, re-init idempotency, and non-production-port assertion. |

### `src/cli/commands/uninstall.ts` — `echoctl uninstall` command

**Purpose:** Reverses ECHO's onboarding writes: strips ECHO marker blocks from CLAUDE.md/AGENTS.md, removes the Codex/Cursor MCP config entries, deletes ECHO-installed Claude skill files, and optionally purges `~/.echo` state, reporting per-agent conflicts that block destructive purges.

**Depends on:** `../../echo-home/paths.js` (ECHO_HOME_PATHS, validateOnboardingState, OnboardingState), `../../echo-home/wizard/detect-agents.js` (AGENT_KINDS, AgentKind), `../io/prompt.js` (makeTtyPrompt, PromptImpl), `../inverse/codex-config.js`, `../inverse/cursor-config.js`, `../inverse/markers.js`, `../inverse/skills.js`, `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeLine(stream, line)` | function | `src/cli/commands/uninstall.ts:41` | Writes a line with trailing newline to a stream. |
| `isAgentKind(value)` | function | `src/cli/commands/uninstall.ts:45` | Type guard checking membership in AGENT_KINDS. |
| `readState()` | function | `src/cli/commands/uninstall.ts:49` | Loads and validates `onboarding.json`, returning null on any parse/validation failure. |
| `skillNames()` | function | `src/cli/commands/uninstall.ts:58` | Lists `.md` skill basenames from ECHO_HOME_PATHS.skills, sorted. |
| `recordMarker(summary, agent, filePath)` | function | `src/cli/commands/uninstall.ts:69` | Calls `stripEchoMarkers`, appends the action to summary.actions, and records a conflict if the strip failed. |
| `recordCodex(summary, filePath)` | function | `src/cli/commands/uninstall.ts:77` | Calls `removeCodexMcpEntry` and records action/conflict for the codex config.toml. |
| `recordCursor(summary, filePath)` | function | `src/cli/commands/uninstall.ts:89` | Calls `removeCursorMcpEntry` and records action/conflict for cursor mcp.json. |
| `trackedWiredAgents(state)` | function | `src/cli/commands/uninstall.ts:101` | Filters AGENT_KINDS to those recorded as wired (non-null `wired_at`) in onboarding state. |
| `filesToInspect(home)` | function | `src/cli/commands/uninstall.ts:110` | Lists the five candidate config file/dir paths under a home dir that uninstall may touch. |
| `cleanupAgent(summary, agent, home)` | function | `src/cli/commands/uninstall.ts:120` | Dispatches per-agent-kind cleanup: codex (marker+config), claude-code (marker+skill removal), cursor (config only). |
| `confirmed(opts, message)` | function | `src/cli/commands/uninstall.ts:147` | Returns true immediately if `--yes`, else prompts for confirmation via PromptImpl. |
| `emitSummary(opts, summary)` | function | `src/cli/commands/uninstall.ts:152` | Prints the cleanup summary as JSON or human-readable lines (tracked agents, actions, conflicts, purge status). |
| `runUninstall(opts)` | function | `src/cli/commands/uninstall.ts:178` | Top-level uninstall flow: shows files-to-inspect and confirms (unless `--yes`), runs cleanup per agent kind, optionally purges `~/.echo` (refusing if conflicts exist unless `--force-purge`), emits summary, returns exit code 1 on unresolved conflicts. |

### `src/cli/index.ts` — `echoctl` CLI entrypoint / command router

**Purpose:** Parses global flags (`--json`, `--quiet`, `--no-color`) and dispatches to the init/doctor/daemon/orchestration/project/uninstall/run/selftest subcommands, each implemented in `./commands/*.js`; also handles `--help`/`--version` and validates `run`'s `--agent`/`--timeout` flags.

**Depends on:** `./commands/doctor.js`, `./commands/daemon.js`, `./commands/init.js`, `./commands/orchestration.js`, `./commands/project.js`, `./commands/run.js`, `./commands/selftest.js`, `./commands/uninstall.js`, `../echo-home/wizard/detect-agents.js` (AgentKind), `node:util`, `node:fs`, `node:url`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `HELP` | const | `src/cli/index.ts:21` | Top-level usage text listing all subcommands. |
| `COMMAND_HELP` | const | `src/cli/index.ts:34` | Map from command name to its per-command help string. |
| `peelGlobal(argv)` | function | `src/cli/index.ts:45` | Splits argv into global flags (json/quiet/no-color) and the remaining command-specific args, computing color-enabled from TTY + NO_COLOR env. |
| `print(stream, text)` | function | `src/cli/index.ts:76` | Writes text to a stream ensuring a trailing newline. |
| `parseAgentOverride(value)` | function | `src/cli/index.ts:80` | Parses a `role=agent` string for `run --agent`, validating agent kind is codex/claude-code/cursor. |
| `parseTimeoutSeconds(value)` | function | `src/cli/index.ts:91` | Validates/parses a `--timeout` string into a positive integer seconds value, or null if invalid. |
| `main(argv)` | function | `src/cli/index.ts:98` | Top-level async CLI dispatcher: handles help/version, routes to each subcommand handler, parses `run`'s workflow/positional/agent/timeout args, catches and reports errors with exit code 1. |
| `isDirectInvocation()` | function | `src/cli/index.ts:202` | Detects whether this module was invoked directly (vs imported) by comparing `import.meta.url` to the resolved argv[1] path. |

### `src/cli/inverse/codex-config.ts` — Codex `config.toml` MCP-entry remover

**Purpose:** Provides the inverse of the Codex TOML wiring step: locates and removes the `[mcp_servers.echo]` TOML table (and any following blank-line artifacts) from `config.toml` for `echoctl uninstall`, refusing to touch symlinked or unparsable files.

**Depends on:** `smol-toml` (parse), `../../echo-home/adapters/atomic-write.js` (atomicWrite), `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RemoveCodexMcpEntryResult` | type | `src/cli/inverse/codex-config.ts:5` | Result shape: action removed/noop/conflict plus an optional reason code. |
| `linesWithOffsets(text)` | function | `src/cli/inverse/codex-config.ts:16` | Splits text into lines while tracking each line's start/end byte offsets. |
| `isEchoHeader(line)` | function | `src/cli/inverse/codex-config.ts:28` | Regex-matches the `[mcp_servers.echo]` TOML table header (BOM-tolerant). |
| `isAnyHeader(line)` | function | `src/cli/inverse/codex-config.ts:32` | Regex-matches any TOML table/array-of-tables header line. |
| `findEchoRange(text)` | function | `src/cli/inverse/codex-config.ts:36` | Finds the byte range spanning the echo table header through just before the next header (or EOF). |
| `collapseOuterBlank(before, after)` | function | `src/cli/inverse/codex-config.ts:50` | Collapses a doubled blank line left behind at the removal seam. |
| `removeCodexMcpEntry(opts)` | function | `src/cli/inverse/codex-config.ts:62` | Reads config.toml, verifies it's not a symlink and parses as valid TOML, removes the echo mcp_servers table via `findEchoRange`, and atomically writes the result (secret-sensitive). |

### `src/cli/inverse/cursor-config.ts` — Cursor `mcp.json` MCP-entry remover

**Purpose:** Inverse of Cursor MCP wiring: deletes the `mcpServers.echo` key from `~/.cursor/mcp.json` for uninstall, refusing symlinked or unparsable files.

**Depends on:** `../../echo-home/adapters/atomic-write.js` (atomicWrite), `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RemoveCursorMcpEntryResult` | type | `src/cli/inverse/cursor-config.ts:4` | Result shape: action removed/noop/conflict plus an optional reason code. |
| `isRecord(value)` | function | `src/cli/inverse/cursor-config.ts:9` | Type guard for non-array plain objects. |
| `removeCursorMcpEntry(opts)` | function | `src/cli/inverse/cursor-config.ts:13` | Reads and JSON-parses mcp.json, verifies not symlinked/malformed, deletes `mcpServers.echo` if present, and atomically rewrites pretty-printed JSON (secret-sensitive). |

### `src/cli/inverse/markers.ts` — generic ECHO marker-block stripper

**Purpose:** Shared inverse-of-wiring primitive: removes the `BEGIN ECHO`/`END ECHO` marker block (used in CLAUDE.md and AGENTS.md) from a text file, detecting malformed marker counts/ordering as a conflict rather than guessing.

**Depends on:** `../../echo-home/adapters/atomic-write.js` (atomicWrite), `../../echo-home/adapters/markers.js` (BEGIN_MARKER, END_MARKER), `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `StripMarkersOpts` | type | `src/cli/inverse/markers.ts:5` | Input shape: `{ filePath }`. |
| `StripMarkersResult` | type | `src/cli/inverse/markers.ts:9` | Discriminated union: stripped (with byte counts), noop (file-missing/no-markers), or conflict (malformed-markers/symlink-target). |
| `count(text, needle)` | function | `src/cli/inverse/markers.ts:14` | Counts non-overlapping occurrences of a substring. |
| `lineStart(text, idx)` | function | `src/cli/inverse/markers.ts:24` | Finds the start offset of the line containing index idx. |
| `lineEnd(text, idx)` | function | `src/cli/inverse/markers.ts:29` | Finds the end offset (inclusive of newline) of the line containing index idx. |
| `collapseBlankJoin(before, after)` | function | `src/cli/inverse/markers.ts:34` | Collapses a doubled blank line left at the marker-removal seam. |
| `stripEchoMarkers(opts)` | function | `src/cli/inverse/markers.ts:44` | Reads the file, refuses symlinks, verifies exactly one BEGIN/END pair in correct order (else conflict), removes the marker-bounded range, and atomically writes the result, returning byte-size before/after. |

### `src/cli/inverse/skills.ts` — ECHO Claude-skill file remover

**Purpose:** Inverse of Claude skill installation: removes previously-installed ECHO skill `.md` files from `~/.claude/commands`, but only when the target file is byte-identical to the current source (skipping user-modified, symlinked, or already-missing files) so uninstall never clobbers user edits.

**Depends on:** `../../echo-home/paths.js` (ECHO_HOME_PATHS), `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `removeEchoClaudeSkills(opts)` | function | `src/cli/inverse/skills.ts:6` | For each given skill name, compares `~/.claude/commands/<name>.md` against the source in ECHO's skills dir; unlinks and records as removed only on exact byte match, otherwise records a skip reason (missing/source-missing/user-modified/symlink). |

### `src/cli/io/prompt.ts` — interactive/non-interactive CLI prompt abstraction

**Purpose:** Defines the `PromptImpl` interface (readPrompt/readConfirm/readSelect) used throughout onboarding/uninstall flows, with a TTY-backed readline implementation and a scripted non-interactive implementation for tests/answer-files.

**Depends on:** `node:readline/promises`, `node:process`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PromptImpl` | interface | `src/cli/io/prompt.ts:4` | Contract: readPrompt(message, opts), readConfirm(message, opts), readSelect(message, choices). |
| `NonInteractiveError` | class | `src/cli/io/prompt.ts:10` | Error thrown when a non-interactive prompt lacks a default/answer. |
| `confirmFromText(value, fallback)` | function | `src/cli/io/prompt.ts:17` | Parses yes/no/true/false/1/0 text into a boolean, falling back or throwing if ambiguous. |
| `formatReadPromptMessage(message, defaultValue)` | function | `src/cli/io/prompt.ts:26` | Formats a prompt message with an optional `[default: x]`/`[Enter to skip]` suffix. |
| `makeTtyPrompt()` | function | `src/cli/io/prompt.ts:32` | Returns a PromptImpl: if stdin isn't a TTY, only defaults are honored (else throws NonInteractiveError); if TTY, uses `readline/promises` to interactively prompt/confirm/select. |
| `makeNonInteractivePrompt(defaults)` | function | `src/cli/io/prompt.ts:84` | Returns a PromptImpl backed entirely by a lookup map keyed by prompt message, throwing NonInteractiveError on missing/wrong-typed answers. |

### `src/cli/io/render.ts` — human-readable status text renderers

**Purpose:** Pure formatting functions that turn onboarding/doctor domain objects (detected agents/projects, wire results, probe outcomes, doctor reports) into colorized/plain multi-line CLI text.

**Depends on:** `../../echo-home/wizard/detect-agents.js` (DetectedAgent), `../../echo-home/wizard/detect-projects.js` (DetectedProject), `../../echo-home/wizard/probe.js` (ProbeOutcome), `../../echo-home/wizard/wire.js` (WireResult), `../commands/doctor.js` (DoctorReport), `../commands/init.js` (buildRemediationCopy type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `status(ok, color)` | function | `src/cli/io/render.ts:8` | Renders "OK"/"WARN" with optional ANSI green/yellow coloring. |
| `renderDetectedAgents(agents, opts)` | function | `src/cli/io/render.ts:13` | Formats a numbered list of detected agents with confidence, config presence, and activity count. |
| `renderDetectedProjects(projects, opts)` | function | `src/cli/io/render.ts:27` | Formats a numbered list of detected project repo roots with event counts. |
| `renderWireResult(result, opts)` | function | `src/cli/io/render.ts:38` | Formats sync-lock/repo-root/symlink messages plus per-agent wire ok/conflict lines (including unified diffs on conflict). |
| `renderProbeOutcomes(outcomes, opts)` | function | `src/cli/io/render.ts:61` | Formats per-agent probe results, appending remediation copy text for failed probes. |
| `renderDoctorReport(report, opts)` | function | `src/cli/io/render.ts:76` | Formats the full doctor report: overall status, daemon/echo-home/sync-lock state, per-agent probe status with remediation copy, and a closing recommendation line if unhealthy. |

### `src/cli/workflow/dispatch.ts` — workflow step dispatcher (spawns agent CLIs)

**Purpose:** Given a loaded `Workflow` and its resolved `AgentMatch`es, sequentially spawns the matched agent CLI (`codex exec` or `claude --print`) per step, enforcing per-step timeout, abort-signal interruption, and stopping the workflow on first failure/mismatch; Cursor is explicitly non-dispatchable.

**Depends on:** `node:child_process` (spawn, ChildProcess), `../../echo-home/wizard/detect-agents.js` (AgentKind, via match.js), `./match.js` (AgentMatch), `./load.js` (Workflow, WorkflowStep)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DispatchOutcome` | interface | `src/cli/workflow/dispatch.ts:6` | Per-step result: the step, its match, spawn result (or null), optional error/signal. |
| `DispatchSpawn` | type | `src/cli/workflow/dispatch.ts:20` | Type alias for `node:child_process`'s spawn signature, injectable for testing. |
| `DispatchOpts` | interface | `src/cli/workflow/dispatch.ts:22` | Options: workflow, matches, spawn override, timeoutMs, projectRoot, AbortSignal, receivedSignal ref, signalGate hook. |
| `argsFor(agent, sandbox, prompt)` | function | `src/cli/workflow/dispatch.ts:33` | Builds the CLI command+args for codex (`codex exec --sandbox <mode> -- <prompt>`) or claude-code (`claude --print --output-format text -- <prompt>`); returns null for cursor. |
| `renderPrompt(step)` | function | `src/cli/workflow/dispatch.ts:49` | Interpolates `${key}` placeholders in a step's prompt template from step.inputs, throwing if a referenced input is missing. |
| `runSpawn(opts)` | function | `src/cli/workflow/dispatch.ts:57` | Spawns a child process, captures stdout/stderr, enforces a timeout (SIGTERM), handles AbortSignal-triggered kill, and resolves a normalized outcome including ENOENT/interrupted flags. |
| `dispatchWorkflow(opts)` | function | `src/cli/workflow/dispatch.ts:152` | Iterates workflow steps in order, skipping/stopping on abort, unmatched role, missing resolvedSandbox, or unsupported agent; renders each step's prompt, spawns via `runSpawn`, and stops the whole run on non-zero exit, timeout, ENOENT, or interruption; awaits an optional `signalGate.beforeNextSpawn` between steps. |

### `src/cli/workflow/load.ts` — workflow TOML loader/validator

**Purpose:** Parses and strictly validates `~/.echo/workflows/<name>.toml` files into typed `Workflow`/`WorkflowStep` objects (filename-name agreement, schema_version pinning, no unknown keys, kebab-case roles), and lists all valid workflows in a directory.

**Depends on:** `smol-toml` (parse), `node:fs`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `WORKFLOW_FILENAME_RE` | const | `src/cli/workflow/load.ts:5` | Regex requiring lowercase-kebab `.toml` filenames. |
| `ROLE_NAME_RE` | const | `src/cli/workflow/load.ts:6` | Regex requiring lowercase-kebab role names. |
| `Workflow` | interface | `src/cli/workflow/load.ts:8` | Parsed workflow: name, description, schemaVersion (literal 1), steps, sourcePath. |
| `WorkflowStep` | interface | `src/cli/workflow/load.ts:16` | Parsed step: role, prompt template, inputs record. |
| `WorkflowValidationError` | class | `src/cli/workflow/load.ts:22` | Error carrying filePath and optional field, formatted as `<path>: <field>: <message>`. |
| `isRecord(value)` | function | `src/cli/workflow/load.ts:35` | Type guard for non-array plain objects. |
| `fail(filePath, field, message)` | function | `src/cli/workflow/load.ts:39` | Throws a `WorkflowValidationError`; typed as `never`. |
| `allowedKeys(record, allowed, filePath, prefix)` | function | `src/cli/workflow/load.ts:43` | Fails if `record` contains any key outside the allowed list. |
| `requiredString(record, key, filePath, field)` | function | `src/cli/workflow/load.ts:54` | Fails unless `record[key]` is a non-empty string; returns it. |
| `parseToml(filePath)` | function | `src/cli/workflow/load.ts:67` | Reads and parses TOML, requiring a table at the root, wrapping parse errors as WorkflowValidationError. |
| `validateInputs(value, filePath, field)` | function | `src/cli/workflow/load.ts:78` | Validates an inputs table is string-to-string, returning a frozen record (empty if undefined). |
| `loadWorkflow(filePath)` | function | `src/cli/workflow/load.ts:94` | Validates filename pattern, parses the TOML, checks `[workflow]` table (name must equal filename, description required, schema_version must be exactly 1), validates at least one `[[step]]` each with role/prompt/inputs and kebab-case role, returns a frozen `Workflow`. |
| `listWorkflows(workflowsDir)` | function | `src/cli/workflow/load.ts:147` | Lists and loads every `.toml` file matching the workflow filename pattern in a directory, sorted by name. |

### `src/cli/workflow/match.ts` — workflow-role-to-onboarded-agent matcher

**Purpose:** Resolves each workflow step's declared `role` to a concrete onboarded agent (codex/claude-code/cursor), honoring capability requirements and manual `--agent` overrides, and reports why a role couldn't be matched.

**Depends on:** `../../echo-home/paths.js` (OnboardedAgentProfile), `../../echo-home/roles.js` (Role, RoleSandbox), `../../echo-home/wizard/detect-agents.js` (AgentKind), `./load.js` (WorkflowStep)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AgentMatch` | interface | `src/cli/workflow/match.ts:6` | Per-role match result: role name, pickedAgent (or null), reason code, optional resolvedSandbox. |
| `isAgentKind(value)` | function | `src/cli/workflow/match.ts:13` | Type guard for the three known agent kind strings. |
| `hasCapabilities(agent, role)` | function | `src/cli/workflow/match.ts:17` | Checks that an onboarded agent's capability set is a superset of the role's required capabilities. |
| `byWiredAt(a, b)` | function | `src/cli/workflow/match.ts:22` | String-compares two agents' `wired_at` timestamps for sort ordering (earliest-wired first). |
| `picked(profile, role)` | function | `src/cli/workflow/match.ts:26` | Builds a "matched" AgentMatch from a chosen onboarded profile and its role's sandbox setting. |
| `matchRolesToAgents(opts)` | function | `src/cli/workflow/match.ts:35` | For each workflow step, looks up its role definition, filters onboarded+wired agents to those with matching capabilities, applies a manual override if given (validating it's onboarded and capability-compatible), else picks the earliest-wired capable candidate; returns one AgentMatch per step with a specific failure reason (role-unknown/no-onboarded-agent/capability-mismatch) when unmatched. |
