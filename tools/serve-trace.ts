// Live HTTP-served trace viewer for the CC + Codex capture streams.
//
// Differs from render-trace.ts (one-shot snapshot to disk):
//   - starts a tiny HTTP server on localhost
//   - serves the same two-column HTML (the live flag flips on an
//     EventSource subscription that prepends new turns as they arrive)
//   - boot-scans the last --days of history into RAM, then keeps the
//     extractors running and pushes every newly-emitted CaptureEvent
//     down the SSE stream
//
// Usage:
//   npm run serve:trace                 (last 7d, port 38479)
//   npm run serve:trace -- --days 1
//   npm run serve:trace -- --port 4000

import { createServer } from 'node:http';
import { createInterface } from 'node:readline';

import { startClaudeCodeExtractor } from '../src/capture/extractors/claude-code.js';
import { startCodexExtractor } from '../src/capture/extractors/codex.js';
import { startCursorExtractor } from '../src/capture/extractors/cursor.js';
import type {
  CaptureEvent,
  EventId,
  QueryFilter,
  Storage,
} from '../src/storage/interface.js';
import { MemoryStorage } from '../src/storage/memory.js';

import {
  buildHtml,
  eventsToRows,
  formatGeneratedAt,
  toRow,
  waitForDrain,
  type RenderRow,
} from './_trace_render.js';

interface Args {
  days: number;
  port: number;
  fullContent: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { days: 7, port: 38479, fullContent: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') {
      const v = argv[++i];
      if (v !== undefined) args.days = Math.max(1, Number.parseInt(v, 10));
    } else if (a === '--port') {
      const v = argv[++i];
      if (v !== undefined) args.port = Number.parseInt(v, 10);
    } else if (a === '--full-content') {
      args.fullContent = true;
    }
  }
  return args;
}

type Listener = (row: RenderRow) => void;

class LiveStorage implements Storage {
  private inner = new MemoryStorage();
  private listeners = new Set<Listener>();
  private liveMode = false;

  constructor(
    private readonly sinceMs: number,
    private readonly fullContent: boolean,
  ) {}

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  enableLiveMode(): void {
    this.liveMode = true;
  }

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const ts = Date.parse(event.timestamp);
    if (Number.isFinite(ts) && ts < this.sinceMs) return '_skip';
    const id = await this.inner.append(event);
    if (this.liveMode) {
      const row = toRow({ ...event, id } as CaptureEvent, this.fullContent);
      if (row !== null) for (const l of this.listeners) l(row);
    }
    return id;
  }

  query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    return this.inner.query(filter);
  }

  count(): Promise<number> {
    return this.inner.count();
  }

  // V1.6 (item 030): delegate to inner. Required by Storage interface.
  getByIds(ids: readonly EventId[]): Promise<CaptureEvent[]> {
    return this.inner.getByIds(ids);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sinceMs = Date.now() - args.days * 24 * 3600 * 1000;
  console.log(`ECHO serve-trace`);
  console.log(`  window:  last ${args.days}d  (since ${new Date(sinceMs).toISOString()})`);
  console.log(`  port:    ${args.port}`);

  const storage = new LiveStorage(sinceMs, args.fullContent);
  console.log(`  starting extractors…`);
  const cc = await startClaudeCodeExtractor(storage);
  const cx = await startCodexExtractor(storage);
  const cu = await startCursorExtractor(storage, { scanOnStart: true });

  console.log(`  draining boot scan…`);
  await waitForDrain(storage);
  storage.enableLiveMode();

  // 4 KB threshold: at 1 s polling, sub-line gaps during active sessions are
  // transient and would spam logs. A larger gap on refresh implies real drop.
  const FRESHNESS_LOG_THRESHOLD_BYTES = 4096;

  async function renderHtml(): Promise<string> {
    const events = await storage.query();
    const rows = eventsToRows(events, args.fullContent);
    const [ccFresh, cxFresh] = await Promise.all([cc.probeFreshness(), cx.probeFreshness()]);
    const worst = Math.max(ccFresh.maxGapBytes, cxFresh.maxGapBytes);
    if (worst >= FRESHNESS_LOG_THRESHOLD_BYTES) {
      console.log(
        `freshness  cc=${ccFresh.maxGapBytes}b/${ccFresh.filesChecked}f  cx=${cxFresh.maxGapBytes}b/${cxFresh.filesChecked}f`,
      );
    }
    return buildHtml(rows, {
      days: args.days,
      generatedAt: formatGeneratedAt(),
      live: true,
    });
  }

  const initialCount = await storage.count();
  console.log(`  loaded ${initialCount} events; entering live mode`);

  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      void renderHtml().then(
        (html) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        },
        (err: unknown) => {
          console.error('renderHtml failed', err);
          res.writeHead(500);
          res.end('render failed');
        },
      );
      return;
    }
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      const unsub = storage.subscribe((row) => {
        res.write(`event: row\ndata: ${JSON.stringify(row)}\n\n`);
      });
      const hb = setInterval(() => res.write(': hb\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(hb);
        unsub();
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });

  await new Promise<void>((resolve) => server.listen(args.port, () => resolve()));
  console.log(`\n  ready at  http://localhost:${args.port}/`);
  console.log(`  press Ctrl-C to stop\n`);

  let stopping = false;
  async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    console.log(`\nstopping…`);
    await new Promise<void>((r) => {
      server.close(() => r());
      // Without this, persistent SSE connections keep server.close() hanging.
      server.closeAllConnections();
    });
    await cc.stop();
    await cx.stop();
    await cu.stop();
    process.exit(0);
  }

  let confirming = false;
  process.on('SIGINT', () => {
    if (stopping) return;
    if (confirming) {
      // Second ^C while at the prompt — bail out hard.
      void shutdown();
      return;
    }
    confirming = true;
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nStop server? [y/N] ', (ans) => {
      // Reset before close so a SIGTERM landing in the gap doesn't get swallowed.
      confirming = false;
      rl.close();
      if (/^y(es)?$/i.test(ans.trim())) {
        void shutdown();
      } else {
        console.log('continuing…');
      }
    });
  });
  process.on('SIGTERM', () => {
    // npm propagates ^C to its child as SIGTERM right after the terminal
    // delivers SIGINT to the process group, which would race past our
    // confirmation prompt. While the prompt is open, ignore SIGTERM and let
    // the user answer.
    if (confirming) return;
    void shutdown();
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
