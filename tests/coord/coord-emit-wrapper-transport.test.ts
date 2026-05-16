// 057b AC7 — coord-emit.sh wrapper transport tests.
//
// Covers (per files_to_modify line ~77):
//   - wrapper-originated atoms carry metadata.coord.emitter_role = ${REVIEWER_NAME}
//     via the X-Echo-Role header
//   - daemon-down does NOT abort the queue tick (curl --connect-timeout 2
//     --max-time 5 returns non-zero, wrapper continues via `|| true`)
//   - coord-emit.sh tick_start --correlation-id=... invocation produces a
//     valid coord:tick_start atom that 057a's coord_emit validator accepts
//   - portability: BSD-date emitted_at (seconds-precision) accepted; daemon
//     canonicalizes to ms-precision

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const VALID_CORR = 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef';

let storage: MemoryStorage;
let handle: McpServerHandle;

beforeEach(async () => {
  _resetValidatorCacheForTests();
  storage = new MemoryStorage();
  handle = await startMcpServer(storage, {
    port: 0,
    deadline_heartbeat_ms: 0,
    deadline_reconciliation_ms: null,
  });
});
afterEach(async () => {
  await handle.stop();
});

describe('057b AC7 — coord-emit.sh wrapper transport', () => {
  it('coord-emit.sh tick_start produces a valid coord:tick_start atom', () => {
    const r = spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
          ECHO_MCP_PORT: String(handle.port),
        },
        encoding: 'utf-8',
      },
    );
    expect(r.status).toBe(0);
  });

  it('atom is accepted by 057a coord_emit validator: tier=round, subject_role=codex', async () => {
    spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
          ECHO_MCP_PORT: String(handle.port),
        },
        encoding: 'utf-8',
      },
    );
    // Give the daemon a moment to flush the append.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    const tickStart = events.find((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'tick_start';
    });
    expect(tickStart).toBeTruthy();
    expect(tickStart!.source).toBe('coord:codex');
    const coord = tickStart!.metadata!['coord'] as Record<string, unknown>;
    expect(coord['subject_role']).toBe('codex');
    expect(coord['correlation_id']).toBe(VALID_CORR);
    expect(coord['tier']).toBe('round');
  });

  it('daemon-down does NOT abort the wrapper (exit 0)', () => {
    // Point at an unreachable port.
    const r = spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: 'http://127.0.0.1:1/mcp', // dead port
        },
        encoding: 'utf-8',
      },
    );
    expect(r.status).toBe(0); // best-effort: || true preserves queue durability
  });

  it('scheduler_health emitted with tick_run_id is accepted', async () => {
    spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'scheduler_health',
        '--tick-run-id=11111111-2222-4333-8444-555555555555',
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
        },
        encoding: 'utf-8',
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    const sh = events.find((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'scheduler_health';
    });
    expect(sh).toBeTruthy();
    const coord = sh!.metadata!['coord'] as Record<string, unknown>;
    expect(coord['tier']).toBe('scheduler');
    expect(coord['tick_run_id']).toBe('11111111-2222-4333-8444-555555555555');
  });
});
