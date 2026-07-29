import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpawnSyncReturns } from 'node:child_process';
import type { InitOpts } from '../../src/cli/commands/init.js';
import type { AdapterSyncProfile } from '../../src/echo-home/adapter-sync.js';
import type { CreateWizardOpts, Wizard } from '../../src/echo-home/wizard/run-wizard.js';
import type { WireResult } from '../../src/echo-home/wizard/wire.js';
import type { AgentKind, DetectedAgent } from '../../src/echo-home/wizard/detect-agents.js';
import { makeNonInteractivePrompt } from '../../src/cli/io/prompt.js';
import { BEGIN_MARKER, END_MARKER } from '../../src/echo-home/adapters/markers.js';

let tmpRoot: string;
let echoHome: string;
let originalEchoHome: string | undefined;
let originalPort: string | undefined;

interface LaunchctlCall {
  command: string;
  args: string[];
}

interface DaemonFixture {
  calls: LaunchctlCall[];
  daemonOptions: NonNullable<InitOpts['daemonOptions']>;
  plistPath: string;
}

type WireDepsOverride = NonNullable<CreateWizardOpts['wireDepsOverride']>;
type ClaudeRegistrationDeps = NonNullable<WireDepsOverride['claudeCodeMcpRegistration']>;

async function loadInit(): Promise<typeof import('../../src/cli/commands/init.js')> {
  return import('../../src/cli/commands/init.js');
}

function writeInitialState(): void {
  mkdirSync(join(echoHome, 'state'), { recursive: true });
  writeFileSync(
    join(echoHome, 'state/onboarding.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        created_at: '2026-05-26T00:00:00.000Z',
        last_updated_at: '2026-05-26T00:00:00.000Z',
        completed: false,
        agents: [],
      },
      null,
      2,
    )}\n`,
  );
}

function successWire(selected: AgentKind[], home = echoHome): WireResult {
  const now = '2026-05-26T00:00:01.000Z';
  const state = JSON.parse(readFileSync(join(home, 'state/onboarding.json'), 'utf8')) as {
    agents: Array<Record<string, unknown>>;
  };
  for (const id of selected) {
    state.agents.push({
      id,
      detected_at: now,
      wired_at: now,
      probed_at: null,
      capabilities: [],
      wire_error: null,
    });
  }
  writeFileSync(join(home, 'state/onboarding.json'), `${JSON.stringify(state, null, 2)}\n`);
  return {
    syncResult: {
      skillsPopulated: { ok: true, copied: [], skipped: [], targetDir: join(home, 'skills') },
      agents: selected.map((agent) => ({
        agent,
        ok: true as const,
        files_written: [],
        actions: [],
      })),
      roles: { results: [], rolesErrors: [] },
      overallOk: true,
    },
    cacheUpdates: [],
    onboardingStateUpdated: true,
  };
}

function writeAnswerFile(name: string, value: unknown): string {
  const path = join(tmpRoot, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

function detected(kind: AgentKind, confidence: DetectedAgent['confidence']): DetectedAgent {
  return {
    kind,
    confidence,
    signals: {
      configFile: { path: `/tmp/${kind}`, exists: true, readableMode: true },
      atomActivity: { count: 1, lastSeen: '2026-05-26T00:00:00.000Z' },
      atomCountSaturated: false,
    },
  };
}

function spawnResult(status: number, stdout = '', stderr = ''): SpawnSyncReturns<string> {
  return {
    pid: 0,
    output: [null, stdout, stderr],
    stdout,
    stderr,
    status,
    signal: null,
  };
}

function writeDaemonRuntimePackage(packageRoot: string): string {
  const daemonPath = join(packageRoot, 'dist/daemon/index.js');
  mkdirSync(join(packageRoot, 'dist/daemon'), { recursive: true });
  writeFileSync(daemonPath, 'console.log("daemon");\n');
  const migrationsDir = join(packageRoot, 'dist/storage/migrations');
  mkdirSync(migrationsDir, { recursive: true });
  writeFileSync(join(migrationsDir, '001-init.sql'), 'select 1;\n');
  mkdirSync(join(packageRoot, 'tools/review-queue/schemas'), { recursive: true });
  writeFileSync(join(packageRoot, 'tools/review-queue/coord-roles.json'), '{}\n');
  writeFileSync(join(packageRoot, 'tools/review-queue/reviewers.json'), '{}\n');
  writeFileSync(join(packageRoot, 'tools/review-queue/schemas/coord-roles.schema.json'), '{}\n');
  return daemonPath;
}

function daemonFixture(opts: {
  launchdRegistered: boolean;
  health?: boolean;
  nodeOk?: boolean;
  plutilOk?: boolean;
  writePlist?: boolean;
}): DaemonFixture {
  const calls: LaunchctlCall[] = [];
  const packageRoot = join(tmpRoot, `daemon-pkg-${calls.length}-${Math.random()}`);
  const daemonPath = writeDaemonRuntimePackage(packageRoot);
  const plistPath = join(tmpRoot, `launchd/${Math.random()}.plist`);
  const logDir = join(tmpRoot, 'daemon-logs');
  const dataDir = join(tmpRoot, 'daemon-data');
  const dbPath = join(dataDir, 'echo.db');
  if (opts.writePlist === true) {
    mkdirSync(join(tmpRoot, 'launchd'), { recursive: true });
    writeFileSync(
      plistPath,
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>ProgramArguments</key>
  <array>
    <string>/node/v22/bin/node</string>
    <string>${daemonPath}</string>
  </array>
  <key>StandardOutPath</key>
  <string>${join(logDir, 'echo-daemon.out.log')}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ECHO_HOME</key>
    <string>${echoHome}</string>
    <key>ECHO_MCP_PORT</key>
    <string>39999</string>
    <key>ECHO_DATA_DIR</key>
    <string>${dataDir}</string>
    <key>ECHO_DB_PATH</key>
    <string>${dbPath}</string>
  </dict>
</dict>
</plist>
`,
    );
  }
  const spawnSync: NonNullable<NonNullable<InitOpts['daemonOptions']>['spawnSync']> = ((
    command: string,
    args: readonly string[],
  ) => {
    const argv = [...args];
    calls.push({ command, args: argv });
    if (command === '/node/v22/bin/node') {
      return opts.nodeOk === false
        ? spawnResult(1, '', 'node exploded\n')
        : spawnResult(0, 'v22.1.0\n');
    }
    if (command === 'plutil') {
      return opts.plutilOk === false
        ? spawnResult(1, '', 'bad plist\n')
        : spawnResult(0, `${argv[1]}: OK\n`);
    }
    if (command === 'launchctl' && argv[0] === 'print') {
      return opts.launchdRegistered
        ? spawnResult(0, 'pid = 12345\nstate = running\n')
        : spawnResult(3, '', 'not loaded\n');
    }
    if (command === 'launchctl') return spawnResult(0);
    return spawnResult(0);
  }) as NonNullable<NonNullable<InitOpts['daemonOptions']>['spawnSync']>;
  return {
    calls,
    plistPath,
    daemonOptions: {
      plistPath,
      logDir,
      dataDir,
      dbPath,
      platform: 'darwin',
      spawnSync,
      healthProbe: async () => opts.health ?? true,
      sleep: async () => {},
      getuid: () => 501,
      processExecPath: '/node/v22/bin/node',
      daemonPath,
      probeDeadlineMs: 0,
    },
  };
}

