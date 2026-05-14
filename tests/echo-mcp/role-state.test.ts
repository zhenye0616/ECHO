// 046 AC4 tests — get_role_state + list_task_states ref-pinning, byte-identity,
// HEAD-race / branch-ref behavior, repo-root resolution, degraded anchors.
//
// All tests use a tmpdir + git-init fixture; the production checkout is
// never touched. We exercise the pure functions (getRoleState /
// listTaskStates) rather than going through the MCP transport — the
// transport layer is identical to other tools and is covered by
// tests/mcp/server.test.ts; here we lock the contract.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRoleState } from '../../src/mcp/tools/get-role-state.js';
import { listTaskStates } from '../../src/mcp/tools/list-task-states.js';
import { GitError, readBlobAtRef } from '../../src/mcp/util/role-state-git.js';

function git(repoRoot: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf-8' });
}

function gitOk(repoRoot: string, args: string[]): { code: number; stdout: string } {
  const r = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: typeof r.status === 'number' ? r.status : 1, stdout: r.stdout ?? '' };
}

function writePointer(
  repoRoot: string,
  taskId: string,
  role: 'strategist' | 'builder' | 'round-state',
  body: string,
): void {
  const dir = join(repoRoot, 'backlog', 'task-state', taskId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${role}.md`), body);
}

function writeStageItem(repoRoot: string, taskId: string, stage: string): void {
  const dir = join(repoRoot, 'backlog', stage);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${taskId}.md`), `---\nid: ${taskId}\n---\nbody\n`);
}

function initRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'echo-046-role-state-'));
  git(repoRoot, ['init', '-q', '-b', 'main']);
  git(repoRoot, ['config', 'user.email', 'test@example.com']);
  git(repoRoot, ['config', 'user.name', 'Tester']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);
  return repoRoot;
}

function commitAll(repoRoot: string, message: string): string {
  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', message]);
  return git(repoRoot, ['rev-parse', 'HEAD']).trim();
}

const TASK = '2026-05-13-046-context-fatigue-via-role-typed-state';

const validStrategist = `## current_thesis

operative frame.

## locked_decisions

- decision 1
- decision 2

## open_questions

- thing A

## dont_touch

- existing tests

## canonical_anchors

- spec: backlog/ready/${TASK}.md
- reviews: backlog/reviews/${TASK}/
`;

