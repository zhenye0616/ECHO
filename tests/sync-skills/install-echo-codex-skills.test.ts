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

function runInstall(repoRoot: string, tmpHome: string, args: string[] = []) {
  return spawnSync('bash', [join(repoRoot, INSTALL_REL), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, HOME: tmpHome },
  });
}

function skillPath(tmpHome: string, name: string): string {
  return join(tmpHome, '.codex/skills', name);
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
});
