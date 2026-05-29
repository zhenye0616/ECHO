import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  consecutiveBlindRoundCount,
  projectPlaybookDecisions,
  readCombinedRounds,
} from '../../src/mcp/tools/internal/decision-source-playbook.js';
import {
  pendingDecisions,
  registerPendingDecisions,
  resetPendingDecisionsGitCache,
  type GitRunner,
} from '../../src/mcp/tools/pending-decisions.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const ITEM_ID = '2026-05-28-078-decision-card-board';

function frontmatter(fields: Record<string, string | number | boolean | null>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${value === null ? 'null' : String(value)}`);
  }
  lines.push('---', '', 'body', '');
  return lines.join('\n');
}

function writeItem(root: string, stage: 'ready' | 'claimed' | 'pending_review' | 'complete', id = ITEM_ID): void {
  mkdirSync(join(root, 'backlog', stage), { recursive: true });
  writeFileSync(
    join(root, 'backlog', stage, `${id}.md`),
    frontmatter({ id, title: 'Decision Card Board' }),
  );
}

function writeCombined(
  root: string,
  itemId: string,
  round: number,
  fields: Partial<{ escalated_to_founder: boolean; next_round: number | null; combined_verdict: string }> = {},
): void {
  const dir = join(root, 'backlog', 'reviews', itemId, `r${round}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'combined.md'),
    frontmatter({
      item_id: itemId,
      round,
      codex_response: 'codex.md',
      'codex-ops_response': 'codex-ops.md',
      next_round: fields.next_round ?? null,
      combined_verdict: fields.combined_verdict ?? 'proceed',
      ...(fields.escalated_to_founder !== undefined ? { escalated_to_founder: fields.escalated_to_founder } : {}),
    }),
  );
}

function makeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'echo-pending-decisions-'));
  mkdirSync(join(root, 'backlog', 'ready'), { recursive: true });
  mkdirSync(join(root, 'backlog', 'claimed'), { recursive: true });
  mkdirSync(join(root, 'backlog', 'pending_review'), { recursive: true });
  mkdirSync(join(root, 'backlog', 'complete'), { recursive: true });
  return root;
}

function fakeGit(argsByCall: (args: readonly string[]) => { ok: boolean; stdout: string; timedOut?: boolean }): GitRunner {
  return async (_repoRoot, args) => argsByCall(args);
}

describe('pending_decisions playbook adapter', () => {
  let root: string;

  beforeEach(() => {
    root = makeRepo();
    resetPendingDecisionsGitCache();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('opens a card for an explicit founder escalation', () => {
    writeItem(root, 'ready');
    writeCombined(root, ITEM_ID, 1, { escalated_to_founder: true, combined_verdict: 'divergent' });

    const result = projectPlaybookDecisions(root);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]!.id).toBe(`${ITEM_ID}#r1`);
    expect(result.decisions[0]!.whyNow).toContain('escalated to founder');
    expect(result.decisions[0]!.signals).toEqual([]);
  });

  it('removes the card when the item leaves active backlog dirs', () => {
    writeItem(root, 'complete');
    writeCombined(root, ITEM_ID, 1, { escalated_to_founder: true, combined_verdict: 'divergent' });

    expect(projectPlaybookDecisions(root).decisions).toEqual([]);
  });

  it('fires A1 after four consecutive blind rounds and resets on founder touch', () => {
    writeItem(root, 'pending_review');
    for (let round = 1; round <= 4; round += 1) {
      writeCombined(root, ITEM_ID, round, { escalated_to_founder: false });
    }

    const firing = projectPlaybookDecisions(root);
    expect(firing.decisions).toHaveLength(1);
    expect(firing.decisions[0]!.signals).toEqual([
      { kind: 'runaway_churn', detail: 'churned 4 rounds without pulling you in' },
    ]);

    writeCombined(root, ITEM_ID, 5, { escalated_to_founder: true, combined_verdict: 'divergent' });
    writeCombined(root, ITEM_ID, 6, { escalated_to_founder: false });
    const rounds = readCombinedRounds(root, ITEM_ID);
    expect(consecutiveBlindRoundCount(rounds)).toBe(1);
    expect(projectPlaybookDecisions(root).decisions).toEqual([]);
  });

  it('uses next_round as the unresolved marker, not request.md presence', () => {
    writeItem(root, 'ready');
    writeCombined(root, ITEM_ID, 1, { escalated_to_founder: true, next_round: 2, combined_verdict: 'divergent' });
    mkdirSync(join(root, 'backlog', 'reviews', ITEM_ID, 'r2'), { recursive: true });
    writeFileSync(join(root, 'backlog', 'reviews', ITEM_ID, 'r2', 'request.md'), frontmatter({ item_id: ITEM_ID, round: 2 }));

    expect(projectPlaybookDecisions(root).decisions).toEqual([]);
  });

  it('tolerates older combined.md files missing escalated_to_founder', () => {
    writeItem(root, 'claimed');
    writeCombined(root, ITEM_ID, 1);

    const result = projectPlaybookDecisions(root, { staleTouchThreshold: 1 });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]!.signals[0]?.kind).toBe('runaway_churn');
  });

  it('the real 072 review sequence triggers A1 above the default threshold', () => {
    const rounds = readCombinedRounds(process.cwd(), '2026-05-25-072-adapter-sync-engine');
    expect(rounds.length).toBeGreaterThanOrEqual(4);
    expect(consecutiveBlindRoundCount(rounds)).toBeGreaterThanOrEqual(4);
  });

  it('scans only active backlog items and reports partial when the active scan budget is hit', () => {
    for (let i = 1; i <= 25; i += 1) {
      const completedId = `2026-05-01-${String(i).padStart(3, '0')}-done`;
      writeCombined(root, completedId, 1, { escalated_to_founder: true });
    }
    for (let i = 1; i <= 3; i += 1) {
      const activeId = `2026-05-28-10${i}-active-${i}`;
      writeItem(root, i === 1 ? 'ready' : 'claimed', activeId);
      writeCombined(root, activeId, 1, { escalated_to_founder: true });
    }

    const result = projectPlaybookDecisions(root, { scanLimit: 2 });

    expect(result.scanned_items).toBe(2);
    expect(result.partial).toBe(true);
    expect(result.source_breakdown.review_rounds).toBe(2);
    expect(result.decisions).toHaveLength(2);
  });
});

