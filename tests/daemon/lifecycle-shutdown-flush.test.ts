import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginRecentMcpCall,
  flushRecentMcpCallLog,
  readRecentMcpCalls,
  resetRecentMcpCallLogForTests,
} from '../../src/mcp/request-log.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const DAEMON_INDEX_PATH = join(REPO_ROOT, 'src', 'daemon', 'index.ts');

function readJsonLines(path: string): Record<string, unknown>[] {
  const raw = readFileSync(path, 'utf8');
  if (raw.length === 0) return [];
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function callEchoPing(url: string, message: string): Promise<void> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: 'echo-test-flush', version: '0.0.0' });
  await client.connect(transport);
  try {
    await client.callTool({ name: 'echo_ping', arguments: { message } });
  } finally {
    await client.close();
  }
}

describe('lifecycle shutdown flush', () => {
  let handle: McpServerHandle | null = null;
  let dataDir: string;

  beforeEach(() => {
    resetRecentMcpCallLogForTests();
    dataDir = mkdtempSync(join(tmpdir(), 'echo-lifecycle-shutdown-flush-'));
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    resetRecentMcpCallLogForTests();
    rmSync(dataDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('Test (i): stop+flush preserves completed `ok` and rewrites in-flight to `killed_during_shutdown`', async () => {
    handle = await startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false });
    await callEchoPing(handle.url, 'completed-before-shutdown');

    // Open an in-flight call directly via the request-log API (the wrapper
    // begins/finishes around the user callback, so an unwrapped begin is
    // the test seam for "still-pending when the shutdown hook fires").
    beginRecentMcpCall('search_memories', { query: 'in-flight' }, 1000);
    const preStop = readRecentMcpCalls();
    expect(preStop.some((call) => call.tool === 'search_memories' && call.status === 'pending')).toBe(
      true,
    );

    // Mirror the daemon's onShutdown ordering: mcp.stop() first, then
    // flushRecentMcpCallLog. The flush snapshot reflects the ring as it
    // stands at flush time.
    await handle.stop();
    handle = null;
    const flushPath = join(dataDir, 'mcp-shutdown.jsonl');
    flushRecentMcpCallLog(flushPath, 1500);

    const lines = readJsonLines(flushPath);
    const echoLine = lines.find((entry) => entry['tool'] === 'echo_ping');
    const searchLine = lines.find((entry) => entry['tool'] === 'search_memories');
    expect(echoLine).toBeDefined();
    expect(echoLine?.['status']).toBe('ok');
    expect(searchLine).toBeDefined();
    expect(searchLine?.['status']).toBe('killed_during_shutdown');
    expect(searchLine?.['duration_ms']).toBe(500);
  });

  it('Test (ii): flush file lands at exactly join(dataDir, "mcp-shutdown.jsonl") and contains the expected tool name', async () => {
    handle = await startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false });
    await callEchoPing(handle.url, 'second-fixture');

    await handle.stop();
    handle = null;
    const flushPath = join(dataDir, 'mcp-shutdown.jsonl');
    flushRecentMcpCallLog(flushPath);

    expect(existsSync(flushPath)).toBe(true);
    const raw = readFileSync(flushPath, 'utf8');
    expect(raw).toContain('"echo_ping"');
  });

  it('Test (iii): src/daemon/index.ts wires the flush correctly (source-text assertions)', () => {
    const src = readFileSync(DAEMON_INDEX_PATH, 'utf8');

    // (a) flushRecentMcpCallLog( appears exactly once in the file.
    const occurrences = src.split('flushRecentMcpCallLog(').length - 1;
    expect(occurrences).toBe(1);

    // (b) The flush call is wrapped in a try { ... } catch block. Look for
    // the literal try/catch pattern around the call.
    const tryCatchRe = /try\s*\{\s*flushRecentMcpCallLog\([\s\S]*?\}\s*catch\b/;
    expect(tryCatchRe.test(src)).toBe(true);

    // (c) The path argument's lexical block contains the literal
    // 'mcp-shutdown.jsonl' substring.
    const flushIdx = src.indexOf('flushRecentMcpCallLog(');
    const flushTailEnd = src.indexOf(')', flushIdx);
    expect(flushTailEnd).toBeGreaterThan(flushIdx);
    const flushCall = src.slice(flushIdx, flushTailEnd + 1);
    expect(flushCall).toContain("'mcp-shutdown.jsonl'");

    // (d/e) Ordering inside the onShutdown closure: flushRecentMcpCallLog(
    // sits strictly after `await mcp.stop()` and strictly before the first
    // extractor `.stop()` invocation.
    const onShutdownIdx = src.indexOf('onShutdown:');
    expect(onShutdownIdx).toBeGreaterThan(-1);
    const closureBody = src.slice(onShutdownIdx);
    const mcpStopIdx = closureBody.indexOf('await mcp.stop()');
    const flushInClosureIdx = closureBody.indexOf('flushRecentMcpCallLog(');
    const cursorStopIdx = closureBody.indexOf('cursorExtractor.stop()');
    expect(mcpStopIdx).toBeGreaterThan(-1);
    expect(flushInClosureIdx).toBeGreaterThan(mcpStopIdx);
    expect(cursorStopIdx).toBeGreaterThan(flushInClosureIdx);
  });

  it('Test (iv): a thrown flush does not skip subsequent teardown; stderr write happens', async () => {
    const extractorA = { stop: vi.fn(async () => undefined) };
    const extractorB = { stop: vi.fn(async () => undefined) };
    const extractorC = { stop: vi.fn(async () => undefined) };
    const gitWatcher = { stop: vi.fn(async () => undefined) };
    const fsWatcher = { stop: vi.fn(async () => undefined) };
    const dispose = vi.fn(() => undefined);
    const mcp = { stop: vi.fn(async () => undefined) };

    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // Force a synchronous throw from flushRecentMcpCallLog by pointing it at
    // a path inside a nonexistent directory under the temp dataDir; writeFileSync
    // throws ENOENT for the missing parent.
    const badPath = join(dataDir, 'definitely-missing-subdir', 'mcp-shutdown.jsonl');

    // Mirror src/daemon/index.ts:58-71 shape exactly.
    const onShutdown = async (): Promise<void> => {
      await mcp.stop();
      try {
        flushRecentMcpCallLog(badPath);
      } catch (err) {
        process.stderr.write(`[daemon] mcp-shutdown-flush failed: ${(err as Error).message}\n`);
      }
      await extractorA.stop();
      await extractorB.stop();
      await extractorC.stop();
      await gitWatcher.stop();
      await fsWatcher.stop();
      dispose();
    };

    await onShutdown();

    expect(mcp.stop).toHaveBeenCalledTimes(1);
    expect(extractorA.stop).toHaveBeenCalledTimes(1);
    expect(extractorB.stop).toHaveBeenCalledTimes(1);
    expect(extractorC.stop).toHaveBeenCalledTimes(1);
    expect(gitWatcher.stop).toHaveBeenCalledTimes(1);
    expect(fsWatcher.stop).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);

    expect(stderrWrite).toHaveBeenCalled();
    const wrote = stderrWrite.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('[daemon] mcp-shutdown-flush failed'),
    );
    expect(wrote).toBe(true);
  });
});
