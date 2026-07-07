// Card provenance trace (item 123 AC3) — a read-only terminal tool that walks
// an intake card's derivation: card atom → classifier run (with its retrieval
// list) → consumed signal atoms → raw source atoms. Every stage prints what
// exists and names what is absent, so a pre-123 card (no card atom) still walks
// the seed → signal → raw remainder, and a failed/lost card atom surfaces as a
// provenance-loss banner from the seed record's `card_atom_status` marker.
//
// Strictly read-only (AC4): the tool writes NOTHING. The SQLite storage open is
// gated on the db file already existing (SqliteStorage's constructor
// creates+migrates a missing db — 117/122 precedent); the seed store is read
// via its read-only accessors.
//
// Usage:
//   npm run trace:card -- <candidate_key>
//   npm run trace:card -- --note <note_id>
//   npm run trace:card -- <candidate_key> --db /path/to/echo.db --seed-store /path/to/seeds.json

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { resolveDbPath } from '../src/daemon/lifecycle.js';
import {
  FileGranolaIntakeSeedStore,
  type GranolaIntakeSeedRecord,
  type GranolaIntakeSeedStore,
} from '../src/enrich/granola-intake-seed-store.js';
import {
  GRANOLA_INTAKE_CARD_SOURCE,
  granolaCardDedupeKey,
  granolaIntakeSeedStorePath,
  type IntakeCardAtomMetadata,
} from '../src/enrich/granola-intake-candidates.js';
import { TERMINAL_CHANNEL_SENTINEL, terminalSeedStorePath } from './intake-terminal.js';
import { GRANOLA_RAW_SOURCE, GRANOLA_SIGNAL_SOURCE } from '../src/enrich/granola-signals.js';
import type { ClassifierRunRecord } from '../src/brain/brain.js';
import type { CaptureEvent, Storage } from '../src/storage/interface.js';
import { SqliteStorage } from '../src/storage/sqlite.js';

const USAGE =
  'Usage: npm run trace:card -- <candidate_key> | --note <note_id> [--db <path>] [--seed-store <path>]';

export interface TraceCardArgs {
  candidateKey?: string;
  noteId?: string;
  dbPath?: string;
  seedStorePath?: string;
}

