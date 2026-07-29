import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveDataDir, resolveDbPath } from '../../daemon/lifecycle.js';
import { ECHO_HOME_PATHS } from '../../echo-home/paths.js';
import { readPackageVersion, resolveMcpPortSync } from './init.js';

type Writable = Pick<NodeJS.WritableStream, 'write'>;
type SpawnSyncFn = typeof spawnSync;
type SpawnFn = typeof spawn;

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
  error?: NodeJS.ErrnoException;
}

export interface DaemonDeps {
  spawnSync?: SpawnSyncFn;
  spawn?: SpawnFn;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  healthProbe?: (port: number) => Promise<boolean>;
  getuid?: () => number;
  now?: () => Date;
  platform?: NodeJS.Platform;
  processExecPath?: string;
  daemonPath?: string;
  probeDeadlineMs?: number;
  cwd?: string;
}

export interface DaemonOpts extends DaemonDeps {
  argv?: readonly string[];
  json?: boolean;
  quiet?: boolean;
  stdout?: Writable;
  stderr?: Writable;
}

export interface DaemonConfig {
  label: string;
  plistPath: string;
  logDir: string;
  home: string;
  port: number;
  dataDir: string;
  dbPath: string;
  repoRoot?: string;
  nodePath: string;
  daemonPath: string;
}

export interface DaemonControlOptions extends DaemonDeps {
  label?: string;
  plistPath?: string;
  logDir?: string;
  home?: string;
  port?: string;
  dataDir?: string;
  dbPath?: string;
  repoRoot?: string;
}

export interface DaemonServiceStatus {
  installed: boolean;
  running: boolean;
  healthy: boolean;
  launchdRegistered: boolean;
  label: string;
  plistPath: string;
  port: number;
}

export type DaemonBringupAction = 'installed-and-started' | 'started' | 'already-running';

export interface DaemonBringupResult {
  action: DaemonBringupAction;
  label: string;
  plistPath: string;
  port: number;
}

export type DaemonControlVerb = 'status' | 'install' | 'start';

export class DaemonCommandError extends Error {
  constructor(
    public readonly verb: DaemonControlVerb,
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'DaemonCommandError';
  }
}

const DEFAULT_LABEL = 'com.echo.daemon';
const DEFAULT_LOG_DIR = join(homedir(), 'Library', 'Logs', 'echo');
const FIXED_LAUNCHD_PATH = '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin';

const HELP = `Usage: echoctl daemon <verb> [options]

Verbs:
  install      Write and bootstrap the launchd plist
  start        Bootstrap a stopped launchd job
  stop         Bootout the launchd job
  restart      Bootout then bootstrap the launchd job
  status       Print launchd and daemon health
  logs         Tail daemon stdout/stderr logs
  uninstall    Bootout and remove the launchd plist

Options:
  --label <id>          launchd label (default: com.echo.daemon)
  --plist-path <path>   plist path (default: ~/Library/LaunchAgents/<label>.plist)
  --home <path>         ECHO_HOME persisted into launchd
  --port <n>            ECHO_MCP_PORT persisted into launchd
  --data-dir <path>     ECHO_DATA_DIR persisted into launchd
  --db-path <path>      ECHO_DB_PATH persisted into launchd
  --repo-root <path>    ECHO_REPO_ROOT persisted into launchd when tools/review-queue/ exists
  --log-dir <path>      log directory
`;

const VERB_HELP: Record<string, string> = {
  install: `Usage: echoctl daemon install [--label <id>] [--plist-path <path>] [--home <path>] [--port <n>] [--data-dir <path>] [--db-path <path>] [--repo-root <path>] [--log-dir <path>]`,
  start: `Usage: echoctl daemon start [--label <id>] [--plist-path <path>] [--home <path>] [--port <n>] [--data-dir <path>] [--db-path <path>] [--log-dir <path>]`,
  stop: `Usage: echoctl daemon stop [--label <id>] [--plist-path <path>]`,
  restart: `Usage: echoctl daemon restart [--label <id>] [--plist-path <path>] [--home <path>] [--port <n>] [--data-dir <path>] [--db-path <path>] [--log-dir <path>]`,
  status: `Usage: echoctl daemon status [--label <id>] [--plist-path <path>] [--home <path>] [--port <n>] [--data-dir <path>] [--db-path <path>]`,
  logs: `Usage: echoctl daemon logs [--tail <n>] [--follow] [--log-dir <path>] [--label <id>] [--plist-path <path>]`,
  uninstall: `Usage: echoctl daemon uninstall [--label <id>] [--plist-path <path>]`,
};

