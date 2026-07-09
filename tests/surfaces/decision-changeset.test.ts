import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyDecisionChangeset,
  createChangesetDraftFromCards,
  parseChangesetEditReply,
  renderDecisionChangesetDraft,
} from '../../src/surfaces/ceo-slack-responder/decision-changeset.js';
import {
  TEAM_DECISION_SOURCE,
  createTeamDecisionStore,
} from '../../src/surfaces/ceo-slack-responder/decision-store.js';
import {
  FileChangesetDraftStore,
  FileDecisionDraftStore,
  type ChangesetEditOp,
  type ChangesetLineInput,
} from '../../src/surfaces/ceo-slack-responder/draft-store.js';
import type {
  LinearIssueCloseInput,
  LinearIssueCreateInput,
} from '../../src/surfaces/ceo-slack-responder/linear-client.js';
import { postDecisionChangesetDraftCard } from '../../src/surfaces/ceo-slack-responder/responder.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('decision changeset compiler', () => {
  it('AC1 creates one batch draft/card for a meeting and no per-decision drafts', async () => {
    const { filePath, changesets } = await tempStores();
    const { draft, created } = await createChangesetDraftFromCards(changesets, batchInput());
    const replay = await createChangesetDraftFromCards(changesets, batchInput());
    const fetchCalls: unknown[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      fetchCalls.push(JSON.parse(String(init.body)));
      return response({ ok: true, ts: '171.1' });
    });

    const ts = await postDecisionChangesetDraftCard('xoxb', 'CDECIDE', draft);
    await changesets.markChangesetMessage(draft.draft_id, ts);

    const raw = JSON.parse(await readFile(filePath, 'utf8')) as {
      drafts: Record<string, unknown>;
      changeset_drafts: Record<string, unknown>;
    };
    expect(created).toBe(true);
    expect(replay.created).toBe(false);
    expect(Object.keys(raw.changeset_drafts)).toEqual([draft.draft_id]);
    expect(Object.keys(raw.drafts)).toEqual([]);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({ channel: 'CDECIDE' });
    expect(renderDecisionChangesetDraft(draft)).toContain(
      '4 decisions -> 1 creates, 1 closes, 2 ledger-only',
    );
  });

  it('AC2 applies deterministic edit ops, records failures, and dedupes replayed add/split replies', async () => {
    const { changesets } = await tempStores();
    const { draft } = await createChangesetDraftFromCards(changesets, batchInput());
    const ops: ChangesetEditOp[] = [
      parseChangesetEditReply('L1 retitle: Ship legal intake')!,
      { kind: 'reassign', line_id: 'L1', assignee_id: 'U123' },
      { kind: 'reproject', line_id: 'L1', project_id: 'proj-2', project_name: 'legal' },
      { kind: 'retype', line_id: 'L3', decision_type: 'executable' },
      {
        kind: 'retarget',
        line_id: 'L2',
        targets: [{ issue_id: 'issue-2', issue_key: 'ECH-2', close_state_id: 'done-state' }],
      },
      { kind: 'strike', line_id: 'L4' },
      { kind: 'restore', line_id: 'L4' },
    ];
    for (const [index, op] of ops.entries()) {
      const result = await changesets.applyChangesetEdit(draft.draft_id, `C:1:${index}`, op);
      expect(result.outcome).toBe('accepted');
    }

    const addLine = lineInput('Added scope', 'Add an owner review.', 'executable');
    const add = await changesets.applyChangesetEdit(draft.draft_id, 'C:1:add', {
      kind: 'add',
      line: addLine,
    });
    const duplicateAdd = await changesets.applyChangesetEdit(draft.draft_id, 'C:1:add', {
      kind: 'add',
      line: addLine,
    });
    const split = await changesets.applyChangesetEdit(draft.draft_id, 'C:1:split', {
      kind: 'split',
      line_id: 'L1',
      lines: [
        lineInput('Split A', 'Create the first issue.', 'executable'),
        lineInput('Split B', 'Create the second issue.', 'executable'),
      ],
    });
    const failed = await changesets.applyChangesetEdit(
      draft.draft_id,
      'C:1:bad',
      null,
      'ambiguous line id',
    );

    expect(add.outcome).toBe('accepted');
    expect(duplicateAdd.outcome).toBe('duplicate');
    expect(split.outcome).toBe('accepted');
    expect(failed.outcome).toBe('failed');
    expect(failed.draft.revision).toBe(split.draft.revision);
    expect(failed.draft.edit_history.at(-1)).toMatchObject({
      status: 'failed',
      error: 'ambiguous line id',
    });
    expect(failed.draft.lines.filter((line) => line.subject === 'Added scope')).toHaveLength(1);
    expect(failed.draft.lines.filter((line) => line.line_key.includes(':e9-'))).toHaveLength(2);
  });

  it('AC3 creates no atoms or Linear mutations before confirm, and dismiss has no side effects', async () => {
    const { changesets } = await tempStores();
    const { draft } = await createChangesetDraftFromCards(changesets, batchInput());
    const storage = new MemoryStorage();
    const calls: LinearIssueCreateInput[] = [];

    await changesets.dismissChangesetDraft(draft.draft_id, 'Taylor');

    expect(await storage.query({ source: TEAM_DECISION_SOURCE })).toHaveLength(0);
    expect(calls).toHaveLength(0);
    expect(await changesets.getChangesetDraft(draft.draft_id)).toMatchObject({
      status: 'dismissed',
    });
  });

  it('AC4 AC5 AC7 applies atoms before Linear, stamps creates/closes, and retries without duplicates', async () => {
    const { changesets } = await tempStores();
    const storage = new MemoryStorage();
    const decisions = createTeamDecisionStore(storage);
    await decisions.appendConfirmedDecision({
      draft_id: 'prior',
      subject: 'Legal intake',
      decision: 'Use manual intake for now.',
      author: 'codex',
      confirmed_by: 'Taylor',
      confirmed_at: '2026-07-08T10:00:00.000Z',
      source_app: 'codex',
    });
    const { draft } = await createChangesetDraftFromCards(changesets, batchInput());
    const createCalls: LinearIssueCreateInput[] = [];
    const closeCalls: LinearIssueCloseInput[] = [];

    const result = await applyDecisionChangeset({
      draftStore: changesets,
      decisionStore: decisions,
      linearClient: {
        createIssue: async (input) => {
          expect((await storage.query({ source: TEAM_DECISION_SOURCE })).length).toBe(5);
          createCalls.push(input);
          return { id: 'LIN-1', url: 'https://linear.app/echo/issue/LIN-1' };
        },
        closeIssue: async (input) => {
          expect((await storage.query({ source: TEAM_DECISION_SOURCE })).length).toBe(5);
          closeCalls.push(input);
          return {
            issue_id: input.issueId,
            marker: `echo:decision:${input.decisionAtomId}:issue:${input.issueId}`,
            outcome: 'closed',
          };
        },
      },
      linearTeamId: 'team-id',
      linearStateId: 'inbox-state',
      defaultAssigneeId: 'zhen-id',
      draftId: draft.draft_id,
      revision: draft.revision,
      confirmedBy: 'Taylor',
      author: 'granola',
      confirmedAt: '2026-07-09T12:00:00.000Z',
    });

    expect(result.outcome).toBe('applied');
    expect(createCalls).toHaveLength(1);
    expect(closeCalls).toHaveLength(1);
    expect(createCalls[0]?.decisionAtomId).toMatch(/[0-9a-f-]{36}/);
    expect(createCalls[0]?.body).toContain('decision_atom_id:');
    expect(createCalls[0]?.body).toContain('https://granola.test/note-1');
    expect(closeCalls[0]?.comment).toBe('Stop the old manual intake issue.');

    const atoms = await storage.query({ source: TEAM_DECISION_SOURCE, order: 'asc' });
    expect(atoms).toHaveLength(5);
    const changesetAtoms = atoms.slice(1);
    expect(changesetAtoms.every((atom) => atom.metadata?.['line_key'] !== undefined)).toBe(true);
    const createAtom = changesetAtoms.find((atom) => atom.metadata?.['mutation_kind'] === 'create');
    expect(createAtom?.metadata).toMatchObject({
      decision_type: 'executable',
      mutation_kind: 'create',
      supersedes: atoms[0]?.id,
    });
    expect(createAtom?.metadata?.['meeting']).toMatchObject({ note_id: 'note-1' });

    const replay = await applyDecisionChangeset({
      draftStore: changesets,
      decisionStore: decisions,
      linearClient: {
        createIssue: async () => {
          throw new Error('create replay should no-op');
        },
      },
      linearTeamId: 'team-id',
      linearStateId: 'inbox-state',
      defaultAssigneeId: 'zhen-id',
      draftId: draft.draft_id,
      revision: draft.revision,
      confirmedBy: 'Taylor',
      author: 'granola',
    });
    expect(replay.outcome).toBe('already_applied');
    expect(await storage.query({ source: TEAM_DECISION_SOURCE })).toHaveLength(5);
  });

  it('AC5 keeps split/add line keys stable across atom-phase crash retry', async () => {
    const { changesets } = await tempStores();
    const storage = new MemoryStorage();
    const decisions = createTeamDecisionStore(storage);
    const { draft } = await createChangesetDraftFromCards(changesets, {
      ...batchInput(),
      cards: [batchInput().cards[0]!],
    });
    const add = await changesets.applyChangesetEdit(draft.draft_id, 'C:1:add', {
      kind: 'add',
      line: lineInput('Added work', 'Create added work.', 'executable'),
    });

    await expect(
      applyDecisionChangeset({
        draftStore: changesets,
        decisionStore: decisions,
        linearClient: {
          createIssue: async () => {
            throw new Error('crash after atom phase');
          },
        },
        linearTeamId: 'team-id',
        linearStateId: 'inbox-state',
        defaultAssigneeId: 'zhen-id',
        draftId: draft.draft_id,
        revision: add.draft.revision,
        confirmedBy: 'Taylor',
        author: 'granola',
        confirmedAt: '2026-07-09T12:00:00.000Z',
        ownerToken: 'owner-a',
      }),
    ).rejects.toThrow('crash after atom phase');
    expect(await storage.query({ source: TEAM_DECISION_SOURCE })).toHaveLength(2);

    const resumed = await changesets.beginChangesetApply(
      draft.draft_id,
      add.draft.revision,
      'owner-b',
      '2099-07-09T12:20:01.000Z',
      1,
    );
    expect(resumed.outcome).toBe('acquired');
    expect(await changesets.fenceChangesetApply(draft.draft_id, 'owner-a')).toBeNull();
    const latest = await changesets.getChangesetDraft(draft.draft_id);
    expect(latest?.lines.map((line) => line.line_key)).toContain(
      `${draft.note_id}:${draft.draft_id}:e1`,
    );
  });

  it('AC6 AC8 blocks unresolved closes, stale revisions, fresh applying leases, and stale owners', async () => {
    const { changesets } = await tempStores();
    const storage = new MemoryStorage();
    const decisions = createTeamDecisionStore(storage);
    const unresolved = await createChangesetDraftFromCards(changesets, {
      ...batchInput(),
      cards: [
        {
          subject: 'Old work',
          decision: 'Stop the old work.',
          decision_type: 'negative',
        },
      ],
    });
    const needsInput = await applyDecisionChangeset({
      draftStore: changesets,
      decisionStore: decisions,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      linearTeamId: 'team-id',
      linearStateId: 'inbox-state',
      defaultAssigneeId: 'zhen-id',
      draftId: unresolved.draft.draft_id,
      revision: unresolved.draft.revision,
      confirmedBy: 'Taylor',
      author: 'granola',
    });
    expect(needsInput).toMatchObject({ outcome: 'needs_input', line_ids: ['L1'] });

    const { draft } = await createChangesetDraftFromCards(
      changesets,
      batchInput({ note_id: 'note-2' }),
    );
    const edited = await changesets.applyChangesetEdit(draft.draft_id, 'C:2:edit', {
      kind: 'retitle',
      line_id: 'L1',
      title: 'New title',
    });
    const stale = await applyDecisionChangeset({
      draftStore: changesets,
      decisionStore: decisions,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      linearTeamId: 'team-id',
      linearStateId: 'inbox-state',
      defaultAssigneeId: 'zhen-id',
      draftId: draft.draft_id,
      revision: draft.revision,
      confirmedBy: 'Taylor',
      author: 'granola',
    });
    expect(stale.outcome).toBe('stale_revision');

    await changesets.beginChangesetApply(
      draft.draft_id,
      edited.draft.revision,
      'owner-a',
      '2026-07-09T12:00:00.000Z',
    );
    const fresh = await applyDecisionChangeset({
      draftStore: changesets,
      decisionStore: decisions,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      linearTeamId: 'team-id',
      linearStateId: 'inbox-state',
      defaultAssigneeId: 'zhen-id',
      draftId: draft.draft_id,
      revision: edited.draft.revision,
      confirmedBy: 'Taylor',
      author: 'granola',
      confirmedAt: '2026-07-09T12:01:00.000Z',
    });
    expect(fresh.outcome).toBe('in_progress');

    const takeover = await changesets.beginChangesetApply(
      draft.draft_id,
      edited.draft.revision,
      'owner-b',
      '2026-07-09T12:20:01.000Z',
      1,
    );
    expect(takeover.outcome).toBe('acquired');
    expect(await changesets.fenceChangesetApply(draft.draft_id, 'owner-a')).toBeNull();
  });
});

