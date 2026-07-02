import { isAbsolute, join } from 'node:path';
import { ECHO_HOME_PATHS } from '../echo-home/paths.js';
import { createLogger } from '../logging/index.js';
import type { IntakeFields } from '../surfaces/ceo-slack-responder/brain.js';
import {
  parseBrainName,
  runBrain,
  type BrainName,
} from '../surfaces/ceo-slack-responder/brain.js';
import {
  renderSeedMessage,
  type MeetingProvenance,
} from '../surfaces/ceo-slack-responder/intake-seed.js';
import type { CaptureEvent, Storage } from '../storage/interface.js';
import { parseJson } from '../util/json.js';
import { GRANOLA_RAW_SOURCE, GRANOLA_SIGNAL_SOURCE } from './granola-signals.js';
import {
  FileGranolaIntakeSeedStore,
  type GranolaIntakeSeedStore,
} from './granola-intake-seed-store.js';

export const DEFAULT_GRANOLA_INTAKE_LOOKBACK_DAYS = 7;
export const DEFAULT_GRANOLA_INTAKE_PER_NOTE_CAP = 3;
export const DEFAULT_GRANOLA_INTAKE_MAX_RETRIES = 5;
export const DEFAULT_GRANOLA_INTAKE_WORKER_INTERVAL_MS = 600_000;
export const DEFAULT_GRANOLA_INTAKE_DEBOUNCE_MS = 5_000;
export const DEFAULT_GRANOLA_INTAKE_BRAIN_TIMEOUT_MS = 180_000;

const log = createLogger('enrich.granola-intake');

const INTAKE_SIGNAL_TYPES: ReadonlySet<string> = new Set(['action', 'decision']);
const EMAIL_RE = /[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/g;

export interface GranolaIntakeConfig {
  enabled: boolean;
  lookbackMs: number;
  internalDomains: string[];
  ownerMap: Record<string, string>;
  defaultOwner?: string;
  channelId: string;
  botToken: string;
  perNoteCap: number;
  maxRetries: number;
}

export class GranolaIntakeConfigError extends Error {
  constructor(
    message: string,
    public readonly missing: string[],
  ) {
    super(message);
    this.name = 'GranolaIntakeConfigError';
  }
}

export interface GranolaIntakeSignalForClassification {
  ref: string;
  signal_type: string;
  text: string;
  canonical_subject: string;
  quote: string;
  confidence: number;
}

export interface GranolaIntakeClassificationInput {
  note_id: string;
  meeting_title: string;
  meeting_date?: string;
  web_url?: string;
  signals: GranolaIntakeSignalForClassification[];
}

export interface ClassifiedIntakeCandidate {
  ref: string;
  fields: IntakeFields;
  quote?: string;
}

export type GranolaIntakeClassifier = (
  input: GranolaIntakeClassificationInput,
) => Promise<ClassifiedIntakeCandidate[]>;

export interface SeedPostResult {
  ts: string;
}

export type SeedPoster = (channel: string, text: string) => Promise<SeedPostResult>;

export interface GranolaIntakeBridgeDeps {
  classify: GranolaIntakeClassifier;
  postSeed: SeedPoster;
  now?: () => string;
}

export type GranolaIntakeBridgeResult =
  | {
      status: 'ok';
      notes_seen: number;
      candidates: number;
      posted: number;
      failed: number;
      skipped: number;
    }
  | { status: 'skipped'; reason: 'disabled' | 'in_flight' | 'config' }
  | { status: 'error'; reason: string; message: string };

export interface GranolaIntakeBridgeHandle {
  enabled: boolean;
  configError?: GranolaIntakeConfigError;
  run: () => Promise<GranolaIntakeBridgeResult>;
  stop: () => Promise<void>;
}

export interface GranolaIntakeBridgeOptions {
  config?: GranolaIntakeConfig;
  seedStore?: GranolaIntakeSeedStore;
  seedStorePath?: string;
  classify?: GranolaIntakeClassifier;
  postSeed?: SeedPoster;
  now?: () => string;
  env?: NodeJS.ProcessEnv;
  /** Coupling that makes the bridge run "after signal extraction": awaited at
   *  the start of every scheduled pass so seeds are built from freshly-extracted
   *  signal atoms. Idempotent on the signal worker side. */
  runSignalsFirst?: () => Promise<unknown>;
  workerIntervalMs?: number;
  debounceMs?: number;
  runOnStart?: boolean;
}

interface BrainClassifierConfig {
  brain: BrainName;
  contextRepoPath: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}

interface RawNoteInfo {
  meeting_title: string;
  meeting_date?: string;
  web_url?: string;
  attendee_emails: string[];
}

function parseBooleanFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === '') return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
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
  const parsed = parseJson(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('ECHO_GRANOLA_INTAKE_OWNER_MAP must be a JSON object of email→slack-user-id');
  }
  const out: Record<string, string> = {};
  for (const [email, slackId] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof slackId !== 'string' || slackId.trim() === '') {
      throw new Error(`ECHO_GRANOLA_INTAKE_OWNER_MAP value for ${email} must be a non-empty string`);
    }
    out[email.trim().toLowerCase()] = slackId.trim();
  }
  return out;
}