function writeLine(stream: Writable, line: string): void {
  stream.write(line.endsWith('\n') ? line : `${line}\n`);
}

function runtimePlatform(deps: DaemonDeps): NodeJS.Platform {
  return deps.platform ?? process.platform;
}

function isLaunchdPlatform(deps: DaemonDeps): boolean {
  return runtimePlatform(deps) === 'darwin';
}

function pathJoinFor(deps: DaemonDeps, ...parts: string[]): string {
  return runtimePlatform(deps) === 'win32' ? win32.join(...parts) : join(...parts);
}

function pathResolveFor(deps: DaemonDeps, path: string): string {
  return runtimePlatform(deps) === 'win32' ? win32.resolve(path) : resolve(path);
}

function expandHome(path: string, deps: DaemonDeps): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return pathJoinFor(deps, homedir(), path.slice(2));
  return path;
}

function abs(path: string, deps: DaemonDeps): string {
  return pathResolveFor(deps, expandHome(path, deps));
}

function installCwd(deps: DaemonDeps): string {
  return deps.cwd ?? process.cwd();
}

function absFromInstallCwd(path: string, deps: DaemonDeps): string {
  const expanded = expandHome(path, deps);
  return runtimePlatform(deps) === 'win32'
    ? win32.resolve(installCwd(deps), expanded)
    : resolve(installCwd(deps), expanded);
}

function defaultPlistPath(label: string): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
}

function defaultDaemonPath(): string {
  return fileURLToPath(new URL('../../daemon/index.js', import.meta.url));
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.length === 0) return resolveMcpPortSync();
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    throw new Error(`invalid --port: ${value}`);
  }
  return n;
}

function parseTail(value: string | undefined): number {
  if (value === undefined || value.length === 0) return 50;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`invalid --tail: ${value}`);
  return n;
}

