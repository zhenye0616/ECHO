import { isAllowedDerived } from '../../capture/sources.js';
import type { CaptureEvent, EventId, Storage } from '../../storage/interface.js';
import { normalizeSubject } from '../../util/subject.js';
import type { ChangesetMeetingProvenance, DecisionType } from './draft-store.js';

export const TEAM_DECISION_SOURCE_NAME = 'team-decisions';
export const TEAM_DECISION_SOURCE = `derived:${TEAM_DECISION_SOURCE_NAME}`;

export type DecisionSourceApp = 'claude-code' | 'codex';

export interface ConfirmedDecisionInput {
  draft_id: string;
  subject: string;
  decision: string;
  rationale?: string;
  author: string;
  confirmed_by: string;
  confirmed_at: string;
  source_app: DecisionSourceApp;
}

export interface TeamDecisionAtom {
  atom_id: EventId;
  subject: string;
  normalized_subject: string;
  decision: string;
  rationale?: string;
  author: string;
  confirmed_by: string;
  confirmed_at: string;
  source_app: DecisionSourceApp;
  dedupe_key: string;
  draft_id: string;
  decision_type?: DecisionType;
  line_key?: string;
  supersedes?: EventId;
  meeting?: ChangesetMeetingProvenance;
  mutation_kind?: 'create' | 'close' | 'ledger';
  tripwire?: string;
}

export interface TeamDecisionStore {
  appendConfirmedDecision(input: ConfirmedDecisionInput): Promise<TeamDecisionAtom>;
  appendChangesetDecision(input: ChangesetDecisionInput): Promise<TeamDecisionAtom>;
  findByDraftId(draftId: string): Promise<TeamDecisionAtom | null>;
  findByLineKey(lineKey: string): Promise<TeamDecisionAtom | null>;
  queryLatestDecisions(filter?: TeamDecisionQuery): Promise<TeamDecisionAtom[]>;
}

export interface ChangesetDecisionInput {
  draft_id: string;
  line_key: string;
  subject: string;
  decision: string;
  decision_type: DecisionType;
  rationale?: string;
  author: string;
  confirmed_by: string;
  confirmed_at: string;
  source_app: DecisionSourceApp;
  meeting: ChangesetMeetingProvenance;
  mutation_kind: 'create' | 'close' | 'ledger';
  tripwire?: string;
}

export interface TeamDecisionQuery {
  subject?: string;
  query?: string;
  limit?: number;
}

export function createTeamDecisionStore(storage: Storage): TeamDecisionStore {
  return {
    appendConfirmedDecision: (input) => appendConfirmedDecision(storage, input),
    appendChangesetDecision: (input) => appendChangesetDecision(storage, input),
    findByDraftId: (draftId) => findDecisionByDraftId(storage, draftId),
    findByLineKey: (lineKey) => findDecisionByLineKey(storage, lineKey),
    queryLatestDecisions: (filter = {}) => queryLatestTeamDecisions(storage, filter),
  };
}

export function decisionDedupeKey(subject: string): string {
  return `team-decision:${normalizeSubject(subject)}`;
}

