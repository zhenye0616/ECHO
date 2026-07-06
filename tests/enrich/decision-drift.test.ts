import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { Storage, EventId } from '../../src/storage/interface.js';
import { appendConfirmedDecision } from '../../src/surfaces/ceo-slack-responder/decision-store.js';
import { normalizeSubject } from '../../src/util/subject.js';
import { GRANOLA_SIGNAL_SOURCE, type GranolaSignalType } from '../../src/enrich/granola-signals.js';
import {
  DEFAULT_DRIFT_MAX_ALERTS_PER_TICK,
  DRIFT_DELIVERY_MAX_RETRIES,
  DRIFT_JUDGE_MAX_ATTEMPTS,
  DRIFT_JUDGE_VERSION,
  DriftDeliveryRejectedError,
  DriftJudgeInfraError,
  DriftJudgeParseError,
  DriftSweepConfigError,
  driftPairKey,
  loadDriftSweepCheckpoint,
  loadDriftSweepConfig,
  runDriftSweepOnce,
  startDriftSweepWorker,
  writeDriftSweepCheckpoint,
  type DriftAlertPayload,
  type DriftJudge,
  type DriftOwnerIdentity,
  type DriftPairCheckpoint,
  type DriftSweepRuntime,
} from '../../src/enrich/decision-drift.js';

const tempDirs: string[] = [];
function tempCheckpoint(): string {
  const dir = mkdtempSync(join(tmpdir(), 'echo-drift-sweep-'));
  tempDirs.push(dir);
  return join(dir, 'drift-sweep-checkpoint.json');
}

// Repoint ECHO_HOME at a fresh temp so any worker-heartbeat write (item 120,
// e.g. the boot-disable path in startDriftSweepWorker) lands in temp, never the
// real ~/.echo/state.
beforeEach(() => {
  const home = mkdtempSync(join(tmpdir(), 'echo-drift-home-'));
  tempDirs.push(home);
  setEchoHomeRoot(home);
});

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

const ALICE: DriftOwnerIdentity = { id: 'alice', slack_user_id: 'U-ALICE' };

async function seedDecision(
  store: Storage,
  subject: string,
  decision: string,
  opts: { confirmedBy?: string; confirmedAt?: string } = {},
): Promise<string> {
  const atom = await appendConfirmedDecision(store, {
    draft_id: `draft-${subject}-${Math.random().toString(36).slice(2)}`,
    subject,
    decision,
    author: 'echo-bot',
    confirmed_by: opts.confirmedBy ?? 'alice',
    confirmed_at: opts.confirmedAt ?? '2026-07-01T00:00:00.000Z',
    source_app: 'claude-code',
  });
  return atom.dedupe_key;
}

let statementCounter = 0;
async function seedStatement(
  store: Storage,
  opts: {
    subject: string;
    text: string;
    signalType?: GranolaSignalType;
    noteId?: string;
    title?: string;
    timestamp?: string;
    dedupeKey?: string;
  },
): Promise<{ id: EventId; dedupeKey: string }> {
  statementCounter += 1;
  const canonical = normalizeSubject(opts.subject);
  const dedupeKey = opts.dedupeKey ?? `granola:signal:stmt-${statementCounter}`;
  const id = await store.append({
    source: GRANOLA_SIGNAL_SOURCE,
    timestamp: opts.timestamp ?? '2026-07-02T00:00:00.000Z',
    content: opts.text,
    metadata: {
      signal_type: opts.signalType ?? 'decision',
      canonical_subject: canonical,
      dedupe_key: dedupeKey,
      note_id: opts.noteId ?? 'note-1',
      meeting_title: opts.title ?? 'Tuesday sync',
    },
  });
  return { id, dedupeKey };
}

function countingJudge(inner: DriftJudge): { judge: DriftJudge; calls: () => number } {
  let calls = 0;
  return {
    judge: async (input) => {
      calls += 1;
      return inner(input);
    },
    calls: () => calls,
  };
}

const contradictsJudge =
  (quote: string): DriftJudge =>
  async () => ({ contradicts: true, quote, reason: 'reverses the recorded decision' });

const noContradictionJudge: DriftJudge = async () => ({
  contradicts: false,
  quote: '',
  reason: 'consistent',
});

