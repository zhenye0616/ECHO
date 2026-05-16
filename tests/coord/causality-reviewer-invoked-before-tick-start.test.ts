// 057b AC0 step 4 — r5 codex-ops F1 HIGH causality.
//
// Verifies the daemon-internal causality contract: coord_invoke MUST append
// the coord:reviewer_invoked atom (and open the pre-spawn deadline)
// SYNCHRONOUSLY before returning to the caller, so the spawned child can
// never produce a tick_start atom whose durable-append sequence_id is
// less than the reviewer_invoked atom's.
//
// We assert the ordering by emitting reviewer_invoked via the internal
// emitter, then a wrapper-style tick_start through coord_emit, and
// reading the atoms' sequence_ids back. The reviewer_invoked atom MUST
// have the lower sequence_id.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { request as httpRequest } from 'node:http';
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
  if (handle) await handle.stop();
});

describe('057b AC0 step 4 — reviewer_invoked precedes child tick_start', () => {
  it('reviewer_invoked durable append precedes tick_start in append order', async () => {
    // Simulate coord_invoke's pre-spawn append.
    await new Promise<void>((resolve, reject) => {
      const body = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'coord_invoke',
          arguments: {
            role: 'codex',
            request_path: 'backlog/reviews/2026-05-16-057b/r1/request.md',
            correlation_id: VALID_CORR,
          },
        },
        id: 1,
      });
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: handle.port,
          path: '/mcp',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString(),
            Accept: 'application/json, text/event-stream',
            'X-Echo-Role': 'claude',
          },
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', resolve);
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    // Now emit the child's tick_start via coord_emit.
    await new Promise<void>((resolve, reject) => {
      const body = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'coord_emit',
          arguments: {
            event_type: 'tick_start',
            schema_version: 1,
            subject_role: 'codex',
            correlation_id: VALID_CORR,
            emitted_at: '2026-05-16T09:01:00Z',
          },
        },
        id: 2,
      });
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: handle.port,
          path: '/mcp',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString(),
            Accept: 'application/json, text/event-stream',
            'X-Echo-Role': 'codex',
          },
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', resolve);
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    // Read by append order.
    const atoms = await storage.iterateCoordAtomsByAppendOrder({});
    const reviewerInvoked = atoms.find((a) => {
      const c = (a.metadata as { coord?: { event_type?: string } } | undefined)?.coord;
      return c?.event_type === 'reviewer_invoked';
    });
    const tickStart = atoms.find((a) => {
      const c = (a.metadata as { coord?: { event_type?: string } } | undefined)?.coord;
      return c?.event_type === 'tick_start';
    });
    expect(reviewerInvoked).toBeTruthy();
    expect(tickStart).toBeTruthy();
    expect(reviewerInvoked!.sequence_id).toBeLessThan(tickStart!.sequence_id);
  });
});
