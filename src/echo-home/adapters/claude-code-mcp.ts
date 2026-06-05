import { spawn as nodeSpawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolveCommand } from '../../util/subprocess.js';

export interface ClaudeCodeMcpSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface ClaudeCodeMcpRegisterDeps {
  spawn?: (
    cmd: string,
    args: string[],
    opts: { timeoutMs: number; outputLimit: number },
  ) => Promise<ClaudeCodeMcpSpawnResult>;
  timeoutMs?: number;
  outputLimit?: number;
}

export type ClaudeCodeMcpRegisterAction =
  | 'mcp-add'
  | 'already-exists (unverified)'
  | 'cli-unavailable'
  | 'timeout'
  | 'error';

export interface ClaudeCodeMcpRegisterResult {
  action: ClaudeCodeMcpRegisterAction;
  command: string;
  detail?: string;
  exitCode?: number;
}

export const CLAUDE_CODE_MCP_TIMEOUT_MS = 30_000;
const DEFAULT_OUTPUT_LIMIT = 4000;

export function claudeCodeMcpAddArgs(mcpServerUrl: string): string[] {
  return ['mcp', 'add', '--transport', 'http', '--scope', 'user', 'echo', mcpServerUrl];
}

export function claudeCodeMcpAddCommand(mcpServerUrl: string): string {
  return `claude ${claudeCodeMcpAddArgs(mcpServerUrl).join(' ')}`;
}

function appendBounded(current: string, chunk: string, limit: number): string {
  if (current.length >= limit) return current;
  const next = `${current}${chunk}`;
  return next.length <= limit ? next : next.slice(0, limit);
}

function realSpawn(
  cmd: string,
  args: string[],
  opts: { timeoutMs: number; outputLimit: number },
): Promise<ClaudeCodeMcpSpawnResult> {
  return new Promise((resolvePromise, reject) => {
    const resolved = resolveCommand(cmd, {
      platform: process.platform,
      env: process.env,
      existsSync,
    });
    const child = nodeSpawn(resolved.command, [...(resolved.prependArgs ?? []), ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, opts.timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout = appendBounded(stdout, chunk, opts.outputLimit);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = appendBounded(stderr, chunk, opts.outputLimit);
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

function detail(stdout: string, stderr: string): string | undefined {
  const combined = `${stdout}\n${stderr}`.trim();
  return combined.length === 0 ? undefined : combined.slice(0, 200);
}

function alreadyExists(text: string): boolean {
  return /mcp server\s+echo\s+already exists/i.test(text) || /already exists/i.test(text);
}

export async function registerClaudeCodeMcpServer(
  mcpServerUrl: string,
  deps: ClaudeCodeMcpRegisterDeps = {},
): Promise<ClaudeCodeMcpRegisterResult> {
  const timeoutMs = deps.timeoutMs ?? CLAUDE_CODE_MCP_TIMEOUT_MS;
  const outputLimit = deps.outputLimit ?? DEFAULT_OUTPUT_LIMIT;
  const spawn = deps.spawn ?? realSpawn;
  const args = claudeCodeMcpAddArgs(mcpServerUrl);
  const command = claudeCodeMcpAddCommand(mcpServerUrl);

  let result: ClaudeCodeMcpSpawnResult;
  try {
    result = await spawn('claude', args, { timeoutMs, outputLimit });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { action: 'cli-unavailable', command };
    }
    return {
      action: 'error',
      command,
      detail: (err as Error).message.slice(0, 200),
    };
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  const resultDetail = detail(result.stdout, result.stderr);
  if (result.timedOut) {
    return { action: 'timeout', command, detail: resultDetail, exitCode: result.exitCode };
  }
  if (result.exitCode === 0) {
    return { action: 'mcp-add', command, detail: resultDetail, exitCode: result.exitCode };
  }
  if (alreadyExists(combined)) {
    return {
      action: 'already-exists (unverified)',
      command,
      detail: resultDetail,
      exitCode: result.exitCode,
    };
  }
  return {
    action: 'error',
    command,
    detail: resultDetail,
    exitCode: result.exitCode,
  };
}
