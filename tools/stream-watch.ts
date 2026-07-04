// Live visualizer for the Claude Code + Codex capture streams.
//
// Wires the real extractors against ~/.claude/projects/ and ~/.codex/sessions/
// using an in-memory storage shim. Pre-seeds the storage with synthetic
// "already-processed-to-EOF" markers for every existing JSONL so the boot
// scan emits zero historical turns — only newly-arriving turns are printed.
// Pure observability: nothing persists. Stop with Ctrl-C.
//
// Usage:  npm run watch:stream

import { readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { startClaudeCodeExtractor } from '../src/capture/extractors/claude-code.js';
import { startCodexExtractor } from '../src/capture/extractors/codex.js';
import { SOURCE_MARKERS } from '../src/capture/extractors/_shared.js';
import type {
  CaptureEvent,
  EventId,
  QueryFilter,
  Storage,
} from '../src/storage/interface.js';
import { MemoryStorage } from '../src/storage/memory.js';

const HOME = homedir();
const CC_ROOT = `${HOME}/.claude/projects/`;
const CX_ROOT = `${HOME}/.codex/sessions/`;

// ─── ANSI helpers ───────────────────────────────────────────────────────────
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const FG = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// ─── Streaming storage shim: prints on append, ignores everything else ──────

class StreamingStorage implements Storage {
  private inner = new MemoryStorage();
  private onLive: ((event: CaptureEvent) => void) | null = null;
  private liveMode = false;

  setOnLive(fn: (event: CaptureEvent) => void): void {
    this.onLive = fn;
  }

  enableLiveMode(): void {
    this.liveMode = true;
  }

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const id = await this.inner.append(event);
    if (this.liveMode && this.onLive !== null) {
      this.onLive({ ...event, id } as CaptureEvent);
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

  // 057a AC3: delegate. StreamingStorage is a dev-time stream tap that
  // wraps the durable storage; the coord seam works through the wrapper.
  iterateCoordAtomsByAppendOrder(
    opts?: Parameters<Storage['iterateCoordAtomsByAppendOrder']>[0],
  ): ReturnType<Storage['iterateCoordAtomsByAppendOrder']> {
    return this.inner.iterateCoordAtomsByAppendOrder(opts);
  }
  getCurrentCoordSequence(): Promise<number> {
    return this.inner.getCurrentCoordSequence();
  }
  iterateAtomsByAppendOrder(
    opts?: Parameters<Storage['iterateAtomsByAppendOrder']>[0],
  ): ReturnType<Storage['iterateAtomsByAppendOrder']> {
    return this.inner.iterateAtomsByAppendOrder(opts);
  }
  getCurrentSequence(
    opts?: Parameters<Storage['getCurrentSequence']>[0],
  ): Promise<number> {
    return this.inner.getCurrentSequence(opts);
  }
}

// ─── Pre-seeding: walk existing JSONLs, mark them processed-to-EOF ──────────

interface SeedOpts {
  root: string;
  recursive: boolean;
}

function walkJsonls({ root, recursive }: SeedOpts): { path: string; size: number }[] {
  const out: { path: string; size: number }[] = [];
  function walk(dir: string): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (recursive) walk(p);
        continue;
      }
      if (!e.isFile()) continue;
      if (!e.name.endsWith('.jsonl')) continue;
      try {
        const s = statSync(p);
        out.push({ path: p, size: s.size });
      } catch {
        /* ignore */
      }
    }
  }
  walk(root);
  return out;
}

async function preSeed(storage: StreamingStorage): Promise<{ cc: number; cx: number }> {
  const cc = walkJsonls({ root: CC_ROOT, recursive: true });
  const cx = walkJsonls({ root: CX_ROOT, recursive: true });

  for (const f of cc) {
    await storage.append({
      source: `fs:${f.path}`,
      timestamp: new Date().toISOString(),
      content: '',
      metadata: { byte_offset: f.size, turn_index: -1, _seed: true },
    });
  }
  for (const f of cx) {
    await storage.append({
      source: `fs:${f.path}`,
      timestamp: new Date().toISOString(),
      content: '',
      metadata: { byte_offset: f.size, turn_index: -1, _seed: true },
    });
  }
  return { cc: cc.length, cx: cx.length };
}

