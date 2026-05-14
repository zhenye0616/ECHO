// 048 AC5 — tools/task-state/patch-builder-state.py behavior contract.
//
// Asserts that the patcher honors AC1: schema-compliant anchors, frontmatter
// handoff metadata, patcher-owned marker idempotence, byte-for-byte
// preservation of locked_decisions / dont_touch, missing-pointer no-op, and
// fail-closed semantics on malformed existing pointers. All fixtures live
// under a tmp dir so the live repo state is never touched.

import { spawnSync } from 'node:child_process';
import {
  existsSync,
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
const PATCHER = join(REPO, 'tools/task-state/patch-builder-state.py');
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

interface RunResult {
  code: number;
  stderr: string;
  stdout: string;
}

function runPatcher(opts: {
  repoRoot: string;
  taskId: string;
  outcome: 'complete' | 'escalated' | (string & {});
  specPath: string;
  branch?: string;
  headSha?: string;
  runLog?: string;
}): RunResult {
  const { cmd, args } = pythonInvocation();
  const argv = [
    ...args,
    PATCHER,
    '--task-id',
    opts.taskId,
    '--outcome',
    opts.outcome,
    '--spec-path',
    opts.specPath,
    '--repo-root',
    opts.repoRoot,
  ];
  if (opts.branch !== undefined) argv.push('--branch', opts.branch);
  if (opts.headSha !== undefined) argv.push('--head-sha', opts.headSha);
  if (opts.runLog !== undefined) argv.push('--run-log', opts.runLog);
  const r = spawnSync(cmd, argv, { encoding: 'utf-8' });
  return {
    code: typeof r.status === 'number' ? r.status : 1,
    stderr: r.stderr ?? '',
    stdout: r.stdout ?? '',
  };
}

function runLint(pointerPath: string): RunResult {
  const { cmd, args } = pythonInvocation();
  const r = spawnSync(cmd, [...args, LINT, pointerPath], { encoding: 'utf-8' });
  return {
    code: typeof r.status === 'number' ? r.status : 1,
    stderr: r.stderr ?? '',
    stdout: r.stdout ?? '',
  };
}

const TASK_ID = 'test-task';
const POINTER_REL = `backlog/task-state/${TASK_ID}/builder.md`;

const HEALTHY_POINTER = `---
task_id: ${TASK_ID}
role: builder
writer: claude-code-builder
last_updated: 2026-05-13T00:00:00Z
---

## current_thesis

Initial claim of test-task. Building feature X to address Y.

The implementation crosses multiple files; this paragraph is intentionally
multi-sentence so the test can assert preservation of pre-existing prose
around the patcher-owned marker block.

## locked_decisions

- Pick A over B because reason Z.
- Pick C over D because reason W.

## open_questions

- Will founder approve E?
- Is F still in scope?

## dont_touch

- wiki/ — strategist edits only.
- docs/STATUS.md — founder owned.

## canonical_anchors

- spec: backlog/claimed/test-task.md
- reviews: backlog/reviews/test-task/
- branch: agent/test-task
- worktree: ~/Desktop/Project_echo--test-task/
- run_log: raw/internal/agent-runs/2026-05-14-test-task.md
- head_sha: deadbeef
`;

function setupPointer(root: string, content: string): string {
  const dir = join(root, 'backlog', 'task-state', TASK_ID);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'builder.md');
  writeFileSync(path, content);
  return path;
}

