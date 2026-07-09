import { randomUUID } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import { ECHO_HOME_PATHS } from '../echo-home/paths.js';
import { createLogger } from '../logging/index.js';
import type { IntakeFields } from '../brain/brain.js';
import {
  parseBrainName,
  runBrainWithRetrievalCapture,
  type BrainName,
  type ClassifierRunRecord,
} from '../brain/brain.js';
import { renderSeedMessage, type MeetingProvenance } from '../brain/intake-seed.js';
import type { CaptureEvent, Storage } from '../storage/interface.js';
import { parseJson } from '../util/json.js';
import { GRANOLA_RAW_SOURCE, GRANOLA_SIGNAL_SOURCE } from './granola-signals.js';
import {
  FileGranolaIntakeSeedStore,
  type CardAtomOutcome,
  type GranolaIntakeSeedStore,
} from './granola-intake-seed-store.js';
import {
  createChangesetDraftFromCards,
  type DecisionCardForChangeset,
} from '../surfaces/ceo-slack-responder/decision-changeset.js';
import type {
  ChangesetDraft,
  ChangesetDraftStore,
} from '../surfaces/ceo-slack-responder/draft-store.js';
import {
  GRANOLA_INTAKE_BRIDGE_WORKER,
  writeWorkerHeartbeat,
  type WorkerHeartbeat,
} from './worker-heartbeat.js';

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
  decision_type?: GranolaDecisionType;
}

export type GranolaDecisionType = 'executable' | 'directional' | 'negative' | 'conditional';

/** Item 123: a classifier may return the bare candidate list (legacy shape) or
 *  a `{ candidates, run }` object carrying the classifier-run provenance. The
 *  bridge normalizes both; a legacy list yields a `capture_failed` run because
 *  the classifier reported no retrieval capture. */
export interface ClassifiedIntakeResult {
  candidates: ClassifiedIntakeCandidate[];
  run?: ClassifierRunRecord;
}

export type GranolaIntakeClassifier = (
  input: GranolaIntakeClassificationInput,
) => Promise<ClassifiedIntakeCandidate[] | ClassifiedIntakeResult>;

/** Source string for the append-only card provenance atom (item 123 AC1). */
export const GRANOLA_INTAKE_CARD_SOURCE = 'derived:intake-cards';

/** `dedupe_key` for a card atom. `candidate_key` is the consumed signal's
 *  dedupe_key; the card atom's key namespaces it under `granola:card:`. */
export function granolaCardDedupeKey(candidateKey: string): string {
  return `granola:card:${candidateKey}`;
}

/** Persisted metadata on a `derived:intake-cards` atom (item 123 AC1). */
export interface IntakeCardAtomMetadata {
  card_version: 1;
  dedupe_key: string;
  candidate_key: string;
  note_id: string;
  channel_id: string;
  fields: IntakeFields;
  /** Consumed signal dedupe_key refs this card derives from. */
  signal_refs: string[];
  /** Seed-store status timestamp at post time. */
  seed_status_at: string;
  slack_ts: string;
  classifier_run: ClassifierRunRecord;
}

function normalizeClassifierResult(
  result: ClassifiedIntakeCandidate[] | ClassifiedIntakeResult,
): ClassifiedIntakeResult {
  return Array.isArray(result) ? { candidates: result } : result;
}

/** Emit the append-only card provenance atom for a successful post. Fail-soft
 *  (AC1): a write failure never breaks posting, but is reported back so the
 *  seed record's `card_atom_status` marker can record the loss. */
