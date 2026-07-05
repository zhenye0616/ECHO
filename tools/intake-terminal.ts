// Terminal intake card — stations 1–3 live end-to-end, zero Slack dependency.
//
// Renders the Granola meeting → signals → classified decision-packet candidate
// pipeline as a plain-text/ANSI card on stdout. The mechanism is REUSED
// verbatim: this tool imports and drives `runGranolaIntakeBridgeOnce` /
// `startGranolaIntakeBridge` from src/enrich/granola-intake-candidates.ts and
// injects a stdout `postSeed` in place of the Slack POST (an existing seam).
// Candidate selection, classification, per-note capping, and the durable seed
// state machine all run unmodified.
//
// Seed-store isolation (why the default store is a dedicated file):
//   Sharing the canonical store (~/.echo/state/granola-intake-seeds.json) would
//   mark terminal-shown seeds `posted` and permanently suppress their future
//   Slack posts. The terminal store is isolated by default so the same
//   candidates can appear again when Slack enables; pass `--seed-store <path>`
//   (e.g. the canonical store) to deliberately choose suppression.
//
// Usage:
//   npm run intake:terminal -- [--once | --watch] [--seed-store <path>]
//     --once   run a single tick, print a status line, exit (default)
//     --watch  reuse the bridge's interval/debounce/single-flight; Ctrl-C to stop
//   Brain classifier defaults to the real runBrain path
//   (ECHO_GRANOLA_INTAKE_BRAIN ?? ECHO_CEO_BRAIN). No Slack env is required.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { parseBrainName, preflightBrain, type BrainName, type IntakeFields } from '../src/brain/brain.js';
import { parseSeedMarker } from '../src/brain/intake-seed.js';
import { resolveDbPath } from '../src/daemon/lifecycle.js';
import { ECHO_HOME_PATHS } from '../src/echo-home/paths.js';
import {
  DEFAULT_GRANOLA_INTAKE_LOOKBACK_DAYS,
  DEFAULT_GRANOLA_INTAKE_MAX_RETRIES,
  DEFAULT_GRANOLA_INTAKE_PER_NOTE_CAP,
  runGranolaIntakeBridgeOnce,
  startGranolaIntakeBridge,
  type GranolaIntakeBridgeResult,
  type GranolaIntakeClassifier,
  type GranolaIntakeConfig,
  type SeedPoster,
} from '../src/enrich/granola-intake-candidates.js';
import {
  FileGranolaIntakeSeedStore,
  type GranolaIntakeSeedStore,
} from '../src/enrich/granola-intake-seed-store.js';
import { SqliteStorage } from '../src/storage/sqlite.js';
import type { Storage } from '../src/storage/interface.js';

// ─── ANSI helpers (following tools/stream-watch.ts conventions) ─────────────
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const FG = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// ─── Config ─────────────────────────────────────────────────────────────────

export const TERMINAL_CHANNEL_SENTINEL = 'terminal';
const TERMINAL_BOT_TOKEN_SENTINEL = 'unused-terminal-token';
const TERMINAL_DEFAULT_OWNER = 'terminal';

