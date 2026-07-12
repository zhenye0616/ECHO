#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

const MAX_BUFFER = 1024 * 1024 * 1024;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: options.encoding ?? 'utf8',
    maxBuffer: MAX_BUFFER,
    ...options,
  });
}

function requireSuccess(result, label) {
  if (result.status === 0) return result;
  process.stderr.write(result.stderr?.toString() ?? '');
  throw new Error(`${label} failed with exit ${result.status ?? 'unknown'}`);
}

function git(repoRoot, args, options = {}) {
  return run('git', args, { cwd: repoRoot, ...options });
}

function printableStrings(buffer, minimumLength = 4) {
  const strings = [];
  let current = [];
  const flush = () => {
    if (current.length >= minimumLength) strings.push(Buffer.from(current).toString('ascii'));
    current = [];
  };
  for (const byte of buffer) {
    if ((byte >= 0x20 && byte <= 0x7e) || byte === 0x09) current.push(byte);
    else flush();
  }
  flush();
  return strings;
}

const rootResult = requireSuccess(run('git', ['rev-parse', '--show-toplevel']), 'repo lookup');
const repoRoot = rootResult.stdout.trim();
const numstat = requireSuccess(
  git(repoRoot, ['log', '--all', '--numstat', '--format=']),
  'binary path inventory',
).stdout;
const binaryPaths = [
  ...new Set(
    numstat
      .split(/\r?\n/)
      .map((line) => line.match(/^-\s+-\s+(.+)$/)?.[1])
      .filter((value) => value !== undefined),
  ),
].sort();

const tempRoot = mkdtempSync(join(tmpdir(), 'echo-binary-history-'));
const seenBlobOids = new Set();
const printable = [];
let totalBlobBytes = 0;

try {
  for (const path of binaryPaths) {
    const commits = requireSuccess(
      git(repoRoot, ['log', '--all', '--format=%H', '--', path]),
      `history lookup for ${path}`,
    )
      .stdout.split(/\r?\n/)
      .filter(Boolean);

    for (const commit of commits) {
      const objectResult = git(repoRoot, ['rev-parse', '--verify', `${commit}:${path}`]);
      if (objectResult.status !== 0) continue;
      const oid = objectResult.stdout.trim();
      if (seenBlobOids.has(oid)) continue;
      seenBlobOids.add(oid);

      const blob = requireSuccess(
        git(repoRoot, ['cat-file', 'blob', oid], { encoding: null }),
        `blob extraction for ${path}@${commit}`,
      ).stdout;
      totalBlobBytes += blob.length;
      printable.push(...printableStrings(blob));

      const suffix = extname(path);
      const safeName = `${oid}-${basename(path, suffix).replace(/[^A-Za-z0-9._-]/g, '_')}${suffix}`;
      writeFileSync(join(tempRoot, safeName), blob);
    }
  }

  const archiveScan = run('gitleaks', [
    'dir',
    tempRoot,
    '--max-archive-depth=3',
    '--redact=100',
    '--no-banner',
    '--no-color',
  ]);
  if (archiveScan.status !== 0) {
    process.stdout.write(archiveScan.stdout ?? '');
    process.stderr.write(archiveScan.stderr ?? '');
    process.exit(archiveScan.status ?? 1);
  }

  const stringPayload = `${printable.join('\n')}\n`;
  const stringScan = run('gitleaks', ['stdin', '--redact=100', '--no-banner', '--no-color'], {
    input: stringPayload,
  });
  if (stringScan.status !== 0) {
    process.stdout.write(stringScan.stdout ?? '');
    process.stderr.write(stringScan.stderr ?? '');
    process.exit(stringScan.status ?? 1);
  }

  process.stdout.write(
    `${JSON.stringify({
      schema_version: 1,
      binary_paths: binaryPaths.length,
      unique_binary_blobs: seenBlobOids.size,
      binary_bytes: totalBlobBytes,
      printable_bytes: Buffer.byteLength(stringPayload),
      archive_scan: 'clean',
      printable_string_scan: 'clean',
    })}\n`,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
