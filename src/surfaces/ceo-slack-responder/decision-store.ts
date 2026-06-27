import { isAllowedDerived } from '../../capture/sources.js';
import type { CaptureEvent, EventId, Storage } from '../../storage/interface.js';

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
}

export interface TeamDecisionStore {
  appendConfirmedDecision(input: ConfirmedDecisionInput): Promise<TeamDecisionAtom>;
  findByDraftId(draftId: string): Promise<TeamDecisionAtom | null>;
  queryLatestDecisions(filter?: TeamDecisionQuery): Promise<TeamDecisionAtom[]>;
}

export interface TeamDecisionQuery {
  subject?: string;
  query?: string;
  limit?: number;
}

export function createTeamDecisionStore(storage: Storage): TeamDecisionStore {
  return {
    appendConfirmedDecision: (input) => appendConfirmedDecision(storage, input),
    findByDraftId: (draftId) => findDecisionByDraftId(storage, draftId),
    queryLatestDecisions: (filter = {}) => queryLatestTeamDecisions(storage, filter),
  };
}

export function normalizeDecisionSubject(subject: string): string {
  return subject.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function decisionDedupeKey(subject: string): string {
  return `team-decision:${normalizeDecisionSubject(subject)}`;
}

export async function appendConfirmedDecision(
  storage: Storage,
  input: ConfirmedDecisionInput,
): Promise<TeamDecisionAtom> {
  assertTeamDecisionSourceAllowed();
  validateConfirmedDecisionInput(input);

  const existing = await findDecisionByDraftId(storage, input.draft_id);
  if (existing !== null) return existing;

  const normalizedSubject = normalizeDecisionSubject(input.subject);
  const dedupeKey = decisionDedupeKey(input.subject);
  const metadata: Record<string, unknown> = {
    decision_atom_type: 'team_decision',
    subject: input.subject.trim(),
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

export async function findDecisionByDraftId(
  storage: Storage,
  draftId: string,
): Promise<TeamDecisionAtom | null> {
  const trimmed = draftId.trim();
  if (trimmed === '') return null;
  const atoms = await loadTeamDecisionAtoms(storage);
  return atoms.find((atom) => atom.draft_id === trimmed) ?? null;
}

export async function queryLatestTeamDecisions(
  storage: Storage,
  filter: TeamDecisionQuery = {},
): Promise<TeamDecisionAtom[]> {
  const latestBySubject = new Map<string, TeamDecisionAtom>();
  for (const atom of await loadTeamDecisionAtoms(storage)) {
    if (!matchesQuery(atom, filter)) continue;
    const current = latestBySubject.get(atom.dedupe_key);
    if (current === undefined || compareDecisionRecency(atom, current) > 0) {
      latestBySubject.set(atom.dedupe_key, atom);
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
  if (normalizeDecisionSubject(input.subject) === '') {
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
  const normalizedSubject =
    stringMetadata(md, 'normalized_subject') ?? normalizeDecisionSubject(subject);
  const dedupeKey = stringMetadata(md, 'dedupe_key') ?? decisionDedupeKey(subject);
  const rationale = stringMetadata(md, 'rationale');
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
  };
}

function stringMetadata(md: Record<string, unknown>, key: string): string | null {
  const value = md[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function matchesQuery(atom: TeamDecisionAtom, filter: TeamDecisionQuery): boolean {
  if (filter.subject !== undefined) {
    return atom.normalized_subject === normalizeDecisionSubject(filter.subject);
  }
  if (filter.query === undefined || filter.query.trim() === '') return true;
  const normalizedQuery = normalizeSearchText(filter.query);
  if (normalizedQuery.includes(atom.normalized_subject)) return true;
  const haystack = normalizeSearchText(
    [atom.subject, atom.decision, atom.rationale ?? ''].join(' '),
  );
  return tokens(normalizedQuery).some((token) => haystack.includes(token));
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
