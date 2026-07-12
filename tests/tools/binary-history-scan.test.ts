import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'tools/binary-history-scan.mjs');

let workdir: string;
let repo: string;
let binDir: string;
let invocationLog: string;
let stdinCapture: string;

function git(args: string[]): void {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
}

function run(extraEnv: Record<string, string> = {}) {
  return spawnSync('node', [SCRIPT], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      GITLEAKS_TEST_LOG: invocationLog,
      GITLEAKS_STDIN_CAPTURE: stdinCapture,
    },
  });
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'echo-binary-history-test-'));
  repo = join(workdir, 'repo');
  binDir = join(workdir, 'bin');
  invocationLog = join(workdir, 'gitleaks.log');
  stdinCapture = join(workdir, 'stdin.txt');
  mkdirSync(repo);
  mkdirSync(binDir);
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);

  const fakeGitleaks = join(binDir, 'gitleaks');
  writeFileSync(
    fakeGitleaks,
    '#!/usr/bin/env bash\nset -euo pipefail\nprintf \'%s\\n\' "$*" >> "$GITLEAKS_TEST_LOG"\nif [ "${1:-}" = stdin ]; then\n  cat > "$GITLEAKS_STDIN_CAPTURE"\n  if [ "${GITLEAKS_FAIL_STDIN:-0}" = 1 ]; then exit 1; fi\nfi\nexit 0\n',
  );
  chmodSync(fakeGitleaks, 0o755);
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('tools/binary-history-scan.mjs', () => {
  it('enumerates binary history and sends printable strings through Gitleaks', () => {
    const canary = ['AKIA', 'QWERTYUIOPASDFGH'].join('');
    const utf16LeCanary = ['UTF16LE', '_SECRET_SAMPLE'].join('');
    const utf16BeCanary = ['UTF16BE', '_SECRET_SAMPLE'].join('');
    const utf16Be = Buffer.from(utf16BeCanary, 'utf16le');
    for (let index = 0; index < utf16Be.length; index += 2) {
      [utf16Be[index], utf16Be[index + 1]] = [utf16Be[index + 1], utf16Be[index]];
    }
    writeFileSync(
      join(repo, 'payload.bin'),
      Buffer.concat([
        Buffer.from([0]),
        Buffer.from(canary),
        Buffer.from([0xff]),
        Buffer.from(utf16LeCanary, 'utf16le'),
        Buffer.from([0xff]),
        utf16Be,
      ]),
    );
    git(['add', 'payload.bin']);
    git(['commit', '-q', '-m', 'binary']);

    const result = run();

    expect(result.status, result.stderr).toBe(0);
    const summary = JSON.parse(result.stdout) as {
      binary_paths: number;
      unique_binary_blobs: number;
      printable_string_scan: string;
    };
    expect(summary.binary_paths).toBe(1);
    expect(summary.unique_binary_blobs).toBe(1);
    expect(summary.printable_string_scan).toBe('clean');
    expect(readFileSync(stdinCapture, 'utf8')).toContain(canary);
    expect(readFileSync(stdinCapture, 'utf8')).toContain(utf16LeCanary);
    expect(readFileSync(stdinCapture, 'utf8')).toContain(utf16BeCanary);
    expect(`${result.stdout}${result.stderr}`).not.toContain(canary);
    expect(readFileSync(invocationLog, 'utf8')).toContain('dir ');
    expect(readFileSync(invocationLog, 'utf8')).toContain('stdin --redact=100');
  });

  it('propagates a printable-string detection failure', () => {
    writeFileSync(join(repo, 'payload.bin'), Buffer.from([0, 65, 66, 67, 68, 69]));
    git(['add', 'payload.bin']);
    git(['commit', '-q', '-m', 'binary']);

    const result = run({ GITLEAKS_FAIL_STDIN: '1' });

    expect(result.status).toBe(1);
  });
});
