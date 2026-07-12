import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  listTaskStates,
  type ListTaskStatesResult,
} from '../../../src/mcp/tools/list-task-states.js';
import {
  defaultGitRunner,
  GitError,
  type GitRunOptions,
  type GitRunResult,
  type GitRunner,
} from '../../../src/mcp/util/role-state-git.js';
import { buildListTaskStatesFixture } from './fixtures/build-list-task-states-fixture.js';

interface LedgerEntry {
  args: string[];
  inputLines: number;
  maxBuffer: number | null;
  stdoutBytes: number;
}

const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/list-task-states-baseline.json', import.meta.url), 'utf-8'),
) as ListTaskStatesResult;

function canonicalizeLastUpdated(result: ListTaskStatesResult): ListTaskStatesResult {
  return {
    ...result,
    task_states: result.task_states.map((state) => ({
      ...state,
      last_updated: new Date(state.last_updated).toISOString(),
    })),
  };
}

function ledgerRunner(ledger: LedgerEntry[]): GitRunner {
  return (repoRoot: string, args: string[], options: GitRunOptions = {}): GitRunResult => {
    const result = defaultGitRunner(repoRoot, args, options);
    ledger.push({
      args: [...args],
      inputLines:
        options.input === undefined
          ? 0
          : options.input.split('\n').filter((line) => line.length > 0).length,
      maxBuffer: options.maxBuffer ?? null,
      stdoutBytes: result.stdoutBuffer.length,
    });
    return result;
  };
}

describe('111 — list_task_states batched git reads', () => {
  const cleanups: (() => void)[] = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  });

  it('matches the checked-in baseline and uses the fixed 8-child git budget', () => {
    const fixture = buildListTaskStatesFixture();
    cleanups.push(fixture.cleanup);
    const ledger: LedgerEntry[] = [];

    const result = listTaskStates(fixture.repoRoot, {}, { gitRunner: ledgerRunner(ledger) });

    // Git 2.54+ may render a UTC %cI timestamp with `Z`, while older Git
    // renders the equivalent `+00:00`. Compare the instant, not the spelling.
    expect(canonicalizeLastUpdated(result)).toEqual(canonicalizeLastUpdated(baseline));
    expect(result.ref).toBe(fixture.ref);
    expect(ledger.map((entry) => entry.args)).toEqual([
      ['rev-parse', '--verify', 'HEAD^{commit}'],
      ['ls-tree', '-r', '--name-only', fixture.ref, 'backlog/task-state/'],
      ['ls-tree', '-r', '--name-only', fixture.ref, 'backlog/ready/'],
      ['ls-tree', '-r', '--name-only', fixture.ref, 'backlog/claimed/'],
      ['ls-tree', '-r', '--name-only', fixture.ref, 'backlog/pending_review/'],
      ['ls-tree', '-r', '--name-only', fixture.ref, 'backlog/complete/'],
      ['cat-file', '--batch'],
      ['log', '--format=%cI', '--name-only', fixture.ref, '--', 'backlog/task-state/'],
    ]);
    expect(ledger).toHaveLength(8);
    expect(ledger[6]!.inputLines).toBe(6);
  });

  it('cleans up the injected batched read failure path across repeated calls', () => {
    const fixture = buildListTaskStatesFixture();
    cleanups.push(fixture.cleanup);
    let activeBatchChildren = 0;
    const runner: GitRunner = (
      repoRoot: string,
      args: string[],
      options: GitRunOptions = {},
    ): GitRunResult => {
      if (args[0] === 'cat-file' && args[1] === '--batch') {
        activeBatchChildren += 1;
        try {
          const stdoutBuffer = Buffer.from('not-a-valid-batch-header\n');
          return {
            code: 0,
            stdout: stdoutBuffer.toString('utf-8'),
            stderr: '',
            stdoutBuffer,
          };
        } finally {
          activeBatchChildren -= 1;
        }
      }
      return defaultGitRunner(repoRoot, args, options);
    };

    for (let i = 0; i < 3; i += 1) {
      expect(() => listTaskStates(fixture.repoRoot, {}, { gitRunner: runner })).toThrow(GitError);
      expect(activeBatchChildren).toBe(0);
    }
  });

  it('handles high-cardinality batched blob output with a growth-sized buffer', () => {
    const fixture = buildListTaskStatesFixture({
      extraCompleteTasks: 600,
      bodyPaddingBytes: 2048,
    });
    cleanups.push(fixture.cleanup);
    const ledger: LedgerEntry[] = [];

    const result = listTaskStates(fixture.repoRoot, {}, { gitRunner: ledgerRunner(ledger) });

    expect(result.task_states).toHaveLength(606);
    expect(ledger).toHaveLength(8);
    const catFile = ledger[6]!;
    expect(catFile.args).toEqual(['cat-file', '--batch']);
    expect(catFile.inputLines).toBe(606);
    expect(catFile.stdoutBytes).toBeGreaterThan(1024 * 1024);
    expect(catFile.maxBuffer).toBeGreaterThan(catFile.stdoutBytes);
  });
});