const parseFailJudge: DriftJudge = async () => {
  throw new DriftJudgeParseError('not JSON');
};

const infraFailJudge: DriftJudge = async () => {
  throw new DriftJudgeInfraError('model timeout');
};

function makeRuntime(
  checkpointPath: string,
  overrides: Partial<DriftSweepRuntime> = {},
): DriftSweepRuntime {
  return {
    judge: noContradictionJudge,
    post: async () => {},
    identities: [ALICE],
    checkpointPath,
    maxAlertsPerTick: DEFAULT_DRIFT_MAX_ALERTS_PER_TICK,
    judgeVersion: DRIFT_JUDGE_VERSION,
    now: () => '2026-07-04T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC2 — the join
// ---------------------------------------------------------------------------

describe('AC2 — subject-key join', () => {
  it('joins a same-subject statement against the recorded decision', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Database choice', 'Use SQLite for V1');
    await seedStatement(store, { subject: 'Database choice', text: "Let's switch to Postgres" });
    const posts: DriftAlertPayload[] = [];
    const result = await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge: contradictsJudge('switch to Postgres'),
        post: async (p) => {
          posts.push(p);
        },
      }),
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.delivered).toBe(1);
    expect(posts).toHaveLength(1);
  });

  it('does not join a different-subject statement (skipped silently)', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Database choice', 'Use SQLite for V1');
    await seedStatement(store, { subject: 'Pricing tier', text: 'Charge 50 a month' });
    const { judge, calls } = countingJudge(contradictsJudge('anything'));
    const result = await runDriftSweepOnce(store, makeRuntime(cp, { judge }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.contradictions).toBe(0);
      expect(result.delivered).toBe(0);
    }
    expect(calls()).toBe(0); // no-match never reaches the judge
  });
});

// ---------------------------------------------------------------------------
// AC1 — clocked worker with durable arrival-order cursor
// ---------------------------------------------------------------------------

describe('AC1 — append-order watermark', () => {
  it('sweeps a late-ingested statement exactly once', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Launch date', 'Freeze on July 18');

    // Tick 1: only the decision atom is in scope, no statements.
    const posts: DriftAlertPayload[] = [];
    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('slip the launch'),
      post: async (p) => {
        posts.push(p);
      },
    });
    const t1 = await runDriftSweepOnce(store, runtime);
    expect(t1.status).toBe('ok');
    if (t1.status === 'ok') expect(t1.delivered).toBe(0);

    // A note captured hours late — OLD event timestamp, but a NEW (higher)
    // append sequence_id. A date cursor would skip it; the append cursor cannot.
    await seedStatement(store, {
      subject: 'Launch date',
      text: 'we should slip the launch to August',
      timestamp: '2026-06-01T00:00:00.000Z',
    });

    const t2 = await runDriftSweepOnce(store, runtime);
    expect(t2.status).toBe('ok');
    if (t2.status === 'ok') expect(t2.delivered).toBe(1);
    expect(posts).toHaveLength(1);

    // Tick 3: the same window re-read yields no new work.
    const t3 = await runDriftSweepOnce(store, runtime);
    if (t3.status === 'ok') {
      expect(t3.delivered).toBe(0);
      expect(t3.brain_invocations).toBe(0);
    }
    expect(posts).toHaveLength(1);
  });

  it('recovers a lost watermark write without double-delivering', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Auth vendor', 'Use Clerk');
    await seedStatement(store, { subject: 'Auth vendor', text: 'rip out Clerk for Auth0' });
    const posts: DriftAlertPayload[] = [];
    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('rip out Clerk'),
      post: async (p) => {
        posts.push(p);
      },
    });

    const t1 = await runDriftSweepOnce(store, runtime);
    if (t1.status === 'ok') expect(t1.delivered).toBe(1);
    expect(posts).toHaveLength(1);

    // Simulate a crash AFTER judging/delivery persisted but BEFORE the watermark
    // write: rewind only the watermark, keep the per-pair checkpoints.
    const persisted = loadDriftSweepCheckpoint(cp);
    writeDriftSweepCheckpoint({ ...persisted, watermark: 1 }, cp);

    const t2 = await runDriftSweepOnce(store, runtime);
    if (t2.status === 'ok') {
      expect(t2.delivered).toBe(0); // already-delivered pair is not re-posted
      expect(t2.brain_invocations).toBe(0); // already-judged pair is not re-judged
    }
    expect(posts).toHaveLength(1);
    expect(loadDriftSweepCheckpoint(cp).watermark).toBeGreaterThan(1); // re-advanced
  });
});

