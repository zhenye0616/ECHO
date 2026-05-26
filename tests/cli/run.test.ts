import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DispatchSpawn } from '../../src/cli/workflow/dispatch.js';

let tmpRoot: string;
let echoHome: string;
let projectRoot: string;
let originalEchoHome: string | undefined;

async function loadRun(): Promise<typeof import('../../src/cli/commands/run.js')> {
  return import('../../src/cli/commands/run.js');
}

function writeSkill(name: string): void {
  mkdirSync(join(echoHome, 'skills'), { recursive: true });
  writeFileSync(join(echoHome, 'skills', `${name}.md`), '---\nname: x\n---\n');
}

function writeRole(
  name: string,
  sandbox = 'workspace-write',
  capabilities = ['fs.write', 'git.write'],
): void {
  mkdirSync(join(echoHome, 'roles'), { recursive: true });
  writeSkill('process-backlog');
  writeFileSync(
    join(echoHome, 'roles', `${name}.toml`),
    `[role]\ndescription = "${name}"\nsandbox = "${sandbox}"\nskills = ["process-backlog"]\n\n[role.requires]\nmcp_servers = ["echo"]\ncapabilities = [${capabilities.map((cap) => `"${cap}"`).join(', ')}]\n\n[role.output]\nformat = "markdown"\nrequired_fields = ["verdict"]\n`,
  );
}

function writeDefaults(): void {
  writeRole('builder');
  writeRole('reviewer');
  writeRole('strategist');
}

function writeState(capabilities = ['fs.write', 'git.write']): void {
  mkdirSync(join(echoHome, 'state'), { recursive: true });
  const now = '2026-05-26T00:00:00.000Z';
  writeFileSync(
    join(echoHome, 'state/onboarding.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        created_at: now,
        last_updated_at: now,
        completed: true,
        agents: [
          {
            id: 'codex',
            detected_at: now,
            wired_at: now,
            probed_at: null,
            capabilities,
            wire_error: null,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(echoHome, 'state/projects.json'),
    `${JSON.stringify({ schema_version: 1, last_refreshed_at: now, default_project: projectRoot, projects: [] }, null, 2)}\n`,
  );
}

function writeWorkflow(): void {
  mkdirSync(join(echoHome, 'workflows'), { recursive: true });
  writeFileSync(
    join(echoHome, 'workflows/review.toml'),
    '[workflow]\nname = "review"\ndescription = "Review"\nschema_version = 1\n\n[[step]]\nrole = "reviewer"\nprompt = "Review ${ref}"\ninputs = { ref = "HEAD" }\n',
  );
}

function fakeSpawn(
  calls: Array<{ args: string[]; cwd?: string }>,
  result: { exitCode?: number; stdout?: string; stderr?: string } = {},
): DispatchSpawn {
  return ((_cmd: string, args: string[], opts?: { cwd?: string }) => {
    calls.push({ args, cwd: opts?.cwd });
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter & { setEncoding: () => void };
      stderr: EventEmitter & { setEncoding: () => void };
      kill: () => boolean;
    };
    child.stdout = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
    child.kill = () => true;
    queueMicrotask(() => {
      if (result.stdout !== undefined) child.stdout.emit('data', result.stdout);
      if (result.stderr !== undefined) child.stderr.emit('data', result.stderr);
      child.emit('close', result.exitCode ?? 0);
    });
    return child;
  }) as unknown as DispatchSpawn;
}

function hangingSpawn(kills: string[]): DispatchSpawn {
  return (() => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter & { setEncoding: () => void };
      stderr: EventEmitter & { setEncoding: () => void };
      kill: (signal?: string) => boolean;
    };
    child.stdout = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
    child.kill = (signal = 'SIGTERM') => {
      kills.push(signal);
      queueMicrotask(() => child.emit('close', -1));
      return true;
    };
    return child;
  }) as unknown as DispatchSpawn;
}

