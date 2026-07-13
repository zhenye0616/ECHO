import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { spawnSanitizedChild } from '../../src/product/spawn-sanitized-child.js';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const BUILDER = join(REPO_ROOT, 'tools/product/build-artifact.mjs');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'echo-build-once-contract-'));

async function run(
  command: string,
  args: readonly string[],
  options: Parameters<typeof spawnSanitizedChild>[2] = {},
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  const child = spawnSanitizedChild(command, args, options);
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => (stdout += chunk));
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  const status = await new Promise<number | null>((resolveStatus, reject) => {
    child.once('error', reject);
    child.once('close', resolveStatus);
  });
  return { status, stdout, stderr };
}

async function headSha(): Promise<string> {
  const result = await run('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe('Git-object product builder', () => {
  it('rejects a supplied source SHA that is not HEAD before creating output', async () => {
    const outDir = join(temporaryRoot, 'mismatch-output');
    const result = await run(
      process.execPath,
      [
        BUILDER,
        '--version',
        '0.1.0-dev.mismatch',
        '--source-sha',
        '0000000000000000000000000000000000000000',
        '--out-dir',
        outDir,
      ],
      { cwd: REPO_ROOT },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('source SHA mismatch');
    expect(existsSync(outDir)).toBe(false);
  });

  it('uses committed bytes after preflight and atomically publishes a new lineage', async () => {
    const outDir = join(temporaryRoot, 'git-object-output');
    const ready = join(temporaryRoot, 'preflight-ready');
    const resume = join(temporaryRoot, 'preflight-continue');
    const closurePath = join(REPO_ROOT, 'src/product/paths.ts');
    const ignoredPath = join(REPO_ROOT, 'src/product/ignored-artifact-sentinel.log');
    const original = readFileSync(closurePath, 'utf8');
    const marker = 'WORKTREE_MUTATION_MUST_NOT_SHIP_132';
    const child = spawnSanitizedChild(
      process.execPath,
      [
        BUILDER,
        '--version',
        '0.1.0-dev.git-objects',
        '--source-sha',
        await headSha(),
        '--out-dir',
        outDir,
      ],
      {
        cwd: REPO_ROOT,
        env: {
          NODE_ENV: 'test',
          PRODUCT_BUILD_TEST_PREFLIGHT_READY_FILE: ready,
          PRODUCT_BUILD_TEST_CONTINUE_FILE: resume,
        },
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    try {
      await vi.waitFor(() => expect(existsSync(ready)).toBe(true), { timeout: 10_000 });
      writeFileSync(closurePath, `${original}\n// ${marker}\n`);
      writeFileSync(ignoredPath, `${marker}\n`);
      writeFileSync(resume, 'continue\n');
      const status = await new Promise<number | null>((resolveStatus, reject) => {
        child.once('error', reject);
        child.once('close', resolveStatus);
      });
      expect(status, stderr).toBe(0);
    } finally {
      writeFileSync(closurePath, original);
      rmSync(ignoredPath, { force: true });
    }

    const artifactResult = JSON.parse(stdout) as { artifact: string };
    expect(readdirSync(outDir).sort()).toEqual(
      [
        'artifact-manifest.json',
        artifactResult.artifact,
        `${artifactResult.artifact}.sha256`,
      ].sort(),
    );
    const extracted = join(temporaryRoot, 'git-object-extracted');
    mkdirSync(extracted);
    const unpacked = await run(
      'tar',
      ['-xzf', join(outDir, artifactResult.artifact), '-C', extracted],
      { cwd: temporaryRoot },
    );
    expect(unpacked.status, unpacked.stderr).toBe(0);
    const packageFiles = readdirSync(join(extracted, 'package/dist/product'));
    expect(packageFiles).not.toContain(basename(ignoredPath));
    for (const path of packageFiles.filter((name) => name.endsWith('.js'))) {
      expect(readFileSync(join(extracted, 'package/dist/product', path), 'utf8')).not.toContain(
        marker,
      );
    }

    const manifest = JSON.parse(readFileSync(join(outDir, 'artifact-manifest.json'), 'utf8')) as {
      source_sha: string;
      package_files: Array<{ path: string }>;
    };
    expect(manifest.source_sha).toBe(await headSha());
    expect(manifest.package_files.some((entry) => entry.path.includes('ignored-artifact'))).toBe(
      false,
    );

    const overwrite = await run(
      process.execPath,
      [
        BUILDER,
        '--version',
        '0.1.0-dev.git-objects',
        '--source-sha',
        await headSha(),
        '--out-dir',
        outDir,
      ],
      { cwd: REPO_ROOT },
    );
    expect(overwrite.status).toBe(1);
    expect(overwrite.stderr).toContain('--out-dir already exists');
  }, 60_000);
});