async function emitIntakeCardAtom(
  storage: Storage,
  args: {
    candidateKey: string;
    noteId: string;
    channelId: string;
    text: string;
    fields: IntakeFields;
    signalRefs: string[];
    slackTs: string;
    postedAt: string;
    classifierRun: ClassifierRunRecord;
  },
): Promise<CardAtomOutcome> {
  const dedupeKey = granolaCardDedupeKey(args.candidateKey);
  const metadata: IntakeCardAtomMetadata = {
    card_version: 1,
    dedupe_key: dedupeKey,
    candidate_key: args.candidateKey,
    note_id: args.noteId,
    channel_id: args.channelId,
    fields: args.fields,
    signal_refs: args.signalRefs,
    seed_status_at: args.postedAt,
    slack_ts: args.slackTs,
    classifier_run: args.classifierRun,
  };
  try {
    // AC3 (item 125): guard the sequential markPosted-throw retry edge. When a
    // prior pass appended this card atom but then threw at `markPosted` (leaving
    // the seed retryable), the next retry re-posts and reaches here again — a
    // second append would duplicate the atom for one card. Skip when an atom
    // with this dedupe_key already exists. The existence check is bounded to the
    // card source. It is a check-then-append, NOT atomic: it does NOT defend two
    // *concurrent* intake ticks racing the same dedupe_key (intake is
    // single-flight today; that path would need an atomic unique-append
    // primitive, a persisted-store change out of scope here — see the item's
    // Out of Scope). A guard-query failure degrades to a best-effort append
    // (prior behavior) rather than dropping the card.
    let alreadyAppended = false;
    try {
      const existing = await storage.query({ source: GRANOLA_INTAKE_CARD_SOURCE });
      alreadyAppended = existing.some((event) => {
        const key = event.metadata?.['dedupe_key'];
        return typeof key === 'string' && key === dedupeKey;
      });
    } catch (queryErr) {
      log.warn('card_atom_dedupe_query_failed', {
        candidate_key: args.candidateKey,
        message: (queryErr as Error).message,
      });
    }
    if (alreadyAppended) return { status: 'written' };
    await storage.append({
      source: GRANOLA_INTAKE_CARD_SOURCE,
      timestamp: args.postedAt,
      content: args.text,
      metadata: metadata as unknown as Record<string, unknown>,
    });
    return { status: 'written' };
  } catch (err) {
    const message = (err as Error).message;
    log.error('card_atom_write_failed', { candidate_key: args.candidateKey, message });
    return { status: 'failed', error: message.slice(0, 500) };
  }
}

export interface SeedPostResult {
  ts: string;
}

export type SeedPoster = (channel: string, text: string) => Promise<SeedPostResult>;
export type DecisionChangesetPoster = (
  channel: string,
  draft: ChangesetDraft,
) => Promise<string>;

