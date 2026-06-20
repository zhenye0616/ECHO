import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export type BrainName = 'codex' | 'claude';
export type BrainOutcome = 'ok' | 'timeout' | 'error';

export interface BrainResult {
  ok: boolean;
  outcome: BrainOutcome;
  durationMs: number;
  answer?: string;
  reason?: string;
}

export interface BrainBinding {
  executable: string;
  versionArgs: readonly string[];
  argv(scopeRepoPath: string): readonly string[];
  capture: 'stdout-json' | 'stdout-text';
}

export interface BrainRunOptions {
  brain: BrainName;
  contextRepoPath: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  killGraceMs?: number;
  registry?: BrainRegistry;
}

export type BrainRegistry = Readonly<Record<BrainName, BrainBinding>>;

interface Invocation {
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  prompt: string;
  capture: BrainBinding['capture'];
}

const DEFAULT_KILL_GRACE_MS = 500;
const PREFLIGHT_TIMEOUT_MS = 5000;

// Checked at claim time on 2026-06-19:
// codex-cli 0.137.0 supports `codex exec -C <dir> --sandbox read-only --json -`.
// Claude Code 2.1.183 supports `claude --dangerously-skip-permissions -p`.
export const BRAIN_REGISTRY: BrainRegistry = {
  codex: {
    executable: 'codex',
    versionArgs: ['--version'],
    argv: (scopeRepoPath) => [
      'codex',
      'exec',
      '-C',
      scopeRepoPath,
      '--sandbox',
      'read-only',
      '--json',
      '-',
    ],
    capture: 'stdout-json',
  },
  claude: {
    executable: 'claude',
    versionArgs: ['--version'],
    argv: () => ['claude', '--dangerously-skip-permissions', '-p'],
    capture: 'stdout-text',
  },
};

export function parseBrainName(raw: string | undefined): BrainName {
  if (raw === undefined || raw.trim() === '') return 'codex';
  const value = raw.trim();
  if (value === 'codex' || value === 'claude') return value;
  throw new Error(`ECHO_CEO_BRAIN must be codex or claude, got ${raw}`);
}

export function buildBrainPrompt(question: string, scopeRepoPath: string): string {
  return [
    'You are the reasoning brain for the ECHO CEO Slack responder.',
    '',
    'Answer the Slack question from scoped ECHO context only.',
    `Scope repo path: ${scopeRepoPath}`,
    '',
    'Rules:',
    `- When using ECHO MCP tools, always pass repo_path exactly "${scopeRepoPath}".`,
    '- Do not search or infer from any other project or personal memory slice.',
    '- Synthesize a business why in clear terms; do not dump raw atoms or tool output.',
    '- Cite at least one concrete scoped fact such as a ticket, component, seam, or decision.',
    '- If scoped context is insufficient, say that directly and name the missing grounding.',
    '- Return only the final Slack-ready answer.',
    '',
    `Question: ${question}`,
  ].join('\n');
}

export function resolveBrainInvocation(question: string, options: BrainRunOptions): Invocation {
  const registry = options.registry ?? BRAIN_REGISTRY;
  const binding = registry[options.brain];
  return {
    argv: binding.argv(options.contextRepoPath),
    cwd: options.contextRepoPath,
    env: { ...process.env, ...options.env },
    prompt: buildBrainPrompt(question, options.contextRepoPath),
    capture: binding.capture,
  };
}

export async function preflightBrain(
  brain: BrainName,
  env: NodeJS.ProcessEnv = process.env,
  registry: BrainRegistry = BRAIN_REGISTRY,
): Promise<void> {
  const binding = registry[brain];
  const result = await runProcess({
    argv: [binding.executable, ...binding.versionArgs],
    cwd: process.cwd(),
    env,
    stdin: '',
    timeoutMs: PREFLIGHT_TIMEOUT_MS,
    killGraceMs: DEFAULT_KILL_GRACE_MS,
  });
  if (result.timedOut) {
    throw new Error(`selected brain "${brain}" version probe timed out`);
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `selected brain "${brain}" version probe failed: ${boundedReason(result.stderr)}`,
    );
  }
}