function daemonAlreadyRunning(): Pick<InitOpts, 'daemonOptions'> {
  return { daemonOptions: daemonFixture({ launchdRegistered: true }).daemonOptions };
}

async function makeCodexSyncWizardFactory(opts: {
  clientHome: string;
  codexConfig: string;
  codexInstructions: string;
}): Promise<(wizardOpts: CreateWizardOpts) => Wizard> {
  const { createWizard } = await import('../../src/echo-home/wizard/run-wizard.js');
  const { syncAll } = await import('../../src/echo-home/adapter-sync.js');
  return (wizardOpts: CreateWizardOpts): Wizard =>
    createWizard({
      ...wizardOpts,
      detectAgentsDeps: { homedir: opts.clientHome, atomStore: null },
      detectProjectsDeps: { atomStore: null },
      probeDeps: {
        spawn: async () => ({
          exitCode: 0,
          stdout: '{"pong":true,"ts":"2026-05-26T00:00:00.000Z"}\n',
          stderr: '',
          timedOut: false,
        }),
      },
      wireDepsOverride: {
        probeMcpEndpoint: async () => ({ ok: true as const }),
        syncAll: async (profiles, syncOpts) =>
          syncAll(
            profiles.map((profile): AdapterSyncProfile => {
              if (profile.kind === 'codex') {
                return {
                  ...profile,
                  paths: {
                    configFile: opts.codexConfig,
                    instructionsFile: opts.codexInstructions,
                  },
                };
              }
              return profile;
            }),
            syncOpts,
          ),
      },
    });
}

async function makeClaudeSyncWizardFactory(opts: {
  clientHome: string;
  claudeInstructions: string;
  claudeCommands: string;
  registerSpawn: NonNullable<ClaudeRegistrationDeps['spawn']>;
  registerTimeoutMs?: number;
  probeSpawn?: NonNullable<NonNullable<CreateWizardOpts['probeDeps']>['spawn']>;
}): Promise<(wizardOpts: CreateWizardOpts) => Wizard> {
  const { createWizard } = await import('../../src/echo-home/wizard/run-wizard.js');
  const { syncAll } = await import('../../src/echo-home/adapter-sync.js');
  return (wizardOpts: CreateWizardOpts): Wizard =>
    createWizard({
      ...wizardOpts,
      detectAgentsDeps: { homedir: opts.clientHome, atomStore: null },
      detectProjectsDeps: { atomStore: null },
      probeDeps: {
        spawn:
          opts.probeSpawn ??
          (async () => ({
            exitCode: 0,
            stdout: '{"pong":true,"ts":"2026-05-26T00:00:00.000Z"}\n',
            stderr: '',
            timedOut: false,
          })),
      },
      wireDepsOverride: {
        probeMcpEndpoint: async () => ({ ok: true as const }),
        claudeCodeMcpRegistration: {
          spawn: opts.registerSpawn,
          ...(opts.registerTimeoutMs === undefined ? {} : { timeoutMs: opts.registerTimeoutMs }),
        },
        syncAll: async (profiles, syncOpts) =>
          syncAll(
            profiles.map((profile): AdapterSyncProfile => {
              if (profile.kind === 'claude-code') {
                return {
                  ...profile,
                  paths: {
                    instructionsFile: opts.claudeInstructions,
                    commandsDir: opts.claudeCommands,
                  },
                };
              }
              return profile;
            }),
            syncOpts,
          ),
      },
    });
}

function successfulWizardFactory(home = echoHome): (wizardOpts: CreateWizardOpts) => Wizard {
  return (() => {
    let selected: AgentKind[] = [];
    return {
      async detectAgents() {
        return [detected('codex', 'high')];
      },
      async detectProjects() {
        return [];
      },
      async wire(opts) {
        selected = opts.selectedAgents;
        return successWire(selected, home);
      },
      async probe() {
        return selected.map((agent) => ({ agent, probed: true as const, latencyMs: 1 }));
      },
      async summary() {
        return {
          detected: null,
          projects: null,
          wired: null,
          probed: null,
          onboardingStateSnapshot: null,
        };
      },
      async markCompleted() {
        const state = JSON.parse(readFileSync(join(home, 'state/onboarding.json'), 'utf8')) as {
          completed: boolean;
        };
        state.completed = true;
        writeFileSync(join(home, 'state/onboarding.json'), `${JSON.stringify(state, null, 2)}\n`);
        return { completed: true, unverifiedAgents: [] };
      },
    } satisfies Wizard;
  }) as never;
}

