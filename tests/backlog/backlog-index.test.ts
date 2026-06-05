import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const BACKLOG_INDEX = join(process.cwd(), 'tools/backlog_index.py');
const BLOCKED = join(process.cwd(), 'tools/blocked.py');

function runPython(args: string[], cwd = process.cwd()): string {
  return execFileSync('python3', args, { cwd, encoding: 'utf-8' });
}

function writeItem(root: string, stage: string, id: string, title: string): string {
  const dir = join(root, 'backlog', stage);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${id}.md`);
  writeFileSync(
    path,
    [
      '---',
      `id: ${id}`,
      `title: "${title}"`,
      'priority: HIGH',
      'estimate: 1d',
      'created: 2026-06-03',
      'blocked_by: []',
      '---',
      '',
      '# Body',
      '',
    ].join('\n'),
  );
  return path;
}

function sealReady(path: string): void {
  const digest = runPython([BLOCKED, '--ready-content-sha', path]).trim();
  const text = readFileSync(path, 'utf-8');
  writeFileSync(path, text.replace('---\n\n# Body', `ready_content_sha: ${digest}\n---\n\n# Body`));
}

describe('tools/backlog_index.py', () => {
  let root = '';

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = '';
  });

  it('renders Proposed and Ready tables from backlog folder state', () => {
    root = mkdtempSync(join(tmpdir(), 'echo-backlog-index-'));
    mkdirSync(join(root, '.git'));
    for (const stage of ['proposed', 'ready', 'claimed', 'pending_review', 'complete']) {
      mkdirSync(join(root, 'backlog', stage), { recursive: true });
    }
    writeItem(root, 'proposed', '2026-06-03-001-proposed-item', 'Proposed item');
    const ready = writeItem(root, 'ready', '2026-06-03-002-ready-item', 'Ready item');
    sealReady(ready);
    writeItem(root, 'ready', '2026-06-03-003-stale-ready', 'Stale ready');

    const rendered = runPython([BACKLOG_INDEX, '--repo-root', root, '--print']);
    expect(rendered).toMatch(/## Proposed/);
    expect(rendered).toMatch(/backlog\/proposed\/2026-06-03-001-proposed-item\.md/);
    expect(rendered).toMatch(/## Ready/);
    expect(rendered).toMatch(/READY \| HIGH/);
    expect(rendered).toMatch(/BLOCKED: missing-ready-content-sha/);
  });

  it('--check is fixture-only and does not compare live docs/BACKLOG.md', () => {
    const out = runPython([BACKLOG_INDEX, '--check']);
    expect(out).toMatch(/fixture check passed/);
  });
});
