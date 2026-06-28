import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

import type { IntakeFields } from './brain.js';
import {
  renderIssueTitle,
  renderParentDeliverableIssue,
  type IssueRenderInput,
} from './issue-render.js';

export type IntakeAgentProvider = 'deterministic' | 'claude' | 'codex';

export interface IntakeIssueDraft {
  title: string;
  body: string;
}

export interface IntakeIssueRendererOptions {
  provider: IntakeAgentProvider;
  model?: string;
  maxTurns: number;
}

export interface IntakeIssueRenderContext extends IssueRenderInput {
  knownProjectNames: readonly string[];
}

const DEFAULT_INTAKE_AGENT_MAX_TURNS = 4;
const CLAUDE_INTAKE_SERVER_NAME = 'echo_intake';
const ISSUE_DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1 },
    body: { type: 'string', minLength: 1 },
  },
  required: ['title', 'body'],
} as const;

const IssueDraftOutput = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

export function parseIntakeAgentProvider(raw: string | undefined): IntakeAgentProvider {
  if (raw === undefined || raw.trim() === '') return 'deterministic';
  const value = raw.trim().toLowerCase();
  if (value === 'deterministic' || value === 'none' || value === 'disabled') {
    return 'deterministic';
  }
  if (value === 'claude' || value === 'claude-agent-sdk') return 'claude';
  if (value === 'codex' || value === 'codex-agent-sdk') return 'codex';
  throw new Error(`ECHO_INTAKE_AGENT_PROVIDER must be deterministic, claude, or codex; got ${raw}`);
}

export function parseIntakeAgentMaxTurns(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_INTAKE_AGENT_MAX_TURNS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`ECHO_INTAKE_AGENT_MAX_TURNS must be a positive integer, got ${raw}`);
  }
  return n;
}

export function createIntakeIssueRenderer(
  options: IntakeIssueRendererOptions,
): (input: IntakeIssueRenderContext) => Promise<IntakeIssueDraft> {
  if (options.provider === 'deterministic') return renderDeterministicIssueDraft;
  if (options.provider === 'claude') {
    if (
      process.env.ANTHROPIC_API_KEY === undefined ||
      process.env.ANTHROPIC_API_KEY.trim() === ''
    ) {
      throw new Error('ANTHROPIC_API_KEY is required when ECHO_INTAKE_AGENT_PROVIDER=claude');
    }
    return (input) => renderClaudeIssueDraft(input, options);
  }
  throw new Error('ECHO_INTAKE_AGENT_PROVIDER=codex is reserved until Codex API credentials exist');
}

export async function renderDeterministicIssueDraft(
  input: IntakeIssueRenderContext,
): Promise<IntakeIssueDraft> {
  return {
    title: renderIssueTitle(input.fields),
    body: renderParentDeliverableIssue(input),
  };
}

async function renderClaudeIssueDraft(
  input: IntakeIssueRenderContext,
  options: IntakeIssueRendererOptions,
): Promise<IntakeIssueDraft> {
  const contractServer = createSdkMcpServer({
    name: 'echo-intake',
    version: '1.0.0',
    instructions:
      'Read-only ECHO Slack intake contract tools. These tools describe how to turn a teammate Slack request into a detailed Linear issue draft.',
    alwaysLoad: true,
    tools: [
      tool(
        'get_issue_creation_contract',
        'Return the required minimum fields and required issue body sections for ECHO Slack intake.',
        {},
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify(issueCreationContract(), null, 2),
            },
          ],
        }),
      ),
      tool(
        'list_linear_projects',
        'Return the Linear project names available to this Slack intake flow.',
        {},
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ projects: input.knownProjectNames }, null, 2),
            },
          ],
        }),
      ),
    ],
  });

  let structuredOutput: unknown;
  let fallbackResultText = '';
  for await (const message of query({
    prompt: buildClaudeIssuePrompt(input),
    options: {
      ...(options.model === undefined ? {} : { model: options.model }),
      maxTurns: options.maxTurns,
      maxBudgetUsd: 0.5,
      tools: [],
      mcpServers: { [CLAUDE_INTAKE_SERVER_NAME]: contractServer },
      allowedTools: [
        `mcp__${CLAUDE_INTAKE_SERVER_NAME}__get_issue_creation_contract`,
        `mcp__${CLAUDE_INTAKE_SERVER_NAME}__list_linear_projects`,
      ],
      permissionMode: 'dontAsk',
      outputFormat: { type: 'json_schema', schema: ISSUE_DRAFT_SCHEMA },
      env: {
        ...process.env,
        CLAUDE_AGENT_SDK_CLIENT_APP: 'echo-slack-responder/0.1.0',
      },
    },
  })) {
    if (message.type !== 'result') continue;
    if (message.subtype !== 'success') {
      throw new Error(`Claude intake agent failed: ${message.subtype}`);
    }
    structuredOutput = message.structured_output;
    fallbackResultText = message.result;
  }

  const parsed = IssueDraftOutput.safeParse(
    structuredOutput ?? parseJsonObject(fallbackResultText),
  );
  if (!parsed.success) {
    throw new Error(`Claude intake agent returned invalid issue draft: ${parsed.error.message}`);
  }
  return {
    title: parsed.data.title,
    body: parsed.data.body,
  };
}

function buildClaudeIssuePrompt(input: IntakeIssueRenderContext): string {
  return [
    'You are ECHO, drafting a detailed Linear issue from a teammate Slack intake.',
    '',
    'Use the available MCP tools before drafting:',
    `- mcp__${CLAUDE_INTAKE_SERVER_NAME}__get_issue_creation_contract`,
    `- mcp__${CLAUDE_INTAKE_SERVER_NAME}__list_linear_projects`,
    '',
    'Do not create the issue. Do not modify files. Return only JSON matching the provided schema.',
    'The Slack bot will create the Linear issue after your draft is accepted by the server-owned idempotency path.',
    '',
    'Drafting requirements:',
    '- Preserve every supplied intake fact; do not invent facts.',
    '- Make the description detailed enough that an engineer can triage without reading the Slack thread first.',
    '- Keep the title action-oriented and under 120 characters.',
    '- Use Markdown in body.',
    '- Include clear acceptance/done-when bullets.',
    '- Include requester, Slack thread, project name, Linear project ID, urgency, and client-facing status.',
    '- If a field is thin, state the gap explicitly instead of filling it in.',
    '',
    'Intake payload:',
    JSON.stringify(
      {
        fields: input.fields,
        requester: input.requester,
        slackThreadUrl: input.slackThreadUrl,
        projectName: input.projectName,
        projectId: input.projectId,
        knownProjectNames: input.knownProjectNames,
      },
      null,
      2,
    ),
  ].join('\n');
}

function issueCreationContract(): {
  minimumFields: Array<keyof IntakeFields>;
  requiredBodySections: string[];
  notes: string[];
} {
  return {
    minimumFields: [
      'clientProject',
      'request',
      'why',
      'clientOutcome',
      'evidence',
      'doneWhen',
      'urgency',
      'clientFacing',
    ],
    requiredBodySections: [
      'Request',
      'Why',
      'Client outcome',
      'Scope',
      'Current state / evidence',
      'Done when',
      'Delivery',
      'Dependencies / blockers',
      'Receipts',
    ],
    notes: [
      'This intake creates a parent deliverable issue in Linear Inbox, not an implementation plan.',
      'Implementation branch, files, tests, duplicate search, and decomposition are out of scope for intake.',
      'The server-owned Linear client performs the actual create after the draft is rendered.',
    ],
  };
}

function parseJsonObject(raw: string): unknown {
  if (raw.trim() === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
