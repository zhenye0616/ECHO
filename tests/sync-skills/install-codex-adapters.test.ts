// 049 AC3 — tools/install-codex-adapters.sh deployment-helper tests.
//
// Asserts that the install helper:
//   - creates symlinks (default) and copies (--copy) under $HOME/.codex/skills/
//   - pre-flight creates $HOME/.codex/skills if absent
//   - is idempotent across modes (rerun is no-op; mode-switch rewrites cleanly)
//   - refuses to overwrite anything that isn't an ECHO-managed entity
//   - acquires a per-skill atomic-mkdir lock; refuses to steal a live lock
//   - recovers from stale locks (readable old timestamp OR mtime fallback)
//   - stages --copy installs OUTSIDE the live codex skill discovery root
//   - cleans stale staging dirs (>60min) without removing the staging root
//   - sentinel records synced_from_commit + synced_content_sha256
//   - sync-skills.sh --check WARNS (not errors) on stale --copy installs
//
// Each test seeds a fresh tmp REPO_ROOT (git-init'd so $HEAD resolves) and a
// fresh tmp $HOME. The install script's REPO_ROOT resolution
// (`$(cd "$(dirname "$0")/.." && pwd)`) keys off the script's own path, so we
// copy the real script + a fixture adapters/codex/skills/<name>/SKILL.md tree
// into the tmp repo.

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const INSTALL_REL = 'tools/install-codex-adapters.sh';
const SYNC_REL = 'tools/sync-skills.sh';

function git(cwd: string, args: string[]): string {
  return spawnSync('git', args, { cwd, encoding: 'utf-8' }).stdout ?? '';
}

function initFixture(): { repoRoot: string; tmpHome: string } {
  const work = mkdtempSync(join(tmpdir(), 'echo-install-codex-test-'));
  const repoRoot = join(work, 'repo');
  const tmpHome = join(work, 'home');
  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(tmpHome, { recursive: true });

  // Bootstrap a minimal repo with the install script + a couple of adapters.
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: repoRoot });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: repoRoot,
  });
  spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoRoot });
  spawnSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoRoot });

  mkdirSync(join(repoRoot, 'tools'), { recursive: true });
  cpSync(join(REPO, INSTALL_REL), join(repoRoot, INSTALL_REL));
  chmodSync(join(repoRoot, INSTALL_REL), 0o755);
  cpSync(join(REPO, SYNC_REL), join(repoRoot, SYNC_REL));
  chmodSync(join(repoRoot, SYNC_REL), 0o755);

  for (const name of ['process-backlog', 'review-pending']) {
    const dir = join(repoRoot, 'adapters/codex/skills', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Fixture for ${name}.\nmetadata:\n  short-description: Fixture for ${name}.\n---\n\nFixture body for ${name}.\n`,
    );
    // Mirror under skills/ so sync-skills.sh --check sees the codex notes
    // section in the canonical and considers this skill in-scope.
    mkdirSync(join(repoRoot, 'skills'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'skills', `${name}.md`),
      `---\ndescription: Fixture for ${name}.\n---\n\nFixture body for ${name}.\n\n## Binding-specific notes — codex\n\nplaceholder\n`,
    );
  }
  git(repoRoot, ['add', '-A']);
  spawnSync('git', ['commit', '-q', '-m', 'seed'], { cwd: repoRoot });
  return { repoRoot, tmpHome };
}

function runInstall(
  repoRoot: string,
  tmpHome: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
) {
  return spawnSync('bash', [join(repoRoot, INSTALL_REL), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, HOME: tmpHome, ...extraEnv },
  });
}

function runSync(
  repoRoot: string,
  tmpHome: string,
  args: string[] = [],
): ReturnType<typeof spawnSync> {
  return spawnSync('bash', [join(repoRoot, SYNC_REL), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, HOME: tmpHome },
  });
}

let repoRoot: string;
let tmpHome: string;

beforeEach(() => {
  const f = initFixture();
  repoRoot = f.repoRoot;
  tmpHome = f.tmpHome;
});

afterEach(() => {
  // The work dir is the parent of both repoRoot and tmpHome.
  const work = join(repoRoot, '..');
  rmSync(work, { recursive: true, force: true });
});