describe('tools/task-state/patch-builder-state.py', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'echo-048-patcher-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('complete handoff: rewrites spec anchor, writes handoff_head_sha frontmatter, keeps anchors schema-compliant, passes lint', () => {
    const pointer = setupPointer(root, HEALTHY_POINTER);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      branch: `agent/${TASK_ID}`,
      headSha: 'cafe1234567',
      runLog: `raw/internal/agent-runs/2026-05-14-${TASK_ID}.md`,
    });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(pointer, 'utf-8');

    // Frontmatter handoff metadata is in the frontmatter, not anchors.
    expect(after).toMatch(/handoff_head_sha: cafe1234567/);
    expect(after).toMatch(/handoff_branch: agent\/test-task/);
    expect(after).toMatch(
      /handoff_run_log: raw\/internal\/agent-runs\/2026-05-14-test-task\.md/,
    );
    // last_updated refreshed to a UTC iso-Z stamp.
    expect(after).toMatch(/last_updated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);

    // spec anchor now points at the pending_review path.
    expect(after).toMatch(
      /- spec: backlog\/pending_review\/test-task\.md/,
    );
    // reviews preserved.
    expect(after).toMatch(/- reviews: backlog\/reviews\/test-task\//);
    // Schema-compliant: no legacy anchor keys survive in the anchors block.
    const anchorsBlock = after.split('## canonical_anchors')[1] ?? '';
    expect(anchorsBlock).not.toMatch(/^\s*- (branch|worktree|run_log|head_sha):/m);

    // Patcher-owned marker block present in current_thesis.
    expect(after).toMatch(
      /<!-- builder-state-handoff:start -->\n- Lifecycle: COMPLETE — ready for review at cafe1234567\.\n<!-- builder-state-handoff:end -->/,
    );

    // Pre-existing prose around the marker is preserved.
    expect(after).toMatch(
      /Initial claim of test-task\. Building feature X to address Y\./,
    );
    expect(after).toMatch(/multi-sentence so the test can assert preservation/);

    // Lint passes on the patched output.
    const lint = runLint(pointer);
    expect(lint.code, lint.stderr).toBe(0);
  });

  it('complete handoff: marker block appended once when absent, replaced exactly once when present', () => {
    const pointer = setupPointer(root, HEALTHY_POINTER);

    const r1 = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      headSha: 'sha-one',
    });
    expect(r1.code, r1.stderr).toBe(0);
    const afterOne = readFileSync(pointer, 'utf-8');
    expect(afterOne.match(/<!-- builder-state-handoff:start -->/g)?.length).toBe(1);
    expect(afterOne.match(/<!-- builder-state-handoff:end -->/g)?.length).toBe(1);
    expect(afterOne).toMatch(
      /- Lifecycle: COMPLETE — ready for review at sha-one\./,
    );

    const r2 = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      headSha: 'sha-two',
    });
    expect(r2.code, r2.stderr).toBe(0);
    const afterTwo = readFileSync(pointer, 'utf-8');
    // Still exactly one marker pair.
    expect(afterTwo.match(/<!-- builder-state-handoff:start -->/g)?.length).toBe(1);
    expect(afterTwo.match(/<!-- builder-state-handoff:end -->/g)?.length).toBe(1);
    // Lifecycle line updated to the new head_sha.
    expect(afterTwo).toMatch(
      /- Lifecycle: COMPLETE — ready for review at sha-two\./,
    );
    expect(afterTwo).not.toMatch(
      /- Lifecycle: COMPLETE — ready for review at sha-one\./,
    );
  });

  it('complete handoff with empty head_sha uses the canonical "none" fallback', () => {
    setupPointer(root, HEALTHY_POINTER);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      headSha: '',
    });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(root, POINTER_REL), 'utf-8');
    expect(after).toMatch(
      /- Lifecycle: COMPLETE — ready for review at none\./,
    );
  });

  it('complete handoff preserves non-empty open_questions byte-for-byte', () => {
    setupPointer(root, HEALTHY_POINTER);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      headSha: 'sha-x',
    });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(root, POINTER_REL), 'utf-8');
    // The original open_questions content stands; no patcher-owned open_q markers.
    expect(after).toMatch(
      /## open_questions\n\n- Will founder approve E\?\n- Is F still in scope\?/,
    );
    expect(after).not.toMatch(/builder-state-handoff-open-questions/);
  });

  it('locked_decisions and dont_touch are preserved byte-for-byte after complete handoff', () => {
    setupPointer(root, HEALTHY_POINTER);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      headSha: 'sha-y',
    });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(root, POINTER_REL), 'utf-8');

    const lockedOriginal =
      HEALTHY_POINTER.split('## locked_decisions')[1].split('## open_questions')[0];
    const lockedAfter =
      after.split('## locked_decisions')[1].split('## open_questions')[0];
    expect(lockedAfter).toBe(lockedOriginal);

    const dontOriginal =
      HEALTHY_POINTER.split('## dont_touch')[1].split('## canonical_anchors')[0];
    const dontAfter =
      after.split('## dont_touch')[1].split('## canonical_anchors')[0];
    expect(dontAfter).toBe(dontOriginal);
  });

  it('escalated handoff appends an escalation marker in open_questions when non-empty', () => {
    setupPointer(root, HEALTHY_POINTER);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'escalated',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      headSha: '',
      runLog: `raw/internal/agent-runs/2026-05-14-${TASK_ID}.md`,
    });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(root, POINTER_REL), 'utf-8');

    // Lifecycle marker in current_thesis uses the ESCALATED canonical wording.
    expect(after).toMatch(
      /- Lifecycle: ESCALATED — see agent_notes and raw\/internal\/agent-runs\/2026-05-14-test-task\.md for blocker\./,
    );

    // Open-questions marker block present, exactly once.
    expect(
      after.match(/<!-- builder-state-handoff-open-questions:start -->/g)?.length,
    ).toBe(1);
    expect(
      after.match(/<!-- builder-state-handoff-open-questions:end -->/g)?.length,
    ).toBe(1);
    // Original open-questions bullets preserved alongside the marker block.
    expect(after).toMatch(/- Will founder approve E\?/);
    expect(after).toMatch(/- Is F still in scope\?/);

    // locked_decisions preserved byte-for-byte even on escalation.
    const lockedOriginal =
      HEALTHY_POINTER.split('## locked_decisions')[1].split('## open_questions')[0];
    const lockedAfter =
      after.split('## locked_decisions')[1].split('## open_questions')[0];
    expect(lockedAfter).toBe(lockedOriginal);

    // Re-run on the same file: marker count stays at 1 (idempotent replacement).
    const r2 = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'escalated',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      runLog: `raw/internal/agent-runs/2026-05-14-${TASK_ID}.md`,
    });
    expect(r2.code, r2.stderr).toBe(0);
    const afterTwo = readFileSync(join(root, POINTER_REL), 'utf-8');
    expect(
      afterTwo.match(/<!-- builder-state-handoff-open-questions:start -->/g)
        ?.length,
    ).toBe(1);

    const lint = runLint(join(root, POINTER_REL));
    expect(lint.code, lint.stderr).toBe(0);
  });

  it('escalated handoff on empty open_questions inserts the non-marker fallback line', () => {
    const variant = HEALTHY_POINTER.replace(
      /## open_questions\n\n- Will founder approve E\?\n- Is F still in scope\?\n/,
      '## open_questions\n\n',
    );
    setupPointer(root, variant);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'escalated',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
      runLog: `raw/internal/agent-runs/2026-05-14-${TASK_ID}.md`,
    });
    expect(r.code, r.stderr).toBe(0);
    const after = readFileSync(join(root, POINTER_REL), 'utf-8');
    expect(after).toMatch(
      /## open_questions\n\n- See agent_notes and run log for the escalation question\.\n/,
    );
    // No marker block in open_questions because the source was empty.
    expect(after).not.toMatch(/builder-state-handoff-open-questions/);
  });

  it('missing builder.md is a no-op: exit 0, no generic replacement pointer created', () => {
    // No setupPointer call; the directory does not exist.
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
    });
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(join(root, POINTER_REL))).toBe(false);
  });

  it('malformed builder.md missing canonical_anchors: exit non-zero, file unchanged', () => {
    const malformed = HEALTHY_POINTER.replace(
      /## canonical_anchors[\s\S]*$/,
      '',
    );
    const pointer = setupPointer(root, malformed);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
    });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/canonical_anchors/);
    expect(readFileSync(pointer, 'utf-8')).toBe(malformed);
  });

  it('malformed builder.md with blocks out of order: exit non-zero, file unchanged', () => {
    const reordered = HEALTHY_POINTER.replace(
      /(## current_thesis[\s\S]*?)(## locked_decisions[\s\S]*?)(## open_questions)/,
      '$2$1$3',
    );
    const pointer = setupPointer(root, reordered);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
    });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/out of order/);
    expect(readFileSync(pointer, 'utf-8')).toBe(reordered);
  });

  it('malformed builder.md with YAML-invalid frontmatter: exit non-zero, file unchanged', () => {
    const broken = `---
task_id: ${TASK_ID}
this line has no colon
---

## current_thesis

x

## locked_decisions

y

## open_questions

z

## dont_touch

w

## canonical_anchors

- spec: backlog/claimed/${TASK_ID}.md
`;
    const pointer = setupPointer(root, broken);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'complete',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
    });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/invalid frontmatter line/);
    expect(readFileSync(pointer, 'utf-8')).toBe(broken);
  });

  it('invalid --outcome exits non-zero without writing misleading state', () => {
    const pointer = setupPointer(root, HEALTHY_POINTER);
    const r = runPatcher({
      repoRoot: root,
      taskId: TASK_ID,
      outcome: 'partial',
      specPath: `backlog/pending_review/${TASK_ID}.md`,
    });
    expect(r.code).not.toBe(0);
    expect(readFileSync(pointer, 'utf-8')).toBe(HEALTHY_POINTER);
  });
});
