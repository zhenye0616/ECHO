import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import type { AgentKind } from '../../echo-home/wizard/detect-agents.js';
import type { AgentMatch } from './match.js';
import type { Workflow, WorkflowStep } from './load.js';

export interface DispatchOutcome {
  step: WorkflowStep;
  match: AgentMatch;
  spawn: {
    exitCode: number;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    elapsedMs: number;
  } | null;
  error?: string;
  signal?: 'SIGINT' | 'SIGTERM';
}

export type DispatchSpawn = typeof nodeSpawn;

export interface DispatchOpts {
  workflow: Workflow;
  matches: readonly AgentMatch[];
  spawn?: DispatchSpawn;
  timeoutMs?: number;
  projectRoot: string;
  signal?: AbortSignal;
  receivedSignal?: { current: 'SIGINT' | 'SIGTERM' | null };
  signalGate?: { beforeNextSpawn?: () => Promise<void> };
}

function argsFor(
  agent: AgentKind,
  sandbox: 'read-only' | 'workspace-write',
  prompt: string,
): { cmd: string; args: string[] } | null {
  if (agent === 'codex')
    return { cmd: 'codex', args: ['exec', '--sandbox', sandbox, '--', prompt] };
  if (agent === 'claude-code') {
    return {
      cmd: 'claude',
      args: ['--print', '--output-format', 'text', '--', prompt],
    };
  }
  return null;
}

export function renderPrompt(step: WorkflowStep): string {
  return step.prompt.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key: string) => {
    const value = step.inputs[key];
    if (value === undefined) throw new Error(`missing workflow input: ${key}`);
    return value;
  });
}

function runSpawn(opts: {
  spawn: DispatchSpawn;
  cmd: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
  receivedSignal?: { current: 'SIGINT' | 'SIGTERM' | null };
}): Promise<DispatchOutcome['spawn'] & { interrupted?: 'SIGINT' | 'SIGTERM'; enonent?: boolean }> {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let child: ChildProcess;

    const finish = (
      exitCode: number,
      interrupted?: 'SIGINT' | 'SIGTERM',
      enonent?: boolean,
    ): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
      resolve({
        exitCode,
        stdout,
        stderr,
        timedOut,
        elapsedMs: Math.max(0, Date.now() - start),
        interrupted,
        enonent,
      });
    };

    const onAbort = (): void => {
      const sig = opts.receivedSignal?.current ?? 'SIGTERM';
      try {
        child.kill('SIGTERM');
      } catch {
        // best effort
      }
      finish(-1, sig);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // best effort
      }
    }, opts.timeoutMs);

    try {
      child = opts.spawn(opts.cmd, opts.args, {
        cwd: opts.cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      clearTimeout(timer);
      resolve({
        exitCode: -1,
        stdout: '',
        stderr: (err as Error).message,
        timedOut: false,
        elapsedMs: Math.max(0, Date.now() - start),
        enonent: (err as NodeJS.ErrnoException).code === 'ENOENT',
      });
      return;
    }

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      stderr += err.message;
      finish(-1, undefined, err.code === 'ENOENT');
    });
    child.on('close', (code) => {
      finish(code ?? -1);
    });
    if (opts.signal?.aborted) onAbort();
    else opts.signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function dispatchWorkflow(opts: DispatchOpts): Promise<DispatchOutcome[]> {
  const outcomes: DispatchOutcome[] = [];
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const spawn = opts.spawn ?? nodeSpawn;
  for (let i = 0; i < opts.workflow.steps.length; i++) {
    const step = opts.workflow.steps[i]!;
    const match = opts.matches[i] ?? {
      role: step.role,
      pickedAgent: null,
      reason: 'role-unknown' as const,
    };
    if (opts.signal?.aborted) {
      outcomes.push({
        step,
        match,
        spawn: null,
        error: 'interrupted',
        signal: opts.receivedSignal?.current ?? 'SIGTERM',
      });
      break;
    }
    if (match.pickedAgent === null || match.reason !== 'matched') {
      outcomes.push({ step, match, spawn: null, error: match.reason });
      break;
    }
    if (match.resolvedSandbox === undefined) {
      throw new Error(`matched role ${match.role} is missing resolvedSandbox`);
    }
    const prompt = renderPrompt(step);
    const command = argsFor(match.pickedAgent, match.resolvedSandbox, prompt);
    if (command === null) {
      outcomes.push({ step, match, spawn: null, error: 'cursor-not-dispatchable' });
      break;
    }
    const result = await runSpawn({
      spawn,
      cmd: command.cmd,
      args: command.args,
      cwd: opts.projectRoot,
      timeoutMs,
      signal: opts.signal,
      receivedSignal: opts.receivedSignal,
    });
    if (result.enonent === true) {
      outcomes.push({
        step,
        match,
        spawn: null,
        error: `cli-unavailable: ${match.pickedAgent} not found on PATH`,
      });
      break;
    }
    if (result.interrupted !== undefined) {
      outcomes.push({
        step,
        match,
        spawn: result,
        error: 'interrupted',
        signal: result.interrupted,
      });
      break;
    }
    outcomes.push({ step, match, spawn: result });
    if (result.exitCode !== 0 || result.timedOut) break;
    await (opts.signalGate?.beforeNextSpawn?.() ?? Promise.resolve());
  }
  return outcomes;
}
