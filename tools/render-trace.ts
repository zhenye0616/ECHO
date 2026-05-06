// One-shot HTML trace renderer for the CC + Codex capture streams.
//
// Wires the real extractors against an in-memory storage that filters by
// timestamp window, lets the boot-scan replay everything in scope, then
// emits a single self-contained HTML file with both streams rendered
// side-by-side in two columns. Inspired by claude-trace's
// template+replacement approach but with our two-stream shape.
//
// Usage:
//   npm run render:trace                       (last 7 days, ~/Desktop)
//   npm run render:trace -- --days 1
//   npm run render:trace -- --days 30 --out /tmp/trace.html
//   npm run render:trace -- --full-content    (don't truncate large messages)

import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { startClaudeCodeExtractor } from '../src/capture/extractors/claude-code.js';
import { startCodexExtractor } from '../src/capture/extractors/codex.js';
import type {
  CaptureEvent,
  EventId,
  QueryFilter,
  Storage,
} from '../src/storage/interface.js';
import { MemoryStorage } from '../src/storage/memory.js';

import { buildHtml, eventsToRows, formatGeneratedAt, waitForDrain } from './_trace_render.js';

interface Args {
  days: number;
  outPath: string;
  fullContent: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    days: 7,
    outPath: defaultOutPath(),
    fullContent: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') {
      const v = argv[++i];
      if (v !== undefined) args.days = Math.max(1, Number.parseInt(v, 10));
    } else if (a === '--out') {
      const v = argv[++i];
      if (v !== undefined) args.outPath = resolve(v);
    } else if (a === '--full-content') {
      args.fullContent = true;
    }
  }
  return args;
}

function defaultOutPath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return resolve(homedir(), 'Desktop', `echo-trace-${stamp}.html`);
}

class WindowedStorage implements Storage {
  private inner = new MemoryStorage();
  constructor(private readonly sinceMs: number) {}

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const ts = Date.parse(event.timestamp);
    if (Number.isFinite(ts) && ts < this.sinceMs) return '_skip';
    return this.inner.append(event);
  }

  query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    return this.inner.query(filter);
  }

  count(): Promise<number> {
    return this.inner.count();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sinceMs = Date.now() - args.days * 24 * 3600 * 1000;
  console.log(`ECHO render-trace`);
  console.log(`  window:  last ${args.days}d  (since ${new Date(sinceMs).toISOString()})`);
  console.log(`  output:  ${args.outPath}`);

  const storage = new WindowedStorage(sinceMs);
  console.log(`  starting extractors…`);
  const cc = await startClaudeCodeExtractor(storage);
  const cx = await startCodexExtractor(storage);

  console.log(`  draining boot scan (poll until count plateau)…`);
  await waitForDrain(storage);

  await cc.stop();
  await cx.stop();

  const events = await storage.query();
  console.log(`  collected ${events.length} events in window`);

  const rows = eventsToRows(events, args.fullContent);

  const html = buildHtml(rows, {
    days: args.days,
    generatedAt: formatGeneratedAt(),
    live: false,
  });

  mkdirSync(dirname(args.outPath), { recursive: true });
  writeFileSync(args.outPath, html, 'utf-8');

  console.log(`\nwrote ${(html.length / 1024 / 1024).toFixed(1)} MB to ${args.outPath}`);
  console.log(`open with:  open '${args.outPath}'`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
