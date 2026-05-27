import { spawn as nodeSpawn } from 'node:child_process';
import type { AgentKind } from './detect-agents.js';

export type ProbeOutcome =
  | { agent: AgentKind; probed: true; latencyMs: number }
  | {
      agent: AgentKind;
      probed: false;
      reason:
        | 'cli-unavailable'
        | 'timeout'
        | 'manual-only'
        | 'auth-required'
        | 'mcp-not-configured'
        | 'unexpected-output';
      detail?: string;
    };

export interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface ProbeDeps {
  spawn?: (cmd: string, args: string[], opts?: { timeoutMs: number }) => Promise<SpawnResult>;
  timeoutMs?: number;
}

const PROMPT =
  'Invoke the mcp tool mcp__echo__echo_ping with no arguments and return its result verbatim as JSON only — no commentary.';

function realSpawn(
  cmd: string,
  args: string[],
  opts?: { timeoutMs: number },
): Promise<SpawnResult> {
  return new Promise((resolvePromise, reject) => {
    const child = nodeSpawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, opts?.timeoutMs ?? 30_000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({ exitCode: code ?? -1, stdout, stderr, timedOut });
    });
  });
}

function detail(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed.length === 0 ? undefined : trimmed.slice(0, 200);
}

function isEchoPingPayload(stdout: string): boolean {
  // Scan every non-empty line; first that parses as {pong:true, ts:string} wins.
  // Robust against agents that wrap responses in markdown code fences (claude-code
  // 2.1.x) or print log preamble before the JSON.
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(trimmed) as { pong?: unknown; ts?: unknown };
      if (parsed.pong === true && typeof parsed.ts === 'string') return true;
    } catch {
      // try next line
    }
  }
  return false;
}

function authRequired(stderr: string): boolean {
  return /auth|login|not authenticated/i.test(stderr);
}

function mcpNotConfigured(combined: string): boolean {
  const lower = combined.toLowerCase();
  if (lower.includes('no such tool') || lower.includes('unknown tool')) return true;
  if (lower.includes('mcp__echo__echo_ping')) {
    return lower.includes('not found') || lower.includes('unavailable');
  }
  return (
    lower.includes('mcp server') &&
    (lower.includes('not configured') || lower.includes('not found'))
  );
}

async function probeOne(
  agent: AgentKind,
  spawn: NonNullable<ProbeDeps['spawn']>,
  timeoutMs: number,
): Promise<ProbeOutcome> {
  if (agent === 'cursor') return { agent, probed: false, reason: 'manual-only' };

  const start = Date.now();
  const cmd = agent === 'codex' ? 'codex' : 'claude';
  const args =
    agent === 'codex'
      ? ['exec', '--sandbox', 'read-only', '--', PROMPT]
      : ['--print', '--output-format', 'text', '--', PROMPT];

  let result: SpawnResult;
  try {
    result = await spawn(cmd, args, { timeoutMs });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { agent, probed: false, reason: 'cli-unavailable' };
    }
    return {
      agent,
      probed: false,
      reason: 'unexpected-output',
      detail: detail((err as Error).message),
    };
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.exitCode !== 0 && authRequired(result.stderr)) {
    return { agent, probed: false, reason: 'auth-required', detail: detail(result.stderr) };
  }
  if (agent === 'claude-code' && mcpNotConfigured(combined)) {
    return { agent, probed: false, reason: 'mcp-not-configured', detail: detail(combined) };
  }
  if (result.timedOut) {
    return { agent, probed: false, reason: 'timeout', detail: detail(combined) };
  }
  if (result.exitCode === 0 && isEchoPingPayload(result.stdout)) {
    return { agent, probed: true, latencyMs: Math.max(0, Date.now() - start) };
  }
  return { agent, probed: false, reason: 'unexpected-output', detail: detail(combined) };
}

export async function probeAgents(
  agents: AgentKind[],
  deps: ProbeDeps = {},
): Promise<ProbeOutcome[]> {
  const timeoutMs = deps.timeoutMs ?? 30_000;
  const spawn = deps.spawn ?? realSpawn;
  const out: ProbeOutcome[] = [];
  for (const agent of agents) {
    out.push(await probeOne(agent, spawn, timeoutMs));
  }
  return out;
}
