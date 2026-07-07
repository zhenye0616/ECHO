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

export interface TraceInput {
  storage: Storage | null;
  seedStore: GranolaIntakeSeedStore;
  dbPathForMessages: string;
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
  const seed = await input.seedStore.get(candidateKey);

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

  const seedStorePath = args.seedStorePath ?? granolaIntakeSeedStorePath();
  const seedStore = new FileGranolaIntakeSeedStore(seedStorePath);

  try {
    const trace = await buildCardTrace({ storage, seedStore, dbPathForMessages: dbPath }, args);
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
