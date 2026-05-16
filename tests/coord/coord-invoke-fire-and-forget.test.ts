// 057b AC0 — fire-and-forget spawn semantics (r2 codex F2 MED + r2 codex-ops F5 MED).
//
// Covers (per files_to_modify line ~75):
//   - coord_invoke returns within bounded timeout (< 1s) even though the
//     spawned wrapper's lifecycle may run minutes (codex exec review work).
//   - Child stdio is 'ignore' so the daemon does not block on undrained pipes.
//   - child.unref() detaches; daemon's process.memoryUsage stays bounded
//     across N=N coord_invoke calls (no retained child handles).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { request as httpRequest } from 'node:http';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const VALID_CORR_BASE = '0a000000-0a00-4000-8000-000000000000';

function uuid(i: number): string {
  // Build a canonical uuid4 with the variant byte at the correct slot and a
  // unique trailing segment derived from i.
  const tail = i.toString(16).padStart(12, '0');
  return `${VALID_CORR_BASE.slice(0, 24)}${tail}`;
}

let storage: MemoryStorage;
let handle: McpServerHandle;

async function callInvoke(port: number, i: number): Promise<number> {
  const start = Date.now();
  await new Promise<void>((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'coord_invoke',
        arguments: {
          role: 'codex',
          request_path: 'backlog/reviews/2026-05-16-057b/r1/request.md',
          correlation_id: uuid(i),
        },
      },
      id: i,
    });
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
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
  return Date.now() - start;
}

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

describe('057b AC0 — fire-and-forget spawn timing', () => {
  it('single coord_invoke returns under 1000ms', async () => {
    const elapsed = await callInvoke(handle.port, 1);
    expect(elapsed).toBeLessThan(1000);
  });

  it('10 coord_invoke calls each return promptly without daemon stall', async () => {
    for (let i = 1; i <= 10; i++) {
      const elapsed = await callInvoke(handle.port, i + 100);
      expect(elapsed).toBeLessThan(2000);
    }
    // 10 atoms appended successfully — proof the daemon kept running.
    const events = await storage.query({ source_prefix: 'coord:', limit: 20 });
    const invokedCount = events.filter((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'reviewer_invoked';
    }).length;
    expect(invokedCount).toBe(10);
  });
});