// ---------------------------------------------------------------------------
// AC3 — idempotent brain judge
// ---------------------------------------------------------------------------

describe('AC3 — idempotent judge', () => {
  it('re-running over the same window produces zero new brain invocations', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Storage', 'Append-only, no upsert');
    await seedStatement(store, { subject: 'Storage', text: 'add an in-place update path' });
    const { judge, calls } = countingJudge(noContradictionJudge);
    const runtime = makeRuntime(cp, { judge });

    await runDriftSweepOnce(store, runtime);
    expect(calls()).toBe(1);
    const second = await runDriftSweepOnce(store, runtime);
    expect(calls()).toBe(1); // no new brain calls
    if (second.status === 'ok') expect(second.brain_invocations).toBe(0);
  });

  it('retries a transient infra error without counting it or going terminal', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Scope', 'Company scope only');
    const { dedupeKey } = await seedStatement(store, {
      subject: 'Scope',
      text: 'expand to machine scope too',
    });
    const decisionKey = `team-decision:${normalizeSubject('Scope')}`;
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);

    const t1 = await runDriftSweepOnce(store, makeRuntime(cp, { judge: infraFailJudge }));
    if (t1.status === 'ok') {
      expect(t1.judge_failed).toBe(0); // NOT terminal
      expect(t1.brain_invocations).toBe(1); // one attempt, not MAX
    }
    // No checkpoint entry written — the pair is left unjudged for a later tick.
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]).toBeUndefined();
    // Watermark held behind the un-judged statement.
    const stmtSeq = await store.getCurrentSequence({ sourcePrefixes: [GRANOLA_SIGNAL_SOURCE] });
    expect(loadDriftSweepCheckpoint(cp).watermark).toBeLessThanOrEqual(stmtSeq);

    // A later tick with a healthy judge resolves it (the retry).
    const t2 = await runDriftSweepOnce(store, makeRuntime(cp, { judge: noContradictionJudge }));
    if (t2.status === 'ok') expect(t2.brain_invocations).toBe(1);
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state).toBe('judged-no-contradiction');
  });

  it('records terminal-judge-failed after exactly MAX attempts on a malformed verdict', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Naming', 'Ship as ECHO');
    const { dedupeKey } = await seedStatement(store, {
      subject: 'Naming',
      text: 'rename before launch',
    });
    const decisionKey = `team-decision:${normalizeSubject('Naming')}`;
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);
    const { judge, calls } = countingJudge(parseFailJudge);

    const result = await runDriftSweepOnce(store, makeRuntime(cp, { judge }));
    expect(calls()).toBe(DRIFT_JUDGE_MAX_ATTEMPTS); // exactly MAX, not more
    if (result.status === 'ok') {
      expect(result.judge_failed).toBe(1);
      expect(result.brain_invocations).toBe(DRIFT_JUDGE_MAX_ATTEMPTS);
    }
    const record = loadDriftSweepCheckpoint(cp).pairs[pairKey];
    expect(record?.state).toBe('terminal-judge-failed');
    expect(record?.failure_reason).toBeTruthy();

    // Never re-judged; watermark advanced past the terminal pair.
    const rerun = await runDriftSweepOnce(store, makeRuntime(cp, { judge }));
    expect(calls()).toBe(DRIFT_JUDGE_MAX_ATTEMPTS);
    if (rerun.status === 'ok') expect(rerun.brain_invocations).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC4 — code-enforced faithfulness
// ---------------------------------------------------------------------------