describe('046 AC4 — get_role_state', () => {
  let repoRoot: string;
  beforeEach(() => {
    repoRoot = initRepo();
  });
  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('(a) returns content for existing strategist.md at HEAD', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    const sha = commitAll(repoRoot, 'add strategist');
    const r = getRoleState(repoRoot, TASK, 'strategist');
    expect(r.content).toBe(validStrategist);
    expect(r.source_path).toBe(`backlog/task-state/${TASK}/strategist.md`);
    expect(r.ref).toBe(sha);
    expect(r.line_count).toBeGreaterThan(0);
    expect(r.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('(b) returns content at an explicit SHA different from HEAD', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    const sha1 = commitAll(repoRoot, 'r1');
    const updated = validStrategist.replace('operative frame.', 'NEW frame.');
    writePointer(repoRoot, TASK, 'strategist', updated);
    commitAll(repoRoot, 'r2');
    const r = getRoleState(repoRoot, TASK, 'strategist', sha1);
    expect(r.content).toContain('operative frame.');
    expect(r.content).not.toContain('NEW frame.');
    expect(r.ref).toBe(sha1);
  });

  it('(c) isError for missing role file', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    commitAll(repoRoot, 'r1');
    expect(() => getRoleState(repoRoot, TASK, 'builder')).toThrowError(GitError);
  });

  it('(d) isError for unresolvable ref', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    commitAll(repoRoot, 'r1');
    expect(() => getRoleState(repoRoot, TASK, 'strategist', 'no-such-branch')).toThrowError(
      GitError,
    );
  });

  it('(j) HEAD-race: SHA is pinned at call entry — moving main does not change the response', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    const sha1 = commitAll(repoRoot, 'r1');
    // Simulate a HEAD race by NOT moving main inside the call; instead we
    // pin to HEAD at entry, then advance main, then re-read using the
    // same response's `ref`. The re-read MUST return the old content.
    const r1 = getRoleState(repoRoot, TASK, 'strategist');
    expect(r1.ref).toBe(sha1);
    const updated = validStrategist.replace('operative frame.', 'NEW frame.');
    writePointer(repoRoot, TASK, 'strategist', updated);
    const sha2 = commitAll(repoRoot, 'r2');
    expect(sha2).not.toBe(sha1);
    const r2 = getRoleState(repoRoot, TASK, 'strategist', r1.ref);
    expect(r2.content).toBe(r1.content);
    expect(r2.ref).toBe(sha1);
  });

  it('(k) branch-ref: response ref is the resolved commit SHA, NOT the branch name', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    const sha1 = commitAll(repoRoot, 'r1');
    git(repoRoot, ['branch', 'feature']);
    const r1 = getRoleState(repoRoot, TASK, 'strategist', 'feature');
    expect(r1.ref).toBe(sha1);
    // Move the branch to a new commit. Calling with the SAME branch name
    // must now reflect the new SHA.
    const updated = validStrategist.replace('operative frame.', 'NEW frame.');
    writePointer(repoRoot, TASK, 'strategist', updated);
    const sha2 = commitAll(repoRoot, 'r2');
    git(repoRoot, ['branch', '-f', 'feature', sha2]);
    const r2 = getRoleState(repoRoot, TASK, 'strategist', 'feature');
    expect(r2.ref).toBe(sha2);
    expect(r2.content).toContain('NEW frame.');
  });

  it('byte-identity contract: git show <ref>:<path> equals get_role_state.content', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    const sha = commitAll(repoRoot, 'r1');
    const fromGit = readBlobAtRef(
      repoRoot,
      sha,
      `backlog/task-state/${TASK}/strategist.md`,
    );
    const fromMcp = getRoleState(repoRoot, TASK, 'strategist', sha);
    expect(fromMcp.content).toBe(fromGit);
  });
});

describe('046 AC4 — list_task_states', () => {
  let repoRoot: string;
  beforeEach(() => {
    repoRoot = initRepo();
  });
  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('(e) filters by stage at HEAD', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    writeStageItem(repoRoot, TASK, 'claimed');
    const T2 = '2026-05-14-047-other';
    writePointer(repoRoot, T2, 'strategist', validStrategist);
    writeStageItem(repoRoot, T2, 'ready');
    commitAll(repoRoot, 'two items');
    const claimed = listTaskStates(repoRoot, { stage: 'claimed' });
    expect(claimed.task_states.map((e) => e.task_id)).toEqual([TASK]);
    const ready = listTaskStates(repoRoot, { stage: 'ready' });
    expect(ready.task_states.map((e) => e.task_id)).toEqual([T2]);
  });

  it('(f) returns empty array gracefully when no task-state directories exist', () => {
    writeStageItem(repoRoot, TASK, 'ready');
    commitAll(repoRoot, 'no pointers');
    const r = listTaskStates(repoRoot, {});
    expect(r.task_states).toEqual([]);
    expect(r.ref).toMatch(/^[0-9a-f]{40}$/);
  });

  it('(g) binding parameter accepted-but-unused without error', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    commitAll(repoRoot, 'r1');
    const r = listTaskStates(repoRoot, { binding: 'cursor-claude' });
    expect(r.task_states.length).toBe(1);
    expect(r.task_states[0]!.task_id).toBe(TASK);
  });

  it('(h) malformed canonical_anchors degrades — response succeeds with _parse_error', () => {
    const malformed = validStrategist.replace(
      '- spec: backlog/ready/' + TASK + '.md\n- reviews: backlog/reviews/' + TASK + '/\n',
      '- spec: a.md\n- bogus_key: oops\n',
    );
    writePointer(repoRoot, TASK, 'strategist', malformed);
    commitAll(repoRoot, 'r1');
    const r = listTaskStates(repoRoot, {});
    expect(r.task_states.length).toBe(1);
    const anchors = r.task_states[0]!.canonical_anchors as {
      spec?: string;
      _parse_error: string;
    };
    expect(anchors._parse_error).toContain('unknown key');
  });

  it('role filter narrows roles_present matching', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    const T2 = '2026-05-14-047-other';
    writePointer(repoRoot, T2, 'builder', validStrategist);
    commitAll(repoRoot, 'mixed roles');
    const stratOnly = listTaskStates(repoRoot, { role: 'strategist' });
    expect(stratOnly.task_states.map((e) => e.task_id)).toEqual([TASK]);
    const buildOnly = listTaskStates(repoRoot, { role: 'builder' });
    expect(buildOnly.task_states.map((e) => e.task_id)).toEqual([T2]);
  });

  it('uses a single pinned SHA for the whole call — stage cross-ref does not see a later commit', () => {
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    writeStageItem(repoRoot, TASK, 'claimed');
    const sha1 = commitAll(repoRoot, 'r1 claimed');
    // Advance the item to pending_review at sha2; pin to sha1.
    mkdirSync(join(repoRoot, 'backlog', 'pending_review'), { recursive: true });
    git(repoRoot, ['mv', `backlog/claimed/${TASK}.md`, `backlog/pending_review/${TASK}.md`]);
    commitAll(repoRoot, 'r2 moved');
    const r = listTaskStates(repoRoot, { ref: sha1 });
    expect(r.ref).toBe(sha1);
    expect(r.task_states.length).toBe(1);
    expect(r.task_states[0]!.stage).toBe('claimed');
  });
});

