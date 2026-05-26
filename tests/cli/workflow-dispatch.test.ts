import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
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

describe('dispatchWorkflow', () => {
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

  it('throws for missing prompt input before spawning', async () => {
    expect(() => renderPrompt({ role: 'x', prompt: '${missing}', inputs: {} })).toThrow(
      'missing workflow input',
    );
  });
});