describe('AC4 — verbatim-quote enforcement', () => {
  it('discards a fabricated quote and never delivers it', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Pricing', 'Charge 25 a month');
    const { dedupeKey } = await seedStatement(store, {
      subject: 'Pricing',
      text: 'we agreed to make it free',
    });
    const decisionKey = `team-decision:${normalizeSubject('Pricing')}`;
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);
    const posts: DriftAlertPayload[] = [];
    const { judge, calls } = countingJudge(
      contradictsJudge('THIS QUOTE IS NOT IN THE STATEMENT'),
    );

    const result = await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge,
        post: async (p) => {
          posts.push(p);
        },
      }),
    );
    expect(posts).toHaveLength(0); // fabricated quote never becomes an alert
    expect(calls()).toBe(DRIFT_JUDGE_MAX_ATTEMPTS); // rejected + re-judged up to MAX
    if (result.status === 'ok') expect(result.judge_failed).toBe(1);
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state).toBe('terminal-judge-failed');

    // The persistently-fabricating judge does not stall the watermark.
    const rerun = await runDriftSweepOnce(store, makeRuntime(cp, { judge }));
    if (rerun.status === 'ok') expect(rerun.brain_invocations).toBe(0);
  });

  it('delivers when the quote is a verbatim substring of the statement', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Pricing', 'Charge 25 a month');
    await seedStatement(store, { subject: 'Pricing', text: 'we agreed to make it free forever' });
    const posts: DriftAlertPayload[] = [];
    const result = await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge: contradictsJudge('make it free'),
        post: async (p) => {
          posts.push(p);
        },
      }),
    );
    if (result.status === 'ok') expect(result.delivered).toBe(1);
    expect(posts[0]?.quote).toBe('make it free');
  });
});

// ---------------------------------------------------------------------------
// AC5 — alert delivery, at-most-once
// ---------------------------------------------------------------------------

