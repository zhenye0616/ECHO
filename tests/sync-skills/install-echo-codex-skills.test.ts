// Codex skill discovery installer tests.
//
// ECHO keeps canonical skill bodies under skills/*.md. Codex does not consume
// the Claude command copies directly, so tools/install-echo-codex-skills.sh
// renders every canonical skill into ~/.codex/skills/ECHO:<name>/SKILL.md.

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const INSTALL_REL = 'tools/install-echo-codex-skills.sh';

function git(cwd: string, args: string[]): void {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  }
}

function initFixture(): { repoRoot: string; tmpHome: string } {
  const work = mkdtempSync(join(tmpdir(), 'echo-install-echo-codex-test-'));
  const repoRoot = join(work, 'repo');
  const tmpHome = join(work, 'home');
  mkdirSync(join(repoRoot, 'tools'), { recursive: true });
  mkdirSync(join(repoRoot, 'skills'), { recursive: true });
  mkdirSync(tmpHome, { recursive: true });

  git(work, ['init', '-q', '-b', 'main', 'repo']);
  git(repoRoot, ['config', 'user.email', 'test@example.com']);
  git(repoRoot, ['config', 'user.name', 'Tester']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);

  cpSync(join(REPO, INSTALL_REL), join(repoRoot, INSTALL_REL));
  chmodSync(join(repoRoot, INSTALL_REL), 0o755);
  writeSkill(repoRoot, 'process-backlog', 'Claim one item.', 'Process body.');
  writeSkill(repoRoot, 'review-pending', 'Review pending work.', 'Review body.');
  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', 'seed']);
  return { repoRoot, tmpHome };
}