describe('runInit', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    originalPort = process.env.ECHO_MCP_PORT;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-init-'));
    echoHome = join(tmpRoot, 'echo-home');
    process.env.ECHO_HOME = echoHome;
    process.env.ECHO_MCP_PORT = '39999';
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    if (originalPort === undefined) delete process.env.ECHO_MCP_PORT;
    else process.env.ECHO_MCP_PORT = originalPort;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('fails closed before wizard creation when stdin is not a TTY', async () => {
    const { runInit } = await loadInit();
    const wizardFactory = vi.fn();
    const errors: string[] = [];

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory: wizardFactory as never,
      stderr: {
        write: (s) => {
          errors.push(String(s));
          return true;
        },
      },
    });

    expect(code).toBe(2);
    expect(wizardFactory).not.toHaveBeenCalled();
    expect(errors.join('')).toContain('non-interactive');
    expect(errors.join('')).toContain('--answer-file');
    expect(existsSync(join(echoHome, 'state/onboarding.json'))).toBe(false);
    expect(existsSync(join(echoHome, 'state/projects.json'))).toBe(false);
  });

  it('documents and parses init isolation flags', async () => {
    const { INIT_HELP, parseInitArgs } = await loadInit();

    expect(
      parseInitArgs([
        '--home',
        '/tmp/echo-home',
        '--port',
        '41234',
        '--profile',
        'dogfood',
        '--label',
        'com.echo.daemon.walkthrough',
        '--answer-file',
        '/tmp/answers.json',
        '--force',
      ]),
    ).toEqual({
      home: '/tmp/echo-home',
      port: '41234',
      profile: 'dogfood',
      label: 'com.echo.daemon.walkthrough',
      answerFile: '/tmp/answers.json',
      force: true,
    });
    expect(INIT_HELP).toContain('--home <path>');
    expect(INIT_HELP).toContain('--port <n>');
    expect(INIT_HELP).toContain('--profile <name>');
    expect(INIT_HELP).toContain('--label <id>');
    expect(INIT_HELP).toContain('--answer-file <path>');
    expect(INIT_HELP).toContain('--force');
    expect(() => parseInitArgs(['--port', '0'])).toThrow('invalid --port: 0');
    expect(() => parseInitArgs(['--port', '12abc'])).toThrow('invalid --port: 12abc');
    expect(() => parseInitArgs(['--profile', 'orchestrator'])).toThrow(
      'invalid --profile: expected customer or dogfood',
    );
  });

  it('honors --home, --port, and --label in non-interactive answer-file mode', async () => {
    const isolatedHome = join(tmpRoot, 'isolated-echo-home');
    const clientHome = join(tmpRoot, 'client-home');
    const codexConfig = join(clientHome, '.codex/config.toml');
    const codexInstructions = join(clientHome, '.codex/AGENTS.md');
    const cursorConfig = join(clientHome, '.cursor/mcp.json');
    const answerFile = writeAnswerFile('answers.json', {
      confirm_setup: true,
      selected_agents: ['codex', 'cursor'],
      default_project_repo_root: null,
    });
    const { runInit } = await loadInit();
    const { createWizard } = await import('../../src/echo-home/wizard/run-wizard.js');
    const { syncAll } = await import('../../src/echo-home/adapter-sync.js');

    const wizardFactory = ((opts: CreateWizardOpts): Wizard =>
      createWizard({
        ...opts,
        detectAgentsDeps: { homedir: clientHome, atomStore: null },
        detectProjectsDeps: { atomStore: null },
        probeDeps: {
          spawn: async () => ({
            exitCode: 0,
            stdout: '{"pong":true,"ts":"2026-05-26T00:00:00.000Z"}\n',
            stderr: '',
            timedOut: false,
          }),
        },
        wireDepsOverride: {
          probeMcpEndpoint: async () => ({ ok: true as const }),
          syncAll: async (profiles, syncOpts) =>
            syncAll(
              profiles.map((profile): AdapterSyncProfile => {
                if (profile.kind === 'codex') {
                  return {
                    ...profile,
                    paths: { configFile: codexConfig, instructionsFile: codexInstructions },
                  };
                }
                if (profile.kind === 'cursor') {
                  return { ...profile, paths: { configFile: cursorConfig } };
                }
                return profile;
              }),
              syncOpts,
            ),
        },
      })) as never;

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41234',
      label: 'com.echo.daemon.walkthrough',
      quiet: true,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      ...daemonAlreadyRunning(),
    });

    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      completed: boolean;
      profile: string;
      agents: Array<{ id: AgentKind }>;
    };
    const cursor = JSON.parse(readFileSync(cursorConfig, 'utf8')) as {
      mcpServers: { echo: { url: string } };
    };
    const codexCache = JSON.parse(
      readFileSync(join(isolatedHome, 'adapters/codex.json'), 'utf8'),
    ) as {
      mcpServerConfig: { url: string };
    };

    expect(code).toBe(0);
    expect(state.completed).toBe(true);
    expect(state.profile).toBe('customer');
    expect(state.agents.map((agent) => agent.id).sort()).toEqual(['codex', 'cursor']);
    expect(readFileSync(codexConfig, 'utf8')).toContain('url = "http://127.0.0.1:41234/mcp"');
    expect(cursor.mcpServers.echo.url).toBe('http://127.0.0.1:41234/mcp');
    expect(codexCache.mcpServerConfig.url).toBe('http://127.0.0.1:41234/mcp');
    expect(existsSync(join(isolatedHome, 'skills', 'using-echo-coord.md'))).toBe(false);
    expect(existsSync(join(isolatedHome, 'skills', 'using-echo-mcp.md'))).toBe(true);
    expect(existsSync(join(isolatedHome, 'skills', 'merge-and-cleanup.md'))).toBe(false);
    expect(existsSync(join(isolatedHome, 'skills', 'process-backlog.md'))).toBe(false);
    expect(existsSync(join(isolatedHome, 'roles', 'builder.toml'))).toBe(false);
    expect(existsSync(join(isolatedHome, 'workflows', 'change-review.toml'))).toBe(false);
    expect(existsSync(join(echoHome, 'state/onboarding.json'))).toBe(false);
  });

  it('registers claude-code MCP when selected in answer-file mode', async () => {
    const isolatedHome = join(tmpRoot, 'claude-register-home');
    const clientHome = join(tmpRoot, 'claude-register-client');
    const claudeInstructions = join(clientHome, '.claude/CLAUDE.md');
    const claudeCommands = join(clientHome, '.claude/commands');
    mkdirSync(join(clientHome, '.claude'), { recursive: true });
    writeFileSync(claudeInstructions, '# Claude user file\n');
    const answerFile = writeAnswerFile('claude-register-answers.json', {
      confirm_setup: true,
      selected_agents: ['claude-code'],
      profile: 'dogfood',
      default_project_repo_root: null,
    });
    const calls: Array<{ cmd: string; args: string[]; timeoutMs: number }> = [];
    const stdout: string[] = [];
    const { runInit } = await loadInit();
    const wizardFactory = await makeClaudeSyncWizardFactory({
      clientHome,
      claudeInstructions,
      claudeCommands,
      registerSpawn: async (cmd, args, opts) => {
        calls.push({ cmd, args, timeoutMs: opts.timeoutMs });
        return { exitCode: 0, stdout: '', stderr: '', timedOut: false };
      },
    });

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41234',
      label: 'com.echo.daemon.walkthrough',
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      stdout: { write: (s) => (stdout.push(String(s)), true) },
      ...daemonAlreadyRunning(),
    });

    expect(code).toBe(0);
    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      profile: string;
    };
    expect(state.profile).toBe('dogfood');
    expect(calls).toEqual([
      {
        cmd: 'claude',
        args: [
          'mcp',
          'add',
          '--transport',
          'http',
          '--scope',
          'user',
          'echo',
          'http://127.0.0.1:41234/mcp',
        ],
        timeoutMs: 30_000,
      },
    ]);
    expect(stdout.join('')).toContain('mcp-add');
  });

  it('CLI profile overrides answer-file and recorded profile', async () => {
    const isolatedHome = join(tmpRoot, 'profile-precedence-home');
    mkdirSync(join(isolatedHome, 'state'), { recursive: true });
    writeFileSync(
      join(isolatedHome, 'state/onboarding.json'),
      `${JSON.stringify(
        {
          schema_version: 1,
          created_at: '2026-05-26T00:00:00.000Z',
          last_updated_at: '2026-05-26T00:00:00.000Z',
          completed: true,
          profile: 'dogfood',
          agents: [],
        },
        null,
        2,
      )}\n`,
    );
    const answerFile = writeAnswerFile('profile-precedence-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      profile: 'dogfood',
      default_project_repo_root: null,
    });
    const seenProfiles: unknown[] = [];
    const wizardFactory = (() =>
      ({
        async detectAgents() {
          return [detected('codex', 'high')];
        },
        async detectProjects() {
          return [];
        },
        async wire(opts) {
          seenProfiles.push(opts.profile);
          return successWire(opts.selectedAgents, isolatedHome);
        },
        async probe() {
          return [{ agent: 'codex', probed: true as const, latencyMs: 1 }];
        },
        async summary() {
          return {
            detected: null,
            projects: null,
            wired: null,
            probed: null,
            onboardingStateSnapshot: null,
          };
        },
        async markCompleted() {
          return { completed: true, unverifiedAgents: [] };
        },
      }) satisfies Wizard) as never;
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      profile: 'customer',
      wizardFactory,
      home: isolatedHome,
      quiet: true,
      ...daemonAlreadyRunning(),
    });

    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      profile: string;
    };
    expect(code).toBe(0);
    expect(seenProfiles).toEqual(['customer']);
    expect(state.profile).toBe('customer');
  });

  it('recorded dogfood profile is respected on no-flag rerun', async () => {
    const isolatedHome = join(tmpRoot, 'recorded-dogfood-home');
    mkdirSync(join(isolatedHome, 'state'), { recursive: true });
    writeFileSync(
      join(isolatedHome, 'state/onboarding.json'),
      `${JSON.stringify(
        {
          schema_version: 1,
          created_at: '2026-05-26T00:00:00.000Z',
          last_updated_at: '2026-05-26T00:00:00.000Z',
          completed: true,
          profile: 'dogfood',
          agents: [],
        },
        null,
        2,
      )}\n`,
    );
    const answerFile = writeAnswerFile('recorded-dogfood-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const seenProfiles: unknown[] = [];
    const wizardFactory = (() =>
      ({
        async detectAgents() {
          return [detected('codex', 'high')];
        },
        async detectProjects() {
          return [];
        },
        async wire(opts) {
          seenProfiles.push(opts.profile);
          return successWire(opts.selectedAgents, isolatedHome);
        },
        async probe() {
          return [{ agent: 'codex', probed: true as const, latencyMs: 1 }];
        },
        async summary() {
          return {
            detected: null,
            projects: null,
            wired: null,
            probed: null,
            onboardingStateSnapshot: null,
          };
        },
        async markCompleted() {
          return { completed: true, unverifiedAgents: [] };
        },
      }) satisfies Wizard) as never;
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory,
      home: isolatedHome,
      quiet: true,
      ...daemonAlreadyRunning(),
    });

    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      profile: string;
    };
    expect(code).toBe(0);
    expect(seenProfiles).toEqual(['dogfood']);
    expect(state.profile).toBe('dogfood');
  });

  it('surfaces duplicate claude-code MCP registration without masking probe failure', async () => {
    const isolatedHome = join(tmpRoot, 'claude-duplicate-home');
    const clientHome = join(tmpRoot, 'claude-duplicate-client');
    const claudeInstructions = join(clientHome, '.claude/CLAUDE.md');
    const claudeCommands = join(clientHome, '.claude/commands');
    mkdirSync(join(clientHome, '.claude'), { recursive: true });
    writeFileSync(claudeInstructions, '# Claude user file\n');
    const answerFile = writeAnswerFile('claude-duplicate-answers.json', {
      confirm_setup: true,
      selected_agents: ['claude-code'],
      default_project_repo_root: null,
    });
    const stdout: string[] = [];
    const { runInit } = await loadInit();
    const wizardFactory = await makeClaudeSyncWizardFactory({
      clientHome,
      claudeInstructions,
      claudeCommands,
      registerSpawn: async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'MCP server echo already exists in user config\n',
        timedOut: false,
      }),
      probeSpawn: async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'No such tool mcp__echo__echo_ping\n',
        timedOut: false,
      }),
    });

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41234',
      stdout: { write: (s) => (stdout.push(String(s)), true) },
      ...daemonAlreadyRunning(),
    });

    const text = stdout.join('');
    expect(code).toBe(0);
    expect(text).toContain('already-exists (unverified)');
    expect(text).toContain('claude-code: WARN mcp-not-configured');
    expect(text).toContain(
      'claude mcp add --transport http --scope user echo http://127.0.0.1:41234/mcp',
    );
    expect(text).toContain('claude mcp remove echo -s local');
  });

  it('continues init when claude-code MCP registration times out', async () => {
    const isolatedHome = join(tmpRoot, 'claude-timeout-home');
    const clientHome = join(tmpRoot, 'claude-timeout-client');
    const claudeInstructions = join(clientHome, '.claude/CLAUDE.md');
    const claudeCommands = join(clientHome, '.claude/commands');
    mkdirSync(join(clientHome, '.claude'), { recursive: true });
    writeFileSync(claudeInstructions, '# Claude user file\n');
    const answerFile = writeAnswerFile('claude-timeout-answers.json', {
      confirm_setup: true,
      selected_agents: ['claude-code'],
      default_project_repo_root: null,
    });
    const stdout: string[] = [];
    const { runInit } = await loadInit();
    const wizardFactory = await makeClaudeSyncWizardFactory({
      clientHome,
      claudeInstructions,
      claudeCommands,
      registerTimeoutMs: 5,
      registerSpawn: async () => ({
        exitCode: -1,
        stdout: '',
        stderr: '',
        timedOut: true,
      }),
    });

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41234',
      stdout: { write: (s) => (stdout.push(String(s)), true) },
      ...daemonAlreadyRunning(),
    });

    expect(code).toBe(0);
    expect(stdout.join('')).toContain('timeout');
  });

  it('continues init when claude is missing and prints remediation through probe', async () => {
    const isolatedHome = join(tmpRoot, 'claude-missing-home');
    const clientHome = join(tmpRoot, 'claude-missing-client');
    const claudeInstructions = join(clientHome, '.claude/CLAUDE.md');
    const claudeCommands = join(clientHome, '.claude/commands');
    mkdirSync(join(clientHome, '.claude'), { recursive: true });
    writeFileSync(claudeInstructions, '# Claude user file\n');
    const answerFile = writeAnswerFile('claude-missing-answers.json', {
      confirm_setup: true,
      selected_agents: ['claude-code'],
      default_project_repo_root: null,
    });
    const enoent = Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' });
    const stdout: string[] = [];
    const { runInit } = await loadInit();
    const wizardFactory = await makeClaudeSyncWizardFactory({
      clientHome,
      claudeInstructions,
      claudeCommands,
      registerSpawn: async () => {
        throw enoent;
      },
      probeSpawn: async () => {
        throw enoent;
      },
    });

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41234',
      stdout: { write: (s) => (stdout.push(String(s)), true) },
      ...daemonAlreadyRunning(),
    });

    const text = stdout.join('');
    expect(code).toBe(0);
    expect(text).toContain('cli-unavailable');
    expect(text).toContain('claude-code not found on PATH');
  });

  it('installs and starts the daemon when init finds no installed launchd job', async () => {
    const isolatedHome = join(tmpRoot, 'bringup-install-home');
    const answerFile = writeAnswerFile('daemon-install-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const daemon = daemonFixture({ launchdRegistered: false });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: successfulWizardFactory(isolatedHome) as never,
      home: isolatedHome,
      port: '41234',
      label: 'com.echo.daemon.test-init',
      daemonOptions: daemon.daemonOptions,
      stdout: { write: (s) => (stdout.push(String(s)), true) },
      stderr: { write: (s) => (stderr.push(String(s)), true) },
    });

    expect(code, stderr.join('')).toBe(0);
    expect(stderr.join('')).toBe('');
    const calls = daemon.calls.map((call) => `${call.command} ${call.args.join(' ')}`);
    const plist = readFileSync(daemon.plistPath, 'utf8');
    expect(stdout.join('')).toContain('Daemon installed and started on port 41234.');
    expect(calls).toContain(`launchctl bootstrap gui/501 ${daemon.plistPath}`);
    expect(calls.some((call) => call.startsWith('plutil -lint'))).toBe(true);
    expect(plist).toContain('<string>com.echo.daemon.test-init</string>');
    expect(plist).toContain(`<string>${isolatedHome}</string>`);
    expect(plist).toContain('<string>41234</string>');
  });

  it('starts the daemon when the plist exists but launchd is not running it', async () => {
    const answerFile = writeAnswerFile('daemon-start-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const daemon = daemonFixture({ launchdRegistered: false, writePlist: true });
    const stdout: string[] = [];
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: successfulWizardFactory() as never,
      daemonOptions: daemon.daemonOptions,
      stdout: { write: (s) => (stdout.push(String(s)), true) },
    });

    const calls = daemon.calls.map((call) => `${call.command} ${call.args.join(' ')}`);
    expect(code).toBe(0);
    expect(stdout.join('')).toContain('Daemon started on port 39999.');
    expect(calls).toContain(`launchctl bootstrap gui/501 ${daemon.plistPath}`);
    expect(calls.some((call) => call.startsWith('plutil -lint'))).toBe(false);
  });

  it('does nothing when the daemon is already running', async () => {
    const answerFile = writeAnswerFile('daemon-running-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const daemon = daemonFixture({ launchdRegistered: true });
    const stdout: string[] = [];
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: successfulWizardFactory() as never,
      daemonOptions: daemon.daemonOptions,
      stdout: { write: (s) => (stdout.push(String(s)), true) },
    });

    expect(code).toBe(0);
    expect(stdout.join('')).toContain('Daemon already running on port 39999.');
    expect(daemon.calls.some((call) => call.args[0] === 'bootstrap')).toBe(false);
    expect(daemon.calls.some((call) => call.command === 'plutil')).toBe(false);
  });

  it('fails init with remediation when daemon install fails', async () => {
    const answerFile = writeAnswerFile('daemon-install-fails-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const daemon = daemonFixture({ launchdRegistered: false, nodeOk: false });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: successfulWizardFactory() as never,
      daemonOptions: daemon.daemonOptions,
      stdout: { write: (s) => (stdout.push(String(s)), true) },
      stderr: { write: (s) => (stderr.push(String(s)), true) },
    });

    const state = JSON.parse(readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8')) as {
      completed: boolean;
    };
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('daemon install failed:');
    expect(stderr.join('')).toContain('node version check failed');
    expect(stderr.join('')).toContain('Run `echoctl daemon install` manually');
    expect(stdout.join('')).not.toContain("You're ready.");
    expect(state.completed).toBe(false);
  });

  it('force-replaces a prior ECHO marker block and records a successful wire', async () => {
    const isolatedHome = join(tmpRoot, 'force-echo-home');
    const clientHome = join(tmpRoot, 'force-client-home');
    const codexConfig = join(clientHome, '.codex/config.toml');
    const codexInstructions = join(clientHome, '.codex/AGENTS.md');
    mkdirSync(join(clientHome, '.codex'), { recursive: true });
    writeFileSync(
      codexInstructions,
      `${BEGIN_MARKER}\nuser hand-edited inside marker\n${END_MARKER}\n`,
    );
    writeFileSync(codexConfig, `[mcp_servers.echo]\nurl = "http://user-edited:9999/mcp"\n`);
    const answerFile = writeAnswerFile('force-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const { runInit } = await loadInit();
    const wizardFactory = await makeCodexSyncWizardFactory({
      clientHome,
      codexConfig,
      codexInstructions,
    });

    const code = await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41236',
      force: true,
      quiet: true,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      ...daemonAlreadyRunning(),
    });

    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      agents: Array<{ id: AgentKind; wired_at: string | null; wire_error: string | null }>;
    };
    const codex = state.agents.find((agent) => agent.id === 'codex');
    expect(code).toBe(0);
    expect(codex?.wired_at).toBe('2026-05-26T00:00:00.000Z');
    expect(codex?.wire_error).toBeNull();
    expect(readFileSync(codexInstructions, 'utf8')).toContain('http://127.0.0.1:41236/mcp');
    expect(readFileSync(codexInstructions, 'utf8')).not.toContain('user hand-edited');
  });

  it('force preserves outside-marker content byte-for-byte', async () => {
    const isolatedHome = join(tmpRoot, 'preserve-echo-home');
    const clientHome = join(tmpRoot, 'preserve-client-home');
    const codexConfig = join(clientHome, '.codex/config.toml');
    const codexInstructions = join(clientHome, '.codex/AGENTS.md');
    const above = '# User heading\ncustom before\n\n';
    const below = '\n## User footer\ncustom after\n';
    mkdirSync(join(clientHome, '.codex'), { recursive: true });
    writeFileSync(
      codexInstructions,
      `${above}${BEGIN_MARKER}\nold echo block with local edits\n${END_MARKER}${below}`,
    );
    writeFileSync(codexConfig, `[mcp_servers.echo]\nurl = "http://old:1111/mcp"\n`);
    const answerFile = writeAnswerFile('preserve-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const { runInit } = await loadInit();
    const wizardFactory = await makeCodexSyncWizardFactory({
      clientHome,
      codexConfig,
      codexInstructions,
    });

    await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41237',
      force: true,
      quiet: true,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      ...daemonAlreadyRunning(),
    });

    const content = readFileSync(codexInstructions, 'utf8');
    const beginIdx = content.indexOf(BEGIN_MARKER);
    const endAfterIdx = content.indexOf(END_MARKER) + END_MARKER.length;
    expect(content.slice(0, beginIdx)).toBe(above);
    expect(content.slice(endAfterIdx)).toBe(below);
    expect(content).toContain('http://127.0.0.1:41237/mcp');
  });

  it('force refuses malformed marker blocks and leaves the file untouched', async () => {
    const isolatedHome = join(tmpRoot, 'malformed-echo-home');
    const clientHome = join(tmpRoot, 'malformed-client-home');
    const codexConfig = join(clientHome, '.codex/config.toml');
    const codexInstructions = join(clientHome, '.codex/AGENTS.md');
    mkdirSync(join(clientHome, '.codex'), { recursive: true });
    writeFileSync(codexInstructions, `# Header\n${BEGIN_MARKER}\nbroken inside\n`);
    writeFileSync(codexConfig, `[mcp_servers.echo]\nurl = "http://old:1111/mcp"\n`);
    const before = readFileSync(codexInstructions);
    const answerFile = writeAnswerFile('malformed-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const { runInit } = await loadInit();
    const wizardFactory = await makeCodexSyncWizardFactory({
      clientHome,
      codexConfig,
      codexInstructions,
    });

    await runInit({
      stdin: { isTTY: false },
      wizardFactory,
      answerFile,
      home: isolatedHome,
      port: '41238',
      force: true,
      quiet: true,
      now: () => new Date('2026-05-26T00:00:00.000Z'),
      ...daemonAlreadyRunning(),
    });

    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      agents: Array<{ id: AgentKind; wire_error: string | null }>;
    };
    expect(state.agents.find((agent) => agent.id === 'codex')?.wire_error).toContain(
      'marker block malformed; manual intervention required',
    );
    expect(readFileSync(codexInstructions).equals(before)).toBe(true);
  });

  it('fails loudly when the answer file is missing', async () => {
    const { runInit } = await loadInit();
    const missingPath = join(tmpRoot, 'missing.json');
    const wizardFactory = vi.fn();
    const errors: string[] = [];

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile: missingPath,
      wizardFactory: wizardFactory as never,
      stderr: { write: (s) => (errors.push(String(s)), true) },
    });

    expect(code).toBe(2);
    expect(wizardFactory).not.toHaveBeenCalled();
    expect(errors.join('')).toContain(missingPath);
    expect(errors.join('')).toContain('file: not found');
  });

  it('fails loudly when the answer file has malformed JSON', async () => {
    const { runInit } = await loadInit();
    const answerFile = join(tmpRoot, 'bad-json.json');
    writeFileSync(answerFile, '{');
    const wizardFactory = vi.fn();
    const errors: string[] = [];

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: wizardFactory as never,
      stderr: { write: (s) => (errors.push(String(s)), true) },
    });

    expect(code).toBe(2);
    expect(wizardFactory).not.toHaveBeenCalled();
    expect(errors.join('')).toContain(answerFile);
    expect(errors.join('')).toContain('root: invalid JSON');
  });

  it('fails loudly when the answer file is missing a required field', async () => {
    const { runInit } = await loadInit();
    const answerFile = writeAnswerFile('missing-field.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
    });
    const wizardFactory = vi.fn();
    const errors: string[] = [];

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: wizardFactory as never,
      stderr: { write: (s) => (errors.push(String(s)), true) },
    });

    expect(code).toBe(2);
    expect(wizardFactory).not.toHaveBeenCalled();
    expect(errors.join('')).toContain(answerFile);
    expect(errors.join('')).toContain('default_project_repo_root: missing required field');
  });

  it('fails loudly when the answer file has an unknown field', async () => {
    const { runInit } = await loadInit();
    const answerFile = writeAnswerFile('unknown-field.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
      extra: true,
    });
    const wizardFactory = vi.fn();
    const errors: string[] = [];

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: wizardFactory as never,
      stderr: { write: (s) => (errors.push(String(s)), true) },
    });

    expect(code).toBe(2);
    expect(wizardFactory).not.toHaveBeenCalled();
    expect(errors.join('')).toContain(answerFile);
    expect(errors.join('')).toContain('extra: unknown field');
  });

  it('fails loudly when the answer file has an invalid profile', async () => {
    const { runInit } = await loadInit();
    const answerFile = writeAnswerFile('invalid-profile.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
      profile: 'orchestrator',
    });
    const wizardFactory = vi.fn();
    const errors: string[] = [];

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: wizardFactory as never,
      stderr: { write: (s) => (errors.push(String(s)), true) },
    });

    expect(code).toBe(2);
    expect(wizardFactory).not.toHaveBeenCalled();
    expect(errors.join('')).toContain(answerFile);
    expect(errors.join('')).toContain('profile: expected customer or dogfood');
  });

  it('fails loudly when repo_root is required but absent in answer-file mode', async () => {
    const { runInit } = await loadInit();
    const answerFile = writeAnswerFile('missing-repo-root.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const errors: string[] = [];
    const wizardFactory = (() =>
      ({
        async detectAgents() {
          return [detected('codex', 'high')];
        },
        async detectProjects() {
          return [];
        },
        async wire() {
          return {
            syncResult: {
              skillsPopulated: { ok: false, sourceDir: '', targetDir: '', error: 'missing' },
              agents: [],
              roles: { results: [], rolesErrors: [] },
              repoRoot: {
                code: 'UNKNOWN',
                file: '/missing',
                operation: 'stat',
                message: 'could not locate repo root',
              },
              overallOk: false,
            },
            cacheUpdates: [],
            onboardingStateUpdated: false,
          } satisfies WireResult;
        },
        async probe() {
          return [];
        },
        async summary() {
          return {
            detected: null,
            projects: null,
            wired: null,
            probed: null,
            onboardingStateSnapshot: null,
          };
        },
        async markCompleted() {
          return { completed: true, unverifiedAgents: [] };
        },
      }) satisfies Wizard) as never;

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory,
      stderr: { write: (s) => (errors.push(String(s)), true) },
      quiet: true,
    });

    expect(code).toBe(2);
    expect(errors.join('')).toContain(answerFile);
    expect(errors.join('')).toContain('repo_root: required');
  });

  it.each([
    ['bare scaffold', { completed: false, agents: [] }],
    [
      'completed with agents',
      {
        completed: true,
        agents: [
          {
            id: 'codex',
            detected_at: '2026-05-26T00:00:00.000Z',
            wired_at: '2026-05-26T00:00:00.000Z',
            probed_at: null,
            capabilities: [],
            wire_error: null,
          },
        ],
      },
    ],
    [
      'mid-wire with agents',
      {
        completed: false,
        agents: [
          {
            id: 'claude-code',
            detected_at: '2026-05-26T00:00:00.000Z',
            wired_at: '2026-05-26T00:00:00.000Z',
            probed_at: null,
            capabilities: [],
            wire_error: null,
          },
        ],
      },
    ],
  ])(
    'defaults profile-less onboarding state to customer with warning: %s',
    async (_label, partial) => {
      const isolatedHome = join(tmpRoot, `profileless-${String(_label).replace(/\s+/g, '-')}`);
      mkdirSync(join(isolatedHome, 'state'), { recursive: true });
      writeFileSync(
        join(isolatedHome, 'state/onboarding.json'),
        `${JSON.stringify(
          {
            schema_version: 1,
            created_at: '2026-05-26T00:00:00.000Z',
            last_updated_at: '2026-05-26T00:00:00.000Z',
            ...partial,
          },
          null,
          2,
        )}\n`,
      );
      const answerFile = writeAnswerFile(`${String(_label).replace(/\s+/g, '-')}.json`, {
        confirm_setup: true,
        selected_agents: ['codex'],
        default_project_repo_root: null,
      });
      const errors: string[] = [];
      const { runInit } = await loadInit();

      const code = await runInit({
        stdin: { isTTY: false },
        answerFile,
        wizardFactory: successfulWizardFactory(isolatedHome) as never,
        home: isolatedHome,
        stderr: { write: (s) => (errors.push(String(s)), true) },
        quiet: true,
        ...daemonAlreadyRunning(),
      });

      const state = JSON.parse(
        readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8'),
      ) as {
        profile: string;
      };
      expect(code).toBe(0);
      expect(state.profile).toBe('customer');
      expect(errors.join('')).toContain('defaulted to `customer`');
      expect(errors.join('')).toContain('echoctl init --profile dogfood');
    },
  );

  it('bootstraps echo home before the interactive wizard touches state', async () => {
    const created: boolean[] = [];
    const wizardFactory = (() => {
      created.push(
        existsSync(join(echoHome, 'state/onboarding.json')) &&
          existsSync(join(echoHome, 'state/projects.json')),
      );
      let selected: AgentKind[] = [];
      return {
        async detectAgents() {
          return [detected('codex', 'high')];
        },
        async detectProjects() {
          return [];
        },
        async wire(opts) {
          selected = opts.selectedAgents;
          return successWire(selected);
        },
        async probe() {
          return selected.map((agent) => ({ agent, probed: true as const, latencyMs: 1 }));
        },
        async summary() {
          return {
            detected: null,
            projects: null,
            wired: null,
            probed: null,
            onboardingStateSnapshot: null,
          };
        },
        async markCompleted() {
          const state = JSON.parse(
            readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8'),
          ) as {
            completed: boolean;
          };
          state.completed = true;
          writeFileSync(
            join(echoHome, 'state/onboarding.json'),
            `${JSON.stringify(state, null, 2)}\n`,
          );
          return { completed: true, unverifiedAgents: [] };
        },
      } satisfies Wizard;
    }) as never;
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: true },
      wizardFactory,
      prompt: makeNonInteractivePrompt({
        'Welcome to ECHO setup. This takes about two minutes.': true,
        'Confirm subset to wire': '',
        'Pick default project': '',
      }),
      quiet: true,
      ...daemonAlreadyRunning(),
    });

    expect(code).toBe(0);
    expect(created).toEqual([true]);
    expect(existsSync(join(echoHome, 'state/onboarding.json'))).toBe(true);
    expect(existsSync(join(echoHome, 'state/projects.json'))).toBe(true);
  });

  it('wires selected agents, populates capabilities, and marks onboarding complete', async () => {
    writeInitialState();
    const created: Array<{ mcpServerUrl: string; echoVersion: string }> = [];
    const wizardFactory = ((opts: { mcpServerUrl: string; echoVersion: string }): Wizard => {
      created.push(opts);
      let selected: AgentKind[] = [];
      return {
        async detectAgents() {
          return [detected('codex', 'high'), detected('cursor', 'medium')];
        },
        async detectProjects() {
          return [{ repoRoot: '/repo', atomCount: 2, lastSeen: 't', sourceBreakdown: {} }];
        },
        async wire(opts) {
          selected = opts.selectedAgents;
          return successWire(selected);
        },
        async probe() {
          return selected.map((agent) =>
            agent === 'cursor'
              ? { agent, probed: false, reason: 'manual-only' as const }
              : { agent, probed: true as const, latencyMs: 1 },
          );
        },
        async summary() {
          return {
            detected: null,
            projects: null,
            wired: null,
            probed: null,
            onboardingStateSnapshot: null,
          };
        },
        async markCompleted() {
          const state = JSON.parse(
            readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8'),
          ) as {
            completed: boolean;
          };
          state.completed = true;
          writeFileSync(
            join(echoHome, 'state/onboarding.json'),
            `${JSON.stringify(state, null, 2)}\n`,
          );
          return { completed: true, unverifiedAgents: [] };
        },
      };
    }) as never;
    const { AGENT_CAPABILITIES_BY_KIND, runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: true },
      wizardFactory,
      prompt: makeNonInteractivePrompt({
        'Welcome to ECHO setup. This takes about two minutes.': true,
        'Confirm subset to wire': '',
        'Pick default project': '1',
      }),
      quiet: true,
      ...daemonAlreadyRunning(),
    });

    const state = JSON.parse(readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8')) as {
      completed: boolean;
      agents: Array<{ id: AgentKind; capabilities: string[] }>;
    };
    expect(code).toBe(0);
    expect(created[0]).toMatchObject({ mcpServerUrl: 'http://127.0.0.1:39999/mcp' });
    expect(state.completed).toBe(true);
    expect(state.agents.find((agent) => agent.id === 'codex')!.capabilities).toEqual(
      AGENT_CAPABILITIES_BY_KIND.codex,
    );
    expect(state.agents.find((agent) => agent.id === 'cursor')!.capabilities).toEqual(
      AGENT_CAPABILITIES_BY_KIND.cursor,
    );
  });

  it('records bound_port, port_source, and runtime_version in the onboarding record', async () => {
    writeInitialState();
    const answerFile = writeAnswerFile('bound-port-answers.json', {
      confirm_setup: true,
      selected_agents: ['codex'],
      default_project_repo_root: null,
    });
    const { runInit } = await loadInit();

    const code = await runInit({
      stdin: { isTTY: false },
      answerFile,
      wizardFactory: successfulWizardFactory(),
      quiet: true,
      portResolution: {
        env: {},
        readRecordedPort: () => null,
        probeHealthz: async (port) =>
          port === 39478
            ? { healthy: true, runtimeVersion: '0.1.0-beta.5' }
            : { healthy: false, runtimeVersion: null },
      },
      ...daemonAlreadyRunning(),
    });

    expect(code).toBe(0);
    const state = JSON.parse(readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8')) as {
      bound_port: number;
      port_source: string;
      runtime_version: string | null;
    };
    expect(state.bound_port).toBe(39478);
    expect(state.port_source).toBe('probe');
    expect(state.runtime_version).toBe('0.1.0-beta.5');
  });
});
