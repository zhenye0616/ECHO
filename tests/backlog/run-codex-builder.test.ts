// 047 AC4 — tools/backlog/run-codex-builder.sh wrapper-contract tests.
//
// Asserts the WRAPPER contract — the env, argv, stdin, and lock-visibility
// codex receives — NOT codex's runtime behavior. A mock at
// tests/backlog/fixtures/mock-codex.sh stands in for `codex exec`,
// records its invocation to side-channel files, and exits 0 (or sleeps
// for the atomic-lock race test). The wrapper's `exec -a codex
// "$CODEX_BIN"` form keeps argv[0]="codex" identical in test and prod.

import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const WRAPPER_REL = 'tools/backlog/run-codex-builder.sh';
const MOCK_REL = 'tests/backlog/fixtures/mock-codex.sh';
const SKILL_REL = 'skills/process-backlog.md';

function git(cwd: string, args: string[]): string {
  return spawnSync('git', args, { cwd, encoding: 'utf-8' }).stdout ?? '';
}

function initTestRepo(repoRoot: string): void {
  mkdirSync(repoRoot, { recursive: true });
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: repoRoot });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: repoRoot,
  });
  spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoRoot });
  spawnSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoRoot });

  // Copy the wrapper + canonical skill into the test repo so the wrapper's
  // own paths resolve. The wrapper hardcodes $REPO_ROOT/skills/process-backlog.md
  // as its prompt — the file must exist there.
  mkdirSync(join(repoRoot, 'skills'), { recursive: true });
  mkdirSync(join(repoRoot, 'tools/backlog'), { recursive: true });
  cpSync(join(REPO, SKILL_REL), join(repoRoot, SKILL_REL));
  cpSync(join(REPO, WRAPPER_REL), join(repoRoot, WRAPPER_REL));
  chmodSync(join(repoRoot, WRAPPER_REL), 0o755);

  git(repoRoot, ['add', '-A']);
  spawnSync('git', ['commit', '-q', '-m', 'seed'], { cwd: repoRoot });
}

interface TestEnvCtx {
  workRoot: string;
  tmpHome: string;
  tmpRepo: string;
  recordDir: string;
  env: NodeJS.ProcessEnv;
}

function buildEnv(
  ctx: Omit<TestEnvCtx, 'env'>,
  extras: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = { ...process.env };
  // Wipe any inherited persona so the wrapper exercises its first-run path.
  delete e.ECHO_AGENT_ID;
  e.HOME = ctx.tmpHome;
  e.ECHO_BACKLOG_REPO_ROOT = ctx.tmpRepo;
  e.CODEX_BIN = join(REPO, MOCK_REL);
  e.MOCK_RECORD_DIR = ctx.recordDir;
  for (const [k, v] of Object.entries(extras)) e[k] = v;
  return e;
}