describe('pending_decisions freshness', () => {
  let root: string;

  beforeEach(() => {
    root = makeRepo();
    writeItem(root, 'ready');
    writeCombined(root, ITEM_ID, 1, { escalated_to_founder: true });
    resetPendingDecisionsGitCache();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('reports behind and dirty state from git', async () => {
    const result = await pendingDecisions(
      { repo_path: root },
      {
        now: () => new Date('2026-05-29T00:00:00.000Z'),
        git: fakeGit((args) => {
          const joined = args.join(' ');
          if (joined === 'fetch origin main') return { ok: true, stdout: '' };
          if (joined === 'rev-parse HEAD') return { ok: true, stdout: 'local-sha\n' };
          if (joined === 'rev-parse --verify origin/main') return { ok: true, stdout: 'upstream-sha\n' };
          if (joined === 'rev-list --count HEAD..origin/main') return { ok: true, stdout: '2\n' };
          if (joined === 'status --porcelain -- backlog') return { ok: true, stdout: ' M backlog/claimed/item.md\n' };
          return { ok: false, stdout: '' };
        }),
      },
    );

    expect(result.source_state).toMatchObject({
      local_head: 'local-sha',
      upstream_head: 'upstream-sha',
      behind: 2,
      upstream_checked_at: '2026-05-29T00:00:00.000Z',
      upstream_stale: false,
      dirty: true,
    });
  });

  it('keeps last upstream_checked_at and warns stale when refresh later fails', async () => {
    let fetchOk = true;
    const git = fakeGit((args) => {
      const joined = args.join(' ');
      if (joined === 'fetch origin main') return fetchOk ? { ok: true, stdout: '' } : { ok: false, stdout: '' };
      if (joined === 'rev-parse HEAD') return { ok: true, stdout: 'local\n' };
      if (joined === 'rev-parse --verify origin/main') return { ok: true, stdout: 'upstream\n' };
      if (joined === 'rev-list --count HEAD..origin/main') return { ok: true, stdout: '1\n' };
      if (joined === 'status --porcelain -- backlog') return { ok: true, stdout: '' };
      return { ok: false, stdout: '' };
    });

    await pendingDecisions({ repo_path: root }, { now: () => new Date('2026-05-29T00:00:00.000Z'), git });
    fetchOk = false;
    const result = await pendingDecisions(
      { repo_path: root },
      { now: () => new Date('2026-05-29T00:01:01.000Z'), git },
    );

    expect(result.source_state.upstream_checked_at).toBe('2026-05-29T00:00:00.000Z');
    expect(result.source_state.upstream_stale).toBe(true);
    expect(result.source_state.behind).toBe(1);
  });

  it('treats hung fetch as offline and still returns cards', async () => {
    const result = await pendingDecisions(
      { repo_path: root },
      {
        now: () => new Date('2026-05-29T00:00:00.000Z'),
        git: fakeGit((args) => {
          const joined = args.join(' ');
          if (joined === 'fetch origin main') return { ok: false, stdout: '', timedOut: true };
          if (joined === 'rev-parse HEAD') return { ok: true, stdout: 'local\n' };
          if (joined === 'rev-parse --verify origin/main') return { ok: true, stdout: 'upstream\n' };
          if (joined === 'rev-list --count HEAD..origin/main') return { ok: true, stdout: '0\n' };
          if (joined === 'status --porcelain -- backlog') return { ok: true, stdout: '' };
          return { ok: false, stdout: '' };
        }),
      },
    );

    expect(result.decisions).toHaveLength(1);
    expect(result.source_state.upstream_stale).toBe(true);
    expect(result.source_state.upstream_checked_at).toBeNull();
  });
});

describe('pending_decisions MCP registration', () => {
  let handle: McpServerHandle | null = null;

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
  });

  it('is registered by startMcpServer', async () => {
    handle = await startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false });
    const transport = new StreamableHTTPClientTransport(new URL(handle.url));
    const client = new Client({ name: 'echo-test', version: '0.0.0' });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      expect(tools.tools.some((tool) => tool.name === 'pending_decisions')).toBe(true);
    } finally {
      await client.close();
    }
  });

  it('exposes a read-only tool handler shape without storage dependencies', async () => {
    const server = {
      registerTool: (_name: string, _config: unknown, handler: (input: unknown) => unknown) => {
        expect(_name).toBe('pending_decisions');
        expect(_config).toMatchObject({ annotations: { readOnlyHint: true } });
        expect(typeof handler).toBe('function');
      },
    };

    registerPendingDecisions(server as unknown as Parameters<typeof registerPendingDecisions>[0]);
  });
});