/**
 * Load bridge config. Fail-closed: when enabled but the Slack bot token or
 * intake channel is missing/blank, throw a structured GranolaIntakeConfigError
 * BEFORE any seed record can be claimed. The daemon/responder equality of the
 * bot token + channel allowlist is a deploy invariant, not machine-checked here
 * (separate deployments, no shared store) — startup validation is scoped to
 * what is locally checkable (presence).
 */
export function loadGranolaIntakeConfig(env: NodeJS.ProcessEnv = process.env): GranolaIntakeConfig {
  const enabled = parseBooleanFlag(env['ECHO_GRANOLA_INTAKE_ENABLED']);
  const lookbackDays = parsePositiveInt(
    env['ECHO_GRANOLA_INTAKE_LOOKBACK_DAYS'],
    DEFAULT_GRANOLA_INTAKE_LOOKBACK_DAYS,
  );
  const channelId = (env['ECHO_GRANOLA_INTAKE_CHANNEL_ID'] ?? '').trim();
  const botToken = (env['ECHO_SLACK_BOT_TOKEN'] ?? env['SLACK_BOT_TOKEN'] ?? '').trim();
  const defaultOwner = (env['ECHO_GRANOLA_INTAKE_DEFAULT_OWNER'] ?? '').trim();

  const config: GranolaIntakeConfig = {
    enabled,
    lookbackMs: lookbackDays * 24 * 60 * 60 * 1000,
    internalDomains: parseDomainList(env['ECHO_GRANOLA_INTAKE_INTERNAL_DOMAINS']),
    ownerMap: parseOwnerMap(env['ECHO_GRANOLA_INTAKE_OWNER_MAP']),
    ...(defaultOwner === '' ? {} : { defaultOwner }),
    channelId,
    botToken,
    perNoteCap: parsePositiveInt(
      env['ECHO_GRANOLA_INTAKE_PER_NOTE_CAP'],
      DEFAULT_GRANOLA_INTAKE_PER_NOTE_CAP,
    ),
    maxRetries: parsePositiveInt(
      env['ECHO_GRANOLA_INTAKE_MAX_RETRIES'],
      DEFAULT_GRANOLA_INTAKE_MAX_RETRIES,
    ),
  };

  if (enabled) {
    const missing: string[] = [];
    if (botToken === '') missing.push('ECHO_SLACK_BOT_TOKEN');
    if (channelId === '') missing.push('ECHO_GRANOLA_INTAKE_CHANNEL_ID');
    if (missing.length > 0) {
      throw new GranolaIntakeConfigError(
        `Granola intake bridge is enabled but missing required config: ${missing.join(', ')}`,
        missing,
      );
    }
  }
  return config;
}

