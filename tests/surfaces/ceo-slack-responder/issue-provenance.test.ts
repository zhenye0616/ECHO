import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { FileIntakeDraftStore, intakeThreadKey } from '../../../src/surfaces/ceo-slack-responder/intake-draft-store.js';
import { renderParentDeliverableIssue } from '../../../src/surfaces/ceo-slack-responder/issue-render.js';
import { renderSeedMessage, type MeetingProvenance } from '../../../src/surfaces/ceo-slack-responder/intake-seed.js';
import type { LinearIssueCreateInput } from '../../../src/surfaces/ceo-slack-responder/linear-client.js';
import {
  extractIntakeSeed,
  respondToIntakeAction,
  respondToIntakeSeed,
  type IntakeAction,
  type ResponderConfig,
} from '../../../src/surfaces/ceo-slack-responder/responder.js';
import type { IntakeFields } from '../../../src/surfaces/ceo-slack-responder/brain.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const PROVENANCE: MeetingProvenance = {
  noteId: 'note-9',
  meetingTitle: 'Acme quarterly',
  meetingDate: '2026-06-30',
  webUrl: 'https://granola.ai/notes/note-9',
  quote: 'They asked for amendment alerts.',
};

const OWNER = 'UOWNER';

function completeFields(): Required<IntakeFields> {
  return {
    clientProject: 'Claudia',
    request: 'Add real-time amendment alerts.',
    why: 'compliance reviewers need change awareness.',
    clientOutcome: 'users see exactly what changed.',
    evidence: 'manual comparison today.',
    doneWhen: 'an alert links to the changed bill text.',
    urgency: 'high',
    clientFacing: 'yes',
  };
}

describe('renderParentDeliverableIssue meeting provenance', () => {
  it('renders the meeting provenance block alongside the Slack thread link', () => {
    const body = renderParentDeliverableIssue({
      fields: completeFields(),
      requester: 'Owner',
      slackThreadUrl: 'https://slack.com/archives/C/p2001',
      projectName: 'claudia',
      projectId: 'claudia-project',
      meetingProvenance: PROVENANCE,
    });
    expect(body).toContain('Slack thread: https://slack.com/archives/C/p2001');
    expect(body).toContain('Meeting: Acme quarterly (2026-06-30)');
    expect(body).toContain('Granola: https://granola.ai/notes/note-9');
    expect(body).toContain('Meeting quote: They asked for amendment alerts.');
  });

  it('omits the meeting block for non-seeded issues', () => {
    const body = renderParentDeliverableIssue({
      fields: completeFields(),
      requester: 'Owner',
      slackThreadUrl: 'https://slack.com/archives/C/p2001',
      projectName: 'claudia',
      projectId: 'claudia-project',
    });
    expect(body).not.toContain('Meeting:');
    expect(body).not.toContain('Granola:');
  });
});

describe('seed → confirm → create carries provenance into the Linear issue body', () => {
  it('includes meeting provenance in the created issue', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'echo-issue-prov-'));
    tempDirs.push(dir);
    const store = new FileIntakeDraftStore(join(dir, 'drafts.json'));

    const cfg = config();
    const seed = extractIntakeSeed(
      {
        type: 'events_api',
        envelope_id: 'env-1',
        payload: {
          event_id: 'event-1',
          team_id: 'T1',
          event: {
            type: 'message',
            bot_id: 'BSELF',
            channel: 'C-INTAKE',
            ts: '200.1',
            text: renderSeedMessage({
              fields: completeFields(),
              provenance: PROVENANCE,
              ownerSlackId: OWNER,
              candidateKey: 'granola:signal:note-9:v1:action:a1',
            }),
          },
        },
      },
      cfg,
    )!;

    await respondToIntakeSeed(seed, cfg, {
      intakeDraftStore: store,
      linearClient: { createIssue: async () => ({ id: 'x', url: 'x' }) },
      postSlackMessage: async () => undefined,
      postIntakeConfirmCard: async () => undefined,
    });

    const key = intakeThreadKey({ teamId: 'T1', channelId: 'C-INTAKE', rootTs: '200.1' });
    const calls: LinearIssueCreateInput[] = [];
    const action: IntakeAction = {
      kind: 'confirm',
      draftKey: key,
      channel: 'C-INTAKE',
      user: OWNER,
      ts: '200.1',
    };

    await respondToIntakeAction(action, cfg, {
      intakeDraftStore: store,
      linearClient: {
        createIssue: async (input) => {
          calls.push(input);
          return { id: 'LIN-9', url: 'https://linear.app/echo/issue/LIN-9' };
        },
      },
      postSlackMessage: async () => undefined,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toContain('Meeting: Acme quarterly (2026-06-30)');
    expect(calls[0]?.body).toContain('Granola: https://granola.ai/notes/note-9');
    expect(calls[0]?.body).toContain('Meeting quote: They asked for amendment alerts.');
    expect(calls[0]?.body).toContain('Slack thread: https://slack.com/archives/C-INTAKE/p2001');
  });
});

function config(): ResponderConfig {
  return {
    slackAppToken: 'xapp',
    slackBotToken: 'xoxb',
    echoMcpUrl: 'http://127.0.0.1:38478/mcp',
    contextRepoPath: '/tmp/repo',
    allowedChannelIds: ['C-INTAKE'],
    eventLogPath: join(tmpdir(), 'echo-prov-events.md'),
    maxMatches: 5,
    brain: 'codex',
    brainTimeoutMs: 1000,
    cofounderIdentities: [{ id: 'owner', slack_user_id: OWNER, display_name: 'Owner' }],
    seedAcceptBotId: 'BSELF',
    seedAcceptChannelId: 'C-INTAKE',
    linearConfig: {
      apiKey: 'lin',
      teamId: 'team-id',
      inboxStateId: 'inbox',
      defaultAssigneeId: 'zhen',
      defaultProjectId: 'echo-project',
      projectMap: { claudia: 'claudia-project' },
    },
  };
}
