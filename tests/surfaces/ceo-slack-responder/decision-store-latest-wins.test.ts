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

  it('AC2 (item 112): writes canonical_subject == normalized_subject with a byte-stable dedupe_key', async () => {
    const storage = new MemoryStorage();
    const store = createTeamDecisionStore(storage);

    const atom = await store.appendConfirmedDecision({
      draft_id: 'draft-ac2-v1',
      subject: '  Auth   Storage ',
      decision: 'We will keep auth sessions in SQLite.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-07-04T08:00:00.000Z',
      source_app: 'codex',
    });

    const events = await storage.query({ source: TEAM_DECISION_SOURCE, order: 'asc' });
    expect(events).toHaveLength(1);
    const md = events[0]!.metadata!;
    // Both keys present, equal values.
    expect(md['canonical_subject']).toBe('auth storage');
    expect(md['normalized_subject']).toBe('auth storage');
    expect(md['canonical_subject']).toBe(md['normalized_subject']);
    // Byte-stable dedupe_key — pinned against a hardcoded literal, NOT a
    // recomputation, so any drift in the `team-decision:` prefix or the
    // normalization is caught.
    expect(md['dedupe_key']).toBe('team-decision:auth storage');
    expect(atom.dedupe_key).toBe('team-decision:auth storage');
    // decisionDedupeKey stays consistent with the persisted key.
    expect(md['dedupe_key']).toBe(decisionDedupeKey('  Auth   Storage '));

    // Latest-wins chain over a pre-existing atom with the same dedupe_key
    // still supersedes correctly after the canonical_subject addition.
    await store.appendConfirmedDecision({
      draft_id: 'draft-ac2-v2',
      subject: 'auth storage',
      decision: 'We moved auth sessions to Postgres.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-07-04T09:00:00.000Z',
      source_app: 'codex',
    });
    const latest = await store.queryLatestDecisions({ subject: 'auth storage' });
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({
      draft_id: 'draft-ac2-v2',
      decision: 'We moved auth sessions to Postgres.',
    });
  });

  it('AC4 (item 112): a mixed-generation store resolves latest-wins via the normalized_subject fallback', async () => {
    const storage = new MemoryStorage();
    const store = createTeamDecisionStore(storage);

    // Legacy atom: pre-change shape — carries normalized_subject only, NO
    // canonical_subject. Appended directly to storage to simulate a decision
    // written before item 112.
    await storage.append({
      source: TEAM_DECISION_SOURCE,
      timestamp: '2026-06-01T08:00:00.000Z',
      content: 'We will use MySQL for auth storage.',
      metadata: {
        decision_atom_type: 'team_decision',
        subject: 'Auth Storage',
        normalized_subject: 'auth storage',
        decision: 'We will use MySQL for auth storage.',
        author: 'avery-machine',
        confirmed_by: 'blake',
        confirmed_at: '2026-06-01T08:00:00.000Z',
        source_app: 'codex',
        dedupe_key: 'team-decision:auth storage',
        draft_id: 'legacy-draft',
      },
    });

    // Legacy atom alone is readable via the read-side normalized_subject
    // fallback (eventToTeamDecisionAtom + matchesQuery).
    const legacyOnly = await store.queryLatestDecisions({ subject: 'auth storage' });
    expect(legacyOnly).toHaveLength(1);
    expect(legacyOnly[0]).toMatchObject({ draft_id: 'legacy-draft' });

    // New atom carries both keys and supersedes the legacy one at query time.
    await store.appendConfirmedDecision({
      draft_id: 'new-draft',
      subject: 'auth storage',
      decision: 'We moved auth storage to Postgres.',
      author: 'avery-machine',
      confirmed_by: 'blake',
      confirmed_at: '2026-07-04T08:00:00.000Z',
      source_app: 'codex',
    });

    const latest = await store.queryLatestDecisions({ subject: 'auth storage' });
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({
      draft_id: 'new-draft',
      decision: 'We moved auth storage to Postgres.',
    });
  });
});
