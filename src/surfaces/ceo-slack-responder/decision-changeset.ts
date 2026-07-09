import { randomUUID } from 'node:crypto';

import type { TeamDecisionStore } from './decision-store.js';
import type {
  ChangesetDraft,
  ChangesetDraftStore,
  ChangesetEditOp,
  ChangesetLine,
  ChangesetLineInput,
  ChangesetMeetingProvenance,
  DecisionType,
} from './draft-store.js';
import type { LinearClient } from './linear-client.js';

export interface DecisionCardForChangeset {
  subject: string;
  decision: string;
  rationale?: string;
  decision_type?: DecisionType;
  project_id?: string;
  project_name?: string;
  assignee_id?: string;
  assignee_label?: string;
  close_targets?: Array<{
    issue_id: string;
    issue_key?: string;
    title?: string;
    close_state_id: string;
  }>;
  tripwire?: string;
}

export interface CompileDecisionChangesetInput {
  note_id: string;
  meeting_title: string;
  meeting_date?: string;
  web_url?: string;
  cards: DecisionCardForChangeset[];
  channel_id?: string;
  thread_ts?: string;
}

export type ApplyDecisionChangesetResult =
  | { outcome: 'applied'; draft: ChangesetDraft }
  | { outcome: 'stale_revision'; draft: ChangesetDraft }
  | { outcome: 'in_progress'; draft: ChangesetDraft }
  | { outcome: 'already_applied'; draft: ChangesetDraft }
  | { outcome: 'dismissed'; draft: ChangesetDraft }
  | { outcome: 'needs_input'; draft: ChangesetDraft; line_ids: string[] };

export function compileDecisionCardsToLines(
  cards: readonly DecisionCardForChangeset[],
): ChangesetLineInput[] {
  if (cards.length === 0) throw new Error('decision changeset requires at least one card');
  return cards.map((card) => {
    const decisionType = card.decision_type ?? classifyDecisionType(card.decision);
    const base = {
      subject: requiredString(card.subject, 'subject'),
      decision: requiredString(card.decision, 'decision'),
      decision_type: decisionType,
      ...(card.rationale === undefined || card.rationale.trim() === ''
        ? {}
        : { rationale: card.rationale.trim() }),
    };
    if (decisionType === 'executable') {
      return {
        ...base,
        mutation: {
          kind: 'create' as const,
          title: executableTitle(card.decision),
          ...(card.project_id === undefined ? {} : { project_id: card.project_id }),
          ...(card.project_name === undefined ? {} : { project_name: card.project_name }),
          ...(card.assignee_id === undefined ? {} : { assignee_id: card.assignee_id }),
          ...(card.assignee_label === undefined ? {} : { assignee_label: card.assignee_label }),
        },
      };
    }
    if (decisionType === 'negative') {
      const targets = card.close_targets ?? [];
      return {
        ...base,
        mutation: {
          kind: 'close' as const,
          targets,
          ...(targets.length === 0 ? { needs_input: true } : {}),
        },
      };
    }
    return {
      ...base,
      mutation: {
        kind: 'ledger' as const,
        reason: decisionType,
        ...(card.tripwire === undefined || card.tripwire.trim() === ''
          ? {}
          : { tripwire: card.tripwire.trim() }),
      },
    };
  });
}

export async function createChangesetDraftFromCards(
  store: ChangesetDraftStore,
  input: CompileDecisionChangesetInput,
): Promise<{ draft: ChangesetDraft; created: boolean }> {
  return store.createChangesetDraft({
    note_id: requiredString(input.note_id, 'note_id'),
    meeting: meetingFromInput(input),
    lines: compileDecisionCardsToLines(input.cards),
    ...(input.channel_id === undefined ? {} : { channel_id: input.channel_id }),
    ...(input.thread_ts === undefined ? {} : { thread_ts: input.thread_ts }),
  });
}