export async function runBrain(question: string, options: BrainRunOptions): Promise<BrainResult> {
  const started = Date.now();
  const invocation = resolveBrainInvocation(question, options);
  const result = await runProcess({
    argv: invocation.argv,
    cwd: invocation.cwd,
    env: invocation.env,
    stdin: invocation.prompt,
    timeoutMs: options.timeoutMs,
    killGraceMs: options.killGraceMs ?? DEFAULT_KILL_GRACE_MS,
  });
  const durationMs = Date.now() - started;

  if (result.timedOut) {
    return {
      ok: false,
      outcome: 'timeout',
      durationMs,
      reason: `timed out after ${options.timeoutMs}ms`,
    };
  }
  if (result.exitCode !== 0) {
    return {
      ok: false,
      outcome: 'error',
      durationMs,
      reason: boundedReason(result.stderr || `brain exited ${result.exitCode}`),
    };
  }

  let answer: string;
  try {
    answer =
      invocation.capture === 'stdout-json'
        ? parseCodexJsonFinalMessage(result.stdout)
        : result.stdout.trim();
  } catch (err) {
    return {
      ok: false,
      outcome: 'error',
      durationMs,
      reason: err instanceof Error ? boundedReason(err.message) : boundedReason(String(err)),
    };
  }
  if (answer === '') {
    return {
      ok: false,
      outcome: 'error',
      durationMs,
      reason: 'empty final answer',
    };
  }
  return {
    ok: true,
    outcome: 'ok',
    durationMs,
    answer,
  };
}

export function parseCodexJsonFinalMessage(stdout: string): string {
  const candidates: string[] = [];
  let jsonErrors = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const text = assistantText(parsed);
      if (text !== null && text.trim() !== '') {
        candidates.push(text.trim());
      }
    } catch {
      jsonErrors += 1;
    }
  }
  const answer = candidates.at(-1);
  if (answer === undefined) {
    throw new Error(`no assistant message found in codex JSON stdout (json_errors=${jsonErrors})`);
  }
  return answer;
}

export function formatBrainFailure(result: BrainResult): string {
  const reason = boundedReason(result.reason ?? result.outcome);
  return `Could not synthesize an answer - ${reason}`;
}

function assistantText(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const type = stringValue(value.type) ?? '';
  const role = stringValue(value.role) ?? '';
  if (role === 'assistant' || type.includes('assistant') || type === 'agent_message') {
    for (const key of ['message', 'text', 'content', 'final_message', 'output']) {
      const text = textFromContent(value[key]);
      if (text !== null) return text;
    }
  }
  for (const key of ['item', 'message', 'data', 'event']) {
    const nested = assistantText(value[key]);
    if (nested !== null) return nested;
  }
  return null;
}

function textFromContent(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return null;
  const parts: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      parts.push(item);
    } else if (isRecord(item)) {
      const text = stringValue(item.text) ?? stringValue(item.content);
      if (text !== null) parts.push(text);
    }
  }
  const joined = parts.join('').trim();
  return joined === '' ? null : joined;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface ProcessRunOptions {
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdin: string;
  timeoutMs: number;
  killGraceMs: number;
}

interface ProcessRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

function runProcess(options: ProcessRunOptions): Promise<ProcessRunResult> {
  return new Promise((resolve) => {
    const [executable, ...args] = options.argv;
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(executable, args, {
        cwd: options.cwd,
        env: options.env,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      resolve({
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        timedOut: false,
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;
    let termTimer: NodeJS.Timeout | undefined;
    let settleTimer: NodeJS.Timeout | undefined;

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      killProcessGroup(child, 'SIGTERM');
      termTimer = setTimeout(() => {
        killProcessGroup(child, 'SIGKILL');
      }, options.killGraceMs);
      termTimer.unref();
      settleTimer = setTimeout(() => {
        finish(null);
      }, options.killGraceMs * 2);
      settleTimer.unref();
    }, options.timeoutMs);
    timeoutTimer.unref();

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      stderr += err.message;
      finish(1);
    });
    child.on('close', (code) => {
      finish(code);
    });
    child.stdin.end(options.stdin);

    function finish(exitCode: number | null): void {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutTimer);
      if (termTimer !== undefined) clearTimeout(termTimer);
      if (settleTimer !== undefined) clearTimeout(settleTimer);
      resolve({ stdout, stderr, exitCode, timedOut });
    }
  });
}

function killProcessGroup(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Best effort; runProcess still returns a bounded timeout result.
    }
  }
}

function boundedReason(reason: string): string {
  return reason.replace(/\s+/g, ' ').trim().slice(0, 200) || 'unknown error';
}