/** The isolated default terminal seed store (AC4). */
export function terminalSeedStorePath(): string {
  return join(ECHO_HOME_PATHS.state, 'granola-intake-seeds.terminal.json');
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseDomainList(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((part) => part.trim().toLowerCase().replace(/^@/, ''))
    .filter((part) => part !== '');
}

function parseOwnerMap(raw: string | undefined): Record<string, string> {
  if (raw === undefined || raw.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [email, id] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof id === 'string' && id.trim() !== '') out[email.trim().toLowerCase()] = id.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Construct GranolaIntakeConfig directly (AC3): enabled, a terminal channel
 * sentinel, and an unused bot token, so no Slack-shaped env is required. The
 * non-Slack knobs (internal domains, owner map, lookback, caps) are read from
 * the same env the daemon honors; a `terminal` defaultOwner fallback keeps
 * owner-unresolved notes from being dropped so candidates always surface.
 */
export function buildTerminalIntakeConfig(env: NodeJS.ProcessEnv = process.env): GranolaIntakeConfig {
  const lookbackDays = parsePositiveInt(
    env['ECHO_GRANOLA_INTAKE_LOOKBACK_DAYS'],
    DEFAULT_GRANOLA_INTAKE_LOOKBACK_DAYS,
  );
  const defaultOwner = (env['ECHO_GRANOLA_INTAKE_DEFAULT_OWNER'] ?? '').trim() || TERMINAL_DEFAULT_OWNER;
  return {
    enabled: true,
    lookbackMs: lookbackDays * 24 * 60 * 60 * 1000,
    internalDomains: parseDomainList(env['ECHO_GRANOLA_INTAKE_INTERNAL_DOMAINS']),
    ownerMap: parseOwnerMap(env['ECHO_GRANOLA_INTAKE_OWNER_MAP']),
    defaultOwner,
    channelId: TERMINAL_CHANNEL_SENTINEL,
    botToken: TERMINAL_BOT_TOKEN_SENTINEL,
    perNoteCap: parsePositiveInt(
      env['ECHO_GRANOLA_INTAKE_PER_NOTE_CAP'],
      DEFAULT_GRANOLA_INTAKE_PER_NOTE_CAP,
    ),
    maxRetries: parsePositiveInt(
      env['ECHO_GRANOLA_INTAKE_MAX_RETRIES'],
      DEFAULT_GRANOLA_INTAKE_MAX_RETRIES,
    ),
  };
}

// ─── Card rendering ─────────────────────────────────────────────────────────

const CARD_FIELD_LABELS: ReadonlyArray<[keyof IntakeFields, string]> = [
  ['clientProject', 'Client/project'],
  ['request', 'Request'],
  ['why', 'Why'],
  ['clientOutcome', 'Client outcome'],
  ['evidence', 'Evidence/example'],
  ['doneWhen', 'Done when'],
  ['urgency', 'Urgency'],
  ['clientFacing', 'Client-facing'],
];

/**
 * The candidate key is a Granola signal dedupe_key, e.g.
 * `granola:signal:<noteId>:v<n>:<action|decision>:<hash>`. Recover the signal
 * type from the typed segment; fall back to unknown for a malformed key.
 */
export function signalTypeFromCandidateKey(candidateKey: string): string {
  for (const part of candidateKey.split(':')) {
    if (part === 'action' || part === 'decision') return part;
  }
  return 'unknown';
}

/**
 * Render one decision-packet candidate to a plain-text/ANSI card from the seed
 * message text (AC2). All fields are recovered from the message + its embedded
 * machine marker (parseSeedMarker) — the same text the Slack path would post.
 * `subject` is the best human-readable identity available through the seam
 * (the request field, else the meeting title); canonical_subject is not carried
 * by the seed message, so it cannot be shown from this surface.
 */
export function renderIntakeCard(text: string): string {
  const marker = parseSeedMarker(text);
  if (marker === null) {
    // Defensive: a seed message always carries a marker. If absent, show raw.
    return `${DIM}(unparseable seed; raw message follows)${RESET}\n${text}`;
  }
  const fields = marker.fields ?? {};
  const prov = marker.provenance;
  const signalType = signalTypeFromCandidateKey(marker.candidateKey);
  const subject =
    (fields.request ?? fields.clientProject ?? prov?.meetingTitle ?? '(no subject)').trim();

  const lines: string[] = [];
  lines.push(`${BOLD}${FG.cyan}┌─ INTAKE CANDIDATE ${'─'.repeat(40)}${RESET}`);
  lines.push(`${FG.cyan}│${RESET} ${BOLD}Subject:${RESET}    ${subject}`);
  lines.push(`${FG.cyan}│${RESET} ${BOLD}Signal:${RESET}     ${FG.yellow}${signalType}${RESET}`);
  if (prov !== undefined) {
    const dateSuffix =
      prov.meetingDate !== undefined && prov.meetingDate.trim() !== ''
        ? ` (${prov.meetingDate.trim()})`
        : '';
    lines.push(
      `${FG.cyan}│${RESET} ${BOLD}Meeting:${RESET}    ${prov.meetingTitle}${dateSuffix}  ${DIM}· note ${prov.noteId}${RESET}`,
    );
  }
  lines.push(`${FG.cyan}│${RESET} ${BOLD}Candidate:${RESET}  ${DIM}${marker.candidateKey}${RESET}`);
  if (prov !== undefined && prov.quote.trim() !== '') {
    lines.push(`${FG.cyan}│${RESET} ${BOLD}Quote:${RESET}      ${FG.gray}"${prov.quote.trim()}"${RESET}`);
  }
  const presentFields = CARD_FIELD_LABELS.filter(([key]) => {
    const value = fields[key];
    return value !== undefined && value.trim() !== '';
  });
  if (presentFields.length > 0) {
    lines.push(`${FG.cyan}│${RESET} ${BOLD}Fields:${RESET}`);
    for (const [key, label] of presentFields) {
      lines.push(`${FG.cyan}│${RESET}   ${DIM}${label}:${RESET} ${fields[key]?.trim()}`);
    }
  }
  if (prov?.webUrl !== undefined && prov.webUrl.trim() !== '') {
    lines.push(`${FG.cyan}│${RESET} ${BOLD}Granola:${RESET}    ${DIM}${prov.webUrl.trim()}${RESET}`);
  }
  lines.push(`${FG.cyan}└${'─'.repeat(59)}${RESET}`);
  return lines.join('\n');
}

// ─── Seed-store persistability (AC4) ────────────────────────────────────────

/**
 * Fail fast BEFORE any card is printed if the resolved seed-store path is not
 * persistable: create the parent dir and confirm write access. A card shown
 * without its `posted` state persisted would re-appear as a duplicate next run.
 */
export async function assertSeedStorePersistable(seedStorePath: string): Promise<void> {
  const dir = dirname(resolve(seedStorePath));
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    throw new Error(`seed-store parent directory is not creatable (${dir}): ${(err as Error).message}`);
  }
  const probe = join(dir, `.echo-intake-terminal-probe-${process.pid}-${Date.now()}`);
  try {
    await writeFile(probe, '');
  } catch (err) {
    throw new Error(`seed-store directory is not writable (${dir}): ${(err as Error).message}`);
  } finally {
    await rm(probe, { force: true }).catch(() => undefined);
  }
}

// ─── Tool core ──────────────────────────────────────────────────────────────

export interface IntakeTerminalOptions {
  storage: Storage;
  seedStorePath: string;
  /** Test seams. */
  seedStore?: GranolaIntakeSeedStore;
  classify?: GranolaIntakeClassifier;
  preflight?: (brain: BrainName, env: NodeJS.ProcessEnv) => Promise<void>;
  env?: NodeJS.ProcessEnv;
  out?: (line: string) => void;
  now?: () => string;
  workerIntervalMs?: number;
  debounceMs?: number;
  runOnStart?: boolean;
}

interface WatchHandle {
  handle: { run: () => Promise<GranolaIntakeBridgeResult>; stop: () => Promise<void> };
  stop: () => Promise<void>;
}

function formatStatusLine(result: GranolaIntakeBridgeResult, classifierErrors: number): string {
  if (result.status === 'ok') {
    return (
      `${BOLD}intake-terminal:${RESET} ${result.notes_seen} notes · ` +
      `${result.candidates} candidates · ${FG.green}${result.posted} cards printed${RESET} · ` +
      `${result.skipped} skipped · ${result.failed} failed · ${classifierErrors} classifier errors`
    );
  }
  if (result.status === 'skipped') {
    return `${BOLD}intake-terminal:${RESET} skipped — ${result.reason}`;
  }
  return `${BOLD}intake-terminal:${RESET} error — ${result.reason}: ${result.message}`;
}

/**
 * Run the terminal intake tool. Returns a process exit code for `--once`; for
 * `--watch` it resolves only after the returned handle is stopped (the CLI keeps
 * the process alive and stops on SIGINT). Tests drive `--watch` by calling the
 * returned handle's `run()` directly.
 */
export async function runIntakeTerminalOnce(options: IntakeTerminalOptions): Promise<number> {
  const env = options.env ?? process.env;
  const out = options.out ?? ((line: string) => process.stdout.write(`${line}\n`));

  if (options.seedStore === undefined) {
    try {
      await assertSeedStorePersistable(options.seedStorePath);
    } catch (err) {
      out(`${BOLD}intake-terminal:${RESET} ${(err as Error).message}`);
      return 1;
    }
  }
  const seedStore =
    options.seedStore ?? new FileGranolaIntakeSeedStore(options.seedStorePath, options.now);
  const config = buildTerminalIntakeConfig(env);

  const state = { classifierErrors: 0 };
  const postSeed = makeTerminalPoster(out, options.now);

  // Real (uninjected) path: preflight the brain and fail closed with a clear
  // skip message + nonzero exit before running (AC3).
  if (options.classify === undefined) {
    const brain = parseBrainName(env['ECHO_GRANOLA_INTAKE_BRAIN'] ?? env['ECHO_CEO_BRAIN']);
    const preflight = options.preflight ?? preflightBrain;
    try {
      await preflight(brain, env);
    } catch (err) {
      out(`${BOLD}intake-terminal:${RESET} skipped: brain unavailable — ${(err as Error).message}`);
      return 1;
    }
    // Let the bridge construct the real runBrain classifier (zero duplication),
    // run exactly one tick, then stop.
    const handle = startGranolaIntakeBridge(options.storage, {
      config,
      seedStore,
      postSeed,
      runOnStart: false,
    });
    if (!handle.enabled) {
      out(
        `${BOLD}intake-terminal:${RESET} skipped: bridge disabled` +
          (handle.configError !== undefined ? ` — ${handle.configError.message}` : ''),
      );
      await handle.stop();
      return 1;
    }
    const result = await handle.run();
    await handle.stop();
    out(formatStatusLine(result, state.classifierErrors));
    return result.status === 'ok' ? 0 : 1;
  }

  // Injected-classifier path (tests): drive runGranolaIntakeBridgeOnce directly.
  const classify = wrapCountingClassifier(options.classify, state);
  const result = await runGranolaIntakeBridgeOnce(options.storage, seedStore, config, {
    classify,
    postSeed,
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  out(formatStatusLine(result, state.classifierErrors));
  return result.status === 'ok' ? 0 : 1;
}

/**
 * Start `--watch`: reuse startGranolaIntakeBridge's interval + debounce +
 * single-flight. Brain preflight is LAZY per tick via the bridge's
 * `runSignalsFirst` start-of-pass seam (the only per-tick hook exposed) — every
 * tick that finds the brain unavailable prints a per-tick skip status line
 * naming the reason and never crashes (AC3/AC5).
 */
export async function startIntakeTerminalWatch(options: IntakeTerminalOptions): Promise<WatchHandle> {
  const env = options.env ?? process.env;
  const out = options.out ?? ((line: string) => process.stdout.write(`${line}\n`));

  if (options.seedStore === undefined) {
    await assertSeedStorePersistable(options.seedStorePath);
  }
  const seedStore =
    options.seedStore ?? new FileGranolaIntakeSeedStore(options.seedStorePath, options.now);
  const config = buildTerminalIntakeConfig(env);
  const brain = parseBrainName(env['ECHO_GRANOLA_INTAKE_BRAIN'] ?? env['ECHO_CEO_BRAIN']);
  const preflight = options.preflight ?? preflightBrain;

  const state = { brainAvailable: false, classifierErrors: 0 };
  const postSeed = makeTerminalPoster(out, options.now);

  // Per-tick lazy preflight (AC3): runs at the start of every scheduled pass.
  const runSignalsFirst = async (): Promise<void> => {
    try {
      await preflight(brain, env);
      state.brainAvailable = true;
    } catch (err) {
      state.brainAvailable = false;
      out(`${BOLD}intake-terminal:${RESET} skipped: brain unavailable — ${(err as Error).message}`);
    }
  };

  // When a classifier is injected (tests), gate it on the per-tick preflight so
  // an unavailable brain skips classification instead of running the stub.
  // On the real path the bridge builds its own runBrain classifier, which
  // self-fails per note when the brain is down (skip line already printed).
  const classify =
    options.classify === undefined
      ? undefined
      : gateClassifier(options.classify, state);

  const handle = startGranolaIntakeBridge(options.storage, {
    config,
    seedStore,
    postSeed,
    runSignalsFirst,
    ...(classify === undefined ? {} : { classify }),
    ...(options.workerIntervalMs === undefined ? {} : { workerIntervalMs: options.workerIntervalMs }),
    ...(options.debounceMs === undefined ? {} : { debounceMs: options.debounceMs }),
    ...(options.runOnStart === undefined ? {} : { runOnStart: options.runOnStart }),
  });

  return { handle, stop: () => handle.stop() };
}

function makeTerminalPoster(
  out: (line: string) => void,
  now: (() => string) | undefined,
): SeedPoster {
  return async (_channel, text) => {
    out(renderIntakeCard(text));
    return { ts: `terminal-${now?.() ?? new Date().toISOString()}` };
  };
}

function wrapCountingClassifier(
  classify: GranolaIntakeClassifier,
  state: { classifierErrors: number },
): GranolaIntakeClassifier {
  return async (input) => {
    try {
      return await classify(input);
    } catch (err) {
      state.classifierErrors += 1;
      throw err;
    }
  };
}

function gateClassifier(
  classify: GranolaIntakeClassifier,
  state: { brainAvailable: boolean; classifierErrors: number },
): GranolaIntakeClassifier {
  return async (input) => {
    if (!state.brainAvailable) throw new Error('brain unavailable');
    try {
      return await classify(input);
    } catch (err) {
      state.classifierErrors += 1;
      throw err;
    }
  };
}

// ─── CLI ────────────────────────────────────────────────────────────────────

interface ParsedArgs {
  mode: 'once' | 'watch';
  seedStorePath: string;
}

export function parseArgs(argv: readonly string[], defaultSeedStorePath: string): ParsedArgs {
  let mode: 'once' | 'watch' | undefined;
  let seedStorePath = defaultSeedStorePath;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--once') {
      if (mode === 'watch') throw new Error('choose either --once or --watch, not both');
      mode = 'once';
    } else if (arg === '--watch') {
      if (mode === 'once') throw new Error('choose either --once or --watch, not both');
      mode = 'watch';
    } else if (arg === '--seed-store') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error('--seed-store requires a path argument');
      }
      seedStorePath = isAbsolute(value) ? value : resolve(value);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('help');
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { mode: mode ?? 'once', seedStorePath };
}

const USAGE =
  'Usage: npm run intake:terminal -- [--once | --watch] [--seed-store <path>]';

async function main(): Promise<void> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2), terminalSeedStorePath());
  } catch (err) {
    const message = (err as Error).message;
    process.stdout.write(`${USAGE}\n`);
    process.exit(message === 'help' ? 0 : 2);
    return;
  }

  const storage = new SqliteStorage(resolveDbPath());

  if (parsed.mode === 'once') {
    const code = await runIntakeTerminalOnce({
      storage,
      seedStorePath: parsed.seedStorePath,
    });
    storage.close();
    process.exit(code);
    return;
  }

  // --watch: keep the process alive until Ctrl-C.
  const watch = await startIntakeTerminalWatch({
    storage,
    seedStorePath: parsed.seedStorePath,
  });
  process.stdout.write(
    `${BOLD}${FG.green}intake-terminal watching${RESET} ${DIM}(seed store: ${parsed.seedStorePath}) — Ctrl-C to stop${RESET}\n`,
  );
  const keepAlive = setInterval(() => undefined, 1 << 30);
  let stopping = false;
  const shutdown = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    process.stdout.write(`\n${DIM}stopping…${RESET}\n`);
    clearInterval(keepAlive);
    await watch.stop();
    storage.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

// Run the CLI when invoked directly (vite-node / `npm run intake:terminal`),
// not when imported by the vitest suite. vite-node strips the script name from
// argv, so entry cannot be detected there; the reliable discriminator is that
// vitest sets process.env.VITEST while the CLI runner does not.
if (process.env['VITEST'] === undefined) {
  main().catch((err: unknown) => {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  });
}