export async function applyDecisionChangeset(input: {
  draftStore: ChangesetDraftStore;
  decisionStore: TeamDecisionStore;
  linearClient: LinearClient;
  linearTeamId: string;
  linearStateId: string;
  defaultAssigneeId: string;
  draftId: string;
  revision: number;
  confirmedBy: string;
  author: string;
  sourceApp?: 'claude-code' | 'codex';
  confirmedAt?: string;
  ownerToken?: string;
}): Promise<ApplyDecisionChangesetResult> {
  const confirmedAt = input.confirmedAt ?? new Date().toISOString();
  const ownerToken = input.ownerToken ?? randomUUID();
  const acquired = await input.draftStore.beginChangesetApply(
    input.draftId,
    input.revision,
    ownerToken,
    confirmedAt,
  );
  if (acquired.outcome !== 'acquired') return acquired;

  let draft = acquired.draft;
  for (const line of activeLines(draft)) {
    if (line.decision_atom_id !== undefined) continue;
    if ((await input.draftStore.fenceChangesetApply(draft.draft_id, ownerToken)) === null) {
      return { outcome: 'in_progress', draft };
    }
    const atom = await input.decisionStore.appendChangesetDecision({
      draft_id: draft.draft_id,
      line_key: line.line_key,
      subject: line.subject,
      decision: line.decision,
      decision_type: line.decision_type,
      ...(line.rationale === undefined ? {} : { rationale: line.rationale }),
      author: input.author,
      confirmed_by: input.confirmedBy,
      confirmed_at: confirmedAt,
      source_app: input.sourceApp ?? 'codex',
      meeting: draft.meeting,
      mutation_kind: line.mutation.kind,
      ...(line.mutation.kind === 'ledger' && line.mutation.tripwire !== undefined
        ? { tripwire: line.mutation.tripwire }
        : {}),
    });
    draft = await input.draftStore.recordChangesetLineAtom(
      draft.draft_id,
      ownerToken,
      line.line_key,
      atom.atom_id,
    );
  }

  for (const line of activeLines(draft)) {
    const decisionAtomId = requireLineAtom(line);
    if (line.mutation.kind === 'ledger') continue;
    if (line.mutation.kind === 'create') {
      if (line.created_issue !== undefined) continue;
      if ((await input.draftStore.fenceChangesetApply(draft.draft_id, ownerToken)) === null) {
        return { outcome: 'in_progress', draft };
      }
      const issue = await input.linearClient.createIssue({
        title: line.mutation.title,
        body: renderCreatedIssueBody(line, draft.meeting, decisionAtomId),
        teamId: input.linearTeamId,
        projectId: requiredString(line.mutation.project_id, `${line.line_id}.project_id`),
        stateId: input.linearStateId,
        assigneeId: line.mutation.assignee_id ?? input.defaultAssigneeId,
        decisionAtomId,
      });
      draft = await input.draftStore.recordChangesetCreate(
        draft.draft_id,
        ownerToken,
        line.line_key,
        issue,
      );
      continue;
    }
    if (input.linearClient.closeIssue === undefined) {
      throw new Error('Linear closeIssue is not configured');
    }
    for (const target of line.mutation.targets) {
      if (line.close_results?.[target.issue_id] !== undefined) continue;
      if ((await input.draftStore.fenceChangesetApply(draft.draft_id, ownerToken)) === null) {
        return { outcome: 'in_progress', draft };
      }
      const result = await input.linearClient.closeIssue({
        issueId: target.issue_id,
        closeStateId: target.close_state_id,
        decisionAtomId,
        comment: line.decision,
      });
      draft = await input.draftStore.recordChangesetClose(
        draft.draft_id,
        ownerToken,
        line.line_key,
        target.issue_id,
        result,
      );
    }
  }

  return {
    outcome: 'applied',
    draft: await input.draftStore.finishChangesetApply(draft.draft_id, ownerToken),
  };
}