describe('AC5 — owner alert delivery', () => {
  it('addresses the alert to the decision owner via the reverse lookup', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Deploy', 'Deploy on Fly', { confirmedBy: 'alice' });
    await seedStatement(store, { subject: 'Deploy', text: 'move everything to Vercel' });
    const posts: DriftAlertPayload[] = [];
    await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge: contradictsJudge('move everything to Vercel'),
        post: async (p) => {
          posts.push(p);
        },
      }),
    );
    expect(posts[0]?.owner_slack_user_id).toBe('U-ALICE');
    expect(posts[0]?.confirmed_by).toBe('alice');
    expect(posts[0]?.decision_text).toBe('Deploy on Fly');
  });

  it('records delivery-failed on a post failure without marking the pair delivered', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'CI', 'Gate on the product suite');
    const { dedupeKey } = await seedStatement(store, {
      subject: 'CI',
      text: 'drop the CI gate for the demo',
    });
    const decisionKey = `team-decision:${normalizeSubject('CI')}`;
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);

    const result = await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge: contradictsJudge('drop the CI gate'),
        post: async () => {
          throw new Error('slack 500');
        },
      }),
    );
    if (result.status === 'ok') {
      expect(result.delivered).toBe(0);
      expect(result.delivery_failed).toBe(1);
    }
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state).toBe('delivery-failed');
  });

  it('persists delivery-intent to disk BEFORE the post fires (real write path, no hand-mocking)', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const decisionKey = await seedDecision(store, 'Storage', 'Append-only, no upsert');
    const { dedupeKey } = await seedStatement(store, {
      subject: 'Storage',
      text: 'add an upsert path to storage',
    });
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);

    // The probe: at the moment runtime.post() runs, the on-disk checkpoint
    // must already hold a durable delivery-intent for this pair. A crash here
    // must recover to delivery-failed, never a second judge+post.
    let stateAtPostTime: string | undefined;
    const result = await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge: contradictsJudge('add an upsert path'),
        post: async () => {
          stateAtPostTime = loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state;
        },
      }),
    );

    expect(result.status).toBe('ok');
    expect(stateAtPostTime).toBe('delivery-intent');
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state).toBe('delivered');
  });

  it('promotes an intent-written/no-outcome pair to delivery-failed with zero new posts', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const decisionKey = await seedDecision(store, 'Roadmap', 'Federation is post-V1');
    const { dedupeKey } = await seedStatement(store, {
      subject: 'Roadmap',
      text: 'ship federation next sprint',
    });
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);

    // Hand-craft the crash-mid-post state: intent written, outcome never recorded.
    const payload: DriftAlertPayload = {
      pair_key: pairKey,
      decision_dedupe_key: decisionKey,
      statement_dedupe_key: dedupeKey,
      judge_version: DRIFT_JUDGE_VERSION,
      owner_cofounder_id: 'alice',
      owner_slack_user_id: 'U-ALICE',
      decision_subject: 'Roadmap',
      decision_text: 'Federation is post-V1',
      confirmed_at: '2026-07-01T00:00:00.000Z',
      confirmed_by: 'alice',
      quote: 'ship federation next sprint',
      reason: 'reverses the recorded decision',
      meeting_title: 'Tuesday sync',
      note_id: 'note-1',
    };
    const intent: DriftPairCheckpoint = {
      decision_dedupe_key: decisionKey,
      statement_dedupe_key: dedupeKey,
      judge_version: DRIFT_JUDGE_VERSION,
      state: 'delivery-intent',
      updated_at: '2026-07-03T00:00:00.000Z',
      pending_alert: payload,
    };
    writeDriftSweepCheckpoint(
      { schema_version: 1, watermark: 1, pairs: { [pairKey]: intent } },
      cp,
    );

    let postCalls = 0;
    const result = await runDriftSweepOnce(
      store,
      makeRuntime(cp, {
        judge: contradictsJudge('ship federation next sprint'),
        post: async () => {
          postCalls += 1;
        },
      }),
    );
    expect(postCalls).toBe(0); // recovered WITHOUT calling Slack again
    if (result.status === 'ok') expect(result.delivery_failed).toBe(1);
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state).toBe('delivery-failed');
    // Terminal now → watermark advances past the pair.
    const stmtSeq = await store.getCurrentSequence({ sourcePrefixes: [GRANOLA_SIGNAL_SOURCE] });
    expect(loadDriftSweepCheckpoint(cp).watermark).toBeGreaterThan(stmtSeq);
  });

  it('re-running over an already-delivered pair posts zero new cards', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Wedge', 'The wedge is the loop');
    await seedStatement(store, { subject: 'Wedge', text: 'pivot the wedge to federation' });
    const posts: DriftAlertPayload[] = [];
    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('pivot the wedge'),
      post: async (p) => {
        posts.push(p);
      },
    });
    await runDriftSweepOnce(store, runtime);
    await runDriftSweepOnce(store, runtime);
    expect(posts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// AC6 — fail-closed + blast-radius cap
// ---------------------------------------------------------------------------

describe('AC6 — fail-closed config', () => {
  it('is disabled by default', () => {
    const config = loadDriftSweepConfig({});
    expect(config.enabled).toBe(false);
  });

  it('returns a disabled handle (never throws) when enabled but misconfigured', async () => {
    const store = new MemoryStorage();
    const handle = await startDriftSweepWorker(store, {
      env: { ECHO_DRIFT_SWEEP_ENABLED: 'true' }, // no bot token, no identities
    });
    expect(handle.enabled).toBe(false);
    expect(handle.configError).toBeInstanceOf(DriftSweepConfigError);
    expect(handle.configError?.missing).toContain('ECHO_SLACK_BOT_TOKEN');
    expect(handle.configError?.missing).toContain('ECHO_TEAM_COFUNDER_IDENTITIES');
    const result = await handle.run();
    expect(result).toEqual({ status: 'skipped', reason: 'disabled' });
  });

  it('loadDriftSweepConfig throws a structured error when enabled but missing config', () => {
    expect(() => loadDriftSweepConfig({ ECHO_DRIFT_SWEEP_ENABLED: '1' })).toThrow(
      DriftSweepConfigError,
    );
  });
});

describe('AC6 — blast-radius cap', () => {
  it('defers overflow, drains across ticks, and holds the watermark until drained', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    // Five same-subject decisions + five contradicting statements.
    const subjects = ['S1', 'S2', 'S3', 'S4', 'S5'];
    for (const s of subjects) {
      await seedDecision(store, s, `decision for ${s}`);
      await seedStatement(store, {
        subject: s,
        text: `reverse ${s} completely`,
        dedupeKey: `granola:signal:${s}`,
      });
    }
    const posts: DriftAlertPayload[] = [];
    const runtime = makeRuntime(cp, {
      maxAlertsPerTick: 3,
      judge: contradictsJudge('reverse'),
      post: async (p) => {
        posts.push(p);
      },
    });

    const t1 = await runDriftSweepOnce(store, runtime);
    if (t1.status === 'ok') {
      expect(t1.delivered).toBe(3);
      expect(t1.deferred).toBe(2);
    }
    expect(posts).toHaveLength(3);
    const maxSeq = await store.getCurrentSequence();
    // Watermark held behind the two undelivered deferred pairs.
    expect(loadDriftSweepCheckpoint(cp).watermark).toBeLessThanOrEqual(maxSeq);

    const t2 = await runDriftSweepOnce(store, runtime);
    if (t2.status === 'ok') expect(t2.delivered).toBe(2); // drains the overflow
    expect(posts).toHaveLength(5);
    // All delivered → watermark now past the whole window.
    expect(loadDriftSweepCheckpoint(cp).watermark).toBe(maxSeq + 1);

    // No re-posting of already-delivered cards.
    const t3 = await runDriftSweepOnce(store, runtime);
    if (t3.status === 'ok') expect(t3.delivered).toBe(0);
    expect(posts).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// AC4 (item 120) — degraded distinction from tracked fields
// ---------------------------------------------------------------------------

describe('AC4 — drift degraded distinction', () => {
  it('an all-retryable stall reports degraded:true + retryable_failures>0 + frozen watermark', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Database choice', 'Use SQLite for V1');
    await seedStatement(store, { subject: 'Database choice', text: "Let's switch to Postgres" });
    const result = await runDriftSweepOnce(store, makeRuntime(cp, { judge: infraFailJudge }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.degraded).toBe(true);
      expect(result.retryable_failures).toBeGreaterThan(0);
      expect(result.brain_invocations).toBeGreaterThan(0);
    }
    // Watermark held behind the retryable statement (not cleared to maxSeq+1).
    const maxSeq = await store.getCurrentSequence();
    expect(loadDriftSweepCheckpoint(cp).watermark).toBeLessThanOrEqual(maxSeq);
  });

  it('a terminal judged-no-contradiction alongside a retryable failure is NOT degraded', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    await seedDecision(store, 'Database choice', 'Use SQLite for V1');
    await seedDecision(store, 'Pricing tier', 'Charge 25 a month');
    await seedStatement(store, { subject: 'Database choice', text: 'sticking with SQLite' });
    await seedStatement(store, { subject: 'Pricing tier', text: 'raise the price' });
    // No-contradiction for the DB statement (terminal progress), infra failure
    // for the pricing statement (retryable).
    const mixedJudge: DriftJudge = async (input) => {
      if (input.decision.subject === 'Pricing tier') throw new DriftJudgeInfraError('model timeout');
      return { contradicts: false, quote: '', reason: 'consistent' };
    };
    const result = await runDriftSweepOnce(store, makeRuntime(cp, { judge: mixedJudge }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.degraded).toBe(false); // terminal progress was made this tick
      expect(result.retryable_failures).toBe(1);
    }
  });

  it('a quiet tick (empty window) reports degraded:false + status ok', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const result = await runDriftSweepOnce(store, makeRuntime(cp));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.degraded).toBe(false);
      expect(result.retryable_failures).toBe(0);
      expect(result.brain_invocations).toBe(0);
    }
  });
});

