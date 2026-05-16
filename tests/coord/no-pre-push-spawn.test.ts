// 057b AC7 — request.py is NEVER a coord_invoke caller (r2 codex F1 +
// codex-ops F1 convergent HIGH).
//
// Verifies the load-bearing invariant: request.py's only coord-related
// responsibility is generating + writing correlation_id to request.md.
// Zero MCP calls. Zero coord:reviewer_invoked / tick_start / tick_end
// atoms produced by request.py alone.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const REPO = process.cwd();

let workdir: string;
let handle: McpServerHandle;
let storage: MemoryStorage;

beforeEach(async () => {
  _resetValidatorCacheForTests();
  storage = new MemoryStorage();
  handle = await startMcpServer(storage, {
    port: 0,
    deadline_heartbeat_ms: 0,
    deadline_reconciliation_ms: null,
  });
  workdir = mkdtempSync(join(tmpdir(), 'echo-no-spawn-'));
  // Initialize a minimal git repo with the backlog/ structure request.py expects.
  execSync('git init -q', { cwd: workdir });
  execSync('git config user.email test@test.test', { cwd: workdir });
  execSync('git config user.name test', { cwd: workdir });
  execSync('git commit -q --allow-empty -m bootstrap', { cwd: workdir });
  mkdirSync(join(workdir, 'backlog/ready'), { recursive: true });
  writeFileSync(
    join(workdir, 'backlog/ready/2026-05-16-057b-test.md'),
    '---\nid: 2026-05-16-057b-test\n---\n\nbody\n',
  );
});

afterEach(async () => {
  await handle.stop();
  rmSync(workdir, { recursive: true, force: true });
});

describe('057b AC7 — request.py emits zero coord atoms', () => {
  it('writes correlation_id but performs NO MCP coord calls', async () => {
    const reviewersJson = readFileSync(
      join(REPO, 'tools/review-queue/reviewers.json'),
      'utf-8',
    );
    mkdirSync(join(workdir, 'tools/review-queue/schemas'), { recursive: true });
    writeFileSync(join(workdir, 'tools/review-queue/reviewers.json'), reviewersJson);
    for (const name of [
      'request.schema.json',
      'reviewer.schema.json',
      'combined.schema.json',
      'reviewers-config.schema.json',
      'coord-roles.schema.json',
    ]) {
      writeFileSync(
        join(workdir, 'tools/review-queue/schemas', name),
        readFileSync(join(REPO, 'tools/review-queue/schemas', name), 'utf-8'),
      );
    }
    for (const f of ['request.py', '_lib.py', '_reviewers.py']) {
      writeFileSync(
        join(workdir, 'tools/review-queue', f),
        readFileSync(join(REPO, 'tools/review-queue', f), 'utf-8'),
      );
    }

    // Point ECHO_MCP_URL at our test daemon so request.py would have a
    // target if it ever made a call. Then assert zero atoms.
    const r = spawnSync(
      'python3',
      ['tools/review-queue/request.py', '2026-05-16-057b-test', '1'],
      {
        cwd: workdir,
        env: {
          ...process.env,
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
          ECHO_MCP_PORT: String(handle.port),
        },
        encoding: 'utf-8',
      },
    );
    expect(r.status, r.stderr).toBe(0);

    // Verify request.md was written with correlation_id
    const fmText = readFileSync(
      join(workdir, 'backlog/reviews/2026-05-16-057b-test/r1/request.md'),
      'utf-8',
    );
    expect(fmText).toMatch(/correlation_id: [0-9a-f-]+/);

    // CRUCIAL: zero coord atoms in storage. The daemon was up and
    // reachable; request.py simply didn't call it.
    const events = await storage.query({ source_prefix: 'coord:', limit: 100 });
    expect(events).toHaveLength(0);
  });
});
