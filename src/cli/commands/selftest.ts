import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { normalizeRepoPath, readCaptureSourcesConfig } from '../../capture/sources.js';

type Writable = Pick<NodeJS.WritableStream, 'write'>;

export const SELFTEST_CHECK_IDS = [
  'INS-02',
  'INS-05',
  'INS-06',
  'DAE-02',
  'DAE-03',
  'DAE-06',
  'MCP-02',
  'INIT-02',
  'INIT-04',
  'INIT-05',
  'WIR-01',
  'WIR-02',
  'WIR-04',
  'WIR-05',
  'WIR-06',
  'SKILL-02',
  'INIT-06',
  'CAP-02',
  'REC-02',
  'DOC-02',
  'DOC-03',
  'INIT-08',
  'SELF-01',
] as const;

export type SelfTestCheckId = (typeof SELFTEST_CHECK_IDS)[number];

export interface SelfTestCheck {
  id: SelfTestCheckId;
  ok: boolean;
  skipped: boolean;
  detail: string;
}

export interface SelfTestReport {
  platform: string;
  arch: string;
  node: string;
  port: number;
  sandbox: string;
  checks: SelfTestCheck[];
  passed: number;
  failed: number;
  skipped: number;
  failedIds: SelfTestCheckId[];
}

interface SyncResult {
  code: number;
  out: string;
}

export interface SelfTestRuntimePaths {
  cliEntry: string;
  daemonEntry: string;
  packageRoot: string;
}

export interface SelfTestDaemonHandle {
  port: number;
  url: string;
  child?: ChildProcess;
}

export interface SelfTestSandbox {
  sandbox: string;
  home: string;
  echoHome: string;
  codexHome: string;
  dataDir: string;
  dbPath: string;
  daemonLabel: string;
  plistPath: string;
  logDir: string;
}

export interface SelfTestCommandContext {
  env: NodeJS.ProcessEnv;
  file: string;
  args: readonly string[];
  cwd?: string;
}

export interface SelfTestDaemonContext {
  env: NodeJS.ProcessEnv;
  sandbox: SelfTestSandbox;
  paths: SelfTestRuntimePaths;
  startupTimeoutMs: number;
  mcpRequest: SelfTestMcpRequest;
  sleep: (ms: number) => Promise<void>;
}

export interface SelfTestStopContext {
  handle: SelfTestDaemonHandle | null;
  sandbox: SelfTestSandbox;
}

export type SelfTestMcpRequest = (
  url: string,
  method: string,
  params?: Record<string, unknown>,
) => Promise<string>;

export interface SelfTestDeps {
  paths?: Partial<SelfTestRuntimePaths>;
  runCommand?: (ctx: SelfTestCommandContext) => SyncResult;
  startDaemon?: (ctx: SelfTestDaemonContext) => Promise<SelfTestDaemonHandle | null>;
  stopDaemon?: (ctx: SelfTestStopContext) => void | Promise<void>;
  mcpRequest?: SelfTestMcpRequest;
  loadSqlite?: () => boolean;
  hasEventsTable?: (dbPath: string) => boolean;
  sleep?: (ms: number) => Promise<void>;
  makeSandbox?: () => string;
  onSandbox?: (sandbox: SelfTestSandbox) => void;
}

export interface SelfTestOpts {
  json?: boolean;
  quiet?: boolean;
  color?: boolean;
  keepSandbox?: boolean;
  timeoutMs?: number;
  startupTimeoutMs?: number;
  stdout?: Writable;
  stderr?: Writable;
  deps?: SelfTestDeps;
}

export const SELFTEST_HELP = `Usage: echoctl selftest [--json] [--quiet] [--keep-sandbox]

Runs the cross-platform onboarding smoke in a freshly isolated HOME/ECHO_HOME/
CODEX_HOME. The command spawns its own throwaway daemon with ECHO_MCP_PORT=0,
reads the resolved port from the daemon lifecycle payload, and threads that
port into every MCP and echoctl check. It never reads or binds the production
38478 port.

Options:
  --keep-sandbox   leave the temp sandbox on disk for debugging (default: removed)

Exit code is 0 only if every non-skipped check passes.`;