function stringMetadata(event: CaptureEvent, key: string): string | null {
  const value = event.metadata?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function collectAttendeeEmails(attendees: unknown): string[] {
  const found = new Set<string>();
  const visit = (value: unknown, depth: number): void => {
    if (depth > 6 || value === null || value === undefined) return;
    if (typeof value === 'string') {
      for (const match of value.matchAll(EMAIL_RE)) {
        found.add(match[0].toLowerCase());
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value === 'object') {
      for (const item of Object.values(value as Record<string, unknown>)) {
        visit(item, depth + 1);
      }
    }
  };
  visit(attendees, 0);
  return [...found];
}

function hasExternalAttendee(emails: readonly string[], internalDomains: readonly string[]): boolean {
  const internal = new Set(internalDomains);
  return emails.some((email) => {
    const at = email.lastIndexOf('@');
    if (at < 0) return false;
    const domain = email.slice(at + 1);
    return !internal.has(domain);
  });
}

function buildRawNoteInfo(events: readonly CaptureEvent[]): Map<string, RawNoteInfo> {
  const byNote = new Map<string, RawNoteInfo>();
  for (const event of events) {
    const noteId = stringMetadata(event, 'note_id');
    if (noteId === null) continue;
    const existing = byNote.get(noteId);
    const emails = collectAttendeeEmails(event.metadata?.['attendees']);
    const info: RawNoteInfo = existing ?? {
      meeting_title: stringMetadata(event, 'title') ?? 'Untitled Granola note',
      attendee_emails: [],
    };
    const title = stringMetadata(event, 'title');
    if (title !== null) info.meeting_title = title;
    const date = stringMetadata(event, 'updated_at') ?? stringMetadata(event, 'created_at');
    if (date !== null && info.meeting_date === undefined) info.meeting_date = date;
    const webUrl = stringMetadata(event, 'web_url');
    if (webUrl !== null && info.web_url === undefined) info.web_url = webUrl;
    info.attendee_emails = [...new Set([...info.attendee_emails, ...emails])];
    byNote.set(noteId, info);
  }
  return byNote;
}

interface SignalForNote {
  note_id: string;
  dedupe_key: string;
  signal_type: string;
  text: string;
  canonical_subject: string;
  quote: string;
  confidence: number;
}

function extractSignal(event: CaptureEvent): SignalForNote | null {
  const meta = event.metadata;
  if (meta === undefined) return null;
  const signalType = meta['signal_type'];
  const noteId = meta['note_id'];
  const dedupeKey = meta['dedupe_key'];
  if (
    typeof signalType !== 'string' ||
    !INTAKE_SIGNAL_TYPES.has(signalType) ||
    typeof noteId !== 'string' ||
    noteId.trim() === '' ||
    typeof dedupeKey !== 'string' ||
    dedupeKey.trim() === ''
  ) {
    return null;
  }
  const span = meta['source_span'];
  const quote =
    typeof span === 'object' &&
    span !== null &&
    (span as Record<string, unknown>)['kind'] === 'transcript' &&
    typeof (span as Record<string, unknown>)['quote'] === 'string'
      ? ((span as Record<string, unknown>)['quote'] as string)
      : event.content;
  const canonicalSubject = meta['canonical_subject'];
  const confidence = meta['confidence'];
  return {
    note_id: noteId,
    dedupe_key: dedupeKey,
    signal_type: signalType,
    text: event.content,
    canonical_subject: typeof canonicalSubject === 'string' ? canonicalSubject : '',
    quote,
    confidence: typeof confidence === 'number' ? confidence : 0,
  };
}

function resolveOwner(
  attendeeEmails: readonly string[],
  config: GranolaIntakeConfig,
): string | undefined {
  for (const email of attendeeEmails) {
    const mapped = config.ownerMap[email];
    if (mapped !== undefined) return mapped;
  }
  return config.defaultOwner;
}

export async function runGranolaIntakeBridgeOnce(
  storage: Storage,
  seedStore: GranolaIntakeSeedStore,
  config: GranolaIntakeConfig,
  deps: GranolaIntakeBridgeDeps,
): Promise<GranolaIntakeBridgeResult> {
  if (!config.enabled) return { status: 'skipped', reason: 'disabled' };
  const now = deps.now ?? (() => new Date().toISOString());
  const cutoffIso = new Date(Date.now() - config.lookbackMs).toISOString();

  let signalEvents: CaptureEvent[];
  let rawEvents: CaptureEvent[];
  try {
    signalEvents = await storage.query({ source: GRANOLA_SIGNAL_SOURCE, since: cutoffIso });
    rawEvents = await storage.query({ source: GRANOLA_RAW_SOURCE });
  } catch (err) {
    const message = (err as Error).message;
    log.error('query_failed', { message });
    return { status: 'error', reason: 'query_failed', message };
  }

  const rawInfo = buildRawNoteInfo(rawEvents);
  const signalsByNote = new Map<string, SignalForNote[]>();
  for (const event of signalEvents) {
    const signal = extractSignal(event);
    if (signal === null) continue;
    const list = signalsByNote.get(signal.note_id) ?? [];
    list.push(signal);
    signalsByNote.set(signal.note_id, list);
  }

  let notesSeen = 0;
  let candidates = 0;
  let posted = 0;
  let failed = 0;
  let skipped = 0;

  for (const [noteId, signals] of signalsByNote) {
    const info = rawInfo.get(noteId);
    if (info === undefined) continue;
    if (!hasExternalAttendee(info.attendee_emails, config.internalDomains)) continue;
    notesSeen += 1;
    const ownerSlackId = resolveOwner(info.attendee_emails, config);
    if (ownerSlackId === undefined) {
      log.warn('owner_unresolved', { note_id: noteId });
      continue;
    }

    const refToSignal = new Map(signals.map((signal) => [signal.dedupe_key, signal]));
    let classified: ClassifiedIntakeCandidate[];
    try {
      classified = await deps.classify({
        note_id: noteId,
        meeting_title: info.meeting_title,
        ...(info.meeting_date === undefined ? {} : { meeting_date: info.meeting_date }),
        ...(info.web_url === undefined ? {} : { web_url: info.web_url }),
        signals: signals.map((signal) => ({
          ref: signal.dedupe_key,
          signal_type: signal.signal_type,
          text: signal.text,
          canonical_subject: signal.canonical_subject,
          quote: signal.quote,
          confidence: signal.confidence,
        })),
      });
    } catch (err) {
      log.error('classify_failed', { note_id: noteId, message: (err as Error).message });
      continue;
    }

    const noteCandidates = classified
      .filter((candidate) => refToSignal.has(candidate.ref))
      .slice(0, config.perNoteCap);

    for (const candidate of noteCandidates) {
      const signal = refToSignal.get(candidate.ref)!;
      candidates += 1;
      const provenance: MeetingProvenance = {
        noteId,
        meetingTitle: info.meeting_title,
        ...(info.meeting_date === undefined ? {} : { meetingDate: info.meeting_date }),
        ...(info.web_url === undefined ? {} : { webUrl: info.web_url }),
        quote: candidate.quote ?? signal.quote,
      };

      const { record } = await seedStore.claim({
        candidateKey: candidate.ref,
        noteId,
        channelId: config.channelId,
      });
      if (record.status === 'posted' || record.status === 'failed') {
        skipped += 1;
        continue;
      }

      await seedStore.markPosting(candidate.ref);
      try {
        const text = renderSeedMessage({
          fields: candidate.fields,
          provenance,
          ownerSlackId,
          candidateKey: candidate.ref,
        });
        const result = await deps.postSeed(config.channelId, text);
        await seedStore.markPosted(candidate.ref, result.ts);
        posted += 1;
      } catch (err) {
        const message = (err as Error).message;
        const next = await seedStore.markFailure(candidate.ref, message, config.maxRetries);
        failed += 1;
        log.error('seed_post_failed', {
          candidate_key: candidate.ref,
          retry_count: next.retry_count,
          terminal: next.status === 'failed',
          message,
        });
      }
    }
  }

  const result = {
    status: 'ok' as const,
    notes_seen: notesSeen,
    candidates,
    posted,
    failed,
    skipped,
  };
  log.info('bridge_ok', { ...result, now: now() });
  return result;
}

function resolveBrainClassifierConfig(env: NodeJS.ProcessEnv): BrainClassifierConfig {
  const brain = parseBrainName(env['ECHO_GRANOLA_INTAKE_BRAIN'] ?? env['ECHO_CEO_BRAIN']);
  const contextRepoPath =
    env['ECHO_GRANOLA_INTAKE_CONTEXT_REPO_PATH'] ??
    env['ECHO_CEO_CONTEXT_REPO_PATH'] ??
    process.cwd();
  if (!isAbsolute(contextRepoPath)) {
    throw new Error('ECHO_GRANOLA_INTAKE_CONTEXT_REPO_PATH must be absolute when set');
  }
  return {
    brain,
    contextRepoPath,
    timeoutMs: parsePositiveInt(
      env['ECHO_GRANOLA_INTAKE_BRAIN_TIMEOUT_MS'],
      DEFAULT_GRANOLA_INTAKE_BRAIN_TIMEOUT_MS,
    ),
    env,
  };
}

function buildClassificationPrompt(input: GranolaIntakeClassificationInput): string {
  return [
    'You triage client needs and issues raised in a meeting into Linear intake candidates.',
    'Keep ONLY ticket-worthy client needs or issues; drop internal chatter and vague items.',
    'For each kept signal, map it to intake fields best-effort. Leave a field out if not stated.',
    'Return JSON only: {"candidates":[{"ref":"<signal ref>","fields":{...},"quote":"<supporting quote>"}]}.',
    'fields keys: clientProject, request, why, clientOutcome, evidence, doneWhen, urgency, clientFacing.',
    'ref MUST be one of the provided signal refs. Do not invent refs or facts.',
    '',
    JSON.stringify(input, null, 2),
  ].join('\n');
}

function parseClassifierAnswer(answer: string): ClassifiedIntakeCandidate[] {
  const parsed = parseJson(answer.trim());
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as Record<string, unknown>)['candidates'])
      ? ((parsed as Record<string, unknown>)['candidates'] as unknown[])
      : null;
  if (list === null) throw new Error('classifier returned invalid JSON candidate list');
  return list.map(parseClassifiedCandidate);
}