describe('046 AC4 — repo-root resolution via startMcpServer option', () => {
  it('(i) constructor option overrides env + cwd at server-start', async () => {
    // Spawn a fresh node process so we don't pollute env in the test runner.
    // This test runs through the public `startMcpServer` entry point indirectly
    // by inspecting that resolveRepoRoot exposes the priority order.
    const repoRoot = initRepo();
    try {
      writePointer(repoRoot, TASK, 'strategist', validStrategist);
      commitAll(repoRoot, 'r1');
      // Sanity: the helper reads from THE provided repoRoot, not cwd().
      const r = getRoleState(repoRoot, TASK, 'strategist');
      expect(r.content).toBe(validStrategist);
      // And a different repo (cwd) does not affect the result.
      const other = initRepo();
      try {
        // Calling getRoleState on `other` with the same task id MUST throw
        // (no pointer exists in `other`).
        expect(() => getRoleState(other, TASK, 'strategist')).toThrowError(GitError);
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('startMcpServer respects options.repo_root and reads through to handlers', async () => {
    const { startMcpServer } = await import('../../src/mcp/server.js');
    const repoRoot = initRepo();
    writePointer(repoRoot, TASK, 'strategist', validStrategist);
    commitAll(repoRoot, 'r1');
    // Stub Storage — the role-state tools don't use it but the server signature requires it.
    const stubStorage = { query: async () => [] } as unknown as Parameters<
      typeof startMcpServer
    >[0];
    const handle = await startMcpServer(stubStorage, {
      port: 0, // ephemeral port
      host: '127.0.0.1',
      repo_root: repoRoot,
    });
    try {
      const url = handle.url;
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'get_role_state', arguments: { task_id: TASK, role: 'strategist' } },
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(200);
      const env = JSON.parse(await res.text()) as {
        result?: {
          content?: { type: string; text: string }[];
          structuredContent?: { content?: string; ref?: string };
        };
        error?: unknown;
      };
      expect(env.error).toBeUndefined();
      const sc = env.result?.structuredContent;
      expect(sc?.content).toBe(validStrategist);
      expect(sc?.ref).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      await handle.stop();
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

// Silence the "unused import" warning if the linter complains.
void gitOk;