export async function appendConfirmedDecision(
  storage: Storage,
  input: ConfirmedDecisionInput,
): Promise<TeamDecisionAtom> {
  assertTeamDecisionSourceAllowed();
  validateConfirmedDecisionInput(input);

  const existing = await findDecisionByDraftId(storage, input.draft_id);
  if (existing !== null) return existing;

  const normalizedSubject = normalizeSubject(input.subject);
  const dedupeKey = decisionDedupeKey(input.subject);
  const metadata: Record<string, unknown> = {
    decision_atom_type: 'team_decision',
    subject: input.subject.trim(),
    // Unified cross-source join key (item 112). Same normalized value as
    // normalized_subject; written so team decisions join Granola signals on
    // canonical_subject and become free-text findable via search_memories.
    canonical_subject: normalizedSubject,
    normalized_subject: normalizedSubject,
    decision: input.decision.trim(),
    author: input.author.trim(),
    confirmed_by: input.confirmed_by.trim(),
    confirmed_at: input.confirmed_at,
    source_app: input.source_app,
    dedupe_key: dedupeKey,
    draft_id: input.draft_id,
  };
  if (input.rationale !== undefined && input.rationale.trim() !== '') {
    metadata['rationale'] = input.rationale.trim();
  }

  const atomId = await storage.append({
    source: TEAM_DECISION_SOURCE,
    timestamp: input.confirmed_at,
    content: input.decision.trim(),
    metadata,
  });

  return {
    atom_id: atomId,
    subject: input.subject.trim(),
    normalized_subject: normalizedSubject,
    decision: input.decision.trim(),
    ...(typeof metadata['rationale'] === 'string' ? { rationale: metadata['rationale'] } : {}),
    author: input.author.trim(),
    confirmed_by: input.confirmed_by.trim(),
    confirmed_at: input.confirmed_at,
    source_app: input.source_app,
    dedupe_key: dedupeKey,
    draft_id: input.draft_id,
  };
}

export async function appendChangesetDecision(
  storage: Storage,
  input: ChangesetDecisionInput,
): Promise<TeamDecisionAtom> {
  assertTeamDecisionSourceAllowed();
  validateChangesetDecisionInput(input);

  const existing = await findDecisionByLineKey(storage, input.line_key);
  if (existing !== null) return existing;

  const normalizedSubject = normalizeSubject(input.subject);
  const prior = await latestDecisionForSubject(storage, input.subject);
  const metadata: Record<string, unknown> = {
    decision_atom_type: 'team_decision',
    subject: input.subject.trim(),
    canonical_subject: normalizedSubject,
    normalized_subject: normalizedSubject,
    decision: input.decision.trim(),
    author: input.author.trim(),
    confirmed_by: input.confirmed_by.trim(),
    confirmed_at: input.confirmed_at,
    source_app: input.source_app,
    dedupe_key: input.line_key.trim(),
    draft_id: input.draft_id.trim(),
    line_key: input.line_key.trim(),
    decision_type: input.decision_type,
    mutation_kind: input.mutation_kind,
    meeting: {
      note_id: input.meeting.note_id,
      meeting_title: input.meeting.meeting_title,
      ...(input.meeting.meeting_date === undefined
        ? {}
        : { meeting_date: input.meeting.meeting_date }),
      ...(input.meeting.web_url === undefined ? {} : { web_url: input.meeting.web_url }),
    },
  };
  if (input.rationale !== undefined && input.rationale.trim() !== '') {
    metadata['rationale'] = input.rationale.trim();
  }
  if (prior !== null) metadata['supersedes'] = prior.atom_id;
  if (input.tripwire !== undefined && input.tripwire.trim() !== '') {
    metadata['tripwire'] = input.tripwire.trim();
  }

  const atomId = await storage.append({
    source: TEAM_DECISION_SOURCE,
    timestamp: input.confirmed_at,
    content: input.decision.trim(),
    metadata,
  });

  return {
    atom_id: atomId,
    subject: input.subject.trim(),
    normalized_subject: normalizedSubject,
    decision: input.decision.trim(),
    ...(typeof metadata['rationale'] === 'string' ? { rationale: metadata['rationale'] } : {}),
    author: input.author.trim(),
    confirmed_by: input.confirmed_by.trim(),
    confirmed_at: input.confirmed_at,
    source_app: input.source_app,
    dedupe_key: input.line_key.trim(),
    draft_id: input.draft_id.trim(),
    decision_type: input.decision_type,
    line_key: input.line_key.trim(),
    ...(prior === null ? {} : { supersedes: prior.atom_id }),
    meeting: input.meeting,
    mutation_kind: input.mutation_kind,
    ...(input.tripwire === undefined || input.tripwire.trim() === ''
      ? {}
      : { tripwire: input.tripwire.trim() }),
  };
}

