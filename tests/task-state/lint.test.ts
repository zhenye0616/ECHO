import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const LINT = join(REPO, 'tools/task-state/lint.py');

let cachedPython: { cmd: string; args: string[] } | null = null;

function tryPython(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, [...args, '-c', 'import sys'], { stdio: 'ignore' });
  return r.status === 0;
}

function pythonInvocation(): { cmd: string; args: string[] } {
  if (cachedPython) return cachedPython;
  if (tryPython('python3', [])) {
    cachedPython = { cmd: 'python3', args: [] };
  } else if (process.platform === 'darwin' && tryPython('arch', ['-arm64', 'python3'])) {
    cachedPython = { cmd: 'arch', args: ['-arm64', 'python3'] };
  } else {
    throw new Error('python3 not available');
  }
  return cachedPython;
}

function runLint(targetFiles: string[]): { code: number; stderr: string } {
  const { cmd, args } = pythonInvocation();
  const r = spawnSync(cmd, [...args, LINT, ...targetFiles], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    code: typeof r.status === 'number' ? r.status : 1,
    stderr: r.stderr ?? '',
  };
}

function buildPointer(opts: {
  blocks?: string[];
  bodyPad?: number;
  frontmatter?: string;
  currentRound?: string | null;
}): string {
  const blocks =
    opts.blocks ??
    ['current_thesis', 'locked_decisions', 'open_questions', 'dont_touch', 'canonical_anchors'];
  const lines: string[] = [];
  if (opts.frontmatter !== undefined) {
    lines.push('---', opts.frontmatter, '---');
  }
  if (opts.currentRound !== undefined && opts.currentRound !== null) {
    lines.push(opts.currentRound, '');
  }
  for (const b of blocks) {
    lines.push(`## ${b}`, '', '(placeholder)', '');
  }
  if (opts.bodyPad && opts.bodyPad > 0) {
    for (let i = 0; i < opts.bodyPad; i++) lines.push(`pad-${i}`);
  }
  return lines.join('\n') + '\n';
}

describe('tools/task-state/lint.py', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-task-state-lint-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writePointer(name: string, content: string): string {
    const p = join(dir, name);
    writeFileSync(p, content);
    return p;
  }

  it('(a) under-cap pointer with all blocks in order passes', () => {
    const p = writePointer('strategist.md', buildPointer({}));
    const r = runLint([p]);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('(b) over-cap fails with line count surfaced', () => {
    // 25 lines of base content + 110 pad lines = 135 > 120
    const p = writePointer('strategist.md', buildPointer({ bodyPad: 110 }));
    const r = runLint([p]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/exceeds hard cap of 120/);
    expect(r.stderr).toMatch(/\d+/); // a count is surfaced
  });

  it('(c) missing required block fails with the field name surfaced', () => {
    const p = writePointer(
      'strategist.md',
      buildPointer({
        blocks: ['current_thesis', 'locked_decisions', 'open_questions', 'dont_touch'],
      }),
    );
    const r = runLint([p]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/missing-required-block: canonical_anchors/);
  });

  it('(d) wrong-order blocks fail', () => {
    const p = writePointer(
      'strategist.md',
      buildPointer({
        blocks: [
          'locked_decisions',
          'current_thesis',
          'open_questions',
          'dont_touch',
          'canonical_anchors',
        ],
      }),
    );
    const r = runLint([p]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/required-block-out-of-order/);
  });

  it('(e) frontmatter-only file fails with missing-required-block: current_thesis', () => {
    const p = writePointer('strategist.md', '---\nname: empty\n---\n\n');
    const r = runLint([p]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/missing-required-block: current_thesis/);
  });

  it('round-state.md without current_round header fails', () => {
    const p = writePointer('round-state.md', buildPointer({}));
    const r = runLint([p]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/current_round/);
  });

  it('round-state.md with current_round: r3 passes', () => {
    const p = writePointer(
      'round-state.md',
      buildPointer({ currentRound: 'current_round: r3' }),
    );
    const r = runLint([p]);
    expect(r.code, r.stderr).toBe(0);
  });

  it('soft-warn threshold prints a warning but does not fail', () => {
    // 20 lines base + 65 pad lines = 85, between 81 and 120
    const p = writePointer('strategist.md', buildPointer({ bodyPad: 65 }));
    const r = runLint([p]);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).toMatch(/warning:/);
    expect(r.stderr).toMatch(/soft-warn threshold/);
  });

  it('discovers files via backlog/task-state when no args passed', () => {
    // Build a faux repo layout under tmp dir
    const taskStateDir = join(dir, 'backlog', 'task-state', '2026-fixture');
    mkdirSync(taskStateDir, { recursive: true });
    writeFileSync(join(taskStateDir, 'strategist.md'), buildPointer({}));
    const { cmd, args } = pythonInvocation();
    const env = { ...process.env, ECHO_TASK_STATE_REPO_ROOT: dir };
    const r = spawnSync(cmd, [...args, LINT], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    expect(r.status, r.stderr ?? '').toBe(0);
  });
});