// Item 119 — delivery retry: proven Slack rejections retry (bounded), unknown
// outcomes stay at-most-once terminal
// ---------------------------------------------------------------------------

describe('119 — delivery retry split', () => {
  async function seedContradictingPair(
    store: Storage,
    subject: string,
    quote: string,
  ): Promise<{ pairKey: string; maxSeq: number }> {
    await seedDecision(store, subject, `decision for ${subject}`);
    const { dedupeKey } = await seedStatement(store, { subject, text: quote });
    const decisionKey = `team-decision:${normalizeSubject(subject)}`;
    const pairKey = driftPairKey(decisionKey, dedupeKey, DRIFT_JUDGE_VERSION);
    const maxSeq = await store.getCurrentSequence({ sourcePrefixes: [GRANOLA_SIGNAL_SOURCE] });
    return { pairKey, maxSeq };
  }

  it('AC1 — a proven rejection once then success delivers on the retry tick with exactly one card', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const { pairKey, maxSeq } = await seedContradictingPair(store, 'CI', 'drop the CI gate for the demo');

    let attempts = 0;
    let deliveredCards = 0;
    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('drop the CI gate'),
      post: async () => {
        attempts += 1;
        if (attempts === 1) throw new DriftDeliveryRejectedError('HTTP 429');
        deliveredCards += 1;
      },
    });

    // Tick 1: proven rejection → non-terminal delivery-deferred, watermark held.
    const t1 = await runDriftSweepOnce(store, runtime);
    if (t1.status === 'ok') {
      expect(t1.delivered).toBe(0);
      expect(t1.deferred).toBe(1);
      expect(t1.delivery_failed).toBe(0);
    }
    const afterT1 = loadDriftSweepCheckpoint(cp).pairs[pairKey];
    expect(afterT1?.state).toBe('delivery-deferred');
    expect(afterT1?.retry_count).toBe(1);
    expect(afterT1?.pending_alert).toBeDefined(); // payload kept for re-delivery
    expect(loadDriftSweepCheckpoint(cp).watermark).toBeLessThanOrEqual(maxSeq);

    // Tick 2: drain re-attempts, poster now succeeds → delivered, exactly one card.
    const t2 = await runDriftSweepOnce(store, runtime);
    if (t2.status === 'ok') expect(t2.delivered).toBe(1);
    expect(deliveredCards).toBe(1); // no double-post
    expect(loadDriftSweepCheckpoint(cp).pairs[pairKey]?.state).toBe('delivered');
    expect(loadDriftSweepCheckpoint(cp).watermark).toBe(maxSeq + 1);
  });

  it('AC1 — a timeout-after-send (untyped throw) goes terminal delivery-failed with zero retries and never re-posts', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const { pairKey, maxSeq } = await seedContradictingPair(store, 'Storage', 'add an upsert path to storage');

    let attempts = 0;
    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('add an upsert path'),
      post: async () => {
        attempts += 1;
        // Untyped throw: the request may have reached Slack (unknown outcome).
        throw new Error('socket hang up');
      },
    });

    const t1 = await runDriftSweepOnce(store, runtime);
    if (t1.status === 'ok') {
      expect(t1.delivered).toBe(0);
      expect(t1.deferred).toBe(0);
      expect(t1.delivery_failed).toBe(1);
    }
    const pair = loadDriftSweepCheckpoint(cp).pairs[pairKey];
    expect(pair?.state).toBe('delivery-failed'); // terminal at-most-once
    expect(pair?.retry_count ?? 0).toBe(0); // zero retries for unknown outcome
    expect(pair?.failure_reason).toBe('socket hang up');
    expect(pair?.pending_alert).toBeUndefined();
    // Terminal → watermark advances; re-running never posts again.
    expect(loadDriftSweepCheckpoint(cp).watermark).toBe(maxSeq + 1);
    const t2 = await runDriftSweepOnce(store, runtime);
    if (t2.status === 'ok') expect(t2.delivered).toBe(0);
    expect(attempts).toBe(1); // never re-posted
  });

  it('AC2 — a persistent proven rejection terminalizes after exactly DRIFT_DELIVERY_MAX_RETRIES attempts, no more', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const { pairKey, maxSeq } = await seedContradictingPair(store, 'Pricing', 'we agreed to make it free');

    let attempts = 0;
    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('make it free'),
      post: async () => {
        attempts += 1;
        throw new DriftDeliveryRejectedError(`rejected attempt ${attempts}`);
      },
    });

    // One post attempt per tick; run enough ticks to exceed the budget and prove
    // it never attempts a MAX+1-th time.
    for (let i = 0; i < DRIFT_DELIVERY_MAX_RETRIES + 3; i += 1) {
      await runDriftSweepOnce(store, runtime);
    }

    expect(attempts).toBe(DRIFT_DELIVERY_MAX_RETRIES); // exactly MAX visible attempts
    const pair = loadDriftSweepCheckpoint(cp).pairs[pairKey];
    expect(pair?.state).toBe('delivery-failed'); // terminal
    expect(pair?.retry_count).toBe(DRIFT_DELIVERY_MAX_RETRIES);
    expect(pair?.failure_reason).toBe(`rejected attempt ${DRIFT_DELIVERY_MAX_RETRIES}`);
    expect(pair?.pending_alert).toBeUndefined();
    // Terminal → watermark no longer stalls.
    expect(loadDriftSweepCheckpoint(cp).watermark).toBe(maxSeq + 1);
  });

  it('AC2 — a pair deferred purely by the per-tick cap and later delivered ends with retry_count 0/absent', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const subjects = ['C1', 'C2', 'C3', 'C4'];
    const pairKeys: string[] = [];
    for (const s of subjects) {
      await seedDecision(store, s, `decision for ${s}`);
      const { dedupeKey } = await seedStatement(store, {
        subject: s,
        text: `reverse ${s} completely`,
        dedupeKey: `granola:signal:${s}`,
      });
      pairKeys.push(driftPairKey(`team-decision:${normalizeSubject(s)}`, dedupeKey, DRIFT_JUDGE_VERSION));
    }
    const runtime = makeRuntime(cp, {
      maxAlertsPerTick: 3,
      judge: contradictsJudge('reverse'),
      post: async () => {}, // always succeeds
    });

    await runDriftSweepOnce(store, runtime); // 3 delivered, 1 cap-deferred
    const deferred = loadDriftSweepCheckpoint(cp).pairs[pairKeys[3] as string];
    expect(deferred?.state).toBe('delivery-deferred');
    expect(deferred?.retry_count).toBeUndefined(); // cap-overflow never consumes budget

    await runDriftSweepOnce(store, runtime); // drains the overflow
    const delivered = loadDriftSweepCheckpoint(cp).pairs[pairKeys[3] as string];
    expect(delivered?.state).toBe('delivered');
    expect(delivered?.retry_count ?? 0).toBe(0);
  });

  it('AC4 — a pre-119 checkpoint (no retry_count) loads and a proven rejection begins retrying from 0', async () => {
    const store = new MemoryStorage();
    const cp = tempCheckpoint();
    const { pairKey } = await seedContradictingPair(store, 'Roadmap', 'ship federation next sprint');

    // Hand-craft a delivery-deferred pair as an OLD checkpoint would write it:
    // a full payload but NO retry_count field at all.
    const payload: DriftAlertPayload = {
      pair_key: pairKey,
      decision_dedupe_key: `team-decision:${normalizeSubject('Roadmap')}`,
      statement_dedupe_key: pairKey.split('::')[1] as string,
      judge_version: DRIFT_JUDGE_VERSION,
      owner_cofounder_id: 'alice',
      owner_slack_user_id: 'U-ALICE',
      decision_subject: 'Roadmap',
      decision_text: 'decision for Roadmap',
      confirmed_at: '2026-07-01T00:00:00.000Z',
      confirmed_by: 'alice',
      quote: 'ship federation next sprint',
      reason: 'reverses the recorded decision',
      meeting_title: 'Tuesday sync',
      note_id: 'note-1',
    };
    const oldPair = {
      decision_dedupe_key: payload.decision_dedupe_key,
      statement_dedupe_key: payload.statement_dedupe_key,
      judge_version: DRIFT_JUDGE_VERSION,
      state: 'delivery-deferred' as const,
      updated_at: '2026-07-03T00:00:00.000Z',
      pending_alert: payload,
    };
    writeDriftSweepCheckpoint(
      { schema_version: 1, watermark: 1, pairs: { [pairKey]: oldPair } },
      cp,
    );
    // The old file has no retry_count on the pair.
    expect('retry_count' in loadDriftSweepCheckpoint(cp).pairs[pairKey]!).toBe(false);

    const runtime = makeRuntime(cp, {
      judge: contradictsJudge('ship federation next sprint'),
      post: async () => {
        throw new DriftDeliveryRejectedError('HTTP 429');
      },
    });
    const t1 = await runDriftSweepOnce(store, runtime);
    expect(t1.status).toBe('ok'); // old file parsed without error
    const pair = loadDriftSweepCheckpoint(cp).pairs[pairKey];
    expect(pair?.state).toBe('delivery-deferred'); // still retrying, not terminal
    expect(pair?.retry_count).toBe(1); // began from 0
  });
});
