import { describe, expect, it } from 'vitest';

import {
  TEAM_DECISION_SOURCE,
  createTeamDecisionStore,
  decisionDedupeKey,
} from '../../../src/surfaces/ceo-slack-responder/decision-store.js';
import { MemoryStorage } from '../../../src/storage/memory.js';

describe('team decision store latest-wins', () => {
  it('re-confirming a subject appends a new atom and queries the latest immutable decision', async () => {
    const storage = new MemoryStorage();
    const store = createTeamDecisionStore(storage);
    await store.appendConfirmedDecision({
      draft_id: 'draft-auth-v1',
      subject: ' Auth   Storage ',
      decision: 'We will keep auth sessions in SQLite.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-06-24T08:00:00.000Z',
      source_app: 'codex',
    });
    const prior = (await storage.query({ source: TEAM_DECISION_SOURCE }))[0]!;

    await store.appendConfirmedDecision({
      draft_id: 'draft-auth-v2',
      subject: 'auth storage',
      decision: 'We moved auth sessions to Postgres.',
      rationale: 'The launch target needs cross-node deploys.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-06-24T09:00:00.000Z',
      source_app: 'codex',
    });

    const atoms = await storage.query({ source: TEAM_DECISION_SOURCE, order: 'asc' });
    expect(atoms).toHaveLength(2);
    expect(atoms[0]).toEqual(prior);
    expect(atoms[0]?.metadata?.['dedupe_key']).toBe(decisionDedupeKey('auth storage'));
    expect(atoms[1]?.metadata?.['dedupe_key']).toBe(decisionDedupeKey('auth storage'));

    const latest = await store.queryLatestDecisions({ subject: 'auth storage' });
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({
      draft_id: 'draft-auth-v2',
      decision: 'We moved auth sessions to Postgres.',
      rationale: 'The launch target needs cross-node deploys.',
    });
  });
});
