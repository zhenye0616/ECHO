import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const MONTH = '2026-06';
const helperPath = join(REPO, 'tools/dogfooding/journal-cat.sh');
const wrapperPath = join(REPO, 'tools/review-queue/_run_reviewer.sh');

let root: string;

function journalDir(): string {
  return join(root, 'raw/internal/dogfooding');
}

function writeShard(actor: string | null, entries: string[]): string {
  const filename =
    actor === null
      ? `mcp-interactions-journal-${MONTH}.md`
      : `mcp-interactions-journal-${MONTH}-${actor}.md`;
  const path = join(journalDir(), filename);
  writeFileSync(
    path,
    [
      `# ECHO MCP interactions journal - ${MONTH}${actor ? ` - ${actor}` : ''}`,
      '',
      '**Timezone convention:** fixture local time.',
      '',
      '## Quick-Fill Template',
      '',
      '    ### YYYY-MM-DD HH:MM PDT - <one-line context>',
      '',
      '## Interactions',
      '',
      ...entries,
    ].join('\n'),
  );
  return path;
}

function runJournalCat(): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(helperPath, [MONTH], {
    cwd: root,
    encoding: 'utf-8',
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function headings(output: string): string[] {
  return Array.from(output.matchAll(/^### .+$/gm), (match) => match[0]);
}

describe('journal-cat.sh', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'echo-journal-cat-'));
    mkdirSync(journalDir(), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('merges legacy and actor shards chronologically with deterministic equal-timestamp order', () => {
    writeShard(null, [
      [
        '### 2026-06-08 15:00 PDT - shared first',
        '',
        '- **Trigger:** shared',
        '- **Query inputs:** none',
        '- **Returned:** one',
        '- **Sources:** shared',
        '- **Verdict:** right - ok',
        '- **Note:** shared body',
        '',
      ].join('\n'),
    ]);
    writeShard('codex-ops', [
      [
        '### 2026-06-08 15:01 PDT - ops second',
        '',
        '- **Trigger:** ops',
        '- **Query inputs:** none',
        '- **Returned:** one',
        '- **Sources:** ops',
        '- **Verdict:** right - ok',
        '- **Note:** ops body',
        '',
      ].join('\n'),
      [
        '### 2026-06-08 16:00 PDT - ops equal',
        '',
        '- **Trigger:** ops equal',
        '- **Query inputs:** none',
        '- **Returned:** one',
        '- **Sources:** ops',
        '- **Verdict:** right - ok',
        '- **Note:** ops equal body',
        '',
      ].join('\n'),
    ]);
    writeShard('codex', [
      [
        '### 2026-06-08 15:02 PDT - codex third',
        '',
        '- **Trigger:** codex',
        '- **Query inputs:** none',
        '- **Returned:** one',
        '- **Sources:** codex',
        '- **Verdict:** right - ok',
        '- **Note:** codex body',
        '',
      ].join('\n'),
      [
        '### 2026-06-08 16:00 PDT - codex equal',
        '',
        '- **Trigger:** codex equal',
        '- **Query inputs:** none',
        '- **Returned:** one',
        '- **Sources:** codex',
        '- **Verdict:** right - ok',
        '- **Note:** codex equal body',
        '',
      ].join('\n'),
    ]);

    const result = runJournalCat();
    expect(result.status).toBe(0);
    expect(headings(result.stdout)).toEqual([
      '### 2026-06-08 15:00 PDT - shared first',
      '### 2026-06-08 15:01 PDT - ops second',
      '### 2026-06-08 15:02 PDT - codex third',
      '### 2026-06-08 16:00 PDT - codex equal',
      '### 2026-06-08 16:00 PDT - ops equal',
    ]);
    expect(result.stdout.match(/Quick-Fill Template/g)).toHaveLength(1);
    expect(result.stdout.match(/shared body/g)).toHaveLength(1);
    expect(result.stdout.match(/ops body/g)).toHaveLength(1);
    expect(result.stdout.match(/codex body/g)).toHaveLength(1);
  });

  it('fails loudly instead of silently omitting malformed blocks', () => {
    writeShard('codex', [
      [
        '### 2026-06-08 15:00 PDT - good',
        '',
        '- **Trigger:** good',
        '',
        'not an entry header',
        '',
        '### malformed heading',
        '',
        '- **Trigger:** bad',
        '',
      ].join('\n'),
    ]);

    const result = runJournalCat();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      `raw/internal/dogfooding/mcp-interactions-journal-${MONTH}-codex.md:17`,
    );
    expect(result.stderr).toContain('entry header must start');
  });

  it('keeps the reviewer wrapper on actor shards and rejects invalid reviewer slugs before writing', () => {
    const wrapper = readFileSync(wrapperPath, 'utf-8');
    expect(wrapper).toContain('mcp-interactions-journal-$month-$REVIEWER_NAME.md');
    expect(wrapper).toContain('^[a-z][a-z0-9-]*$');

    for (const reviewerName of ['', 'Codex_Bad']) {
      const result = spawnSync(wrapperPath, [], {
        cwd: REPO,
        env: {
          ...process.env,
          REVIEWER_NAME: reviewerName,
          ECHO_REVIEW_QUEUE_REPO_ROOT: root,
        },
        encoding: 'utf-8',
      });
      expect(result.status).not.toBe(0);
    }

    const rawDir = journalDir();
    const shardFiles = existsSync(rawDir)
      ? readdirSync(rawDir).filter((name) => name.startsWith(`mcp-interactions-journal-${MONTH}`))
      : [];
    expect(shardFiles).toEqual([]);
  });
});