interface ResolveConfigOptions {
  resolveRepoRoot?: boolean;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function hasReviewerHarness(repoRoot: string, deps: DaemonDeps): boolean {
  return isDirectory(pathJoinFor(deps, repoRoot, 'tools', 'review-queue'));
}

function validateExplicitRepoRoot(value: string, deps: DaemonDeps): string {
  if (value.length === 0) throw new Error('invalid --repo-root: value must not be empty');
  const repoRoot = absFromInstallCwd(value, deps);
  if (!isDirectory(repoRoot)) {
    throw new Error(`invalid --repo-root: expected existing directory: ${repoRoot}`);
  }
  if (!hasReviewerHarness(repoRoot, deps)) {
    throw new Error(
      `invalid --repo-root: missing reviewer harness marker tools/review-queue/ under ${repoRoot}`,
    );
  }
  return repoRoot;
}

function deriveGitRepoRoot(deps: DaemonDeps): string | undefined {
  const result = run(deps, 'git', ['rev-parse', '--show-toplevel'], { cwd: installCwd(deps) });
  if (commandMissing(result) || result.status !== 0) return undefined;
  const raw = result.stdout.trim();
  if (raw.length === 0) return undefined;
  const repoRoot = absFromInstallCwd(raw, deps);
  return hasReviewerHarness(repoRoot, deps) ? repoRoot : undefined;
}

function resolveRepoRoot(
  values: Record<string, unknown>,
  deps: DaemonDeps,
): string | undefined {
  const explicit = values['repo-root'];
  if (explicit !== undefined) return validateExplicitRepoRoot(String(explicit), deps);
  return deriveGitRepoRoot(deps);
}

function resolveConfig(
  values: Record<string, unknown>,
  deps: DaemonDeps,
  options: ResolveConfigOptions = {},
): DaemonConfig {
  const label = String(values['label'] ?? DEFAULT_LABEL);
  const dataDir = abs(
    String(values['data-dir'] ?? resolveDataDir({ platform: deps.platform })),
    deps,
  );
  const dbPath =
    values['db-path'] !== undefined
      ? abs(String(values['db-path']), deps)
      : values['data-dir'] !== undefined
        ? pathJoinFor(deps, dataDir, 'echo.db')
        : abs(resolveDbPath({ platform: deps.platform }), deps);
  const repoRoot = options.resolveRepoRoot === true ? resolveRepoRoot(values, deps) : undefined;
  return {
    label,
    plistPath: abs(String(values['plist-path'] ?? defaultPlistPath(label)), deps),
    logDir: abs(String(values['log-dir'] ?? DEFAULT_LOG_DIR), deps),
    home: abs(String(values['home'] ?? ECHO_HOME_PATHS.root), deps),
    port: parsePort(values['port'] as string | undefined),
    dataDir,
    dbPath,
    ...(repoRoot !== undefined ? { repoRoot } : {}),
    nodePath: deps.processExecPath ?? process.execPath,
    daemonPath: deps.daemonPath ?? defaultDaemonPath(),
  };
}

function run(
  deps: DaemonDeps,
  command: string,
  args: readonly string[],
  options: { cwd?: string } = {},
): CommandResult {
  const result = (deps.spawnSync ?? spawnSync)(command, [...args], {
    encoding: 'utf8',
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
  });
  return {
    status: typeof result.status === 'number' ? result.status : result.error ? 127 : 0,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
    error: result.error as NodeJS.ErrnoException | undefined,
  };
}

function commandMissing(result: CommandResult): boolean {
  return result.error?.code === 'ENOENT';
}

function uid(deps: DaemonDeps): number {
  return deps.getuid?.() ?? process.getuid?.() ?? 501;
}

function userTarget(deps: DaemonDeps): string {
  return `gui/${uid(deps)}`;
}

function jobTarget(config: Pick<DaemonConfig, 'label'>, deps: DaemonDeps): string {
  return `${userTarget(deps)}/${config.label}`;
}

function launchctl(deps: DaemonDeps, args: readonly string[]): CommandResult {
  return run(deps, 'launchctl', args);
}

function launchdLoaded(config: Pick<DaemonConfig, 'label'>, deps: DaemonDeps): CommandResult {
  return launchctl(deps, ['print', jobTarget(config, deps)]);
}

function parseNonNegativeInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePsElapsedTimeSeconds(raw: string): number | null {
  const value = raw.trim();
  if (value.length === 0) return null;

  const dayParts = value.split('-');
  if (dayParts.length > 2) return null;

  let days = 0;
  let time = value;
  const hasDays = dayParts.length === 2;
  if (hasDays) {
    const parsedDays = parseNonNegativeInt(dayParts[0]!);
    if (parsedDays === null) return null;
    days = parsedDays;
    time = dayParts[1]!;
  }

  const pieces = time.split(':');
  if (hasDays ? pieces.length !== 3 : pieces.length < 2 || pieces.length > 3) return null;

  const [hoursRaw, minutesRaw, secondsRaw] =
    pieces.length === 3 ? pieces : ['0', pieces[0]!, pieces[1]!];
  const hours = parseNonNegativeInt(hoursRaw);
  const minutes = parseNonNegativeInt(minutesRaw);
  const seconds = parseNonNegativeInt(secondsRaw);
  if (hours === null || minutes === null || seconds === null) return null;
  if (minutes >= 60 || seconds >= 60) return null;
  if (hasDays && hours >= 24) return null;

  return days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
}

export async function getDaemonUptimeSeconds(
  pid: number,
  deps: DaemonDeps = {},
): Promise<number | null> {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const result = run(deps, 'ps', ['-o', 'etime=', '-p', String(pid)]);
  if (result.status !== 0 || commandMissing(result)) return null;
  const line = result.stdout
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  return line === undefined ? null : parsePsElapsedTimeSeconds(line);
}

export function formatUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const remainingSeconds = total % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function packageRootFromDaemonPath(daemonPath: string): string {
  return dirname(dirname(dirname(daemonPath)));
}

function ensureWritableDir(path: string): void {
  mkdirSync(path, { recursive: true });
  accessSync(path, constants.W_OK);
}

function assertReadableFile(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${label} missing: ${path}`);
  }
  accessSync(path, constants.R_OK);
}

function runPreflight(config: DaemonConfig): void {
  assertReadableFile(config.daemonPath, 'daemon binary');
  const packageRoot = packageRootFromDaemonPath(config.daemonPath);
  const migrationsDir = join(packageRoot, 'dist', 'storage', 'migrations');
  const migrations = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
    : [];
  if (migrations.length === 0) {
    throw new Error(`SQL migrations missing: ${migrationsDir}`);
  }
  assertReadableFile(
    join(packageRoot, 'tools', 'review-queue', 'coord-roles.json'),
    'coord roles config',
  );
  assertReadableFile(
    join(packageRoot, 'tools', 'review-queue', 'reviewers.json'),
    'reviewers config',
  );
  const schemasDir = join(packageRoot, 'tools', 'review-queue', 'schemas');
  if (!existsSync(schemasDir) || !statSync(schemasDir).isDirectory()) {
    throw new Error(`coord schema directory missing: ${schemasDir}`);
  }
  ensureWritableDir(config.logDir);
  ensureWritableDir(config.dataDir);
  ensureWritableDir(dirname(config.dbPath));
}

function verifyNodeVersion(config: DaemonConfig, deps: DaemonDeps): void {
  const result = run(deps, config.nodePath, ['--version']);
  if (commandMissing(result)) throw new Error(`node binary not found: ${config.nodePath}`);
  if (result.status !== 0) {
    throw new Error(`node version check failed for ${config.nodePath}: ${result.stderr.trim()}`);
  }
  const raw = result.stdout.trim().replace(/^v/, '');
  const major = Number.parseInt(raw.split('.')[0] ?? '', 10);
  if (!Number.isInteger(major) || major < 22) {
    throw new Error(`node >=22 required; ${config.nodePath} reported ${result.stdout.trim()}`);
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderRepoRootEnv(config: DaemonConfig): string {
  if (config.repoRoot === undefined) return '';
  return `    <key>ECHO_REPO_ROOT</key>
    <string>${xmlEscape(config.repoRoot)}</string>
`;
}

export function renderLaunchdPlist(config: DaemonConfig): string {
  const outPath = join(config.logDir, 'echo-daemon.out.log');
  const errPath = join(config.logDir, 'echo-daemon.err.log');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(config.label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(config.nodePath)}</string>
    <string>${xmlEscape(config.daemonPath)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${xmlEscape(outPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(errPath)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xmlEscape(FIXED_LAUNCHD_PATH)}</string>
    <key>ECHO_HOME</key>
    <string>${xmlEscape(config.home)}</string>
    <key>ECHO_MCP_PORT</key>
    <string>${xmlEscape(String(config.port))}</string>
    <key>ECHO_DATA_DIR</key>
    <string>${xmlEscape(config.dataDir)}</string>
    <key>ECHO_DB_PATH</key>
    <string>${xmlEscape(config.dbPath)}</string>
${renderRepoRootEnv(config)}  </dict>
</dict>
</plist>
`;
}

function xmlUnescape(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function stringsIn(block: string): string[] {
  return [...block.matchAll(/<string>([\s\S]*?)<\/string>/g)].map((m) => xmlUnescape(m[1]!));
}

function stringAfterKey(xml: string, key: string): string | null {
  const match = new RegExp(`<key>${key}</key>\\s*<string>([\\s\\S]*?)</string>`).exec(xml);
  return match === null ? null : xmlUnescape(match[1]!);
}

function readPlistConfig(base: DaemonConfig): DaemonConfig {
  const xml = readFileSync(base.plistPath, 'utf8');
  const program = /<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(xml);
  const args = program === null ? [] : stringsIn(program[1]!);
  const env = /<key>EnvironmentVariables<\/key>\s*<dict>([\s\S]*?)<\/dict>/.exec(xml);
  const envBlock = env?.[1] ?? '';
  const outPath = stringAfterKey(xml, 'StandardOutPath');
  const logDir = outPath !== null ? dirname(outPath) : base.logDir;
  const dataDir = stringAfterKey(envBlock, 'ECHO_DATA_DIR') ?? base.dataDir;
  const dbPath = stringAfterKey(envBlock, 'ECHO_DB_PATH') ?? base.dbPath;
  const repoRoot = stringAfterKey(envBlock, 'ECHO_REPO_ROOT') ?? base.repoRoot;
  return {
    ...base,
    nodePath: args[0] ?? base.nodePath,
    daemonPath: args[1] ?? base.daemonPath,
    logDir,
    home: stringAfterKey(envBlock, 'ECHO_HOME') ?? base.home,
    port: parsePort(stringAfterKey(envBlock, 'ECHO_MCP_PORT') ?? String(base.port)),
    dataDir,
    dbPath,
    ...(repoRoot !== undefined ? { repoRoot } : {}),
  };
}

function writeAndLintPlist(config: DaemonConfig, deps: DaemonDeps): void {
  mkdirSync(dirname(config.plistPath), { recursive: true });
  const tmpPath = `${config.plistPath}.tmp-${process.pid}-${randomUUID()}`;
  writeFileSync(tmpPath, renderLaunchdPlist(config));
  const lint = run(deps, 'plutil', ['-lint', tmpPath]);
  if (commandMissing(lint)) {
    rmSync(tmpPath, { force: true });
    throw new Error('plutil not found; launchd install requires macOS');
  }
  if (lint.status !== 0) {
    rmSync(tmpPath, { force: true });
    throw new Error(`plist lint failed for ${config.label}: ${lint.stderr.trim()}`);
  }
  renameSync(tmpPath, config.plistPath);
}

async function probeOnce(port: number, deps: DaemonDeps): Promise<boolean> {
  if (deps.healthProbe !== undefined) return deps.healthProbe(port);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await (deps.fetch ?? fetch)(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'echoctl-daemon', version: readPackageVersion() },
        },
        id: 1,
      }),
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealthy(config: DaemonConfig, deps: DaemonDeps): Promise<boolean> {
  const deadlineMs = deps.probeDeadlineMs ?? 10_000;
  const start = Date.now();
  let delay = 200;
  while (Date.now() - start <= deadlineMs) {
    if (await probeOnce(config.port, deps)) return true;
    if (deadlineMs === 0) break;
    await (deps.sleep ?? ((ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))))(
      delay,
    );
    delay = Math.min(delay * 2, 1000);
  }
  return false;
}