describe('runRun', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-run-'));
    echoHome = join(tmpRoot, 'echo-home');
    projectRoot = join(tmpRoot, 'repo');
    mkdirSync(join(projectRoot, '.git'), { recursive: true });
    process.env.ECHO_HOME = echoHome;
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('dispatches a matched workflow using --project cwd', async () => {
    writeDefaults();
    writeState();
    writeWorkflow();
    const calls: Array<{ args: string[]; cwd?: string }> = [];
    const { runRun } = await loadRun();

    const code = await runRun({
      workflowName: 'review',
      projectFlag: projectRoot,
      spawn: fakeSpawn(calls),
      quiet: true,
    });

    expect(code).toBe(0);
    expect(calls[0]!.cwd).toBe(projectRoot);
    expect(calls[0]!.args).toEqual(['exec', '--sandbox', 'workspace-write', '--', 'Review HEAD']);
  });

  it('reports capability-mismatch before spawning', async () => {
    writeDefaults();
    writeState(['mcp.echo.read']);
    writeWorkflow();
    const calls: Array<{ args: string[]; cwd?: string }> = [];
    const { runRun } = await loadRun();

    const code = await runRun({
      workflowName: 'review',
      projectFlag: projectRoot,
      spawn: fakeSpawn(calls),
    });

    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it('uses projects.json default when cwd has no git root and exits 143 on post-final SIGTERM gate', async () => {
    writeDefaults();
    writeState();
    writeWorkflow();
    const calls: Array<{ args: string[]; cwd?: string }> = [];
    const { runRun } = await loadRun();

    const code = await runRun({
      workflowName: 'review',
      cwd: join(tmpRoot, 'not-a-repo'),
      spawn: fakeSpawn(calls),
      quiet: true,
      signalGate: {
        beforeExitDerivation: async () => {
          process.emit('SIGTERM');
        },
      },
    });

    expect(code).toBe(143);
    expect(calls[0]!.cwd).toBe(projectRoot);
  });

  it('human mode prints captured stdout from dispatched review output', async () => {
    writeDefaults();
    writeState();
    writeWorkflow();
    const calls: Array<{ args: string[]; cwd?: string }> = [];
    let stdout = '';
    const { runRun } = await loadRun();

    const code = await runRun({
      workflowName: 'review',
      projectFlag: projectRoot,
      spawn: fakeSpawn(calls, { stdout: '### Finding 1 — HIGH — sample\n' }),
      stdout: {
        write: (chunk: string) => {
          stdout += chunk;
          return true;
        },
      },
    });

    expect(code).toBe(0);
    expect(stdout).toContain('reviewer: exit 0');
    expect(stdout).toContain('### Finding 1 — HIGH — sample');
  });

  it('human mode prints stderr block for nonzero dispatched outcomes', async () => {
    writeDefaults();
    writeState();
    writeWorkflow();
    const calls: Array<{ args: string[]; cwd?: string }> = [];
    let stdout = '';
    const { runRun } = await loadRun();

    const code = await runRun({
      workflowName: 'review',
      projectFlag: projectRoot,
      spawn: fakeSpawn(calls, { exitCode: 2, stderr: 'review crashed\n' }),
      stdout: {
        write: (chunk: string) => {
          stdout += chunk;
          return true;
        },
      },
    });

    expect(code).toBe(1);
    expect(stdout).toContain('reviewer: exit 2');
    expect(stdout).toContain('stderr:\nreview crashed');
  });

  it('passes timeoutMs override through to dispatch', async () => {
    vi.useFakeTimers();
    writeDefaults();
    writeState();
    writeWorkflow();
    const kills: string[] = [];
    const { runRun } = await loadRun();

    const promise = runRun({
      workflowName: 'review',
      projectFlag: projectRoot,
      spawn: hangingSpawn(kills),
      quiet: true,
      timeoutMs: 600_000,
    });

    await vi.advanceTimersByTimeAsync(599_999);
    expect(kills).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    const code = await promise;

    expect(code).toBe(1);
    expect(kills).toEqual(['SIGTERM']);
  });

  it('parses --timeout seconds from argv and forwards milliseconds to runRun', async () => {
    let captured: { workflowName?: string; timeoutMs?: number } | null = null;
    vi.doMock('../../src/cli/commands/run.js', () => ({
      runRun: async (opts: { workflowName?: string; timeoutMs?: number }) => {
        captured = opts;
        return 0;
      },
    }));

    try {
      const { main } = await import('../../src/cli/index.js');
      const code = await main(['run', 'review', '--timeout', '600']);

      expect(code).toBe(0);
      expect(captured).toMatchObject({ workflowName: 'review', timeoutMs: 600_000 });
    } finally {
      vi.doUnmock('../../src/cli/commands/run.js');
    }
  });

  it('rejects invalid --timeout values as usage errors', async () => {
    let called = false;
    vi.doMock('../../src/cli/commands/run.js', () => ({
      runRun: async () => {
        called = true;
        return 0;
      },
    }));
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      const { main } = await import('../../src/cli/index.js');
      const code = await main(['run', 'review', '--timeout', '0']);

      expect(code).toBe(2);
      expect(called).toBe(false);
      expect(stderr.mock.calls.map((call) => String(call[0])).join('')).toContain(
        'Usage: echoctl run',
      );
    } finally {
      stderr.mockRestore();
      vi.doUnmock('../../src/cli/commands/run.js');
    }
  });
});