// ─── Pretty-printing ────────────────────────────────────────────────────────

function shortRepo(p: string | undefined): string {
  if (p === undefined) return '—';
  const parts = p.split('/').filter((s) => s.length > 0);
  return parts.slice(-2).join('/');
}

function clip(s: string, n: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n - 1) + '…' : flat;
}

function parseUserAssistant(content: string): { user: string; assistant: string } {
  const m = content.match(/^USER: ([\s\S]*?)\n\nASSISTANT: ([\s\S]*)$/);
  if (m) return { user: m[1] ?? '', assistant: m[2] ?? '' };
  return { user: '', assistant: content };
}

function printEvent(event: CaptureEvent): void {
  const md = (event.metadata ?? {}) as Record<string, unknown>;
  if (md['_seed'] === true) return; // safety net, shouldn't happen in liveMode

  const isCodex = event.source.includes(SOURCE_MARKERS.codex);
  const lane = isCodex
    ? `${FG.magenta}CODEX${RESET}`
    : `${FG.cyan}CC   ${RESET}`;

  const sid = ((md['session_id'] as string) ?? '????????').slice(0, 8);
  const turn = md['turn_index'] ?? '?';
  const tool = md['had_tool_use'] === true ? `${FG.yellow}🔧${RESET}` : '  ';

  const repo = shortRepo(md['repo_root'] as string | undefined);
  const branch = isCodex
    ? ((md['git'] as Record<string, unknown> | undefined)?.['branch'] as string | undefined)
    : undefined;
  const repoBranch = branch !== undefined ? `${repo}@${FG.green}${branch}${RESET}` : repo;

  const codex = (md['codex'] as Record<string, unknown> | undefined) ?? {};
  const model = codex['model'] as string | undefined;
  const sandbox = codex['sandbox_policy_type'] as string | undefined;
  const codexHints = isCodex
    ? `${DIM}${[model, sandbox].filter(Boolean).join('/')}${RESET}`
    : '';
  const filesRef = md['files_referenced'] as string[] | undefined;
  const fileHint =
    filesRef !== undefined && filesRef.length > 0
      ? ` ${DIM}files=${filesRef.length}${RESET}`
      : '';

  const { user } = parseUserAssistant(event.content);
  const userOneLine = clip(user, 90);

  const ts = event.timestamp.slice(11, 19); // HH:MM:SS
  console.log(
    `${DIM}${ts}${RESET} ${lane} ${DIM}${sid}/#${turn}${RESET} ${tool} ${BOLD}${repoBranch}${RESET}${fileHint} ${codexHints}\n` +
      `              ${FG.gray}»${RESET} ${userOneLine}`,
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const storage = new StreamingStorage();
  storage.setOnLive(printEvent);

  console.log(`${BOLD}ECHO stream-watch${RESET}  ${DIM}— pre-seeding existing JSONLs…${RESET}`);
  const seedCounts = await preSeed(storage);
  console.log(
    `${DIM}seeded ${seedCounts.cc} CC sessions and ${seedCounts.cx} Codex rollouts at EOF${RESET}`,
  );

  const cc = await startClaudeCodeExtractor(storage);
  const cx = await startCodexExtractor(storage);
  storage.enableLiveMode();

  console.log(
    `${BOLD}${FG.green}live${RESET}  ${DIM}watching ${CC_ROOT} and ${CX_ROOT}${RESET}`,
  );
  console.log(`${DIM}press Ctrl-C to stop${RESET}\n`);

  let stopping = false;
  async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    console.log(`\n${DIM}stopping…${RESET}`);
    await cc.stop();
    await cx.stop();
    process.exit(0);
  }
  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