function bootout(config: Pick<DaemonConfig, 'label'>, deps: DaemonDeps): CommandResult {
  return launchctl(deps, ['bootout', jobTarget(config, deps)]);
}

function bootstrap(config: DaemonConfig, deps: DaemonDeps): CommandResult {
  return launchctl(deps, ['bootstrap', userTarget(deps), config.plistPath]);
}

function kickstart(config: Pick<DaemonConfig, 'label'>, deps: DaemonDeps): CommandResult {
  return launchctl(deps, ['kickstart', '-k', jobTarget(config, deps)]);
}

function isLaunchdNotFound(result: CommandResult): boolean {
  return /not found|No such process|Could not find/i.test(`${result.stdout}\n${result.stderr}`);
}

function controlValues(opts: DaemonControlOptions): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  if (opts.label !== undefined) values['label'] = opts.label;
  if (opts.plistPath !== undefined) values['plist-path'] = opts.plistPath;
  if (opts.logDir !== undefined) values['log-dir'] = opts.logDir;
  if (opts.home !== undefined) values['home'] = opts.home;
  if (opts.port !== undefined) values['port'] = opts.port;
  if (opts.dataDir !== undefined) values['data-dir'] = opts.dataDir;
  if (opts.dbPath !== undefined) values['db-path'] = opts.dbPath;
  if (opts.repoRoot !== undefined) values['repo-root'] = opts.repoRoot;
  return values;
}