export async function findDecisionByDraftId(
  storage: Storage,
  draftId: string,
): Promise<TeamDecisionAtom | null> {
  const trimmed = draftId.trim();
  if (trimmed === '') return null;
  const atoms = await loadTeamDecisionAtoms(storage);
  return atoms.find((atom) => atom.draft_id === trimmed) ?? null;
}

export async function findDecisionByLineKey(
  storage: Storage,
  lineKey: string,
): Promise<TeamDecisionAtom | null> {
  const trimmed = lineKey.trim();
  if (trimmed === '') return null;
  const atoms = await loadTeamDecisionAtoms(storage);
  return atoms.find((atom) => atom.line_key === trimmed) ?? null;
}

export async function queryLatestTeamDecisions(
  storage: Storage,
  filter: TeamDecisionQuery = {},
): Promise<TeamDecisionAtom[]> {
  const latestBySubject = new Map<string, TeamDecisionAtom>();
  for (const atom of await loadTeamDecisionAtoms(storage)) {
    if (!matchesQuery(atom, filter)) continue;
    const current = latestBySubject.get(atom.normalized_subject);
    if (current === undefined || compareDecisionRecency(atom, current) > 0) {
      latestBySubject.set(atom.normalized_subject, atom);
    }
  }

  const limit = filter.limit ?? Number.POSITIVE_INFINITY;
  return [...latestBySubject.values()].sort((a, b) => compareDecisionRecency(b, a)).slice(0, limit);
}

async function loadTeamDecisionAtoms(storage: Storage): Promise<TeamDecisionAtom[]> {
  const events = await storage.query({ source: TEAM_DECISION_SOURCE, order: 'asc' });
  return events
    .map(eventToTeamDecisionAtom)
    .filter((atom): atom is TeamDecisionAtom => atom !== null);
}

function assertTeamDecisionSourceAllowed(): void {
  if (!isAllowedDerived(TEAM_DECISION_SOURCE_NAME)) {
    throw new Error(`${TEAM_DECISION_SOURCE} is not allowlisted`);
  }
}

function validateConfirmedDecisionInput(input: ConfirmedDecisionInput): void {
  for (const [key, value] of Object.entries({
    draft_id: input.draft_id,
    subject: input.subject,
    decision: input.decision,
    author: input.author,
    confirmed_by: input.confirmed_by,
    confirmed_at: input.confirmed_at,
  })) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`team decision ${key} is required`);
    }
  }
  if (normalizeSubject(input.subject) === '') {
    throw new Error('team decision subject is required');
  }
}

function validateChangesetDecisionInput(input: ChangesetDecisionInput): void {
  for (const [key, value] of Object.entries({
    draft_id: input.draft_id,
    line_key: input.line_key,
    subject: input.subject,
    decision: input.decision,
    author: input.author,
    confirmed_by: input.confirmed_by,
    confirmed_at: input.confirmed_at,
    note_id: input.meeting.note_id,
    meeting_title: input.meeting.meeting_title,
  })) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`team decision ${key} is required`);
    }
  }
  if (normalizeSubject(input.subject) === '') {
    throw new Error('team decision subject is required');
  }
}

