import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const SCRIPT = join(REPO, 'tools/secret-scan.sh');

let workdir: string;
let repo: string;
let binDir: string;
let invocationLog: string;

function run(env: Record<string, string> = {}) {
  return spawnSync(SCRIPT, ['history'], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      GITLEAKS_TEST_LOG: invocationLog,
    },
  });
}

function writeFakeGitleaks(version = '8.30.1', scanExit = 0): void {
  const fake = join(binDir, 'gitleaks');
  writeFileSync(
    fake,
    `#!/usr/bin/env bash\nset -euo pipefail\nif [ "\${1:-}" = version ]; then\n  printf '%s\\n' '${version}'\n  exit 0\nfi\nprintf '%s\\n' "$*" >> "$GITLEAKS_TEST_LOG"\nexit ${scanExit}\n`,
  );
  chmodSync(fake, 0o755);
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'echo-secret-scan-test-'));
  repo = join(workdir, 'repo');
  binDir = join(workdir, 'bin');
  invocationLog = join(workdir, 'invocations.log');
  mkdirSync(repo);
  mkdirSync(binDir);
  spawnSync('git', ['init', '-q'], { cwd: repo });
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('tools/secret-scan.sh', () => {
  it('runs the pinned redacted full-history scan from the repository root', () => {
    writeFakeGitleaks();

    const result = run();

    expect(result.status).toBe(0);
    const invocation = spawnSync('cat', [invocationLog], { encoding: 'utf8' }).stdout;
    expect(invocation).toContain(`git ${realpathSync(repo)}`);
    expect(invocation).toContain('--log-opts=--all');
    expect(invocation).toContain('--redact=100');
    expect(invocation).toContain('--no-banner');
    expect(invocation).toContain('--no-color');
  });

  it('fails closed when the installed Gitleaks version differs', () => {
    writeFakeGitleaks('8.29.1');

    const result = run();

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('expected gitleaks 8.30.1, found 8.29.1');
  });

  it('propagates a detected-leak failure', () => {
    writeFakeGitleaks('8.30.1', 1);

    const result = run();

    expect(result.status).toBe(1);
  });
});
