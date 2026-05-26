import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
  version: string;
};
const hasNpm = spawnSync('npm', ['--version']).status === 0;
const hasBash = spawnSync('bash', ['-c', 'true']).status === 0;
const maybeIt = hasNpm && hasBash ? it : it.skip;

let tmpRoot: string;

describe('echoctl shell reachability', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-shell-reachable-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  maybeIt(
    'packs an echoctl binary reachable from bash and exercises transitive doctor imports',
    () => {
      const build = spawnSync('npm', ['run', 'build:cli'], { cwd: repoRoot, encoding: 'utf8' });
      expect(build.status, build.stderr).toBe(0);
      expect(existsSync(join(repoRoot, 'dist/cli/index.js'))).toBe(true);
      expect(existsSync(join(repoRoot, 'dist/cli/commands/doctor.js'))).toBe(true);

      const pack = spawnSync('npm', ['pack', '--pack-destination', tmpRoot], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(pack.status, pack.stderr).toBe(0);
      const tarball = join(tmpRoot, pack.stdout.trim().split(/\r?\n/).at(-1)!);
      const tarList = spawnSync('tar', ['tf', tarball], { encoding: 'utf8' });
      expect(tarList.status, tarList.stderr).toBe(0);
      expect(tarList.stdout.split(/\r?\n/)).toContain(
        'package/assets/echo-workflows/change-review.toml',
      );
      const prefix = join(tmpRoot, 'prefix');
      const install = spawnSync('npm', ['install', '-g', '--prefix', prefix, tarball], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(install.status, install.stderr).toBe(0);

      const env = {
        ...process.env,
        PATH: `${join(prefix, 'bin')}:${process.env.PATH ?? ''}`,
        ECHO_HOME: join(tmpRoot, 'echo-home'),
        ECHO_MCP_PORT: '39999',
      };
      const version = spawnSync('bash', ['-c', 'echoctl --version'], { env, encoding: 'utf8' });
      expect(version.status, version.stderr).toBe(0);
      expect(version.stdout.trim()).toBe(packageJson.version);

      const doctor = spawnSync('bash', ['-c', 'echoctl doctor --json'], { env, encoding: 'utf8' });
      expect(doctor.status).toBe(1);
      expect(JSON.parse(doctor.stdout)).toMatchObject({ overall: 'broken' });

      const builtin = spawnSync('bash', ['-c', 'echo --version'], { env, encoding: 'utf8' });
      expect(builtin.stdout.trim()).not.toBe(packageJson.version);
    },
  );
});
