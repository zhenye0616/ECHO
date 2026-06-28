import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FileIntakeDraftStore,
  intakeThreadKey,
  type IntakeDraft,
} from '../../../src/surfaces/ceo-slack-responder/intake-draft-store.js';
import type { LinearIssueCreateInput } from '../../../src/surfaces/ceo-slack-responder/linear-client.js';
import {
  respondToIntakeAction,
  type IntakeAction,
  type ResponderConfig,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('Slack Linear intake confirm idempotency', () => {
  it('creates exactly one Linear issue for concurrent duplicate confirms', async () => {
    const { store } = await readyDraft();
    const calls: LinearIssueCreateInput[] = [];
    const key = draftKey();

    await Promise.all([
      respondToIntakeAction(confirmAction(key), config(), deps(store, calls)),
      respondToIntakeAction(confirmAction(key), config(), deps(store, calls)),
    ]);

    expect(calls).toHaveLength(1);
    expect(await store.getDraft(key)).toMatchObject({ status: 'created' });
  });

  it('replays a creating draft as needs-reconcile and does not create again', async () => {
    const { store, filePath } = await readyDraft();
    await forceStatus(filePath, draftKey(), 'creating');
    const calls: LinearIssueCreateInput[] = [];

    await respondToIntakeAction(confirmAction(draftKey()), config(), deps(store, calls));

    expect(calls).toHaveLength(0);
    expect(await store.getDraft(draftKey())).toMatchObject({
      status: 'needs-reconcile',
      failure: { phase: 'creating_replay' },
    });
  });

  it('records timeout failures as needs-reconcile without retrying', async () => {
    const { store } = await readyDraft();
    let calls = 0;

    await respondToIntakeAction(confirmAction(draftKey()), config(), {
      intakeDraftStore: store,
      linearClient: {
        createIssue: async () => {
          calls += 1;
          throw new Error('Linear createIssue timed out after 1ms');
        },
      },
      appendIntakeFailureRecord: async () => undefined,
      postSlackMessage: async () => undefined,
    });

    expect(calls).toBe(1);
    expect(await store.getDraft(draftKey())).toMatchObject({
      status: 'needs-reconcile',
      failure: { phase: 'linear_create' },
    });
  });

  it('falls back to deterministic issue rendering when the headless agent fails', async () => {
    const { store } = await readyDraft();
    const calls: LinearIssueCreateInput[] = [];

    await respondToIntakeAction(confirmAction(draftKey()), config(), {
      intakeDraftStore: store,
      linearClient: {
        createIssue: async (input) => {
          calls.push(input);
          return { id: 'LIN-1', url: 'https://linear.app/echo/issue/LIN-1' };
        },
      },
      intakeIssueRenderer: async () => {
        throw new Error('agent auth unavailable');
      },
      appendIntakeFailureRecord: async () => undefined,
      postSlackMessage: async () => undefined,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toContain('Status note: Agent issue renderer failed');
    expect(calls[0]?.body).toContain('agent auth unavailable');
    expect(await store.getDraft(draftKey())).toMatchObject({ status: 'created' });
  });

  it('records Slack receipt failures after Linear create succeeds', async () => {
    const { store } = await readyDraft();
    const records: Array<{
      draftKey: string;
      issueUrl?: string;
      message: string;
      phase: string;
    }> = [];
    const calls: LinearIssueCreateInput[] = [];

    await expect(
      respondToIntakeAction(confirmAction(draftKey()), config(), {
        intakeDraftStore: store,
        linearClient: {
          createIssue: async (input) => {
            calls.push(input);
            return { id: 'LIN-1', url: 'https://linear.app/echo/issue/LIN-1' };
          },
        },
        appendIntakeSlackPostFailureRecord: async (_path, failure) => {
          records.push(failure);
        },
        postSlackMessage: async () => {
          throw new Error('Slack post failed after create');
        },
      }),
    ).rejects.toThrow('Slack post failed after create');

    expect(calls).toHaveLength(1);
    expect(await store.getDraft(draftKey())).toMatchObject({ status: 'created' });
    expect(records).toMatchObject([
      {
        draftKey: draftKey(),
        issueUrl: 'https://linear.app/echo/issue/LIN-1',
        message: 'Slack post failed after create',
        phase: 'created_receipt_post',
      },
    ]);
  });

  it('treats replayed confirms on a dismissed draft as a no-op', async () => {
    const { store } = await readyDraft();
    const calls: LinearIssueCreateInput[] = [];
    await store.dismissDraft(draftKey(), 'Taylor');

    await respondToIntakeAction(confirmAction(draftKey()), config(), deps(store, calls));

    expect(calls).toHaveLength(0);
    expect(await store.getDraft(draftKey())).toMatchObject({ status: 'dismissed' });
  });

  it('does not collide two confirm cards that share the same action_id', async () => {
    const { store } = await readyDraft();
    const key2 = intakeThreadKey({ teamId: 'T1', channelId: 'CENG', rootTs: '200.1' });
    await store.recordMessage({
      key: { teamId: 'T1', channelId: 'CENG', rootTs: '200.1' },
      requester: { slack_user_id: 'UREQ', label: 'Taylor' },
      eventId: 'event-2',
      fields: readyFields('Export receipts.'),
      projectId: 'claudia-project',
    });
    const calls: LinearIssueCreateInput[] = [];

    await respondToIntakeAction(confirmAction(draftKey()), config(), deps(store, calls));
    await respondToIntakeAction(confirmAction(key2), config(), deps(store, calls));

    expect(calls).toHaveLength(2);
    expect(await store.getDraft(draftKey())).toMatchObject({ status: 'created' });
    expect(await store.getDraft(key2)).toMatchObject({ status: 'created' });
  });

  it('preserves every draft when different Slack threads are recorded concurrently', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'echo-linear-intake-'));
    tempDirs.push(dir);
    const store = new FileIntakeDraftStore(join(dir, 'drafts.json'));
    const keys = Array.from({ length: 20 }, (_value, index) =>
      intakeThreadKey({ teamId: 'T1', channelId: 'CENG', rootTs: `300.${index}` }),
    );

    await Promise.all(
      keys.map((_key, index) =>
        store.recordMessage({
          key: { teamId: 'T1', channelId: 'CENG', rootTs: `300.${index}` },
          requester: { slack_user_id: 'UREQ', label: 'Taylor' },
          eventId: `event-${index}`,
          fields: readyFields(`Concurrent request ${index}.`),
          projectId: 'claudia-project',
        }),
      ),
    );

    const missing: string[] = [];
    for (const key of keys) {
      if ((await store.getDraft(key)) === null) missing.push(key);
    }
    expect(missing).toEqual([]);
  });
});