function writeSkill(repoRoot: string, name: string, description: string, body: string): void {
  writeFileSync(
    join(repoRoot, 'skills', `${name}.md`),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`,
  );
}

function runInstall(
  repoRoot: string,
  tmpHome: string,
  args: string[] = [],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  return spawnSync('bash', [join(repoRoot, INSTALL_REL), ...args], {
    cwd: opts.cwd ?? repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...opts.env, HOME: tmpHome },
  });
}

function runCheck(
  repoRoot: string,
  tmpHome: string,
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  return runInstall(repoRoot, tmpHome, ['--check'], opts);
}

function skillPath(tmpHome: string, name: string): string {
  return join(tmpHome, '.codex/skills', name);
}

function sentinelPath(tmpHome: string, name: string): string {
  return join(skillPath(tmpHome, name), '.echo-managed');
}

function rewriteSentinelSource(tmpHome: string, name: string, source: string): void {
  const path = sentinelPath(tmpHome, name);
  const text = readFileSync(path, 'utf-8').replace(/^source=.*$/m, `source=${source}`);
  writeFileSync(path, text);
}

function remediationCommands(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.match(/remediation: (.+)$/)?.[1])
    .filter((line): line is string => line !== undefined);
}

function runShell(command: string, tmpHome: string, cwd: string) {
  return spawnSync('bash', ['-lc', command], {
    cwd,
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
  rmSync(join(repoRoot, '..'), { recursive: true, force: true });
});

describe('install-echo-codex-skills.sh', () => {
  it('installs all canonical skills under the ECHO namespace', () => {
    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);

    for (const name of ['ECHO:process-backlog', 'ECHO:review-pending']) {
      const target = skillPath(tmpHome, name);
      expect(lstatSync(target).isDirectory()).toBe(true);
      expect(existsSync(join(target, 'SKILL.md'))).toBe(true);
      expect(existsSync(join(target, '.echo-managed'))).toBe(true);
    }
  });

  it('renders Codex-shaped frontmatter and preserves canonical body', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const text = readFileSync(
      join(skillPath(tmpHome, 'ECHO:process-backlog'), 'SKILL.md'),
      'utf-8',
    );
    expect(text).toContain("name: 'ECHO:process-backlog'");
    expect(text).toContain("description: 'Claim one item.'");
    expect(text).toContain("short-description: 'Claim one item.'");
    expect(text).toContain('\nProcess body.\n');
  });

  it('records source, commit, content hash, and installer name in the sentinel', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const sentinel = readFileSync(
      join(skillPath(tmpHome, 'ECHO:review-pending'), '.echo-managed'),
      'utf-8',
    );
    expect(sentinel).toMatch(/^managed_by=tools\/install-echo-codex-skills\.sh$/m);
    expect(sentinel).toMatch(/^source=.*skills\/review-pending\.md$/m);
    expect(sentinel).toMatch(/^skill_name=ECHO:review-pending$/m);
    expect(sentinel).toMatch(/^synced_from_commit=[0-9a-f]{7,40}$/m);
    expect(sentinel).toMatch(/^synced_content_sha256=[0-9a-f]{64}$/m);
  });

  it('refreshes managed installs when canonical content changes', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    writeSkill(repoRoot, 'process-backlog', 'Claim one item.', 'Updated body.');

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).toBe(0);
    const text = readFileSync(
      join(skillPath(tmpHome, 'ECHO:process-backlog'), 'SKILL.md'),
      'utf-8',
    );
    expect(text).toContain('Updated body.');
  });

  it('refuses to overwrite non-managed existing targets', () => {
    const target = skillPath(tmpHome, 'ECHO:process-backlog');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'SKILL.md'), 'pre-existing');

    const r = runInstall(repoRoot, tmpHome);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/not ECHO-managed/);
    expect(readFileSync(join(target, 'SKILL.md'), 'utf-8')).toBe('pre-existing');
  });

  it('--dry-run prints planned installs without writing files', () => {
    const r = runInstall(repoRoot, tmpHome, ['--dry-run']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/DRY-RUN/);
    expect(existsSync(join(tmpHome, '.codex/skills'))).toBe(false);
  });

  it('supports custom namespace', () => {
    const r = runInstall(repoRoot, tmpHome, ['--namespace', 'PROJECT']);
    expect(r.status).toBe(0);
    expect(existsSync(skillPath(tmpHome, 'PROJECT:process-backlog'))).toBe(true);
    expect(existsSync(skillPath(tmpHome, 'ECHO:process-backlog'))).toBe(false);
  });

  it('supports underscore-visible names', () => {
    const r = runInstall(repoRoot, tmpHome, ['--underscore-names']);
    expect(r.status).toBe(0);
    expect(existsSync(skillPath(tmpHome, 'ECHO:process_backlog'))).toBe(true);
    expect(existsSync(skillPath(tmpHome, 'ECHO:review_pending'))).toBe(true);
  });

  it('--check exits 0 for a clean managed install', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);

    const r = runCheck(repoRoot, tmpHome);

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('OK: all managed Codex ECHO skills match canonical sources');
  });

  it('--check exits non-zero and names a hand-mutated installed skill', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    writeFileSync(join(skillPath(tmpHome, 'ECHO:process-backlog'), 'SKILL.md'), 'mutated\n');

    const r = runCheck(repoRoot, tmpHome);

    expect(r.status).toBe(1);
    expect(r.stdout).toContain('DRIFT: ECHO:process-backlog');
    expect(r.stdout).toContain('installed SKILL.md drift');
  });

  it('--check exits 0 for non-default namespace and underscore-visible installs', () => {
    expect(
      runInstall(repoRoot, tmpHome, ['--namespace', 'PROJECT', '--underscore-names']).status,
    ).toBe(0);

    const r = runCheck(repoRoot, tmpHome);

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('OK: all managed Codex ECHO skills match canonical sources');
  });

  it('--check exits 0 without writing when ~/.codex/skills is absent', () => {
    const r = runCheck(repoRoot, tmpHome);

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('no managed Codex ECHO install; nothing to check');
    expect(existsSync(join(tmpHome, '.codex/skills'))).toBe(false);
  });

  it('--check removes its per-run temp stage and writes nothing under ~/.codex', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const tmpStageRoot = mkdtempSync(join(tmpdir(), 'echo-codex-check-stage-root-'));
    const codexEntriesBefore = readdirSync(join(tmpHome, '.codex')).sort();

    const r = runCheck(repoRoot, tmpHome, { env: { TMPDIR: tmpStageRoot } });

    expect(r.status).toBe(0);
    expect(readdirSync(tmpStageRoot)).toEqual([]);
    expect(readdirSync(join(tmpHome, '.codex')).sort()).toEqual(codexEntriesBefore);
    rmSync(tmpStageRoot, { recursive: true, force: true });
  });

  it('--check exits 2 on an internal temp-stage failure', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const missingTmp = join(tmpHome, 'missing-tmp-root');

    const r = runCheck(repoRoot, tmpHome, { env: { TMPDIR: missingTmp } });

    expect(r.status).toBe(2);
    expect(r.stderr).toContain('failed to create temporary check stage');
  });

  it('prints cwd-safe namespace remediation that clears non-default drift', () => {
    expect(runInstall(repoRoot, tmpHome, ['--namespace', 'PROJECT']).status).toBe(0);
    writeFileSync(join(skillPath(tmpHome, 'PROJECT:process-backlog'), 'SKILL.md'), 'mutated\n');
    const nonRepoCwd = mkdtempSync(join(tmpdir(), 'echo-codex-nonrepo-'));

    const drift = runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd });
    const command = remediationCommands(drift.stdout).find((line) => line.includes('--namespace'));

    expect(drift.status).toBe(1);
    expect(command).toContain('--namespace');
    expect(command).toContain('PROJECT');
    expect(command).toMatch(/^'/);
    expect(runShell(command!, tmpHome, nonRepoCwd).status).toBe(0);
    expect(runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd }).status).toBe(0);
    rmSync(nonRepoCwd, { recursive: true, force: true });
  });

  it('prints one runnable remediation per drifted mixed install family', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    expect(runInstall(repoRoot, tmpHome, ['--namespace', 'PROJECT']).status).toBe(0);
    writeFileSync(
      join(skillPath(tmpHome, 'ECHO:process-backlog'), 'SKILL.md'),
      'mutated-default\n',
    );
    writeFileSync(
      join(skillPath(tmpHome, 'PROJECT:review-pending'), 'SKILL.md'),
      'mutated-project\n',
    );
    const nonRepoCwd = mkdtempSync(join(tmpdir(), 'echo-codex-mixed-nonrepo-'));

    const drift = runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd });
    const commands = remediationCommands(drift.stdout);

    expect(drift.status).toBe(1);
    expect(commands.some((line) => !line.includes('--namespace'))).toBe(true);
    expect(commands.some((line) => line.includes('--namespace') && line.includes('PROJECT'))).toBe(
      true,
    );
    for (const command of commands) {
      expect(runShell(command, tmpHome, nonRepoCwd).status).toBe(0);
    }
    expect(runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd }).status).toBe(0);
    rmSync(nonRepoCwd, { recursive: true, force: true });
  });

  it('distinguishes stale sentinels from true orphaned managed dirs', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const nonRepoCwd = mkdtempSync(join(tmpdir(), 'echo-codex-missing-source-nonrepo-'));

    rewriteSentinelSource(tmpHome, 'ECHO:process-backlog', '/old/repo/skills/process-backlog.md');
    const stale = runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd });
    const staleCommand = remediationCommands(stale.stdout)[0]!;
    expect(stale.status).toBe(1);
    expect(stale.stdout).toContain('stale sentinel');
    expect(stale.stdout).not.toContain('rm -rf');
    expect(runShell(staleCommand, tmpHome, nonRepoCwd).status).toBe(0);
    expect(runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd }).status).toBe(0);

    rmSync(join(repoRoot, 'skills/process-backlog.md'));
    const orphan = runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd });
    const orphanCommands = remediationCommands(orphan.stdout);
    expect(orphan.status).toBe(1);
    expect(orphan.stdout).toContain('true orphan');
    expect(orphanCommands[0]).toContain('rm -rf');
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    expect(runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd }).status).toBe(1);
    expect(runShell(orphanCommands[0]!, tmpHome, nonRepoCwd).status).toBe(0);
    expect(runCheck(repoRoot, tmpHome, { cwd: nonRepoCwd }).status).toBe(0);
    rmSync(nonRepoCwd, { recursive: true, force: true });
  });

  it('--check exits 2 for an uninspectable skills tree', () => {
    expect(runInstall(repoRoot, tmpHome).status).toBe(0);
    const skillsDir = join(tmpHome, '.codex/skills');
    chmodSync(skillsDir, 0o000);
    try {
      const r = runCheck(repoRoot, tmpHome);
      expect(r.status).toBe(2);
      expect(r.stderr).toContain('not readable/traversable');
    } finally {
      chmodSync(skillsDir, 0o755);
    }
  });
});