export function resolveDaemonControlConfig(opts: DaemonControlOptions = {}): DaemonConfig {
  return resolveConfig(controlValues(opts), opts);
}

function captureStream(out: string[]): Writable {
  return { write: (chunk) => (out.push(String(chunk)), true) };
}

function capturedOutput(stdout: readonly string[], stderr: readonly string[]): string {
  return `${stdout.join('')}${stderr.join('')}`.trim();
}

async function manualDaemonStatus(
  config: DaemonConfig,
  deps: DaemonOpts,
  stdout: Writable,
): Promise<number> {
  const healthy = await probeOnce(config.port, deps);
  if (deps.json === true) {
    writeLine(
      stdout,
      JSON.stringify({
        daemon: 'manual',
        mode: 'manual-daemon',
        launchd: false,
        port: config.port,
        data_dir: config.dataDir,
        db_path: config.dbPath,
        health: healthy ? 'healthy' : 'unreachable',
      }),
    );
  } else {
    writeLine(
      stdout,
      `ECHO daemon: manual daemon (no launchd)
  port:        ${config.port}
  data-dir:    ${config.dataDir}
  db-path:     ${config.dbPath}
  health:      ${healthy ? 'healthy' : 'unreachable'}`,
    );
  }
  return 0;
}

function manualDaemonNoop(verb: string, deps: DaemonDeps, stdout: Writable): number {
  writeLine(stdout, `Manual daemon mode (no launchd) on ${runtimePlatform(deps)}; ${verb} is a no-op.`);
  return 0;
}

async function runDaemonControlVerb(
  verb: Exclude<DaemonControlVerb, 'status'>,
  config: DaemonConfig,
  deps: DaemonDeps,
): Promise<void> {
  if (!isLaunchdPlatform(deps)) return;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const out = captureStream(stdout);
  const err = captureStream(stderr);
  const code =
    verb === 'install'
      ? await install(config, deps, out, err)
      : await start(config, deps, out, err);
  if (code !== 0) {
    const detail = capturedOutput(stdout, stderr) || `echoctl daemon ${verb} exited ${code}`;
    throw new DaemonCommandError(verb, code, detail);
  }
}

