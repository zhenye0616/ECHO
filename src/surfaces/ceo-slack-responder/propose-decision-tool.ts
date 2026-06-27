import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import {
  FileDecisionDraftStore,
  type DecisionDraft,
  type DecisionDraftStore,
} from './draft-store.js';
import { postDecisionDraftCard } from './responder.js';

export interface ProposeDecisionInput {
  subject: string;
  decision: string;
  rationale?: string;
  source_app: 'claude-code' | 'codex';
}

export interface ProposeDecisionResult {
  schema_version: 1;
  tool: 'propose_decision';
  status: 'draft_posted';
  draft_id: string;
  confirm_target: string;
}

export interface ProposeDecisionDependencies {
  draftStore: DecisionDraftStore;
  slackBotToken?: string;
  confirmTarget?: string;
  author?: string;
  postDraftCard?: (botToken: string, channel: string, draft: DecisionDraft) => Promise<void>;
}

const proposeDecisionOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('propose_decision'),
  status: z.literal('draft_posted'),
  draft_id: z.string(),
  confirm_target: z.string(),
};

export function registerProposeDecision(server: McpServer): void {
  server.registerTool(
    'propose_decision',
    {
      description:
        'Draft a code-session team decision and post it to the configured Slack confirm target. Nothing is shared until a human confirms the draft.',
      inputSchema: {
        subject: z.string().min(1),
        decision: z.string().min(1),
        rationale: z.string().min(1).optional(),
        source_app: z.enum(['claude-code', 'codex']),
      },
      outputSchema: proposeDecisionOutputSchema,
      annotations: { readOnlyHint: false },
    },
    async (input) => {
      const result = await proposeDecision(input, loadProposeDecisionDependencies(process.env));
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: 'text', text: result.error }],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result.value) }],
        structuredContent: result.value as unknown as Record<string, unknown>,
      };
    },
  );
}

export async function proposeDecision(
  input: ProposeDecisionInput,
  deps: ProposeDecisionDependencies,
): Promise<{ ok: true; value: ProposeDecisionResult } | { ok: false; error: string }> {
  const slackBotToken = deps.slackBotToken?.trim();
  if (slackBotToken === undefined || slackBotToken === '') {
    return { ok: false, error: 'propose_decision: ECHO_SLACK_BOT_TOKEN is required' };
  }
  const confirmTarget = deps.confirmTarget?.trim();
  if (confirmTarget === undefined || !isValidConfirmTarget(confirmTarget)) {
    return {
      ok: false,
      error:
        'propose_decision: ECHO_TEAM_DECISION_CONFIRM_TARGET must be a Slack channel or user id',
    };
  }
  const author = deps.author?.trim();
  if (author === undefined || author === '') {
    return { ok: false, error: 'propose_decision: server-side decision author is unresolved' };
  }

  const draft = await deps.draftStore.createDraft({
    subject: input.subject,
    decision: input.decision,
    ...(input.rationale !== undefined ? { rationale: input.rationale } : {}),
    author,
    source_app: input.source_app,
  });
  await (deps.postDraftCard ?? postDecisionDraftCard)(slackBotToken, confirmTarget, draft);

  return {
    ok: true,
    value: {
      schema_version: 1,
      tool: 'propose_decision',
      status: 'draft_posted',
      draft_id: draft.draft_id,
      confirm_target: confirmTarget,
    },
  };
}

export function loadProposeDecisionDependencies(
  env: NodeJS.ProcessEnv,
): ProposeDecisionDependencies {
  return {
    draftStore: new FileDecisionDraftStore(
      env.ECHO_TEAM_DECISION_DRAFT_STORE?.trim() ||
        join(homedir(), '.echo', 'state', 'team-decision-drafts.json'),
    ),
    slackBotToken: env.ECHO_SLACK_BOT_TOKEN ?? env.SLACK_BOT_TOKEN,
    confirmTarget: env.ECHO_TEAM_DECISION_CONFIRM_TARGET,
    author: resolveDecisionAuthor(env),
  };
}

export function resolveDecisionAuthor(env: NodeJS.ProcessEnv): string {
  return (
    env.ECHO_TEAM_DECISION_AUTHOR?.trim() ||
    env.ECHO_MACHINE_ID?.trim() ||
    env.ECHO_AGENT_ID?.trim() ||
    env.USER?.trim() ||
    'local-machine'
  );
}

function isValidConfirmTarget(target: string): boolean {
  return /^[CDU][A-Z0-9]{2,}$/.test(target);
}