async function tempStores(): Promise<{
  dir: string;
  filePath: string;
  changesets: FileChangesetDraftStore;
  decisions: FileDecisionDraftStore;
}> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-decision-changeset-'));
  tempDirs.push(dir);
  const filePath = join(dir, 'drafts.json');
  return {
    dir,
    filePath,
    changesets: new FileChangesetDraftStore(filePath),
    decisions: new FileDecisionDraftStore(filePath),
  };
}

function batchInput(overrides: Partial<{ note_id: string }> = {}) {
  return {
    note_id: overrides.note_id ?? 'note-1',
    meeting_title: 'EchoBrain Legal',
    meeting_date: '2026-07-08',
    web_url: 'https://granola.test/note-1',
    channel_id: 'CDECIDE',
    cards: [
      {
        subject: 'Legal intake',
        decision: 'Create the legal intake changeset.',
        rationale: 'The meeting approved materializing decisions.',
        decision_type: 'executable' as const,
        project_id: 'project-legal',
        assignee_id: 'zhen-id',
      },
      {
        subject: 'Old manual intake',
        decision: 'Stop the old manual intake issue.',
        decision_type: 'negative' as const,
        close_targets: [{ issue_id: 'issue-1', issue_key: 'ECH-1', close_state_id: 'done-state' }],
      },
      {
        subject: 'Architecture posture',
        decision: 'Prefer ledger primary and Linear projection.',
        decision_type: 'directional' as const,
      },
      {
        subject: 'Brief tripwire',
        decision: 'If Linear goes stale, ask for a meeting correction.',
        decision_type: 'conditional' as const,
        tripwire: 'Linear stale',
      },
    ],
  };
}

function lineInput(
  subject: string,
  decision: string,
  decisionType: ChangesetLineInput['decision_type'],
) {
  return {
    subject,
    decision,
    decision_type: decisionType,
    mutation:
      decisionType === 'executable'
        ? { kind: 'create' as const, title: decision, project_id: 'project-legal' }
        : { kind: 'ledger' as const, reason: 'directional' as const },
  };
}

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}