export async function getDaemonStatus(
  opts: DaemonControlOptions = {},
): Promise<DaemonServiceStatus> {
  const config = resolveDaemonControlConfig(opts);
  if (!isLaunchdPlatform(opts)) {
    const healthy = await probeOnce(config.port, opts);
    return {
      installed: true,
      running: healthy,
      healthy,
      launchdRegistered: false,
      label: config.label,
      plistPath: config.plistPath,
      port: config.port,
    };
  }
  const loaded = launchdLoaded(config, opts);
  if (commandMissing(loaded)) {
    throw new DaemonCommandError(
      'status',
      2,
      'launchctl not found; daemon lifecycle requires macOS launchd',
    );
  }
  const launchdRegistered = loaded.status === 0;
  const healthy = launchdRegistered ? await probeOnce(config.port, opts) : false;
  return {
    installed: launchdRegistered || existsSync(config.plistPath),
    running: launchdRegistered && healthy,
    healthy,
    launchdRegistered,
    label: config.label,
    plistPath: config.plistPath,
    port: config.port,
  };
}

export async function installDaemon(opts: DaemonControlOptions = {}): Promise<DaemonConfig> {
  const config = resolveConfig(controlValues(opts), opts, {
    resolveRepoRoot: isLaunchdPlatform(opts),
  });
  await runDaemonControlVerb('install', config, opts);
  return config;
}

export async function startDaemon(opts: DaemonControlOptions = {}): Promise<DaemonConfig> {
  const config = resolveDaemonControlConfig(opts);
  await runDaemonControlVerb('start', config, opts);
  return config;
}

export async function ensureDaemonRunning(
  opts: DaemonControlOptions = {},
): Promise<DaemonBringupResult> {
  const status = await getDaemonStatus(opts);
  if (!status.installed) {
    const config = await installDaemon(opts);
    return {
      action: 'installed-and-started',
      label: config.label,
      plistPath: config.plistPath,
      port: config.port,
    };
  }
  if (!status.running) {
    const config = await startDaemon(opts);
    return {
      action: 'started',
      label: config.label,
      plistPath: config.plistPath,
      port: config.port,
    };
  }
  return {
    action: 'already-running',
    label: status.label,
    plistPath: status.plistPath,
    port: status.port,
  };
}