const DEFAULT_PATHS: SelfTestRuntimePaths = {
  cliEntry: fileURLToPath(new URL('../index.js', import.meta.url)),
  daemonEntry: fileURLToPath(new URL('../../daemon/index.js', import.meta.url)),
  packageRoot: fileURLToPath(new URL('../../../', import.meta.url)),
};

const IS_WIN = process.platform === 'win32';

class SelfTestTimeout extends Error {
  constructor() {
    super('selftest timed out');
    this.name = 'SelfTestTimeout';
  }
}

export function parseSelfTestArgs(args: readonly string[]): Pick<SelfTestOpts, 'keepSandbox'> {
  const parsed = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      'keep-sandbox': { type: 'boolean', default: false },
    },
  });
  return { keepSandbox: parsed.values['keep-sandbox'] === true };
}

function writeLine(stream: Writable, line: string): void {
  stream.write(line.endsWith('\n') ? line : `${line}\n`);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CAPTURE_RECALL_TIMEOUT_MS = 10_000;
const CAPTURE_RECALL_POLL_INTERVAL_MS = 500;
const DAEMON_RESTART_TIMEOUT_MS = 15_000;
const DAEMON_RESTART_POLL_INTERVAL_MS = 250;
const DAEMON_READY_MCP_TIMEOUT_MS = 1_000;
const REQUIRED_ECHO_TOOLS = ['echo_ping', 'search_memories', 'find_clusters', 'get_atoms'] as const;

function defaultRunCommand({ env, file, args, cwd }: SelfTestCommandContext): SyncResult {
  try {
    const out = execFileSync(file, [...args], {
      cwd,
      env,
      encoding: 'utf8',
    });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function readPidLockPid(sandbox: SelfTestSandbox): number | null {
  try {
    const pid = Number.parseInt(readFileSync(join(sandbox.dataDir, 'daemon.pid'), 'utf8'), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function captureSourcesIncludesRepo(filePath: string, repo: string): boolean {
  try {
    const config = readCaptureSourcesConfig(filePath);
    if (config === null) return false;
    const normalizedRepo = normalizeRepoPath(repo);
    return config.git_repos.some((entry) => normalizeRepoPath(entry) === normalizedRepo);
  } catch {
    return false;
  }
}

function defaultLoadSqlite(): boolean {
  try {
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3') as new (path: string) => {
      prepare: (sql: string) => { get: () => unknown };
    };
    new Database(':memory:').prepare('select 1 as a').get();
    return true;
  } catch {
    return false;
  }
}

function defaultHasEventsTable(dbPath: string): boolean {
  try {
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3') as new (
      path: string,
      opts: { readonly: boolean },
    ) => { prepare: (sql: string) => { get: () => unknown } };
    const db = new Database(dbPath, { readonly: true });
    return (
      db.prepare("select name from sqlite_master where type='table' and name='events'").get() !==
      undefined
    );
  } catch {
    return false;
  }
}

async function defaultMcpRequest(
  url: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const text = await res.text();
  if (!text.includes('data:')) return text;
  const dataLine = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .pop();
  return dataLine === undefined ? text : dataLine.slice(5).trim();
}

function toolCall(
  mcpRequest: SelfTestMcpRequest,
  url: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  return mcpRequest(url, 'tools/call', { name, arguments: args });
}

async function pollUntilRecall(args: {
  mcpRequest: SelfTestMcpRequest;
  url: string;
  token: string;
  sleep: (ms: number) => Promise<void>;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<{ ok: boolean; waitedMs: number; response: string }> {
  const timeoutMs = args.timeoutMs ?? CAPTURE_RECALL_TIMEOUT_MS;
  const intervalMs = args.intervalMs ?? CAPTURE_RECALL_POLL_INTERVAL_MS;
  let waitedMs = 0;
  let response = '';

  while (true) {
    response = await toolCall(args.mcpRequest, args.url, 'search_memories', {
      query: args.token,
      source_app: 'git',
      limit: 5,
    });
    if (response.includes(args.token)) return { ok: true, waitedMs, response };
    if (waitedMs >= timeoutMs) return { ok: false, waitedMs, response };
    const delay = Math.min(intervalMs, timeoutMs - waitedMs);
    await args.sleep(delay);
    waitedMs += delay;
  }
}

function priorDaemonReleaseStatus(args: {
  sandbox: SelfTestSandbox;
  priorPid: number | null;
  priorPort: number;
}): { ok: boolean; detail: string } {
  const lockPid = readPidLockPid(args.sandbox);
  if (lockPid === null) return { ok: true, detail: 'pid-lock released' };
  if (!isProcessAlive(lockPid)) {
    return { ok: true, detail: `pid-lock stale for exited pid ${lockPid}` };
  }
  const owner =
    args.priorPid !== null && lockPid === args.priorPid ? 'prior daemon' : 'daemon process';
  return {
    ok: false,
    detail: `pid-lock still held by live ${owner} ${lockPid} on old port ${args.priorPort}`,
  };
}

async function pollUntilPriorDaemonReleased(args: {
  sandbox: SelfTestSandbox;
  priorPid: number | null;
  priorPort: number;
  sleep: (ms: number) => Promise<void>;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<{ ok: boolean; waitedMs: number; detail: string }> {
  const timeoutMs = args.timeoutMs ?? DAEMON_RESTART_TIMEOUT_MS;
  const intervalMs = args.intervalMs ?? DAEMON_RESTART_POLL_INTERVAL_MS;
  let waitedMs = 0;
  let status = priorDaemonReleaseStatus(args);

  while (true) {
    if (status.ok) return { ok: true, waitedMs, detail: status.detail };
    if (waitedMs >= timeoutMs) return { ok: false, waitedMs, detail: status.detail };
    const delay = Math.min(intervalMs, timeoutMs - waitedMs);
    await args.sleep(delay);
    waitedMs += delay;
    status = priorDaemonReleaseStatus(args);
  }
}

async function withTimeout<T>(label: string, timeoutMs: number, work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

async function daemonReadyStatus(args: {
  sandbox: SelfTestSandbox;
  handle: SelfTestDaemonHandle;
  mcpRequest: SelfTestMcpRequest;
}): Promise<{ ok: boolean; detail: string }> {
  if (readPidLockPid(args.sandbox) === null) {
    return { ok: false, detail: 'pid-lock not present after daemon lifecycle start' };
  }
  let tools: string;
  try {
    tools = await withTimeout(
      `MCP tools/list on port ${args.handle.port}`,
      DAEMON_READY_MCP_TIMEOUT_MS,
      args.mcpRequest(args.handle.url, 'tools/list', {}),
    );
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
  const missing = REQUIRED_ECHO_TOOLS.filter((tool) => !tools.includes(tool));
  if (missing.length > 0) {
    return {
      ok: false,
      detail: `MCP tools/list on port ${args.handle.port} missing ${missing.join(', ')}`,
    };
  }
  return {
    ok: true,
    detail: `pid-lock present and MCP tools/list reachable on port ${args.handle.port}`,
  };
}

async function startDaemonUntilReady(args: {
  env: NodeJS.ProcessEnv;
  sandbox: SelfTestSandbox;
  paths: SelfTestRuntimePaths;
  startupTimeoutMs: number;
  mcpRequest: SelfTestMcpRequest;
  sleep: (ms: number) => Promise<void>;
  startDaemon: (ctx: SelfTestDaemonContext) => Promise<SelfTestDaemonHandle | null>;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<{ ok: boolean; waitedMs: number; detail: string; handle: SelfTestDaemonHandle | null }> {
  const timeoutMs = args.timeoutMs ?? DAEMON_RESTART_TIMEOUT_MS;
  const intervalMs = args.intervalMs ?? DAEMON_RESTART_POLL_INTERVAL_MS;
  let waitedMs = 0;
  let handle: SelfTestDaemonHandle | null = null;
  let detail = 'daemon restart not attempted';

  while (true) {
    if (waitedMs >= timeoutMs) return { ok: false, waitedMs, detail, handle };

    if (handle === null) {
      const remainingMs = Math.max(1, timeoutMs - waitedMs);
      const attemptTimeoutMs = Math.min(args.startupTimeoutMs, remainingMs);
      const startedAt = Date.now();
      handle = await args.startDaemon({
        env: args.env,
        sandbox: args.sandbox,
        paths: args.paths,
        startupTimeoutMs: attemptTimeoutMs,
        mcpRequest: args.mcpRequest,
        sleep: args.sleep,
      });
      waitedMs += Math.max(0, Date.now() - startedAt);
      if (handle === null) {
        detail = `daemon did not report lifecycle started within ${attemptTimeoutMs}ms`;
      }
    }

    if (handle !== null) {
      const ready = await daemonReadyStatus({
        sandbox: args.sandbox,
        handle,
        mcpRequest: args.mcpRequest,
      });
      if (ready.ok) return { ok: true, waitedMs, detail: ready.detail, handle };
      detail = ready.detail;
    }

    if (waitedMs >= timeoutMs) return { ok: false, waitedMs, detail, handle };
    const delay = Math.min(intervalMs, timeoutMs - waitedMs);
    await args.sleep(delay);
    waitedMs += delay;
  }
}

function parseLifecyclePort(line: string): { port: number; url: string } | null {
  try {
    const entry = JSON.parse(line) as {
      source?: unknown;
      message?: unknown;
      payload?: { mcp_port?: unknown; mcp_url?: unknown };
    };
    if (entry.source !== 'daemon.lifecycle' || entry.message !== 'started') return null;
    const port = Number(entry.payload?.mcp_port);
    const url = entry.payload?.mcp_url;
    if (!Number.isInteger(port) || port <= 0 || port > 65535 || typeof url !== 'string') {
      return null;
    }
    return { port, url };
  } catch {
    return null;
  }
}

async function defaultStartDaemon(
  ctx: SelfTestDaemonContext,
): Promise<SelfTestDaemonHandle | null> {
  const child = spawn(process.execPath, [ctx.paths.daemonEntry], {
    env: ctx.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !IS_WIN,
  });
  child.unref();

  let buffer = '';
  let stderr = '';
  return await new Promise((resolve) => {
    let settled = false;
    const done = (handle: SelfTestDaemonHandle | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(handle);
    };
    const timer = setTimeout(() => done(null), ctx.startupTimeoutMs);

    child.stdout?.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const parsed = parseLifecyclePort(line);
        if (parsed !== null) {
          done({ child, port: parsed.port, url: parsed.url });
          return;
        }
      }
    });
    child.stderr?.on('data', (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-4000);
    });
    child.once('exit', () => {
      if (stderr.length > 0) process.stderr.write(stderr);
      done(null);
    });
    child.once('error', () => done(null));
  });
}

async function waitForChildExit(child: ChildProcess, ms: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function defaultStopDaemon({ handle, sandbox }: SelfTestStopContext): Promise<void> {
  try {
    const pid = Number.parseInt(readFileSync(join(sandbox.dataDir, 'daemon.pid'), 'utf8'), 10);
    if (Number.isInteger(pid)) process.kill(pid, 'SIGTERM');
  } catch {
    // best effort
  }
  if (handle?.child?.pid !== undefined) {
    try {
      if (IS_WIN) handle.child.kill();
      else process.kill(-handle.child.pid, 'SIGTERM');
    } catch {
      // best effort
    }
    await waitForChildExit(handle.child, 1500);
    if (handle.child.exitCode === null && handle.child.signalCode === null) {
      try {
        if (IS_WIN) handle.child.kill('SIGKILL');
        else process.kill(-handle.child.pid, 'SIGKILL');
      } catch {
        // best effort
      }
    }
  }
}

function makeSandbox(deps: SelfTestDeps): SelfTestSandbox {
  const sandbox = deps.makeSandbox?.() ?? mkdtempSync(join(tmpdir(), 'echo-selftest-'));
  const home = join(sandbox, 'home');
  const echoHome = join(home, '.echo');
  const dataDir = join(sandbox, 'data');
  const codexHome = join(home, '.codex');
  const daemonLabel = `com.echo.selftest.${process.pid}.${Date.now()}`;
  const plistPath = join(sandbox, 'launchd', `${daemonLabel}.plist`);
  const logDir = join(sandbox, 'logs');
  const dbPath = join(dataDir, 'echo.db');
  mkdirSync(home, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(dirname(plistPath), { recursive: true });
  return { sandbox, home, echoHome, codexHome, dataDir, dbPath, daemonLabel, plistPath, logDir };
}

function makeDaemonEnv(sandbox: SelfTestSandbox): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: sandbox.home,
    USERPROFILE: sandbox.home,
    ECHO_HOME: sandbox.echoHome,
    CODEX_HOME: sandbox.codexHome,
    ECHO_DATA_DIR: sandbox.dataDir,
    ECHO_DB_PATH: sandbox.dbPath,
    ECHO_MCP_PORT: '0',
  };
  delete env.ECHO_STORAGE;
  return env;
}

function makeClientEnv(daemonEnv: NodeJS.ProcessEnv, port: number): NodeJS.ProcessEnv {
  return {
    ...daemonEnv,
    ECHO_MCP_PORT: String(port),
  };
}

export async function runSelftest(opts: SelfTestOpts = {}): Promise<number> {
  const stdout = opts.stdout ?? process.stdout;
  const stderr = opts.stderr ?? process.stderr;
  const deps = opts.deps ?? {};
  const paths: SelfTestRuntimePaths = { ...DEFAULT_PATHS, ...(deps.paths ?? {}) };
  const runCommand = deps.runCommand ?? defaultRunCommand;
  const mcpRequest = deps.mcpRequest ?? defaultMcpRequest;
  const startDaemon = deps.startDaemon ?? defaultStartDaemon;
  const stopDaemon = deps.stopDaemon ?? defaultStopDaemon;
  const loadSqlite = deps.loadSqlite ?? defaultLoadSqlite;
  const hasEventsTable = deps.hasEventsTable ?? defaultHasEventsTable;
  const sleep = deps.sleep ?? defaultSleep;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const startupTimeoutMs = opts.startupTimeoutMs ?? 60_000;
  const checks: SelfTestCheck[] = [];
  const seen = new Set<SelfTestCheckId>();
  const human = !opts.json && !opts.quiet;
  const sandbox = makeSandbox(deps);
  deps.onSandbox?.(sandbox);
  let daemonEnv = makeDaemonEnv(sandbox);
  let clientEnv: NodeJS.ProcessEnv | null = null;
  let daemon: SelfTestDaemonHandle | null = null;
  let currentPort = 0;
  let timedOut = false;

  const record = (id: SelfTestCheckId, ok: boolean, detail = ''): void => {
    if (seen.has(id)) return;
    seen.add(id);
    checks.push({ id, ok, skipped: false, detail });
    if (human) writeLine(stdout, `  ${ok ? 'PASS' : 'FAIL'}  ${id}${detail ? ` - ${detail}` : ''}`);
  };
  const skip = (id: SelfTestCheckId, why: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    checks.push({ id, ok: true, skipped: true, detail: why });
    if (human) writeLine(stdout, `  SKIP  ${id} - ${why}`);
  };
  const echoctl = (args: readonly string[]): SyncResult => {
    if (clientEnv === null) return { code: 1, out: 'selftest client env not initialized' };
    return runCommand({ env: clientEnv, file: process.execPath, args: [paths.cliEntry, ...args] });
  };
  const git = (args: readonly string[], cwd: string): SyncResult =>
    runCommand({ env: clientEnv ?? daemonEnv, file: 'git', args, cwd });

  if (human) {
    writeLine(
      stdout,
      `onboarding selftest - ${process.platform}/${process.arch} node ${process.version}`,
    );
    writeLine(stdout, `  package=${paths.packageRoot}`);
    writeLine(stdout, `  sandbox=${sandbox.sandbox}\n`);
  }

  async function performChecks(): Promise<void> {
    record('INS-02', existsSync(paths.daemonEntry), paths.daemonEntry);
    record('INS-05', loadSqlite(), 'better-sqlite3 prebuilt loads');
    skip('INS-06', 'Windows compatibility patcher is release-tier until 091');

    daemon = await startDaemon({
      env: daemonEnv,
      sandbox,
      paths,
      startupTimeoutMs,
      mcpRequest,
      sleep,
    });
    record(
      'DAE-02',
      daemon !== null && daemon.port !== 38478,
      daemon === null ? 'daemon did not report a resolved MCP port' : `resolved :${daemon.port}`,
    );
    if (daemon === null) return;
    currentPort = daemon.port;
    clientEnv = makeClientEnv(daemonEnv, currentPort);

    record('DAE-03', existsSync(join(sandbox.dataDir, 'daemon.pid')), 'pid-lock present');
    record('DAE-06', hasEventsTable(sandbox.dbPath), 'events table present');

    const tools = await mcpRequest(daemon.url, 'tools/list', {});
    record(
      'MCP-02',
      REQUIRED_ECHO_TOOLS.every((t) => tools.includes(t)),
      'ECHO tools advertised',
    );

    const repo = join(sandbox.sandbox, 'repo');
    mkdirSync(repo, { recursive: true });
    git(['init', '-q'], repo);
    git(['config', 'user.email', 'ci@ci'], repo);
    git(['config', 'user.name', 'ci'], repo);

    const answerFile = join(sandbox.sandbox, 'answers.json');
    const answers = JSON.stringify({
      confirm_setup: true,
      profile: 'customer',
      selected_agents: ['claude-code', 'codex'],
      default_project_repo_root: repo,
      repo_root: paths.packageRoot,
    });
    writeFileSync(answerFile, `\ufeff${answers}`, 'utf8');
    const init = echoctl([
      'init',
      '--answer-file',
      answerFile,
      '--force',
      '--json',
      '--home',
      sandbox.echoHome,
      '--label',
      sandbox.daemonLabel,
      '--port',
      String(currentPort),
    ]);
    record('INIT-02', init.code === 0, `BOM answer file accepted (exit ${init.code})`);
    let completed = false;
    try {
      completed =
        (
          JSON.parse(safeRead(join(sandbox.echoHome, 'state', 'onboarding.json'))) as {
            completed?: unknown;
          }
        ).completed === true;
    } catch {
      completed = false;
    }
    record('INIT-04', completed, 'onboarding.json completed:true');
    if (IS_WIN) {
      record(
        'INIT-05',
        init.code === 0 && !/launchctl not found/i.test(init.out),
        'no launchctl failure on Windows',
      );
    } else {
      skip('INIT-05', 'Windows-only');
    }

    const claudeMd = join(sandbox.home, '.claude', 'CLAUDE.md');
    record(
      'WIR-01',
      existsSync(claudeMd) && /\/mcp/.test(safeRead(claudeMd)),
      'CLAUDE.md MCP marker',
    );
    record(
      'WIR-02',
      existsSync(join(sandbox.home, '.claude', 'commands', 'using-echo-mcp.md')),
      'Claude slash command',
    );
    const agentsMd = join(sandbox.codexHome, 'AGENTS.md');
    record(
      'WIR-04',
      existsSync(agentsMd) && /\/mcp/.test(safeRead(agentsMd)),
      'Codex AGENTS.md marker',
    );
    record(
      'WIR-05',
      /\[mcp_servers\.echo\]/.test(safeRead(join(sandbox.codexHome, 'config.toml'))),
      'Codex config.toml mcp block',
    );
    const skillMd = join(sandbox.codexHome, 'skills', 'using-echo-mcp', 'SKILL.md');
    record('WIR-06', existsSync(skillMd), 'Codex SKILL.md');
    record(
      'SKILL-02',
      existsSync(skillMd) && /^name:\s*'?using-echo-mcp/m.test(safeRead(skillMd)),
      'SKILL.md frontmatter',
    );

    echoctl(['project', 'add', repo, '--home', sandbox.echoHome]);
    const captureSourcesPath = join(sandbox.echoHome, 'state', 'capture-sources.json');
    record(
      'INIT-06',
      captureSourcesIncludesRepo(captureSourcesPath, repo),
      'repo in capture-sources.json',
    );

    const token = `echo-selftest-${process.pid}-${process.hrtime.bigint()}`;
    writeFileSync(join(repo, 'f.txt'), token);
    git(['add', '-A'], repo);
    git(['commit', '-q', '-m', token], repo);

    const priorPid = readPidLockPid(sandbox);
    const priorPort = daemon.port;
    await stopDaemon({ handle: daemon, sandbox });
    daemon = null;
    const release = await pollUntilPriorDaemonReleased({
      sandbox,
      priorPid,
      priorPort,
      sleep,
      timeoutMs: DAEMON_RESTART_TIMEOUT_MS,
      intervalMs: DAEMON_RESTART_POLL_INTERVAL_MS,
    });
    if (!release.ok) {
      record(
        'CAP-02',
        false,
        `daemon restart timed out after ${release.waitedMs}ms; prior daemon release unmet: ${release.detail}`,
      );
      return;
    }
    daemonEnv = makeDaemonEnv(sandbox);
    const restart = await startDaemonUntilReady({
      env: daemonEnv,
      sandbox,
      paths,
      startupTimeoutMs,
      mcpRequest,
      sleep,
      startDaemon,
      timeoutMs: DAEMON_RESTART_TIMEOUT_MS - release.waitedMs,
      intervalMs: DAEMON_RESTART_POLL_INTERVAL_MS,
    });
    daemon = restart.handle;
    if (!restart.ok || daemon === null) {
      record(
        'CAP-02',
        false,
        `daemon restart timed out after ${release.waitedMs + restart.waitedMs}ms; readiness unmet: ${restart.detail}`,
      );
      return;
    }
    currentPort = daemon.port;
    clientEnv = makeClientEnv(daemonEnv, currentPort);
    const recall = await pollUntilRecall({
      mcpRequest,
      url: daemon.url,
      token,
      sleep,
    });
    record(
      'CAP-02',
      recall.ok,
      recall.ok
        ? `commit captured + recalled after ${recall.waitedMs}ms`
        : `commit not recalled after ${recall.waitedMs}ms`,
    );
    const clusters = await toolCall(mcpRequest, daemon.url, 'find_clusters', {
      repo_path: repo,
      view: 'compact',
    });
    record(
      'REC-02',
      clusters.includes('cluster') || clusters.includes('atom_ids'),
      'find_clusters repo-scoped',
    );

    const doc = echoctl([
      'doctor',
      '--json',
      '--home',
      sandbox.echoHome,
      '--port',
      String(currentPort),
    ]);
    let mcpReachable = false;
    let doctorOverall = 'unparsed';
    let doctorStateOk = false;
    let doctorAgentProbeDegraded = false;
    try {
      const line = doc.out.split(/\r?\n/).find((l) => l.trim().startsWith('{')) ?? '{}';
      const parsed = JSON.parse(line) as {
        daemon?: { mcpReachable?: unknown };
        echoHome?: { schemaVersion?: unknown };
        syncLock?: { present?: unknown };
        agents?: Array<{ probeOutcome?: { probed?: unknown; reason?: unknown } | null }>;
        overall?: unknown;
      };
      mcpReachable = parsed.daemon?.mcpReachable === true;
      doctorOverall = typeof parsed.overall === 'string' ? parsed.overall : 'unparsed';
      doctorStateOk = parsed.echoHome?.schemaVersion === 1 && parsed.syncLock?.present !== true;
      doctorAgentProbeDegraded =
        parsed.agents?.some((agent) => {
          const outcome = agent.probeOutcome;
          return (
            outcome !== null &&
            outcome !== undefined &&
            outcome.probed === false &&
            outcome.reason !== 'manual-only'
          );
        }) ?? false;
    } catch {
      mcpReachable = false;
    }
    const doctorExitOk = doc.code === 0 && mcpReachable;
    const doctorMcpOnlyOk =
      mcpReachable && doctorOverall === 'degraded' && doctorStateOk && doctorAgentProbeDegraded;
    record(
      'DOC-02',
      doctorExitOk || doctorMcpOnlyOk,
      `doctor: mcp reachable (exit ${doc.code}, mcpReachable=${mcpReachable}, overall=${doctorOverall}${
        doctorAgentProbeDegraded ? ', agent-probe degraded' : ''
      })`,
    );
    if (IS_WIN) record('DOC-03', !/launchctl/i.test(doc.out), 'no launchctl false-fail on Windows');
    else skip('DOC-03', 'Windows-only');

    echoctl([
      'init',
      '--answer-file',
      answerFile,
      '--force',
      '--json',
      '--home',
      sandbox.echoHome,
      '--label',
      sandbox.daemonLabel,
      '--port',
      String(currentPort),
    ]);
    const echoBlocks = (safeRead(agentsMd).match(/BEGIN ECHO/g) ?? []).length;
    record('INIT-08', echoBlocks === 1, `re-init idempotent (${echoBlocks} ECHO block)`);
    record(
      'SELF-01',
      daemonEnv.ECHO_MCP_PORT === '0' &&
        clientEnv?.ECHO_MCP_PORT !== '38478' &&
        currentPort !== 38478,
      'production port 38478 not used',
    );
  }

  const work = performChecks().catch((err) => {
    if (!timedOut) throw err;
  });
  let timer: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SelfTestTimeout()), timeoutMs);
      }),
    ]);
  } catch (err) {
    if (err instanceof SelfTestTimeout) {
      timedOut = true;
      record('SELF-01', false, `timeout after ${timeoutMs}ms`);
      void work.catch(() => {});
    } else {
      writeLine(stderr, (err as Error).message);
      record('SELF-01', false, (err as Error).message);
    }
  } finally {
    if (timer !== null) clearTimeout(timer);
    for (const id of SELFTEST_CHECK_IDS) {
      if (!seen.has(id)) skip(id, 'not reached');
    }
    await stopDaemon({ handle: daemon, sandbox });
    if (opts.keepSandbox !== true) {
      rmSync(sandbox.sandbox, { recursive: true, force: true });
    }
  }

  const real = checks.filter((c) => !c.skipped);
  const failed = real.filter((c) => !c.ok);
  const skipped = checks.filter((c) => c.skipped).length;
  const report: SelfTestReport = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    port: currentPort,
    sandbox: sandbox.sandbox,
    checks,
    passed: real.length - failed.length,
    failed: failed.length,
    skipped,
    failedIds: failed.map((c) => c.id),
  };
  if (opts.json) {
    writeLine(stdout, JSON.stringify(report));
  } else if (!opts.quiet) {
    writeLine(stdout, `\n  ${report.passed}/${real.length} passed, ${skipped} skipped`);
    if (failed.length > 0) writeLine(stdout, `  FAILED: ${report.failedIds.join(', ')}`);
  }
  return failed.length > 0 ? 1 : 0;
}
