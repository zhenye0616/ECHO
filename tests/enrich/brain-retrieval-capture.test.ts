import { createServer, request, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createHttpRetrievalCapture,
  extractRetrievalsFromExchange,
  runBrainWithRetrievalCapture,
  summarizeMcpToolInput,
  summarizeMcpToolResult,
  type BrainResult,
  type BrainRunOptions,
  type RetrievalCapture,
  type RetrievalCaptureSession,
} from '../../src/brain/brain.js';

const okBrain = async (): Promise<BrainResult> => ({
  ok: true,
  outcome: 'ok',
  durationMs: 1,
  answer: 'answer',
});

const baseOptions: BrainRunOptions = {
  brain: 'codex',
  contextRepoPath: '/tmp/scope',
  timeoutMs: 1000,
  env: { ECHO_MCP_URL: 'http://127.0.0.1:38478/mcp' },
};

function fakeCapture(
  session: Partial<RetrievalCaptureSession> & { startError?: Error },
): RetrievalCapture {
  return {
    async start(): Promise<RetrievalCaptureSession> {
      if (session.startError) throw session.startError;
      return {
        childEnv: session.childEnv ?? { ECHO_MCP_URL: 'http://127.0.0.1:9/mcp' },
        finish: session.finish ?? (async () => []),
        close: session.close ?? (async () => undefined),
      };
    },
  };
}

describe('summarizeMcpToolInput / summarizeMcpToolResult', () => {
  it('bounds and compacts the input summary', () => {
    expect(summarizeMcpToolInput({ query: 'hello   world' })).toBe('{"query":"hello world"}');
    expect(summarizeMcpToolInput(undefined)).toBe('(no args)');
    const big = summarizeMcpToolInput({ q: 'x'.repeat(500) });
    expect(big.length).toBeLessThanOrEqual(200);
  });

  it('summarizes result counts and errors', () => {
    expect(summarizeMcpToolResult({ isError: true })).toBe('error result');
    expect(summarizeMcpToolResult({ content: [{ type: 'text' }, { type: 'text' }] })).toContain(
      'content_items=2',
    );
    expect(
      summarizeMcpToolResult({ structuredContent: { clusters: [1, 2, 3], atoms: [1] } }),
    ).toContain('clusters=3');
    expect(summarizeMcpToolResult(null)).toBe('(no result captured)');
  });
});

describe('extractRetrievalsFromExchange', () => {
  it('extracts a tools/call retrieval and matches its response by id', () => {
    const req = JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'search_memories', arguments: { query: 'roadmap' } },
    });
    const res = JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      result: { content: [{ type: 'text', text: 'hit' }] },
    });
    const out = extractRetrievalsFromExchange(req, res, '2026-07-07T00:00:00.000Z');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      tool: 'search_memories',
      input_summary: '{"query":"roadmap"}',
      at: '2026-07-07T00:00:00.000Z',
    });
    expect(out[0]?.result_summary).toContain('content_items=1');
  });

  it('parses SSE-framed responses', () => {
    const req = JSON.stringify({
      id: 'a',
      method: 'tools/call',
      params: { name: 'find_clusters', arguments: {} },
    });
    const res = `event: message\ndata: ${JSON.stringify({ id: 'a', result: { content: [] } })}\n\n`;
    const out = extractRetrievalsFromExchange(req, res, 't');
    expect(out).toHaveLength(1);
    expect(out[0]?.tool).toBe('find_clusters');
  });

  it('ignores non-tools/call requests', () => {
    const req = JSON.stringify({ id: 1, method: 'initialize', params: {} });
    expect(extractRetrievalsFromExchange(req, '{}', 't')).toHaveLength(0);
  });
});