describe('047 AC4 — run-codex-builder.sh wrapper contract', () => {
  let ctx: TestEnvCtx;

  beforeEach(() => {
    const workRoot = mkdtempSync(join(tmpdir(), 'echo-047-codex-builder-'));
    const tmpHome = join(workRoot, 'home');
    const tmpRepo = join(workRoot, 'repo');
    const recordDir = join(workRoot, 'record');
    mkdirSync(tmpHome, { recursive: true });
    mkdirSync(recordDir, { recursive: true });
    initTestRepo(tmpRepo);
    ctx = {
      workRoot,
      tmpHome,
      tmpRepo,
      recordDir,
      env: buildEnv({ workRoot, tmpHome, tmpRepo, recordDir }),
    };
  });

  afterEach(() => {
    rmSync(ctx.workRoot, { recursive: true, force: true });
  });

  it('case 1 — wrapper passes correct env + argv + stdin + lock-visibility to codex exec', () => {
    const wrapper = join(ctx.tmpRepo, WRAPPER_REL);
    const r = spawnSync('bash', [wrapper], {
      env: ctx.env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(r.status, `wrapper failed: stdout=${r.stdout} stderr=${r.stderr}`).toBe(0);

    // (a) argv = exactly `codex exec -C <repo_root> --sandbox danger-full-access -`
    const argv = readFileSync(join(ctx.recordDir, 'argv'), 'utf-8').split('\n').filter(Boolean);
    expect(argv).toEqual([
      'codex',
      'exec',
      '-C',
      ctx.tmpRepo,
      '--sandbox',
      'danger-full-access',
      '-',
    ]);

    // (b) env contains ECHO_AGENT_ID=<resolved>
    const envText = readFileSync(join(ctx.recordDir, 'env'), 'utf-8');
    const envLines = envText.split('\n');
    const agentIdLine = envLines.find((l) => l.startsWith('ECHO_AGENT_ID='));
    expect(agentIdLine, 'ECHO_AGENT_ID missing from recorded env').toBeDefined();
    const agentId = agentIdLine!.substring('ECHO_AGENT_ID='.length);
    expect(agentId).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

    // (c) HOME is the test tmpHome
    const homeLine = envLines.find((l) => l.startsWith('HOME='));
    expect(homeLine).toBe(`HOME=${ctx.tmpHome}`);

    // (d) stdin equals the on-disk content of $REPO_ROOT/skills/process-backlog.md
    const stdin = readFileSync(join(ctx.recordDir, 'stdin'), 'utf-8');
    const expectedSkill = readFileSync(join(ctx.tmpRepo, SKILL_REL), 'utf-8');
    expect(stdin).toBe(expectedSkill);

    // (e) LOCK_DIR was present during the codex invocation (mock recorded it)
    const lockStatus = readFileSync(join(ctx.recordDir, 'lock-status'), 'utf-8').trim();
    expect(lockStatus).toBe('PRESENT');
    // ...and is gone after wrapper exit (trap fired)
    expect(existsSync(join(ctx.tmpRepo, '.git/echo-builder-in-progress.d'))).toBe(false);

    // (f) log file at $HOME/Library/Logs contains start + end markers
    const logPath = join(ctx.tmpHome, 'Library/Logs/echo-backlog-codex-builder.log');
    const logContent = readFileSync(logPath, 'utf-8');
    expect(logContent).toMatch(/codex-builder start/);
    expect(logContent).toMatch(/codex-builder end rc=0/);
  });

  it('case 2 — wrapper handles ECHO_AGENT_ID first-run generation and is stable across runs', () => {
    const agentIdFile = join(ctx.tmpHome, '.echo/agent-id');
    expect(existsSync(agentIdFile)).toBe(false);

    const wrapper = join(ctx.tmpRepo, WRAPPER_REL);

    // First run
    const r1 = spawnSync('bash', [wrapper], {
      env: ctx.env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(r1.status, r1.stderr).toBe(0);

    // (a) ~/.echo/agent-id created with UUID4-shaped string
    expect(existsSync(agentIdFile)).toBe(true);
    const uuid1 = readFileSync(agentIdFile, 'utf-8').trim();
    expect(uuid1).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

    // (b) same value passed to codex
    const env1 = readFileSync(join(ctx.recordDir, 'env'), 'utf-8');
    expect(env1).toContain(`ECHO_AGENT_ID=${uuid1}`);

    // Second run — same UUID is read from ~/.echo/agent-id and passed to codex
    rmSync(ctx.recordDir, { recursive: true, force: true });
    mkdirSync(ctx.recordDir, { recursive: true });

    const r2 = spawnSync('bash', [wrapper], {
      env: ctx.env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(r2.status, r2.stderr).toBe(0);

    const uuid2 = readFileSync(agentIdFile, 'utf-8').trim();
    expect(uuid2).toBe(uuid1);
    const env2 = readFileSync(join(ctx.recordDir, 'env'), 'utf-8');
    expect(env2).toContain(`ECHO_AGENT_ID=${uuid1}`);
  });

  it('case 3 — atomic lockfile prevents overlapping wrapper invocations (race-free)', async () => {
    const wrapper = join(ctx.tmpRepo, WRAPPER_REL);
    const slowEnv = buildEnv(
      {
        workRoot: ctx.workRoot,
        tmpHome: ctx.tmpHome,
        tmpRepo: ctx.tmpRepo,
        recordDir: ctx.recordDir,
      },
      { MOCK_CODEX_SLEEP: '3' },
    );
    const lockDir = join(ctx.tmpRepo, '.git/echo-builder-in-progress.d');
    const lockInfo = join(lockDir, 'info');

    // First invocation — backgrounded, holds the lock for ~3s.
    const child = spawn('bash', [wrapper], {
      env: slowEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const firstDone = new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? -1));
    });

    // Race-free synchronization (R2 codex F2): poll for lock info to appear
    // before firing the second invocation. WAITED=0 initializer is required
    // under bash `set -u` in the spec; the same shape is preserved here for
    // parity even though TypeScript doesn't need it.
    let WAITED = 0;
    while (!existsSync(lockInfo) && WAITED < 20) {
      await new Promise((r) => setTimeout(r, 100));
      WAITED = WAITED + 1;
    }
    expect(existsSync(lockInfo), 'lock info did not appear within 2s').toBe(true);
    const lockInfoBefore = readFileSync(lockInfo, 'utf-8');

    // (a) Second invocation — must exit non-zero with lock-exists diagnostic.
    const r2 = spawnSync('bash', [wrapper], {
      env: ctx.env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(r2.status, `expected non-zero exit; stderr=${r2.stderr}`).not.toBe(0);
    expect(r2.stderr).toMatch(/existing lock at/);

    // (b) Lock info content is UNCHANGED — first invocation still owns it.
    const lockInfoAfter = readFileSync(lockInfo, 'utf-8');
    expect(lockInfoAfter).toBe(lockInfoBefore);
    expect(lockInfoBefore).toMatch(/^codex-builder @ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z by \d+ agent=/);

    // Wait for first invocation to finish.
    const firstExit = await firstDone;
    expect(firstExit).toBe(0);

    // (c) Lock dir is gone after the first invocation exits.
    expect(existsSync(lockDir)).toBe(false);

    // (d) Third invocation (post-cleanup) acquires the lock cleanly.
    rmSync(ctx.recordDir, { recursive: true, force: true });
    mkdirSync(ctx.recordDir, { recursive: true });
    const r3 = spawnSync('bash', [wrapper], {
      env: ctx.env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(r3.status, r3.stderr).toBe(0);
  });
});