function parseClassifiedCandidate(value: unknown): ClassifiedIntakeCandidate {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('classifier candidate must be an object');
  }
  const record = value as Record<string, unknown>;
  const ref = record['ref'];
  if (typeof ref !== 'string' || ref.trim() === '') {
    throw new Error('classifier candidate ref is required');
  }
  const fieldsRaw = record['fields'];
  const fields: IntakeFields = {};
  if (typeof fieldsRaw === 'object' && fieldsRaw !== null && !Array.isArray(fieldsRaw)) {
    for (const key of [
      'clientProject',
      'request',
      'why',
      'clientOutcome',
      'evidence',
      'doneWhen',
      'urgency',
      'clientFacing',
    ] as const) {
      const fieldValue = (fieldsRaw as Record<string, unknown>)[key];
      if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
        fields[key] = fieldValue.trim();
      }
    }
  }
  const quote = record['quote'];
  return {
    ref: ref.trim(),
    fields,
    ...(typeof quote === 'string' && quote.trim() !== '' ? { quote: quote.trim() } : {}),
  };
}

function defaultClassifierFromBrain(config: BrainClassifierConfig): GranolaIntakeClassifier {
  return async (input) => {
    const result = await runBrain(buildClassificationPrompt(input), {
      brain: config.brain,
      contextRepoPath: config.contextRepoPath,
      timeoutMs: config.timeoutMs,
      env: config.env,
    });
    if (!result.ok || result.answer === undefined) {
      throw new Error(result.reason ?? result.outcome);
    }
    return parseClassifierAnswer(result.answer);
  };
}

