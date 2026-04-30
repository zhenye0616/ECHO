import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  startMcpServer,
  type McpServerHandle,
} from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { captureStdout } from '../fixtures/stdout.js';

interface PingResult {
  pong: boolean;
  received: string | undefined;
  ts: string;
}

interface ToolContent {
  type: string;
  text: string;
}

interface CallToolResultLike {
  content?: ToolContent[];
}

async function withClient<T>(
  url: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: 'echo-test', version: '0.0.0' });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

describe('startMcpServer', () => {
  let handle: McpServerHandle | null = null;
  let restoreStdout: () => void;

  beforeEach(() => {
    ({ restore: restoreStdout } = captureStdout());
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    restoreStdout();
  });

  it('boots on an ephemeral port and exposes a stable url shape', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    expect(handle.port).toBeGreaterThan(0);
    expect(handle.url).toBe(`http://127.0.0.1:${handle.port}/mcp`);
  });

  it('binds only to 127.0.0.1 (no 0.0.0.0)', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });
    expect(handle.url.startsWith('http://127.0.0.1:')).toBe(true);
  });

  it('lists echo_ping via tools/list', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    const tools = await withClient(handle.url, async (client) =>
      client.listTools(),
    );

    const found = tools.tools.find((t) => t.name === 'echo_ping');
    expect(found).toBeDefined();
    expect(found?.description).toContain('Connectivity check');
  });

  it('echo_ping returns pong + received message + iso timestamp', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    const result = (await withClient(handle.url, async (client) =>
      client.callTool({
        name: 'echo_ping',
        arguments: { message: 'hello' },
      }),
    )) as CallToolResultLike;

    const content = result.content?.[0];
    expect(content).toBeDefined();
    expect(content?.type).toBe('text');
    const parsed = JSON.parse(content!.text) as PingResult;
    expect(parsed.pong).toBe(true);
    expect(parsed.received).toBe('hello');
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('echo_ping handles a missing message argument', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });

    const result = (await withClient(handle.url, async (client) =>
      client.callTool({
        name: 'echo_ping',
        arguments: {},
      }),
    )) as CallToolResultLike;

    const content = result.content?.[0];
    expect(content).toBeDefined();
    const parsed = JSON.parse(content!.text) as PingResult;
    expect(parsed.pong).toBe(true);
    expect(parsed.received).toBeUndefined();
  });

  it('stop() closes the listener so subsequent connections fail', async () => {
    const storage = new MemoryStorage();
    handle = await startMcpServer(storage, { port: 0 });
    const url = handle.url;
    await handle.stop();
    handle = null;

    let failed = false;
    try {
      await withClient(url, async (client) => client.listTools());
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it('logs `started` with port + url + host', async () => {
    const { writes, restore } = captureStdout();
    try {
      const storage = new MemoryStorage();
      handle = await startMcpServer(storage, { port: 0 });
      const startedLine = writes.find((line) => {
        try {
          const entry = JSON.parse(line.trim()) as Record<string, unknown>;
          return (
            entry['source'] === 'mcp.server' && entry['message'] === 'started'
          );
        } catch {
          return false;
        }
      });
      expect(startedLine).toBeDefined();
      const entry = JSON.parse(startedLine!.trim()) as Record<string, unknown>;
      const payload = entry['payload'] as Record<string, unknown>;
      expect(payload['host']).toBe('127.0.0.1');
      expect(typeof payload['port']).toBe('number');
      expect(typeof payload['url']).toBe('string');
    } finally {
      restore();
    }
  });
});
