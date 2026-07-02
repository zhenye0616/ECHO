import type { IntakeFields } from './brain.js';

/**
 * Meeting provenance carried from a Granola-sourced intake candidate through the
 * seed message, the durable draft, and finally the created Linear issue body.
 * Kept separate from IntakeFields because it is capture-origin metadata, not a
 * teammate-supplied intake answer.
 */
export interface MeetingProvenance {
  noteId: string;
  meetingTitle: string;
  meetingDate?: string;
  webUrl?: string;
  quote: string;
}

export interface SeedMessageInput {
  fields: IntakeFields;
  provenance: MeetingProvenance;
  ownerSlackId: string;
  candidateKey: string;
}

export interface SeedMarker {
  version: number;
  candidateKey: string;
  ownerSlackId?: string;
  fields?: IntakeFields;
  provenance?: MeetingProvenance;
}

export interface SeedMarkerInput {
  candidateKey: string;
  ownerSlackId?: string;
  fields?: IntakeFields;
  provenance?: MeetingProvenance;
}

/**
 * Current seed marker version. The responder accepts a bot-authored message as
 * an intake seed only when the parsed marker version is in
 * SUPPORTED_SEED_MARKER_VERSIONS; an unsupported version is ignored, never
 * guessed. Bump this and extend the supported set together when the payload
 * shape changes.
 */
export const SEED_MARKER_VERSION = 1;
const SUPPORTED_SEED_MARKER_VERSIONS: ReadonlySet<number> = new Set([1]);

// The payload segment is base64url so the candidate key (which contains colons)
// and owner id survive without needing an in-band delimiter that could collide
// with key content. Version is human-inspectable; payload is machine-only.
const SEED_MARKER_RE = /\[echo-intake-seed v(\d+) ([A-Za-z0-9_-]+)\]/;

interface SeedMarkerPayload {
  k: string;
  o?: string;
  f?: IntakeFields;
  p?: MeetingProvenance;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    // Reject payloads that do not round-trip (e.g. non-base64url content that
    // Buffer tolerated) so a malformed marker is never silently accepted.
    return base64UrlEncode(decoded) === value ? decoded : null;
  } catch {
    return null;
  }
}

export function renderSeedMarker(input: SeedMarkerInput): string {
  const payload: SeedMarkerPayload = { k: input.candidateKey };
  if (input.ownerSlackId !== undefined && input.ownerSlackId.trim() !== '') {
    payload.o = input.ownerSlackId.trim();
  }
  if (input.fields !== undefined && Object.keys(input.fields).length > 0) {
    payload.f = input.fields;
  }
  if (input.provenance !== undefined) {
    payload.p = input.provenance;
  }
  return `[echo-intake-seed v${SEED_MARKER_VERSION} ${base64UrlEncode(JSON.stringify(payload))}]`;
}

/**
 * Strict marker parse. Returns null for: no marker present, an unsupported
 * version, an undecodable payload, or a payload missing a well-formed candidate
 * key. Every rejection path collapses to null so the caller treats all of them
 * as "not an acceptable seed" (AC3 negatives).
 */
export function parseSeedMarker(text: string | undefined): SeedMarker | null {
  if (text === undefined || text === '') return null;
  const match = SEED_MARKER_RE.exec(text);
  if (match === null) return null;
  const version = Number.parseInt(match[1] ?? '', 10);
  if (!Number.isInteger(version) || !SUPPORTED_SEED_MARKER_VERSIONS.has(version)) return null;
  const decoded = base64UrlDecode(match[2] ?? '');
  if (decoded === null) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const candidateKey = record['k'];
  if (typeof candidateKey !== 'string' || candidateKey.trim() === '') return null;
  const owner = record['o'];
  const marker: SeedMarker = { version, candidateKey: candidateKey.trim() };
  if (typeof owner === 'string' && owner.trim() !== '') marker.ownerSlackId = owner.trim();
  const fields = parseMarkerFields(record['f']);
  if (fields !== undefined) marker.fields = fields;
  const provenance = parseMarkerProvenance(record['p']);
  if (provenance !== undefined) marker.provenance = provenance;
  return marker;
}

function parseMarkerFields(value: unknown): IntakeFields | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const out: IntakeFields = {};
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
    const fieldValue = record[key];
    if (typeof fieldValue === 'string' && fieldValue.trim() !== '') out[key] = fieldValue.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseMarkerProvenance(value: unknown): MeetingProvenance | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const noteId = record['noteId'];
  const meetingTitle = record['meetingTitle'];
  const quote = record['quote'];
  if (typeof noteId !== 'string' || typeof meetingTitle !== 'string' || typeof quote !== 'string') {
    return undefined;
  }
  const provenance: MeetingProvenance = { noteId, meetingTitle, quote };
  if (typeof record['meetingDate'] === 'string') provenance.meetingDate = record['meetingDate'];
  if (typeof record['webUrl'] === 'string') provenance.webUrl = record['webUrl'];
  return provenance;
}

const SEED_FIELD_LABELS: ReadonlyArray<[keyof IntakeFields, string]> = [
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
 * Human-readable seed message: labeled best-effort intake fields, meeting
 * provenance, an owner @mention, and the machine-parseable marker last. The
 * marker is the ONLY thing that makes this message a seed; follow-up questions
 * and confirm cards deliberately omit it so they can never be re-accepted.
 */
export function renderSeedMessage(input: SeedMessageInput): string {
  const lines: string[] = [
    '*Meeting intake candidate*',
    `<@${input.ownerSlackId}> — a client need surfaced in a meeting. Reply in this thread to confirm or dismiss.`,
    '',
  ];
  for (const [key, label] of SEED_FIELD_LABELS) {
    const value = input.fields[key];
    if (value !== undefined && value.trim() !== '') {
      lines.push(`*${label}:* ${value.trim()}`);
    }
  }
  lines.push('');
  const dateSuffix =
    input.provenance.meetingDate !== undefined && input.provenance.meetingDate.trim() !== ''
      ? ` (${input.provenance.meetingDate.trim()})`
      : '';
  lines.push(`*Meeting:* ${input.provenance.meetingTitle}${dateSuffix}`);
  if (input.provenance.webUrl !== undefined && input.provenance.webUrl.trim() !== '') {
    lines.push(`*Granola:* ${input.provenance.webUrl.trim()}`);
  }
  if (input.provenance.quote.trim() !== '') {
    lines.push(`> ${input.provenance.quote.trim()}`);
  }
  lines.push('');
  lines.push(
    renderSeedMarker({
      candidateKey: input.candidateKey,
      ownerSlackId: input.ownerSlackId,
      fields: input.fields,
      provenance: input.provenance,
    }),
  );
  return lines.join('\n');
}