function eventToTeamDecisionAtom(event: CaptureEvent): TeamDecisionAtom | null {
  const md = event.metadata ?? {};
  if (event.source !== TEAM_DECISION_SOURCE) return null;
  const subject = stringMetadata(md, 'subject');
  const decision = stringMetadata(md, 'decision') ?? event.content;
  const author = stringMetadata(md, 'author');
  const confirmedBy = stringMetadata(md, 'confirmed_by');
  const confirmedAt = stringMetadata(md, 'confirmed_at') ?? event.timestamp;
  const sourceApp = stringMetadata(md, 'source_app');
  const draftId = stringMetadata(md, 'draft_id');
  if (
    subject === null ||
    decision === null ||
    author === null ||
    confirmedBy === null ||
    draftId === null ||
    (sourceApp !== 'claude-code' && sourceApp !== 'codex')
  ) {
    return null;
  }
  const normalizedSubject = stringMetadata(md, 'normalized_subject') ?? normalizeSubject(subject);
  const dedupeKey = stringMetadata(md, 'dedupe_key') ?? decisionDedupeKey(subject);
  const rationale = stringMetadata(md, 'rationale');
  const decisionType = stringMetadata(md, 'decision_type');
  const lineKey = stringMetadata(md, 'line_key');
  const supersedes = stringMetadata(md, 'supersedes');
  const mutationKind = stringMetadata(md, 'mutation_kind');
  const tripwire = stringMetadata(md, 'tripwire');
  const meeting = meetingMetadata(md['meeting']);
  return {
    atom_id: event.id,
    subject,
    normalized_subject: normalizedSubject,
    decision,
    ...(rationale !== null ? { rationale } : {}),
    author,
    confirmed_by: confirmedBy,
    confirmed_at: confirmedAt,
    source_app: sourceApp,
    dedupe_key: dedupeKey,
    draft_id: draftId,
    ...(isDecisionType(decisionType) ? { decision_type: decisionType } : {}),
    ...(lineKey !== null ? { line_key: lineKey } : {}),
    ...(supersedes !== null ? { supersedes } : {}),
    ...(meeting !== null ? { meeting } : {}),
    ...(isMutationKind(mutationKind) ? { mutation_kind: mutationKind } : {}),
    ...(tripwire !== null ? { tripwire } : {}),
  };
}

function stringMetadata(md: Record<string, unknown>, key: string): string | null {
  const value = md[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function matchesQuery(atom: TeamDecisionAtom, filter: TeamDecisionQuery): boolean {
  if (filter.subject !== undefined) {
    return atom.normalized_subject === normalizeSubject(filter.subject);
  }
  if (filter.query === undefined || filter.query.trim() === '') return true;
  const normalizedQuery = normalizeSearchText(filter.query);
  if (normalizedQuery.includes(atom.normalized_subject)) return true;
  const haystack = normalizeSearchText(
    [atom.subject, atom.decision, atom.rationale ?? ''].join(' '),
  );
  return tokens(normalizedQuery).some((token) => haystack.includes(token));
}

async function latestDecisionForSubject(
  storage: Storage,
  subject: string,
): Promise<TeamDecisionAtom | null> {
  const latest = await queryLatestTeamDecisions(storage, { subject, limit: 1 });
  return latest[0] ?? null;
}

function isDecisionType(value: string | null): value is DecisionType {
  return (
    value === 'executable' ||
    value === 'directional' ||
    value === 'negative' ||
    value === 'conditional'
  );
}

function isMutationKind(value: string | null): value is 'create' | 'close' | 'ledger' {
  return value === 'create' || value === 'close' || value === 'ledger';
}

function meetingMetadata(value: unknown): ChangesetMeetingProvenance | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const noteId = record['note_id'];
  const title = record['meeting_title'];
  if (typeof noteId !== 'string' || noteId.trim() === '') return null;
  if (typeof title !== 'string' || title.trim() === '') return null;
  const date = record['meeting_date'];
  const webUrl = record['web_url'];
  return {
    note_id: noteId,
    meeting_title: title,
    ...(typeof date === 'string' && date.trim() !== '' ? { meeting_date: date } : {}),
    ...(typeof webUrl === 'string' && webUrl.trim() !== '' ? { web_url: webUrl } : {}),
  };
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(normalizedQuery: string): string[] {
  const stop = new Set([
    'a',
    'about',
    'and',
    'did',
    'do',
    'for',
    'the',
    'this',
    'to',
    'we',
    'what',
    'when',
    'why',
    'with',
  ]);
  return normalizedQuery
    .split(' ')
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !stop.has(part));
}

function compareDecisionRecency(a: TeamDecisionAtom, b: TeamDecisionAtom): number {
  const timeDelta = Date.parse(a.confirmed_at) - Date.parse(b.confirmed_at);
  if (timeDelta !== 0) return timeDelta;
  return a.atom_id.localeCompare(b.atom_id);
}