describe('049 AC3 — install-codex-adapters.sh', () => {
  it('clean install creates symlinks under HOME=$TMPDIR', () => {
    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    for (const name of ['process-backlog', 'review-pending']) {
      const target = join(tmpHome, '.codex/skills', name);
      expect(lstatSync(target).isSymbolicLink()).toBe(true);
      expect(readlinkSync(target)).toBe(
        join(repoRoot, 'adapters/codex/skills', name),
      );
    }
  });

  it('pre-flight creates ~/.codex/skills if absent', () => {
    // tmpHome exists; ~/.codex/ and ~/.codex/skills/ do not.
    expect(existsSync(join(tmpHome, '.codex'))).toBe(false);
    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    expect(statSync(join(tmpHome, '.codex/skills')).isDirectory()).toBe(true);
  });

  it('idempotent rerun is a no-op', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const before = readlinkSync(join(tmpHome, '.codex/skills/process-backlog'));
    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    const after = readlinkSync(join(tmpHome, '.codex/skills/process-backlog'));
    expect(after).toBe(before);
  });

  it('--copy mode creates copies with .echo-managed sentinel', () => {
    const r = runInstall(repoRoot, tmpHome, ['--copy']);
    expect(r.status).toBe(0);
    const target = join(tmpHome, '.codex/skills/review-pending');
    expect(statSync(target).isDirectory()).toBe(true);
    expect(lstatSync(target).isSymbolicLink()).toBe(false);
    expect(existsSync(join(target, '.echo-managed'))).toBe(true);
  });

  it('--copy install sentinel records synced_from_commit', () => {
    expect(runInstall(repoRoot, tmpHome, ['--copy']).status).toBe(0);
    const sentinel = readFileSync(
      join(tmpHome, '.codex/skills/process-backlog/.echo-managed'),
      'utf-8',
    );
    expect(sentinel).toMatch(/^synced_from_commit=[0-9a-f]{7,40}/m);
    expect(sentinel).toMatch(/^synced_content_sha256=[0-9a-f]{64}/m);
  });

  it('mode switch rewrites cleanly (symlink → copy and back)', () => {
    // 1. install symlink
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    expect(
      lstatSync(join(tmpHome, '.codex/skills/process-backlog')).isSymbolicLink(),
    ).toBe(true);

    // 2. install copy: replaces symlink with copy
    expect(runInstall(repoRoot, tmpHome, ['--copy']).status).toBe(0);
    const t = join(tmpHome, '.codex/skills/process-backlog');
    expect(lstatSync(t).isSymbolicLink()).toBe(false);
    expect(statSync(t).isDirectory()).toBe(true);
    expect(existsSync(join(t, '.echo-managed'))).toBe(true);

    // 3. install symlink: replaces copy with symlink
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    expect(lstatSync(t).isSymbolicLink()).toBe(true);
  });

  it('--dry-run produces no FS changes', () => {
    const r = runInstall(repoRoot, tmpHome, ['--dry-run']);
    expect(r.status).toBe(0);
    expect(existsSync(join(tmpHome, '.codex/skills'))).toBe(false);
    expect(r.stdout).toMatch(/DRY-RUN/);
  });

  it('non-managed conflict refuses overwrite (regular directory)', () => {
    mkdirSync(join(tmpHome, '.codex/skills/process-backlog'), {
      recursive: true,
    });
    writeFileSync(
      join(tmpHome, '.codex/skills/process-backlog/PRIOR.md'),
      'pre-existing',
    );

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/non-managed directory/);
    expect(
      readFileSync(
        join(tmpHome, '.codex/skills/process-backlog/PRIOR.md'),
        'utf-8',
      ),
    ).toBe('pre-existing');
  });

  it('non-managed conflict refuses overwrite (non-matching symlink)', () => {
    mkdirSync(join(tmpHome, '.codex/skills'), { recursive: true });
    const elsewhere = mkdtempSync(join(tmpdir(), 'echo-elsewhere-'));
    writeFileSync(join(elsewhere, 'SKILL.md'), 'elsewhere content');
    symlinkSync(elsewhere, join(tmpHome, '.codex/skills/process-backlog'));

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/non-managed symlink/);
    expect(readlinkSync(join(tmpHome, '.codex/skills/process-backlog'))).toBe(
      elsewhere,
    );
    rmSync(elsewhere, { recursive: true, force: true });
  });

  it('non-managed conflict refuses overwrite (regular file)', () => {
    mkdirSync(join(tmpHome, '.codex/skills'), { recursive: true });
    writeFileSync(
      join(tmpHome, '.codex/skills/process-backlog'),
      'pre-existing file',
    );

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/regular file/);
    expect(
      readFileSync(join(tmpHome, '.codex/skills/process-backlog'), 'utf-8'),
    ).toBe('pre-existing file');
  });

  it('unwritable HOME exits with clear error', () => {
    const ro = mkdtempSync(join(tmpdir(), 'echo-readonly-home-'));
    try {
      chmodSync(ro, 0o500);
      const r = runInstall(repoRoot, ro);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/HOME/);
    } finally {
      chmodSync(ro, 0o700);
      rmSync(ro, { recursive: true, force: true });
    }
  });

  it('concurrent install lock serializes probe-to-finalize', () => {
    // Pre-create the lock manually (simulating an in-flight install).
    mkdirSync(join(tmpHome, '.codex/.echo-locks/process-backlog'), {
      recursive: true,
    });
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/pid'),
      `${process.pid}`,
    );
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/timestamp'),
      `${Math.floor(Date.now() / 1000)}`,
    );

    const r = runInstall(repoRoot, tmpHome);
    // process-backlog blocked, review-pending might succeed; overall non-zero.
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/another install in progress/);

    // Release lock; rerun succeeds.
    rmSync(join(tmpHome, '.codex/.echo-locks/process-backlog'), {
      recursive: true,
      force: true,
    });
    const r2 = runInstall(repoRoot, tmpHome);
    expect(r2.status).toBe(0);
  });

  it('lock applies to BOTH symlink and copy modes', () => {
    mkdirSync(join(tmpHome, '.codex/.echo-locks/process-backlog'), {
      recursive: true,
    });
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/pid'),
      `${process.pid}`,
    );
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/timestamp'),
      `${Math.floor(Date.now() / 1000)}`,
    );

    const rSymlink = runInstall(repoRoot, tmpHome);
    expect(rSymlink.status).not.toBe(0);
    expect(rSymlink.stderr).toMatch(/another install in progress/);

    const rCopy = runInstall(repoRoot, tmpHome, ['--copy']);
    expect(rCopy.status).not.toBe(0);
    expect(rCopy.stderr).toMatch(/another install in progress/);
  });

  it('staging directory lives outside ~/.codex/skills', () => {
    expect(runInstall(repoRoot, tmpHome, ['--copy']).status).toBe(0);
    // No leftover staging dirs under .echo-staging
    const staging = join(tmpHome, '.codex/.echo-staging');
    expect(statSync(staging).isDirectory()).toBe(true);
    const leftover = spawnSync('find', [
      staging,
      '-mindepth',
      '1',
      '-maxdepth',
      '1',
      '-type',
      'd',
    ]);
    expect((leftover.stdout?.toString() ?? '').trim()).toBe('');
    // Skills dir contains ONLY the installed skill dirs, not any staging dirs.
    for (const name of ['process-backlog', 'review-pending']) {
      expect(
        statSync(join(tmpHome, '.codex/skills', name)).isDirectory(),
      ).toBe(true);
    }
  });

  it('stale-staging cleanup preserves staging root', () => {
    mkdirSync(join(tmpHome, '.codex/.echo-staging/orphan-12345'), {
      recursive: true,
    });
    // Make both root and child >60min old.
    const oldEpoch = Math.floor(Date.now() / 1000) - 4000;
    utimesSync(join(tmpHome, '.codex/.echo-staging'), oldEpoch, oldEpoch);
    utimesSync(
      join(tmpHome, '.codex/.echo-staging/orphan-12345'),
      oldEpoch,
      oldEpoch,
    );

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    expect(existsSync(join(tmpHome, '.codex/.echo-staging'))).toBe(true);
    expect(
      existsSync(join(tmpHome, '.codex/.echo-staging/orphan-12345')),
    ).toBe(false);
  });

  it('stale-lock recovery — readable old timestamp + dead pid', () => {
    mkdirSync(join(tmpHome, '.codex/.echo-locks/process-backlog'), {
      recursive: true,
    });
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/pid'),
      `99999`,
    );
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/timestamp'),
      `${Math.floor(Date.now() / 1000) - 700}`,
    );

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/removing stale lock/);
    expect(
      lstatSync(
        join(tmpHome, '.codex/skills/process-backlog'),
      ).isSymbolicLink(),
    ).toBe(true);
  });

  it('stale-lock recovery — corrupted/missing timestamp (mtime fallback)', () => {
    mkdirSync(join(tmpHome, '.codex/.echo-locks/process-backlog'), {
      recursive: true,
    });
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/pid'),
      `99999`,
    );
    // No timestamp file at all; set dir mtime >60min ago.
    const oldEpoch = Math.floor(Date.now() / 1000) - 4000;
    utimesSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog'),
      oldEpoch,
      oldEpoch,
    );

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/missing timestamp/);
    expect(r.stderr).toMatch(/removing stale lock/);

    // Non-integer timestamp variant: same recovery path.
    rmSync(join(tmpHome, '.codex'), { recursive: true, force: true });
    mkdirSync(join(tmpHome, '.codex/.echo-locks/process-backlog'), {
      recursive: true,
    });
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/pid'),
      `99999`,
    );
    writeFileSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog/timestamp'),
      `garbage`,
    );
    utimesSync(
      join(tmpHome, '.codex/.echo-locks/process-backlog'),
      oldEpoch,
      oldEpoch,
    );
    const r2 = runInstall(repoRoot, tmpHome);
    expect(r2.status).toBe(0);
    expect(r2.stderr).toMatch(/corrupted/);
  });

  it('sync-skills.sh --check warns on stale copy-mode adapter', () => {
    // Install in copy mode against current canonical/adapter state.
    expect(runInstall(repoRoot, tmpHome, ['--copy']).status).toBe(0);

    // Mutate the canonical to invalidate the content hash without changing HEAD.
    const canonical = join(repoRoot, 'skills/process-backlog.md');
    const current = readFileSync(canonical, 'utf-8');
    writeFileSync(canonical, current + '\n\nextra paragraph\n');
    // Re-run sync so the adapter content reflects the mutated canonical.
    expect(runSync(repoRoot, tmpHome).status).toBe(0);

    const check = runSync(repoRoot, tmpHome, ['--check']);
    // It WARNS but does not error — install-step concern, not sync-step.
    expect(check.status).toBe(0);
    expect(check.stderr).toMatch(/stale content/);
    expect(check.stderr).toMatch(/process-backlog/);
  });
});
