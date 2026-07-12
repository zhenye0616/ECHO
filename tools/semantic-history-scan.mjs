#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const MAX_BUFFER = 256 * 1024 * 1024;
const NOTE_ID_RE = /\bnot_[A-Za-z0-9]{8,}\b/g;
const ABSOLUTE_USER_PATH_RE = /\/Users\/[A-Za-z0-9._-]+\/[A-Za-z0-9_./-]+/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_EXCLUSIONS = [
  /example\.com/i,
  /test@test/i,
  /test\.com/i,
  /users\.noreply\.github\.com/i,
  /noreply@anthropic\.com/i,
];
const PATH_EXCLUSIONS = new Set(['tests/tools/semantic-history-scan.test.ts']);

const argv = process.argv.slice(2);
let refScope = '--all';
if (argv.length > 0) {
  if (argv.length !== 2 || argv[0] !== '--ref' || argv[1].trim() === '') {
    process.stderr.write('usage: tools/semantic-history-scan.mjs [--ref <git-revision>]\n');
    process.exit(2);
  }
  refScope = argv[1];
}

function git(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '');
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function distinctMatches(text, regex) {
  return new Set(text.match(regex) ?? []);
}

const historyArgs = [
  'log',
  ...(refScope === '--all' ? ['--all'] : [refScope]),
  '-p',
  '--no-color',
  '--format=',
];
let currentPath = '';
const history = git(historyArgs)
  .split(/\r?\n/)
  .flatMap((line) => {
    const diffHeader = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (diffHeader !== null) currentPath = diffHeader[2];
    if (!/^[+-]/.test(line) || /^\+\+\+|^---/.test(line)) return [];
    if (PATH_EXCLUSIONS.has(currentPath)) return [];
    return [line];
  })
  .join('\n');
const trackedResult = spawnSync(
  'git',
  ['grep', '-I', '-h', '-E', 'not_[A-Za-z0-9]{8,}', refScope === '--all' ? 'HEAD' : refScope, '--'],
  { encoding: 'utf8', maxBuffer: MAX_BUFFER },
);
if (trackedResult.status !== 0 && trackedResult.status !== 1) {
  process.stderr.write(trackedResult.stderr ?? '');
  process.exit(trackedResult.status ?? 1);
}

const historyNoteIds = distinctMatches(history, NOTE_ID_RE);
const trackedNoteIds = distinctMatches(trackedResult.stdout ?? '', NOTE_ID_RE);
const absolutePaths = distinctMatches(history, ABSOLUTE_USER_PATH_RE);
const emails = [...distinctMatches(history, EMAIL_RE)].filter(
  (value) => !EMAIL_EXCLUSIONS.some((pattern) => pattern.test(value)),
);
const inputSha = refScope === '--all' ? null : git(['rev-parse', `${refScope}^{commit}`]).trim();

process.stdout.write(
  `${JSON.stringify(
    {
      schema_version: 1,
      ref_scope: refScope,
      input_sha: inputSha,
      input: 'added/deleted textual diff-content lines from git log -p',
      diff_content_bytes: Buffer.byteLength(history),
      diff_content_sha256: createHash('sha256').update(history).digest('hex'),
      detectors: {
        live_looking_note_ids: {
          regex: NOTE_ID_RE.source,
          history_distinct: historyNoteIds.size,
          tracked_distinct: trackedNoteIds.size,
          history_only: [...historyNoteIds].filter((value) => !trackedNoteIds.has(value)).length,
        },
        absolute_user_paths: {
          regex: ABSOLUTE_USER_PATH_RE.source,
          history_distinct: absolutePaths.size,
        },
        non_example_emails: {
          regex: EMAIL_RE.source,
          exclusions: EMAIL_EXCLUSIONS.map((pattern) => pattern.source),
          history_distinct: emails.length,
        },
      },
      path_exclusions: [...PATH_EXCLUSIONS],
      privacy: 'counts and detector definitions only; matched values are never emitted',
    },
    null,
    2,
  )}\n`,
);