export function parseTraceCardArgs(argv: readonly string[]): TraceCardArgs {
  const args: TraceCardArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--note') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error('--note requires a note_id');
      args.noteId = value;
      i += 1;
    } else if (arg === '--db') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error('--db requires a path');
      args.dbPath = value;
      i += 1;
    } else if (arg === '--seed-store') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error('--seed-store requires a path');
      args.seedStorePath = value;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('help');
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown argument: ${arg}`);
    } else if (args.candidateKey === undefined) {
      args.candidateKey = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }
  if (args.candidateKey === undefined && args.noteId === undefined) {
    throw new Error('a candidate_key or --note <note_id> is required');
  }
  if (args.candidateKey !== undefined && args.noteId !== undefined) {
    throw new Error('pass either a candidate_key or --note, not both');
  }
  return args;
}

function metaString(event: CaptureEvent, key: string): string | undefined {
  const value = event.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function cardMetadata(event: CaptureEvent): IntakeCardAtomMetadata | undefined {
  const meta = event.metadata;
  if (meta === undefined || typeof meta['candidate_key'] !== 'string') return undefined;
  return meta as unknown as IntakeCardAtomMetadata;
}

/** Render the classifier-run tri-state distinctly (AC3). */
function renderClassifierRun(run: ClassifierRunRecord | undefined, indent: string): string[] {
  if (run === undefined) return [`${indent}classifier run: (absent)`];
  const lines = [
    `${indent}classifier run ${run.run_id}`,
    `${indent}  binding: ${run.binding}${run.model === undefined ? '' : ` model=${run.model}`}`,
    `${indent}  window: ${run.started_at} → ${run.completed_at}`,
  ];
  if (run.capture_status === 'ok') {
    const retrievals = run.retrievals ?? [];
    lines.push(`${indent}  capture: ok (${retrievals.length} retrieval${retrievals.length === 1 ? '' : 's'})`);
    for (const r of retrievals) {
      lines.push(`${indent}    - ${r.tool} @ ${r.at}`);
      lines.push(`${indent}        in:  ${r.input_summary}`);
      lines.push(`${indent}        out: ${r.result_summary}`);
    }
  } else if (run.capture_status === 'zero_retrievals') {
    lines.push(`${indent}  capture: zero retrievals (classifier made no scoped ECHO MCP calls)`);
  } else {
    lines.push(`${indent}  capture: FAILED — ${run.capture_error ?? '(no error summary)'}`);
  }
  return lines;
}

/**
 * AC1 (item 125): map a card atom's `channel_id` to its seed-store path. The
 * terminal sentinel channel writes to the isolated `.terminal.json` store; every
 * other channel (a real Slack channel id) uses the canonical default store. An
 * unknown/undefined channel (e.g. a pre-123 card with no atom) resolves to the
 * default store — the historical trace-card behavior. This is the fix for the
 * live-trace gap where terminal cards' seeds were read from the default store
 * and never found.
 */
export function seedStorePathForChannel(channelId: string | undefined): string {
  return channelId === TERMINAL_CHANNEL_SENTINEL
    ? terminalSeedStorePath()
    : granolaIntakeSeedStorePath();
}

/**
 * AC4 (item 125): the full enumerated seed-store path set. `--note` mode scans
 * all of these when there is no card atom to supply a `channel_id`, so
 * terminal-only seeds are never silently missed. Keep in sync with every
 * channel `seedStorePathForChannel` can resolve to.
 */
export function enumerateSeedStorePaths(): string[] {
  return [granolaIntakeSeedStorePath(), terminalSeedStorePath()];
}

export interface TraceInput {
  storage: Storage | null;
  /**
   * Fallback single seed store, used for channels when `resolveSeedStore` is
   * omitted and as the sole store when `seedStores` is omitted. Preserved so
   * callers that do not need channel-aware resolution keep working.
   */
  seedStore: GranolaIntakeSeedStore;
  dbPathForMessages: string;
  /**
   * AC1 (item 125): resolve the seed store for a card's `channel_id`. When
   * omitted, `seedStore` is used for every candidate; when an explicit
   * `--seed-store` override is in effect, this returns that single store for
   * every channel.
   */
  resolveSeedStore?: (channelId: string | undefined) => GranolaIntakeSeedStore;
  /**
   * AC4 (item 125): the full enumerated seed-store set scanned by `--note` mode
   * when a note has no card atoms. Defaults to `[seedStore]`; an explicit
   * `--seed-store` override narrows it to that single store.
   */
  seedStores?: readonly GranolaIntakeSeedStore[];
}

function seedStoreForChannel(
  input: TraceInput,
  channelId: string | undefined,
): GranolaIntakeSeedStore {
  return input.resolveSeedStore !== undefined
    ? input.resolveSeedStore(channelId)
    : input.seedStore;
}

async function queryAll(storage: Storage | null, source: string): Promise<CaptureEvent[]> {
  if (storage === null) return [];
  return storage.query({ source });
}

/** Walk one candidate_key end-to-end and return the rendered lines. */
async function traceOneCandidate(input: TraceInput, candidateKey: string): Promise<string[]> {
  const lines: string[] = [];
  const dbMissing = input.storage === null;

  const cardAtoms = await queryAll(input.storage, GRANOLA_INTAKE_CARD_SOURCE);
  const cardAtom = cardAtoms.find(
    (a) => cardMetadata(a)?.candidate_key === candidateKey || metaString(a, 'dedupe_key') === granolaCardDedupeKey(candidateKey),
  );
  // AC1 (item 125): resolve the seed store from the card atom's channel_id so a
  // terminal card's seed is read from `.terminal.json`, not the default store.
  const cardChannelId = cardAtom === undefined ? undefined : cardMetadata(cardAtom)?.channel_id;
  const seedStore = seedStoreForChannel(input, cardChannelId);
  const seed = await seedStore.get(candidateKey);

  lines.push(`card  ${candidateKey}`);

  // Provenance-loss banner (AC1/AC3): no card atom, or a persisted failed marker.
  const cardFailedMarker = seed?.card_atom_status === 'failed';
  if (cardAtom === undefined || cardFailedMarker) {
    const reason = dbMissing
      ? `no ECHO db at ${input.dbPathForMessages}`
      : cardFailedMarker
        ? `card atom write FAILED at post time${seed?.card_atom_error === undefined ? '' : ` — ${seed.card_atom_error}`}`
        : 'no card atom (pre-123 card, or provenance lost)';
    lines.push(`  ⚠ PROVENANCE LOSS: ${reason}`);
  }

  const cardMeta = cardAtom === undefined ? undefined : cardMetadata(cardAtom);
  if (cardMeta !== undefined) {
    lines.push(`  posted text:`);
    for (const t of cardAtom!.content.split(/\r?\n/)) lines.push(`    | ${t}`);
    lines.push(`  fields: ${JSON.stringify(cardMeta.fields)}`);
    lines.push(`  channel: ${cardMeta.channel_id}  slack_ts: ${cardMeta.slack_ts}`);
    lines.push(...renderClassifierRun(cardMeta.classifier_run, '  '));
  }

  // Seed record (read from the seed store even when the card atom is absent).
  if (seed !== undefined && seed !== null) {
    lines.push(
      `  seed: status=${seed.status}` +
        (seed.slack_ts === undefined ? '' : ` slack_ts=${seed.slack_ts}`) +
        (seed.card_atom_status === undefined ? '' : ` card_atom=${seed.card_atom_status}`),
    );
  } else {
    lines.push(`  seed: (no seed record for this candidate_key)`);
  }

  // Consumed signal atom(s): candidate_key IS the signal dedupe_key.
  const signalRefs =
    cardMeta?.signal_refs !== undefined && cardMeta.signal_refs.length > 0
      ? cardMeta.signal_refs
      : [candidateKey];
  const signalAtoms = await queryAll(input.storage, GRANOLA_SIGNAL_SOURCE);
  let noteId = cardMeta?.note_id ?? seed?.note_id;
  for (const ref of signalRefs) {
    const signal = signalAtoms.find((a) => metaString(a, 'dedupe_key') === ref);
    if (signal === undefined) {
      const why = dbMissing ? `no ECHO db at ${input.dbPathForMessages}` : 'signal atom not found';
      lines.push(`  signal ${ref}: (absent — ${why})`);
      continue;
    }
    noteId = noteId ?? metaString(signal, 'note_id');
    lines.push(
      `  signal ${ref}: type=${metaString(signal, 'signal_type') ?? '?'}` +
        ` subject=${metaString(signal, 'canonical_subject') ?? '?'}` +
        ` confidence=${String(signal.metadata?.['confidence'] ?? '?')}`,
    );
    lines.push(
      `    extraction: run=${metaString(signal, 'extraction_run_id') ?? '?'}` +
        ` extractor=${metaString(signal, 'extractor_version') ?? '?'}` +
        ` parent=${metaString(signal, 'parent_dedupe_key') ?? '?'}`,
    );
  }

  // Raw source atom(s) for the note.
  if (noteId === undefined) {
    lines.push(`  raw: (note_id unknown — cannot walk raw source)`);
  } else {
    const rawAtoms = (await queryAll(input.storage, GRANOLA_RAW_SOURCE)).filter(
      (a) => metaString(a, 'note_id') === noteId,
    );
    if (rawAtoms.length === 0) {
      const why = dbMissing ? `no ECHO db at ${input.dbPathForMessages}` : 'no raw atom found';
      lines.push(`  raw (note ${noteId}): (absent — ${why})`);
    } else {
      for (const raw of rawAtoms) {
        const title = metaString(raw, 'title') ?? '(untitled)';
        const excerpt = raw.content.replace(/\s+/g, ' ').trim().slice(0, 100);
        lines.push(
          `  raw ${raw.source} @ ${raw.timestamp}: ${title}` +
            (metaString(raw, 'web_url') === undefined ? '' : ` <${metaString(raw, 'web_url')}>`),
        );
        lines.push(`    excerpt: ${excerpt}`);
      }
    }
  }

  return lines;
}

/** List a note's cards, then walk each (AC3 `--note` mode). */
async function traceNote(input: TraceInput, noteId: string): Promise<string[]> {
  const lines: string[] = [`note  ${noteId}`];
  const cardAtoms = (await queryAll(input.storage, GRANOLA_INTAKE_CARD_SOURCE)).filter(
    (a) => cardMetadata(a)?.note_id === noteId,
  );
  if (input.storage === null) {
    lines.push(`  (no ECHO db at ${input.dbPathForMessages} — cannot list card atoms)`);
  } else if (cardAtoms.length === 0) {
    lines.push(`  (no card atoms recorded for this note)`);
  }
  const candidateKeys = cardAtoms
    .map((a) => cardMetadata(a)?.candidate_key)
    .filter((k): k is string => typeof k === 'string');
  for (const key of candidateKeys) {
    lines.push('');
    lines.push(...(await traceOneCandidate(input, key)));
  }

  // AC4 (item 125): when the note has no card atoms (pre-123 note), list its
  // seed records so the note is still walkable from the note entry point. With
  // no card atom to supply a channel_id, scan the FULL enumerated seed-store set
  // (default + every channel-specific store) so terminal-only seeds are never
  // silently missed — the same gap AC1 fixes for the candidate_key path. An
  // explicit `--seed-store` override narrows `seedStores` to that single store.
  if (candidateKeys.length === 0) {
    const stores = input.seedStores ?? [input.seedStore];
    const seen = new Set<string>();
    const seedLines: string[] = [];
    for (const store of stores) {
      let records: GranolaIntakeSeedRecord[];
      try {
        records = await store.list();
      } catch {
        continue; // a missing/unreadable store is walked as empty, never fatal
      }
      for (const record of records) {
        if (record.note_id !== noteId || seen.has(record.candidate_key)) continue;
        seen.add(record.candidate_key);
        seedLines.push(
          `  seed ${record.candidate_key}: status=${record.status}` +
            (record.slack_ts === undefined ? '' : ` slack_ts=${record.slack_ts}`) +
            (record.card_atom_status === undefined ? '' : ` card_atom=${record.card_atom_status}`),
        );
      }
    }
    if (seedLines.length > 0) {
      lines.push('');
      lines.push('  seeds (no card atoms — from seed store):');
      lines.push(...seedLines);
    }
  }
  return lines;
}

export async function buildCardTrace(
  input: TraceInput,
  args: Pick<TraceCardArgs, 'candidateKey' | 'noteId'>,
): Promise<string> {
  const lines =
    args.noteId !== undefined
      ? await traceNote(input, args.noteId)
      : await traceOneCandidate(input, args.candidateKey!);
  return lines.join('\n');
}

export interface TraceCardIo {
  out: (line: string) => void;
  err: (line: string) => void;
}

/**
 * Resolve paths, open storage read-only (existsSync-gated), render, and print.
 * Returns an exit code. Writes NOTHING to disk (AC4).
 */
export async function runTraceCard(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  io: TraceCardIo,
): Promise<number> {
  let args: TraceCardArgs;
  try {
    args = parseTraceCardArgs(argv);
  } catch (err) {
    const message = (err as Error).message;
    io.out(USAGE);
    return message === 'help' ? 0 : 2;
  }

  const dbPath = args.dbPath ?? resolveDbPath({ env });
  // Gate the open on the db file existing — SqliteStorage's constructor
  // creates+migrates a missing db, which would violate the read-only contract.
  let storage: Storage | null = null;
  if (existsSync(dbPath)) {
    try {
      storage = new SqliteStorage(dbPath);
    } catch (err) {
      io.err(`could not open ECHO db at ${dbPath}: ${(err as Error).message}`);
      return 1;
    }
  }

  // AC1/AC4 (item 125): build the seed-store resolution. With an explicit
  // `--seed-store` override, every channel and the `--note` full scan use that
  // one store. Without it, resolve per channel_id (terminal → `.terminal.json`,
  // else default) and enumerate the full set for `--note` mode. Stores are
  // cached by path so a repeated channel reuses one FileGranolaIntakeSeedStore.
  const storeCache = new Map<string, FileGranolaIntakeSeedStore>();
  const storeForPath = (path: string): FileGranolaIntakeSeedStore => {
    let store = storeCache.get(path);
    if (store === undefined) {
      store = new FileGranolaIntakeSeedStore(path);
      storeCache.set(path, store);
    }
    return store;
  };

  let seedStore: FileGranolaIntakeSeedStore;
  let resolveSeedStore: (channelId: string | undefined) => GranolaIntakeSeedStore;
  let seedStores: FileGranolaIntakeSeedStore[];
  if (args.seedStorePath !== undefined) {
    const override = storeForPath(args.seedStorePath);
    seedStore = override;
    resolveSeedStore = () => override;
    seedStores = [override];
  } else {
    seedStore = storeForPath(granolaIntakeSeedStorePath());
    resolveSeedStore = (channelId) => storeForPath(seedStorePathForChannel(channelId));
    seedStores = enumerateSeedStorePaths().map(storeForPath);
  }

  try {
    const trace = await buildCardTrace(
      { storage, seedStore, resolveSeedStore, seedStores, dbPathForMessages: dbPath },
      args,
    );
    io.out(trace);
    return 0;
  } finally {
    if (storage !== null && 'close' in storage && typeof storage.close === 'function') {
      (storage as unknown as { close: () => void }).close();
    }
  }
}

// House entry guard (item 121): run only when this module is the process entry
// point, never on import. Holds under `vite-node --script` (which sets argv[1]
// to the resolved script path); the `trace:card` npm script uses `--script`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTraceCard(process.argv.slice(2), process.env, {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  })
    .then((code) => process.exit(code))
    .catch((err: unknown) => {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(1);
    });
}

// Exported for the seed-record type in tests.
export type { GranolaIntakeSeedRecord };