interface SlackPostResponse {
  ok?: boolean;
  error?: string;
  ts?: string;
}

export async function postGranolaIntakeSeed(
  botToken: string,
  channel: string,
  text: string,
): Promise<SeedPostResult> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });
  const body = (await response.json()) as SlackPostResponse;
  if (!response.ok || body.ok !== true || body.ts === undefined) {
    throw new Error(`Slack seed postMessage failed: ${body.error ?? `HTTP ${response.status}`}`);
  }
  return { ts: body.ts };
}

export function startGranolaIntakeBridge(
  storage: Storage,
  options: GranolaIntakeBridgeOptions = {},
): GranolaIntakeBridgeHandle {
  const env = options.env ?? process.env;
  let config: GranolaIntakeConfig;
  try {
    config = options.config ?? loadGranolaIntakeConfig(env);
  } catch (err) {
    if (err instanceof GranolaIntakeConfigError) {
      log.error('config_error', { missing: err.missing, message: err.message });
      return {
        enabled: false,
        configError: err,
        run: async () => ({ status: 'skipped', reason: 'config' }),
        stop: async () => {},
      };
    }
    throw err;
  }

  if (!config.enabled) {
    return {
      enabled: false,
      run: async () => ({ status: 'skipped', reason: 'disabled' }),
      stop: async () => {},
    };
  }

  let classify = options.classify;
  if (classify === undefined) {
    try {
      const brainConfig = resolveBrainClassifierConfig(env);
      classify = defaultClassifierFromBrain(brainConfig);
    } catch (err) {
      log.error('disabled', { reason: (err as Error).message });
      return {
        enabled: false,
        run: async () => ({ status: 'skipped', reason: 'disabled' }),
        stop: async () => {},
      };
    }
  }
  const activeClassify = classify;

  const seedStore =
    options.seedStore ??
    new FileGranolaIntakeSeedStore(
      options.seedStorePath ?? defaultSeedStorePath(),
      options.now,
    );
  const postSeed =
    options.postSeed ?? ((channel, text) => postGranolaIntakeSeed(config.botToken, channel, text));
  const deps: GranolaIntakeBridgeDeps = {
    classify: activeClassify,
    postSeed,
    ...(options.now === undefined ? {} : { now: options.now }),
  };

  const workerIntervalMs = options.workerIntervalMs ?? DEFAULT_GRANOLA_INTAKE_WORKER_INTERVAL_MS;
  const debounceMs = options.debounceMs ?? DEFAULT_GRANOLA_INTAKE_DEBOUNCE_MS;
  const runOnStart = options.runOnStart ?? true;
  let stopped = false;
  let inFlight: Promise<GranolaIntakeBridgeResult> | null = null;
  let debounceTimer: NodeJS.Timeout | undefined;

  async function run(): Promise<GranolaIntakeBridgeResult> {
    if (stopped) return { status: 'skipped', reason: 'disabled' };
    if (inFlight !== null) return { status: 'skipped', reason: 'in_flight' };
    inFlight = (async () => {
      if (options.runSignalsFirst !== undefined) {
        try {
          await options.runSignalsFirst();
        } catch (err) {
          log.warn('signals_first_failed', { message: (err as Error).message });
        }
      }
      return runGranolaIntakeBridgeOnce(storage, seedStore, config, deps);
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  function trigger(): void {
    if (stopped || debounceTimer !== undefined) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void run().catch((err: unknown) => {
        log.error('handler_error', { message: (err as Error).message });
      });
    }, debounceMs);
    debounceTimer.unref();
  }

  const interval = setInterval(trigger, workerIntervalMs);
  interval.unref();
  if (runOnStart) trigger();

  log.info('started', {
    worker_interval_ms: workerIntervalMs,
    debounce_ms: debounceMs,
    channel_id: config.channelId,
    per_note_cap: config.perNoteCap,
    max_retries: config.maxRetries,
  });

  return {
    enabled: true,
    run,
    stop: async () => {
      stopped = true;
      clearInterval(interval);
      if (debounceTimer !== undefined) clearTimeout(debounceTimer);
      if (inFlight !== null) await inFlight.catch(() => undefined);
      log.info('stopped', {});
    },
  };
}

export function granolaIntakeSeedStorePath(): string {
  return join(ECHO_HOME_PATHS.state, 'granola-intake-seeds.json');
}

function defaultSeedStorePath(): string {
  return granolaIntakeSeedStorePath();
}
