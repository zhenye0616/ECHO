import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchWorkflow,
  renderPrompt,
  type DispatchSpawn,
} from '../../src/cli/workflow/dispatch.js';
import type { Workflow } from '../../src/cli/workflow/load.js';
import type { AgentMatch } from '../../src/cli/workflow/match.js';

function workflow(): Workflow {
  return {
    name: 'review',
    description: 'Review',
    schemaVersion: 1,
    sourcePath: '/workflow.toml',
    steps: [
      { role: 'reviewer', prompt: 'Review ${ref}', inputs: { ref: 'HEAD' } },
      { role: 'builder', prompt: 'Build', inputs: {} },
    ],
  };
}

function match(role: string): AgentMatch {
  return { role, pickedAgent: 'codex', reason: 'matched', resolvedSandbox: 'workspace-write' };
}

function claudeMatch(role: string): AgentMatch {
  return {
    role,
    pickedAgent: 'claude-code',
    reason: 'matched',
    resolvedSandbox: 'workspace-write',
  };
}

function fakeSpawn(calls: Array<{ cmd: string; args: string[]; cwd?: string }>): DispatchSpawn {
  return ((cmd: string, args: string[], opts?: { cwd?: string }) => {
    calls.push({ cmd, args, cwd: opts?.cwd });
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter & { setEncoding: () => void };
      stderr: EventEmitter & { setEncoding: () => void };
      kill: () => boolean;
    };
    child.stdout = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding: () => undefined });
    child.kill = () => true;
    queueMicrotask(() => child.emit('close', 0));
    return child;
  }) as unknown as DispatchSpawn;
}

function hangingSpawn(kills: string[]): DispatchSpawn {
  return ((_cmd: string, _args: string[], _opts?: { cwd?: string }) => {
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

describe('dispatchWorkflow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('substitutes inputs and passes project cwd plus codex sandbox args', async () => {
    const calls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
    const outcomes = await dispatchWorkflow({
      workflow: workflow(),
      matches: [match('reviewer'), match('builder')],
      spawn: fakeSpawn(calls),
      projectRoot: '/fixture/repo',
    });

    expect(outcomes).toHaveLength(2);
    expect(calls[0]).toMatchObject({ cmd: 'codex', cwd: '/fixture/repo' });
    expect(calls[0]!.args).toEqual(['exec', '--sandbox', 'workspace-write', '--', 'Review HEAD']);
  });

  it('passes claude-code print args without a streaming flag', async () => {
    const calls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
    const outcomes = await dispatchWorkflow({
      workflow: workflow(),
      matches: [claudeMatch('reviewer'), match('builder')],
      spawn: fakeSpawn(calls),
      projectRoot: '/fixture/repo',
    });

    expect(outcomes).toHaveLength(2);
    expect(calls[0]).toMatchObject({ cmd: 'claude', cwd: '/fixture/repo' });
    expect(calls[0]!.args).toEqual([
      '--print',
      '--output-format',
      'text',
      '--',
      'Review HEAD',
    ]);
  });

  it('stops before the next spawn when the tail signal gate aborts', async () => {
    const calls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
    const controller = new AbortController();
    const receivedSignal: { current: 'SIGINT' | 'SIGTERM' | null } = { current: null };
    const outcomes = await dispatchWorkflow({
      workflow: workflow(),
      matches: [match('reviewer'), match('builder')],
      spawn: fakeSpawn(calls),
      projectRoot: '/fixture/repo',
      signal: controller.signal,
      receivedSignal,
      signalGate: {
        beforeNextSpawn: async () => {
          receivedSignal.current = 'SIGTERM';
          controller.abort();
        },
      },
    });

    expect(calls).toHaveLength(1);
    expect(outcomes[1]).toMatchObject({ error: 'interrupted', signal: 'SIGTERM' });
  });

  it('uses a 300s default timeout before killing the spawned agent', async () => {
    vi.useFakeTimers();
    const kills: string[] = [];
    const promise = dispatchWorkflow({
      workflow: workflow(),
      matches: [match('reviewer'), match('builder')],
      spawn: hangingSpawn(kills),
      projectRoot: '/fixture/repo',
    });

    await vi.advanceTimersByTimeAsync(299_999);
    expect(kills).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    const outcomes = await promise;

    expect(kills).toEqual(['SIGTERM']);
    expect(outcomes[0]!.spawn).toMatchObject({ timedOut: true, exitCode: -1 });
    expect(outcomes).toHaveLength(1);
  });

  it('throws for missing prompt input before spawning', async () => {
    expect(() => renderPrompt({ role: 'x', prompt: '${missing}', inputs: {} })).toThrow(
      'missing workflow input',
    );
  });
});