async function readyDraft(): Promise<{
  dir: string;
  filePath: string;
  store: FileIntakeDraftStore;
}> {
  const dir = await mkdtemp(join(tmpdir(), 'echo-linear-intake-'));
  tempDirs.push(dir);
  const filePath = join(dir, 'drafts.json');
  const store = new FileIntakeDraftStore(filePath);
  await store.recordMessage({
    key: { teamId: 'T1', channelId: 'CENG', rootTs: '100.1' },
    requester: { slack_user_id: 'UREQ', label: 'Taylor' },
    eventId: 'event-1',
    fields: readyFields('Add real-time amendment alerts.'),
    projectId: 'claudia-project',
  });
  return { dir, filePath, store };
}

function deps(store: FileIntakeDraftStore, calls: LinearIssueCreateInput[]) {
  return {
    intakeDraftStore: store,
    linearClient: {
      createIssue: async (input: LinearIssueCreateInput) => {
        calls.push(input);
        return {
          id: `LIN-${calls.length}`,
          url: `https://linear.app/echo/issue/LIN-${calls.length}`,
        };
      },
    },
    appendIntakeFailureRecord: async () => undefined,
    postSlackMessage: async () => undefined,
  };
}

function config(): ResponderConfig {
  return {
    slackAppToken: 'xapp-token',
    slackBotToken: 'xoxb-token',
    echoMcpUrl: 'http://127.0.0.1:38478/mcp',
    contextRepoPath: '/Users/zhenye/justinian.ai',
    allowedChannelIds: [],
    eventLogPath: 'raw/internal/ceo-loop-events.md',
    maxMatches: 5,
    brain: 'codex',
    brainTimeoutMs: 180000,
    cofounderIdentities: [{ id: 'taylor', slack_user_id: 'UREQ', display_name: 'Taylor' }],
    linearConfig: {
      apiKey: 'lin-key',
      teamId: 'team-id',
      inboxStateId: 'inbox-state-id',
      defaultAssigneeId: 'zhen-id',
      defaultProjectId: 'echo-project',
      projectMap: { claudia: 'claudia-project' },
    },
  };
}

function draftKey(): string {
  return intakeThreadKey({ teamId: 'T1', channelId: 'CENG', rootTs: '100.1' });
}

function confirmAction(draftKey: string): IntakeAction {
  return {
    kind: 'confirm',
    draftKey,
    channel: 'CENG',
    user: 'UREQ',
    ts: '100.1',
  };
}

function readyFields(request: string) {
  return {
    clientProject: 'claudia',
    request,
    why: 'compliance reviewers need to know when a bill changes.',
    clientOutcome: 'users can see exactly what changed in the bill text.',
    evidence: 'California bill amendments currently require manual comparison.',
    doneWhen: 'an alert links to the changed bill text.',
    urgency: 'high',
    clientFacing: 'yes',
  };
}

async function forceStatus(
  filePath: string,
  key: string,
  status: IntakeDraft['status'],
): Promise<void> {
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as {
    drafts: Record<string, IntakeDraft>;
  };
  const draft = parsed.drafts[key];
  if (draft === undefined) throw new Error(`missing draft ${key}`);
  draft.status = status;
  await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
}