describe('runBrainWithRetrievalCapture', () => {
  it('reports ok with retrievals when the session captured calls', async () => {
    const { run, result } = await runBrainWithRetrievalCapture(
      'q',
      baseOptions,
      {
        runBrain: okBrain,
        capture: fakeCapture({
          finish: async () => [
            { tool: 'search_memories', input_summary: '{}', result_summary: 'x', at: 't' },
          ],
        }),
        now: () => '2026-07-07T00:00:00.000Z',
        newRunId: () => 'run-1',
      },
    );
    expect(result.ok).toBe(true);
    expect(run).toMatchObject({
      run_id: 'run-1',
      binding: 'codex',
      capture_status: 'ok',
      started_at: '2026-07-07T00:00:00.000Z',
    });
    expect(run.retrievals).toHaveLength(1);
  });

  it('reports zero_retrievals when the session captured nothing', async () => {
    const { run } = await runBrainWithRetrievalCapture('q', baseOptions, {
      runBrain: okBrain,
      capture: fakeCapture({ finish: async () => [] }),
    });
    expect(run.capture_status).toBe('zero_retrievals');
    expect(run.retrievals).toBeUndefined();
  });

  it('reports capture_failed (not zero_retrievals) when finish throws', async () => {
    const { run } = await runBrainWithRetrievalCapture('q', baseOptions, {
      runBrain: okBrain,
      capture: fakeCapture({
        finish: async () => {
          throw new Error('proxy exploded');
        },
      }),
    });
    expect(run.capture_status).toBe('capture_failed');
    expect(run.capture_error).toContain('proxy exploded');
  });

  it('reports capture_failed and still runs the brain when the proxy cannot start', async () => {
    let ranBrain = false;
    const { run, result } = await runBrainWithRetrievalCapture('q', baseOptions, {
      runBrain: async () => {
        ranBrain = true;
        return okBrain();
      },
      capture: fakeCapture({ startError: new Error('bind failed') }),
    });
    expect(ranBrain).toBe(true);
    expect(result.ok).toBe(true);
    expect(run.capture_status).toBe('capture_failed');
    expect(run.capture_error).toContain('bind failed');
  });

  it('injects the proxy childEnv into the brain child', async () => {
    let seenMcpUrl: string | undefined;
    await runBrainWithRetrievalCapture('q', baseOptions, {
      runBrain: async (_q, o) => {
        seenMcpUrl = o.env?.['ECHO_MCP_URL'];
        return okBrain();
      },
      capture: fakeCapture({ childEnv: { ECHO_MCP_URL: 'http://127.0.0.1:5555/mcp' } }),
    });
    expect(seenMcpUrl).toBe('http://127.0.0.1:5555/mcp');
  });
});

describe('createHttpRetrievalCapture (real proxy)', () => {
  const servers: Server[] = [];
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))),
    );
  });

  function startUpstream(): Promise<{ url: string }> {
    const upstream = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
          id?: unknown;
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id ?? null,
            result: { content: [{ type: 'text', text: 'upstream ok' }] },
          }),
        );
      });
    });
    servers.push(upstream);
    return new Promise((resolve) => {
      upstream.listen(0, '127.0.0.1', () => {
        const addr = upstream.address();
        if (addr === null || typeof addr === 'string') throw new Error('no port');
        resolve({ url: `http://127.0.0.1:${addr.port}/mcp` });
      });
    });
  }

  function postJson(url: string, body: unknown): Promise<{ status: number; text: string }> {
    const u = new URL(url);
    return new Promise((resolve, reject) => {
      const req = request(
        { hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') }),
          );
        },
      );
      req.on('error', reject);
      req.end(JSON.stringify(body));
    });
  }

  it('forwards transparently and records a tools/call retrieval', async () => {
    const { url } = await startUpstream();
    const capture = createHttpRetrievalCapture();
    const session = await capture.start('run-x', url);
    const proxyUrl = session.childEnv['ECHO_MCP_URL']!;

    const resp = await postJson(proxyUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search_memories', arguments: { query: 'q' } },
    });
    // Transparent forward: the child sees the upstream's exact response.
    expect(resp.status).toBe(200);
    expect(resp.text).toContain('upstream ok');

    const retrievals = await session.finish();
    await session.close();
    expect(retrievals).toHaveLength(1);
    expect(retrievals[0]).toMatchObject({ tool: 'search_memories' });
    expect(retrievals[0]?.result_summary).toContain('content_items=1');
  });
});

