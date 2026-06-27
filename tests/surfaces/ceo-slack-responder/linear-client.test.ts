import { describe, expect, it } from 'vitest';

import {
  LinearGraphqlClient,
  loadLinearConfig,
  resolveLinearProjectId,
} from '../../../src/surfaces/ceo-slack-responder/linear-client.js';

describe('Linear create client', () => {
  it('maps issue fields to the Linear createIssue payload', async () => {
    const requests: unknown[] = [];
    const client = new LinearGraphqlClient('lin-api-key', async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          data: {
            issueCreate: { success: true, issue: { id: 'LIN-1', url: 'https://linear.app/x/1' } },
          },
        }),
        { status: 200 },
      );
    });

    const issue = await client.createIssue({
      title: 'Add amendment alerts',
      body: '## Request\nAdd alerts',
      teamId: 'team-id',
      projectId: 'project-id',
      stateId: 'inbox-state-id',
      assigneeId: 'zhen-id',
    });

    expect(issue).toEqual({ id: 'LIN-1', url: 'https://linear.app/x/1' });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      variables: {
        input: {
          teamId: 'team-id',
          projectId: 'project-id',
          stateId: 'inbox-state-id',
          assigneeId: 'zhen-id',
          title: 'Add amendment alerts',
          description: '## Request\nAdd alerts',
        },
      },
    });
  });

  it('validates required config and resolves project names without Linear reads', () => {
    expect(() => loadLinearConfig({})).toThrow(/LINEAR_API_KEY is required/);
    expect(() =>
      loadLinearConfig({
        LINEAR_API_KEY: 'key',
        LINEAR_TEAM_ID: 'team',
        LINEAR_INBOX_STATE_ID: 'state',
        LINEAR_DEFAULT_ASSIGNEE_ID: 'assignee',
        LINEAR_DEFAULT_PROJECT_ID: 'echo-project',
        LINEAR_PROJECT_MAP: '{bad json',
      }),
    ).toThrow(/LINEAR_PROJECT_MAP must be JSON/);

    const config = loadLinearConfig({
      LINEAR_API_KEY: 'key',
      LINEAR_TEAM_ID: 'team',
      LINEAR_INBOX_STATE_ID: 'state',
      LINEAR_DEFAULT_ASSIGNEE_ID: 'assignee',
      LINEAR_DEFAULT_PROJECT_ID: 'echo-project',
      LINEAR_PROJECT_MAP: JSON.stringify({ Claudia: 'claudia-project' }),
    });

    expect(resolveLinearProjectId('claudia', config)).toBe('claudia-project');
    expect(resolveLinearProjectId('Echo', config)).toBe('echo-project');
    expect(resolveLinearProjectId('Unknown Client', config)).toBeNull();
  });

  it('fails before any network call when create input is unresolved', async () => {
    let calls = 0;
    const client = new LinearGraphqlClient('lin-api-key', async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    });

    await expect(
      client.createIssue({
        title: 'Add amendment alerts',
        body: 'body',
        teamId: 'team-id',
        projectId: '',
        stateId: 'inbox-state-id',
        assigneeId: 'zhen-id',
      }),
    ).rejects.toThrow(/projectId is required/);
    expect(calls).toBe(0);
  });

  it('uses a bounded timeout and does not retry failed creates', async () => {
    let calls = 0;
    const client = new LinearGraphqlClient(
      'lin-api-key',
      (_url, init) => {
        calls += 1;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      },
      1,
    );

    await expect(
      client.createIssue({
        title: 'Add amendment alerts',
        body: 'body',
        teamId: 'team-id',
        projectId: 'project-id',
        stateId: 'inbox-state-id',
        assigneeId: 'zhen-id',
      }),
    ).rejects.toThrow(/timed out/);
    expect(calls).toBe(1);
  });
});