export function renderDecisionChangesetDraft(draft: ChangesetDraft): string {
  const active = activeLines(draft);
  const creates = active.filter((line) => line.mutation.kind === 'create').length;
  const closes = active.filter((line) => line.mutation.kind === 'close').length;
  const ledger = active.filter((line) => line.mutation.kind === 'ledger').length;
  return [
    `Decision changeset for ${draft.meeting.meeting_title}`,
    `${active.length} decisions -> ${creates} creates, ${closes} closes, ${ledger} ledger-only`,
    `revision ${draft.revision}`,
    '',
    ...draft.lines.map(renderLine),
  ].join('\n');
}

export function parseChangesetEditReply(text: string): ChangesetEditOp | null {
  const trimmed = text.trim();
  const match = /^(L\d+)\s+([a-z]+)(?::|\s+)([\s\S]+)$/i.exec(trimmed);
  if (match === null) return null;
  const lineId = match[1]!.toUpperCase();
  const command = match[2]!.toLowerCase();
  const value = match[3]!.trim();
  if (value === '' && command !== 'strike' && command !== 'restore') return null;
  if (command === 'retitle') return { kind: 'retitle', line_id: lineId, title: value };
  if (command === 'reassign') return { kind: 'reassign', line_id: lineId, assignee_id: value };
  if (command === 'reproject') return { kind: 'reproject', line_id: lineId, project_id: value };
  if (command === 'strike') return { kind: 'strike', line_id: lineId };
  if (command === 'restore') return { kind: 'restore', line_id: lineId };
  if (command === 'retype' && isDecisionType(value)) {
    return { kind: 'retype', line_id: lineId, decision_type: value };
  }
  return null;
}

export function classifyDecisionType(text: string): DecisionType {
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

function renderLine(line: ChangesetLine): string {
  const prefix = line.struck ? `${line.line_id} [struck]` : line.line_id;
  if (line.mutation.kind === 'create') {
    return `${prefix} ${line.decision_type} create: ${line.mutation.title}`;
  }
  if (line.mutation.kind === 'close') {
    const targets =
      line.mutation.targets.length === 0
        ? 'targets: ? (reply to pick)'
        : `targets: ${line.mutation.targets.map((target) => target.issue_key ?? target.issue_id).join(', ')}`;
    return `${prefix} ${line.decision_type} close: ${line.decision} (${targets})`;
  }
  return `${prefix} ${line.decision_type} ledger-only: ${line.decision}`;
}

function renderCreatedIssueBody(
  line: ChangesetLine,
  meeting: ChangesetMeetingProvenance,
  decisionAtomId: string,
): string {
  return [
    line.decision,
    '',
    line.rationale === undefined ? undefined : `Rationale: ${line.rationale}`,
    `Granola note: ${meeting.web_url ?? meeting.note_id}`,
    `decision_atom_id: ${decisionAtomId}`,
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n');
}

function activeLines(draft: ChangesetDraft): ChangesetLine[] {
  return draft.lines.filter((line) => !line.struck);
}

function requireLineAtom(line: ChangesetLine): string {
  return requiredString(line.decision_atom_id, `${line.line_id}.decision_atom_id`);
}

function meetingFromInput(
  input: CompileDecisionChangesetInput,
): Omit<ChangesetMeetingProvenance, 'note_id'> {
  return {
    meeting_title: requiredString(input.meeting_title, 'meeting_title'),
    ...(input.meeting_date === undefined ? {} : { meeting_date: input.meeting_date }),
    ...(input.web_url === undefined ? {} : { web_url: input.web_url }),
  };
}

function executableTitle(decision: string): string {
  return decision.trim().replace(/[.]+$/u, '').slice(0, 120);
}

function isDecisionType(value: string): value is DecisionType {
  return (
    value === 'executable' ||
    value === 'directional' ||
    value === 'negative' ||
    value === 'conditional'
  );
}

function requiredString(value: string | undefined, field: string): string {
  if (value === undefined || value.trim() === '') throw new Error(`${field} is required`);
  return value.trim();
}