describe('createHttpRetrievalCapture stream error handling (item 125 AC2)', () => {
  const servers: Server[] = [];
  const sessions: RetrievalCaptureSession[] = [];
  afterEach(async () => {
    await Promise.all(sessions.splice(0).map((s) => s.close().catch(() => undefined)));
    await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))));
  });

  function listen(server: Server): Promise<string> {
    servers.push(server);
    return new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const a = server.address();
        if (a === null || typeof a === 'string') throw new Error('no port');
        resolve(`http://127.0.0.1:${a.port}/mcp`);
      });
    });
  }

  // fatalError may be set a tick after the client's socket event; poll finish().
  async function expectFinishRejects(session: RetrievalCaptureSession): Promise<void> {
    for (let i = 0; i < 40; i += 1) {
      try {
        await session.finish();
      } catch {
        return; // rejected → capture_failed record, per the 123 contract
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error('finish() never rejected — capture failure was not recorded');
  }

  // Wrap a test so any unhandled process error/rejection during it fails the
  // test — the core AC2 invariant is "the hosting worker never crashes".
  function guarded(fn: () => Promise<void>): () => Promise<void> {
    return async () => {
      const caught: unknown[] = [];
      const onErr = (e: unknown): void => {
        caught.push(e);
      };
      process.on('uncaughtException', onErr);
      process.on('unhandledRejection', onErr);
      try {
        await fn();
      } finally {
        process.off('uncaughtException', onErr);
        process.off('unhandledRejection', onErr);
      }
      expect(caught).toEqual([]);
    };
  }

  function fireRequest(proxyUrl: string, onResponse: (res: import('node:http').IncomingMessage, req: import('node:http').ClientRequest) => void): void {
    const u = new URL(proxyUrl);
    const creq = request(
      { hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => onResponse(res, creq),
    );
    creq.on('error', () => undefined);
    creq.end(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_memories', arguments: {} } }),
    );
  }

  it(
    'does not crash when the downstream client is destroyed mid-stream',
    guarded(async () => {
      let releaseTail = (): void => undefined;
      const tail = new Promise<void>((r) => {
        releaseTail = r;
      });
      const upstreamUrl = await listen(
        createServer((req, res) => {
          req.resume();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write('{"jsonrpc":"2.0",'); // first chunk; response not yet ended
          void tail.then(() => res.end('"id":1,"result":{"content":[]}}'));
        }),
      );

      const capture = createHttpRetrievalCapture();
      const session = await capture.start('run-down', upstreamUrl);
      sessions.push(session);

      await new Promise<void>((resolve) => {
        fireRequest(session.childEnv['ECHO_MCP_URL']!, (res, creq) => {
          res.on('error', () => undefined);
          res.once('data', () => {
            creq.destroy(); // brain child killed mid-stream
            releaseTail(); // upstream now finishes → proxy writes to a dead cres
            setTimeout(resolve, 40);
          });
        });
      });

      // Whether the destroyed-downstream write surfaces an error (→
      // capture_failed) or is silently discarded (→ partial capture) is OS
      // timing dependent; the 123 contract allows either. The load-bearing
      // assertion is the `guarded` no-crash wrapper. finish() must still settle
      // cleanly to one of those two shapes.
      let settled: unknown;
      try {
        settled = await session.finish();
      } catch {
        settled = 'capture_failed';
      }
      expect(settled === 'capture_failed' || Array.isArray(settled)).toBe(true);
      await session.close();
    }),
  );

  it(
    'does not crash when the upstream is destroyed mid-stream',
    guarded(async () => {
      const upstreamUrl = await listen(
        createServer((req, res) => {
          req.resume();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write('{"jsonrpc":"2.0",');
          setTimeout(() => res.socket?.destroy(), 20); // upstream reset mid-response
        }),
      );

      const capture = createHttpRetrievalCapture();
      const session = await capture.start('run-up', upstreamUrl);
      sessions.push(session);

      await new Promise<void>((resolve) => {
        fireRequest(session.childEnv['ECHO_MCP_URL']!, (res) => {
          res.on('data', () => undefined);
          res.on('error', () => undefined);
          res.on('end', () => resolve());
          res.on('close', () => resolve());
        });
      });

      await expectFinishRejects(session);
    }),
  );
});