async function bootstrapAndProbe(config: DaemonConfig, deps: DaemonDeps, stderr: Writable): Promise<number> {
  const boot = bootstrap(config, deps);
  if (commandMissing(boot)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (boot.status !== 0) {
    writeLine(stderr, `launchctl bootstrap failed: ${boot.stderr.trim()}`);
    return 1;
  }
  const kicked = kickstart(config, deps);
  if (commandMissing(kicked)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (kicked.status !== 0) {
    writeLine(stderr, `launchctl kickstart failed: ${kicked.stderr.trim()}`);
    return 1;
  }
  if (await waitForHealthy(config, deps)) return 0;
  bootout(config, deps);
  writeLine(
    stderr,
    `daemon ${config.label} did not become healthy on port ${config.port}; run \`echoctl daemon logs --tail 50 --label ${config.label}\` and reinstall or rollback`,
  );
  return 1;
}

async function install(config: DaemonConfig, deps: DaemonDeps, stdout: Writable, stderr: Writable): Promise<number> {
  try {
    verifyNodeVersion(config, deps);
    runPreflight(config);
    writeAndLintPlist(config, deps);
  } catch (err) {
    writeLine(stderr, `${(err as Error).message}. Recovery: re-run \`npm install -g <tarball>\`; the package appears incomplete.`);
    return 2;
  }

  const loaded = launchdLoaded(config, deps);
  if (commandMissing(loaded)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (loaded.status === 0) {
    const stopped = bootout(config, deps);
    if (stopped.status !== 0) {
      writeLine(stderr, `launchctl bootout failed: ${stopped.stderr.trim()}`);
      return 1;
    }
  }
  const code = await bootstrapAndProbe(config, deps, stderr);
  if (code !== 0) return code;
  writeLine(
    stdout,
    `Installed ${config.label} on port ${config.port}\nplist: ${config.plistPath}\nbinary: ${config.daemonPath}\nhome: ${config.home}\ndata-dir: ${config.dataDir}\ndb-path: ${config.dbPath}`,
  );
  return 0;
}

async function start(base: DaemonConfig, deps: DaemonDeps, stdout: Writable, stderr: Writable): Promise<number> {
  const loaded = launchdLoaded(base, deps);
  if (commandMissing(loaded)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (loaded.status === 0) {
    const healthy = await probeOnce(base.port, deps);
    if (healthy) {
      writeLine(stdout, `${base.label} already running`);
      return 0;
    }
    writeLine(
      stderr,
      `daemon is loaded but unhealthy; run \`echoctl daemon restart --label ${base.label}\` or \`echoctl daemon uninstall --label ${base.label} && echoctl daemon install --label ${base.label}\`; see \`echoctl daemon logs --tail 50 --label ${base.label}\``,
    );
    return 1;
  }
  if (!existsSync(base.plistPath)) {
    writeLine(stderr, `plist missing: ${base.plistPath}`);
    return 2;
  }
  let config: DaemonConfig;
  try {
    config = readPlistConfig(base);
    runPreflight(config);
  } catch (err) {
    writeLine(stderr, `${(err as Error).message}. Recovery: re-run \`npm install -g <tarball>\`; the package appears incomplete.`);
    return 2;
  }
  const code = await bootstrapAndProbe(config, deps, stderr);
  if (code === 0) writeLine(stdout, `${config.label} started`);
  return code;
}

async function restart(base: DaemonConfig, deps: DaemonDeps, stdout: Writable, stderr: Writable): Promise<number> {
  if (!existsSync(base.plistPath)) {
    writeLine(stderr, `plist missing: ${base.plistPath}`);
    return 2;
  }
  let config: DaemonConfig;
  try {
    config = readPlistConfig(base);
    runPreflight(config);
  } catch (err) {
    writeLine(stderr, `${(err as Error).message}. Recovery: re-run \`npm install -g <tarball>\`; the package appears incomplete.`);
    return 2;
  }
  const stopped = bootout(config, deps);
  if (commandMissing(stopped)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (stopped.status !== 0 && !isLaunchdNotFound(stopped)) {
    writeLine(stderr, `launchctl bootout failed: ${stopped.stderr.trim()}`);
    return 1;
  }
  const code = await bootstrapAndProbe(config, deps, stderr);
  if (code === 0) writeLine(stdout, `${config.label} restarted`);
  return code;
}

function stop(config: DaemonConfig, deps: DaemonDeps, stdout: Writable, stderr: Writable): number {
  const stopped = bootout(config, deps);
  if (commandMissing(stopped)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (stopped.status !== 0 && !isLaunchdNotFound(stopped)) {
    writeLine(stderr, `launchctl bootout failed: ${stopped.stderr.trim()}`);
    return 1;
  }
  writeLine(stdout, `${config.label} stopped`);
  return 0;
}

async function status(config: DaemonConfig, deps: DaemonOpts, stdout: Writable, stderr: Writable): Promise<number> {
  const loaded = launchdLoaded(config, deps);
  if (commandMissing(loaded)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (loaded.status !== 0) {
    if (deps.json === true) {
      writeLine(
        stdout,
        JSON.stringify({
          daemon: 'not running',
          plist: config.plistPath,
          uptime: 'unknown',
          uptime_seconds: null,
        }),
      );
    } else {
      writeLine(stdout, `ECHO daemon: not running\n  plist:       ${config.plistPath}`);
    }
    return 2;
  }
  const runtime = existsSync(config.plistPath) ? readPlistConfig(config) : config;
  const healthy = await probeOnce(runtime.port, deps);
  const pidMatch = /pid\s*=\s*(\d+)/i.exec(loaded.stdout);
  const pid = pidMatch === null ? null : Number.parseInt(pidMatch[1]!, 10);
  const uptimeSeconds = pid === null ? null : await getDaemonUptimeSeconds(pid, deps);
  const uptime = uptimeSeconds === null ? 'unknown' : formatUptime(uptimeSeconds);

  if (deps.json === true) {
    writeLine(
      stdout,
      JSON.stringify({
        daemon: 'running',
        plist: runtime.plistPath,
        binary: runtime.daemonPath,
        pid,
        port: runtime.port,
        home: runtime.home,
        data_dir: runtime.dataDir,
        db_path: runtime.dbPath,
        uptime,
        uptime_seconds: uptimeSeconds,
        health: healthy ? 'healthy' : 'broken',
      }),
    );
    return healthy ? 0 : 2;
  }

  writeLine(
    stdout,
    `ECHO daemon: running
  plist:       ${runtime.plistPath}
  binary:      ${runtime.daemonPath}
  pid:         ${pid === null ? 'unknown' : pid}
  port:        ${runtime.port}
  home:        ${runtime.home}
  data-dir:    ${runtime.dataDir}
  db-path:     ${runtime.dbPath}
  uptime:      ${uptime}
  health:      ${healthy ? 'healthy' : 'broken'}`,
  );
  return healthy ? 0 : 2;
}

function logs(config: DaemonConfig, deps: DaemonDeps, stdout: Writable, stderr: Writable, tail: number, follow: boolean): Promise<number> | number {
  const outPath = join(config.logDir, 'echo-daemon.out.log');
  const errPath = join(config.logDir, 'echo-daemon.err.log');
  const args = follow ? ['-f', outPath, errPath] : ['-n', String(tail), outPath, errPath];
  if (!follow) {
    const result = run(deps, 'tail', args);
    if (result.stdout.length > 0) stdout.write(result.stdout);
    if (result.stderr.length > 0) stderr.write(result.stderr);
    return result.status;
  }
  return new Promise((resolveLogs) => {
    const child = (deps.spawn ?? spawn)('tail', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.on('data', (chunk) => stdout.write(chunk));
    child.stderr?.on('data', (chunk) => stderr.write(chunk));
    child.on('close', (code) => resolveLogs(code ?? 0));
    child.on('error', (err) => {
      writeLine(stderr, err.message);
      resolveLogs(1);
    });
  });
}

function uninstall(config: DaemonConfig, deps: DaemonDeps, stdout: Writable, stderr: Writable): number {
  const stopped = bootout(config, deps);
  if (commandMissing(stopped)) {
    writeLine(stderr, 'launchctl not found; daemon lifecycle requires macOS launchd');
    return 2;
  }
  if (stopped.status !== 0 && !isLaunchdNotFound(stopped)) {
    writeLine(stderr, `launchctl bootout failed: ${stopped.stderr.trim()}`);
    return 1;
  }
  rmSync(config.plistPath, { force: true });
  writeLine(stdout, `Uninstalled: ${config.plistPath}`);
  return 0;
}

export async function runDaemon(opts: DaemonOpts = {}): Promise<number> {
  const stdout = opts.stdout ?? process.stdout;
  const stderr = opts.stderr ?? process.stderr;
  const parsed = parseArgs({
    args: [...(opts.argv ?? [])],
    strict: true,
    allowPositionals: true,
    options: {
      label: { type: 'string' },
      'plist-path': { type: 'string' },
      home: { type: 'string' },
      port: { type: 'string' },
      'data-dir': { type: 'string' },
      'db-path': { type: 'string' },
      'repo-root': { type: 'string' },
      'log-dir': { type: 'string' },
      tail: { type: 'string' },
      follow: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const verb = parsed.positionals[0];
  if (verb === undefined || parsed.values.help === true) {
    writeLine(stdout, verb !== undefined ? (VERB_HELP[verb] ?? HELP) : HELP);
    return verb === undefined || VERB_HELP[verb] !== undefined ? 0 : 2;
  }
  if (parsed.positionals.length > 1) {
    writeLine(stderr, VERB_HELP[verb] ?? HELP);
    return 2;
  }
  if (!(verb in VERB_HELP)) {
    writeLine(stderr, `unknown daemon verb: ${verb}\n${HELP}`);
    return 2;
  }

  let config: DaemonConfig;
  let tail: number;
  try {
    config = resolveConfig(parsed.values, opts, {
      resolveRepoRoot: verb === 'install' && isLaunchdPlatform(opts),
    });
    tail = parseTail(parsed.values.tail);
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 2;
  }

  const explicitLogDir = parsed.values['log-dir'] !== undefined;

  if (opts.quiet && verb !== 'logs') {
    const sink: Writable = { write: () => true };
    return runVerb(
      verb,
      config,
      opts,
      sink,
      stderr,
      tail,
      parsed.values.follow === true,
      explicitLogDir,
    );
  }
  return runVerb(
    verb,
    config,
    opts,
    stdout,
    stderr,
    tail,
    parsed.values.follow === true,
    explicitLogDir,
  );
}

async function runVerb(
  verb: string,
  config: DaemonConfig,
  deps: DaemonOpts,
  stdout: Writable,
  stderr: Writable,
  tail: number,
  follow: boolean,
  explicitLogDir: boolean,
): Promise<number> {
  if (!isLaunchdPlatform(deps) && verb !== 'logs') {
    if (verb === 'status') return manualDaemonStatus(config, deps, stdout);
    return manualDaemonNoop(verb, deps, stdout);
  }

  switch (verb) {
    case 'install':
      return install(config, deps, stdout, stderr);
    case 'start':
      return start(config, deps, stdout, stderr);
    case 'stop':
      return stop(config, deps, stdout, stderr);
    case 'restart':
      return restart(config, deps, stdout, stderr);
    case 'status':
      return status(config, deps, stdout, stderr);
    case 'logs':
      return await logs(
        !explicitLogDir && existsSync(config.plistPath) ? readPlistConfig(config) : config,
        deps,
        stdout,
        stderr,
        tail,
        follow,
      );
    case 'uninstall':
      return uninstall(config, deps, stdout, stderr);
    default:
      writeLine(stderr, `unknown daemon verb: ${verb}`);
      return 2;
  }
}
