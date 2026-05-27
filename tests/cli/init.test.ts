import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdapterSyncProfile } from '../../src/echo-home/adapter-sync.js';
import type { CreateWizardOpts, Wizard } from '../../src/echo-home/wizard/run-wizard.js';
import type { WireResult } from '../../src/echo-home/wizard/wire.js';
import type { AgentKind, DetectedAgent } from '../../src/echo-home/wizard/detect-agents.js';
import { makeNonInteractivePrompt } from '../../src/cli/io/prompt.js';

let tmpRoot: string;
let echoHome: string;
let originalEchoHome: string | undefined;
let originalPort: string | undefined;

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

    expect(parseInitArgs([
      '--home',
      '/tmp/echo-home',
      '--port',
      '41234',
      '--label',
      'com.echo.daemon.walkthrough',
      '--answer-file',
      '/tmp/answers.json',
    ])).toEqual({
      home: '/tmp/echo-home',
      port: '41234',
      label: 'com.echo.daemon.walkthrough',
      answerFile: '/tmp/answers.json',
    });
    expect(INIT_HELP).toContain('--home <path>');
    expect(INIT_HELP).toContain('--port <n>');
    expect(INIT_HELP).toContain('--label <id>');
    expect(INIT_HELP).toContain('--answer-file <path>');
    expect(() => parseInitArgs(['--port', '0'])).toThrow('invalid --port: 0');
    expect(() => parseInitArgs(['--port', '12abc'])).toThrow('invalid --port: 12abc');
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
    });

    const state = JSON.parse(readFileSync(join(isolatedHome, 'state/onboarding.json'), 'utf8')) as {
      completed: boolean;
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
    expect(state.agents.map((agent) => agent.id).sort()).toEqual(['codex', 'cursor']);
    expect(readFileSync(codexConfig, 'utf8')).toContain(
      'url = "http://127.0.0.1:41234/mcp"',
    );
    expect(cursor.mcpServers.echo.url).toBe('http://127.0.0.1:41234/mcp');
    expect(codexCache.mcpServerConfig.url).toBe('http://127.0.0.1:41234/mcp');
    expect(existsSync(join(echoHome, 'state/onboarding.json'))).toBe(false);
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
        async markCompleted() {},
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
});