export interface GranolaIntakeBridgeDeps {
  classify: GranolaIntakeClassifier;
  postSeed: SeedPoster;
  changesetDraftStore?: ChangesetDraftStore;
  postChangesetDraftCard?: DecisionChangesetPoster;
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
  changesetDraftStore?: ChangesetDraftStore;
  decisionChangesetDraftStorePath?: string;
  classify?: GranolaIntakeClassifier;
  postSeed?: SeedPoster;
  postChangesetDraftCard?: DecisionChangesetPoster;
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
      throw new Error(
        `ECHO_GRANOLA_INTAKE_OWNER_MAP value for ${email} must be a non-empty string`,
      );
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

function hasExternalAttendee(
  emails: readonly string[],
  internalDomains: readonly string[],
): boolean {
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

function candidateToDecisionCard(
  candidate: ClassifiedIntakeCandidate,
  signal: SignalForNote,
): DecisionCardForChangeset {
  const decision = candidate.fields.request ?? signal.text;
  return {
    subject:
      signal.canonical_subject ||
      candidate.fields.clientProject ||
      candidate.fields.request ||
      signal.text,
    decision,
    ...(candidate.fields.why === undefined ? {} : { rationale: candidate.fields.why }),
    decision_type: candidate.decision_type ?? classifyGranolaDecisionType(decision),
    ...(candidate.fields.clientProject === undefined
      ? {}
      : { project_name: candidate.fields.clientProject }),
    ...(candidate.fields.doneWhen === undefined ? {} : { tripwire: candidate.fields.doneWhen }),
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
  const cutoffIso = new Date(new Date(now()).getTime() - config.lookbackMs).toISOString();

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
    let classifierResult: ClassifiedIntakeResult;
    const classifyStartedAt = now();
    try {
      classifierResult = normalizeClassifierResult(
        await deps.classify({
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
        }),
      );
    } catch (err) {
      log.error('classify_failed', { note_id: noteId, message: (err as Error).message });
      continue;
    }

    // The classifier run is per-note (one classification call) and embedded in
    // every card atom that call produces. A legacy classifier that reports no
    // run yields an honest `capture_failed` record (never a fake ok/zero).
    const classifierRun: ClassifierRunRecord = classifierResult.run ?? {
      run_id: randomUUID(),
      binding: 'unknown',
      started_at: classifyStartedAt,
      completed_at: now(),
      capture_status: 'capture_failed',
      capture_error: 'classifier did not report retrieval capture',
    };

    const noteCandidates = classifierResult.candidates
      .filter((candidate) => refToSignal.has(candidate.ref))
      .slice(0, config.perNoteCap);

    if (
      noteCandidates.length > 0 &&
      deps.changesetDraftStore !== undefined &&
      deps.postChangesetDraftCard !== undefined
    ) {
      candidates += noteCandidates.length;
      try {
        const { draft } = await createChangesetDraftFromCards(deps.changesetDraftStore, {
          note_id: noteId,
          meeting_title: info.meeting_title,
          ...(info.meeting_date === undefined ? {} : { meeting_date: info.meeting_date }),
          ...(info.web_url === undefined ? {} : { web_url: info.web_url }),
          channel_id: config.channelId,
          cards: noteCandidates.map((candidate) =>
            candidateToDecisionCard(candidate, refToSignal.get(candidate.ref)!),
          ),
        });
        if (draft.message_ts !== undefined) {
          skipped += 1;
          continue;
        }
        const messageTs = await deps.postChangesetDraftCard(config.channelId, draft);
        await deps.changesetDraftStore.markChangesetMessage(draft.draft_id, messageTs);
        posted += 1;
      } catch (err) {
        failed += 1;
        log.error('changeset_post_failed', { note_id: noteId, message: (err as Error).message });
      }
      continue;
    }

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
        // Card provenance (AC1): append the derived atom, then record its
        // written/failed outcome in the SAME seed-store update as `posted`.
        const postedAt = now();
        const cardOutcome = await emitIntakeCardAtom(storage, {
          candidateKey: candidate.ref,
          noteId,
          channelId: config.channelId,
          text,
          fields: candidate.fields,
          signalRefs: [candidate.ref],
          slackTs: result.ts,
          postedAt,
          classifierRun,
        });
        await seedStore.markPosted(candidate.ref, result.ts, cardOutcome);
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
    'Classify each kept decision as decision_type: executable, directional, negative, or conditional.',
    'Return JSON only: {"candidates":[{"ref":"<signal ref>","fields":{...},"quote":"<supporting quote>","decision_type":"executable|directional|negative|conditional"}]}.',
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
  const rawDecisionType = record['decision_type'];
  return {
    ref: ref.trim(),
    fields,
    ...(typeof quote === 'string' && quote.trim() !== '' ? { quote: quote.trim() } : {}),
    ...(typeof rawDecisionType === 'string' && isGranolaDecisionType(rawDecisionType)
      ? { decision_type: rawDecisionType }
      : { decision_type: classifyGranolaDecisionType(`${JSON.stringify(fields)} ${quote ?? ''}`) }),
  };
}

export function classifyGranolaDecisionType(text: string): GranolaDecisionType {
  const normalized = text.toLowerCase();
  if (/\b(do not|don't|stop|cancel|kill|drop|remove|defer|no longer|won't)\b/.test(normalized)) {
    return 'negative';
  }
  if (/\b(if|when|unless|until|provided that)\b/.test(normalized)) return 'conditional';
  if (/\b(direction|principle|prefer|north star|policy|posture)\b/.test(normalized)) {
    return 'directional';
  }
  return 'executable';
}

function isGranolaDecisionType(value: string): value is GranolaDecisionType {
  return (
    value === 'executable' ||
    value === 'directional' ||
    value === 'negative' ||
    value === 'conditional'
  );
}

function defaultClassifierFromBrain(config: BrainClassifierConfig): GranolaIntakeClassifier {
  return async (input): Promise<ClassifiedIntakeResult> => {
    // AC2: wrap the brain child so its scoped ECHO MCP retrievals are captured
    // and returned as the classifier run. Capture is fail-soft (never blocks
    // classification); the run's tri-state status records the outcome.
    const { result, run } = await runBrainWithRetrievalCapture(buildClassificationPrompt(input), {
      brain: config.brain,
      contextRepoPath: config.contextRepoPath,
      timeoutMs: config.timeoutMs,
      env: config.env,
    });
    if (!result.ok || result.answer === undefined) {
      throw new Error(result.reason ?? result.outcome);
    }
    return { candidates: parseClassifierAnswer(result.answer), run };
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

/** Item 120 AC2: map a completed bridge run to its heartbeat. An `ok` tick
 *  reports notes_seen/candidates/posted/failed/skipped. A `config` or `disabled`
 *  skip is `disabled`; an `in_flight` skip is `ok`; an `error` is `degraded`
 *  with the error message. */
function granolaIntakeHeartbeat(
  result: GranolaIntakeBridgeResult,
  lastTickAt: string,
): WorkerHeartbeat {
  if (result.status === 'ok') {
    return {
      schema_version: 1,
      worker: GRANOLA_INTAKE_BRIDGE_WORKER,
      last_tick_at: lastTickAt,
      status: 'ok',
      counters: {
        notes_seen: result.notes_seen,
        candidates: result.candidates,
        posted: result.posted,
        failed: result.failed,
        skipped: result.skipped,
      },
    };
  }
  if (result.status === 'skipped') {
    if (result.reason === 'in_flight') {
      return {
        schema_version: 1,
        worker: GRANOLA_INTAKE_BRIDGE_WORKER,
        last_tick_at: lastTickAt,
        status: 'ok',
      };
    }
    return {
      schema_version: 1,
      worker: GRANOLA_INTAKE_BRIDGE_WORKER,
      last_tick_at: lastTickAt,
      status: 'disabled',
      reason: result.reason === 'config' ? 'missing required config' : 'worker stopped',
    };
  }
  return {
    schema_version: 1,
    worker: GRANOLA_INTAKE_BRIDGE_WORKER,
    last_tick_at: lastTickAt,
    status: 'degraded',
    reason: result.message,
  };
}

/** Item 120 AC3: emit a `disabled` heartbeat for a boot-time permanent-disable
 *  path (config-parse error, disabled flag, or classifier-config error), so an
 *  accidental disablement is externally observable. */
function writeIntakeDisabledHeartbeat(reason: string): void {
  writeWorkerHeartbeat(GRANOLA_INTAKE_BRIDGE_WORKER, {
    schema_version: 1,
    worker: GRANOLA_INTAKE_BRIDGE_WORKER,
    last_tick_at: new Date().toISOString(),
    status: 'disabled',
    reason,
  });
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
      writeIntakeDisabledHeartbeat(err.message);
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
    writeIntakeDisabledHeartbeat('ECHO_GRANOLA_INTAKE_ENABLED not enabled');
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
      writeIntakeDisabledHeartbeat(`classifier config error: ${(err as Error).message}`);
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
    new FileGranolaIntakeSeedStore(options.seedStorePath ?? defaultSeedStorePath(), options.now);
  const postSeed =
    options.postSeed ?? ((channel, text) => postGranolaIntakeSeed(config.botToken, channel, text));
  const deps: GranolaIntakeBridgeDeps = {
    classify: activeClassify,
    postSeed,
    ...(options.changesetDraftStore === undefined
      ? {}
      : { changesetDraftStore: options.changesetDraftStore }),
    ...(options.postChangesetDraftCard === undefined
      ? {}
      : { postChangesetDraftCard: options.postChangesetDraftCard }),
    ...(options.now === undefined ? {} : { now: options.now }),
  };

  const workerIntervalMs = options.workerIntervalMs ?? DEFAULT_GRANOLA_INTAKE_WORKER_INTERVAL_MS;
  const debounceMs = options.debounceMs ?? DEFAULT_GRANOLA_INTAKE_DEBOUNCE_MS;
  const runOnStart = options.runOnStart ?? true;
  let stopped = false;
  let inFlight: Promise<GranolaIntakeBridgeResult> | null = null;
  let debounceTimer: NodeJS.Timeout | undefined;

  const heartbeatNow = options.now ?? (() => new Date().toISOString());

  async function runInner(): Promise<GranolaIntakeBridgeResult> {
    if (stopped) return { status: 'skipped', reason: 'disabled' };
    // Single-flight: a trigger that fires while a run is in flight is dropped
    // (`in_flight`). AC5 (item 125) — abandoned-not-cancelled semantics: an
    // in-flight run whose brain classifier exceeds its timeout, or that outlasts
    // the next interval tick, is left to run to completion; it is never actively
    // cancelled here. The classifier child owns its own timeoutMs abort; stop()
    // likewise awaits `inFlight` rather than aborting it. So a "timed out" tick
    // is abandoned by the scheduler (no new run starts), not force-killed.
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

  // Item 120 AC2: write a heartbeat at the end of every run(), best-effort.
  async function run(): Promise<GranolaIntakeBridgeResult> {
    const result = await runInner();
    writeWorkerHeartbeat(
      GRANOLA_INTAKE_BRIDGE_WORKER,
      granolaIntakeHeartbeat(result, heartbeatNow()),
    );
    return result;
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

export function granolaDecisionChangesetDraftStorePath(): string {
  return join(ECHO_HOME_PATHS.state, 'decision-changeset-drafts.json');
}
