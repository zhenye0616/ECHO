import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';

import { SqliteStorage } from '../../storage/sqlite.js';
import {
  answerFromTeamDecisions,
  buildIntakeFollowupQuestions,
  formatBrainFailure,
  intakeReadyFields,
  isLikelyLinearIntake,
  missingIntakeFields,
  parseBrainName,
  preflightBrain,
  runBrain,
  runIntakeBrain,
  type BrainName,
  type BrainResult,
  type BrainRunOptions,
  type IntakeFields,
} from './brain.js';
import { createTeamDecisionStore, type TeamDecisionStore } from './decision-store.js';
import {
  FileDecisionDraftStore,
  type DecisionDraft,
  type DecisionDraftStore,
} from './draft-store.js';
import {
  confirmAttributionForSlackUser,
  parseCofounderIdentities,
  requesterAttributionForSlackUser,
  type CofounderIdentity,
} from './identity.js';
import {
  FileIntakeDraftStore,
  intakeThreadKey,
  type IntakeDraft,
  type IntakeDraftStore,
  type IntakeThreadKeyParts,
} from './intake-draft-store.js';
import {
  formatCreatedIssueReceipt,
  renderIssueTitle,
  renderParentDeliverableIssue,
} from './issue-render.js';
import {
  createLinearClient,
  knownLinearProjectNames,
  loadLinearConfig,
  resolveLinearProjectId,
  shouldLoadLinearConfig,
  type LinearClient,
  type LinearConfig,
} from './linear-client.js';

const DEFAULT_ECHO_MCP_URL = 'http://127.0.0.1:38478/mcp';
const DEFAULT_EVENT_LOG_PATH = 'raw/internal/ceo-loop-events.md';
const DEFAULT_BRAIN_TIMEOUT_MS = 180000;
const ACK_MESSAGE = 'Looking...';
const DEFAULT_LINEAR_INTAKE_DRAFT_STORE = join(
  homedir(),
  '.echo',
  'state',
  'linear-intake-drafts.json',
);

export interface ResponderConfig {
  slackAppToken: string;
  slackBotToken: string;
  echoMcpUrl: string;
  contextRepoPath: string;
  allowedChannelIds: readonly string[];
  eventLogPath: string;
  maxMatches: number;
  brain: BrainName;
  brainTimeoutMs: number;
  teamDecisionStorePath?: string;
  teamDecisionDraftStorePath?: string;
  decisionConfirmTarget?: string;
  cofounderIdentities?: readonly CofounderIdentity[];
  linearConfig?: LinearConfig;
  linearIntakeDraftStorePath?: string;
}

export interface SlackQuestion {
  envelopeId: string;
  eventId?: string;
  teamId?: string;
  channel: string;
  user: string;
  text: string;
  ts?: string;
  threadTs?: string;
}

interface SlackMessageEvent {
  type?: string;
  subtype?: string;
  bot_id?: string;
  team?: string;
  channel?: string;
  channel_type?: string;
  user?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
}

interface SlackEnvelope {
  envelope_id?: string;
  team_id?: string;
  type?: string;
  payload?: {
    event_id?: string;
    team_id?: string;
    event?: SlackMessageEvent;
    type?: string;
    user?: { id?: string };
    channel?: { id?: string };
    message?: { ts?: string; thread_ts?: string };
    actions?: Array<{ action_id?: string; value?: string }>;
  };
}

interface SlackApiResponse {
  ok?: boolean;
  error?: string;
  url?: string;
}

interface SocketLike {
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: unknown) => void,
  ): void;
  send(data: string): void;
}

type SocketConstructor = new (url: string) => SocketLike;
type BrainRunner = (question: string, options: BrainRunOptions) => Promise<BrainResult>;
type SlackPoster = typeof postSlackMessage;
type IntakeConfirmPoster = typeof postIntakeConfirmCard;
type UsageAppender = typeof appendUsageRecord;
type IntakeFailureAppender = typeof appendIntakeFailureRecord;

interface ResponderDependencies {
  runBrain?: BrainRunner;
  postSlackMessage?: SlackPoster;
  appendUsageRecord?: UsageAppender;
  appendIntakeFailureRecord?: IntakeFailureAppender;
  postIntakeConfirmCard?: IntakeConfirmPoster;
  teamDecisionStore?: TeamDecisionStore;
  decisionDraftStore?: DecisionDraftStore;
  intakeDraftStore?: IntakeDraftStore;
  linearClient?: LinearClient;
}

export interface DecisionAction {
  kind: 'confirm' | 'dismiss' | 'edit';
  draftId: string;
  channel: string;
  user: string;
  ts?: string;
  threadTs?: string;
}

export interface IntakeAction {
  kind: 'confirm' | 'dismiss';
  draftKey: string;
  channel: string;
  user: string;
  ts?: string;
  threadTs?: string;
}

export function intakeKeyPartsForQuestion(question: SlackQuestion): IntakeThreadKeyParts {
  return {
    teamId: question.teamId ?? 'unknown-team',
    channelId: question.channel,
    rootTs: question.threadTs ?? question.ts ?? question.envelopeId,
  };
}

function requiredEnv(env: NodeJS.ProcessEnv, primary: string, fallback?: string): string {
  const value = env[primary] ?? (fallback === undefined ? undefined : env[fallback]);
  if (value === undefined || value.trim() === '') {
    throw new Error(
      fallback === undefined ? `${primary} is required` : `${primary} or ${fallback} is required`,
    );
  }
  return value.trim();
}

function parseChannelList(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`expected positive integer, got ${raw}`);
  }
  return n;
}

export function loadResponderConfig(env: NodeJS.ProcessEnv = process.env): ResponderConfig {
  const contextRepoPath = requiredEnv(env, 'ECHO_CEO_CONTEXT_REPO_PATH');
  if (!isAbsolute(contextRepoPath)) {
    throw new Error('ECHO_CEO_CONTEXT_REPO_PATH must be an absolute path');
  }
  const linearConfig = shouldLoadLinearConfig(env) ? loadLinearConfig(env) : undefined;
  return {
    slackAppToken: requiredEnv(env, 'ECHO_SLACK_APP_TOKEN', 'SLACK_APP_TOKEN'),
    slackBotToken: requiredEnv(env, 'ECHO_SLACK_BOT_TOKEN', 'SLACK_BOT_TOKEN'),
    echoMcpUrl: env.ECHO_MCP_URL?.trim() || DEFAULT_ECHO_MCP_URL,
    contextRepoPath,
    allowedChannelIds: parseChannelList(env.ECHO_CEO_SLACK_CHANNEL_IDS),
    eventLogPath: env.ECHO_CEO_EVENT_LOG_PATH?.trim() || DEFAULT_EVENT_LOG_PATH,
    maxMatches: parsePositiveInt(env.ECHO_CEO_MAX_MATCHES, 5),
    brain: parseBrainName(env.ECHO_CEO_BRAIN),
    brainTimeoutMs: parsePositiveInt(env.ECHO_CEO_BRAIN_TIMEOUT_MS, DEFAULT_BRAIN_TIMEOUT_MS),
    ...(env.ECHO_TEAM_DECISION_STORE?.trim()
      ? { teamDecisionStorePath: env.ECHO_TEAM_DECISION_STORE.trim() }
      : {}),
    ...(env.ECHO_TEAM_DECISION_DRAFT_STORE?.trim()
      ? { teamDecisionDraftStorePath: env.ECHO_TEAM_DECISION_DRAFT_STORE.trim() }
      : {}),
    ...(env.ECHO_TEAM_DECISION_CONFIRM_TARGET?.trim()
      ? { decisionConfirmTarget: env.ECHO_TEAM_DECISION_CONFIRM_TARGET.trim() }
      : {}),
    cofounderIdentities: parseCofounderIdentities(env.ECHO_TEAM_COFUNDER_IDENTITIES),
    ...(linearConfig !== undefined ? { linearConfig } : {}),
    ...(env.ECHO_LINEAR_INTAKE_DRAFT_STORE?.trim()
      ? { linearIntakeDraftStorePath: env.ECHO_LINEAR_INTAKE_DRAFT_STORE.trim() }
      : {}),
  };
}

export function createResponderRuntimeDependencies(config: ResponderConfig): ResponderDependencies {
  const deps: ResponderDependencies = {};
  if (config.teamDecisionStorePath !== undefined) {
    deps.teamDecisionStore = createTeamDecisionStore(
      new SqliteStorage(config.teamDecisionStorePath),
    );
  }
  if (config.teamDecisionDraftStorePath !== undefined) {
    deps.decisionDraftStore = new FileDecisionDraftStore(config.teamDecisionDraftStorePath);
  }
  if (config.linearConfig !== undefined) {
    deps.intakeDraftStore = new FileIntakeDraftStore(
      config.linearIntakeDraftStorePath ?? DEFAULT_LINEAR_INTAKE_DRAFT_STORE,
    );
    deps.linearClient = createLinearClient(config.linearConfig);
  }
  return deps;
}

export function extractQuestion(
  envelope: SlackEnvelope,
  allowedChannelIds: readonly string[],
): SlackQuestion | null {
  if (envelope.type !== 'events_api') return null;
  if (envelope.envelope_id === undefined || envelope.envelope_id.trim() === '') return null;

  const event = envelope.payload?.event;
  if (event === undefined) return null;
  if (event.type !== 'message' && event.type !== 'app_mention') return null;
  if (event.subtype !== undefined || event.bot_id !== undefined) return null;
  if (event.channel === undefined || event.user === undefined || event.text === undefined)
    return null;

  const allowed = allowedChannelIds.length === 0 || allowedChannelIds.includes(event.channel);
  const isDirectMessage = event.channel_type === 'im';
  const isMention = event.type === 'app_mention';
  if (!allowed || (!isDirectMessage && !isMention && !allowedChannelIds.includes(event.channel))) {
    return null;
  }

  const text = normalizeSlackQuestionText(event.text);
  if (text === '') return null;
  return {
    envelopeId: envelope.envelope_id,
    eventId: envelope.payload?.event_id ?? envelope.envelope_id,
    teamId: envelope.payload?.team_id ?? event.team ?? envelope.team_id,
    channel: event.channel,
    user: event.user,
    text,
    ts: event.ts,
    threadTs: event.thread_ts,
  };
}

export function normalizeSlackQuestionText(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function answerQuestion(
  question: SlackQuestion,
  config: Pick<ResponderConfig, 'brain' | 'brainTimeoutMs' | 'contextRepoPath' | 'echoMcpUrl'>,
  brainRunner: BrainRunner = runBrain,
): Promise<BrainResult> {
  return brainRunner(question.text, {
    brain: config.brain,
    contextRepoPath: config.contextRepoPath,
    timeoutMs: config.brainTimeoutMs,
    env: { ECHO_MCP_URL: config.echoMcpUrl },
  });
}

export async function respondToQuestion(
  question: SlackQuestion,
  config: ResponderConfig,
  deps: ResponderDependencies = {},
): Promise<void> {
  const postMessage = deps.postSlackMessage ?? postSlackMessage;
  const brainRunner = deps.runBrain ?? runBrain;
  const appendRecord = deps.appendUsageRecord ?? appendUsageRecord;
  const threadTs = question.threadTs ?? question.ts;

  await postMessage(config.slackBotToken, question.channel, ACK_MESSAGE, threadTs);

  if (await respondToLinearIntakeIfNeeded(question, config, deps, postMessage)) {
    return;
  }

  let result: BrainResult;
  try {
    result =
      deps.teamDecisionStore === undefined
        ? await answerQuestion(question, config, brainRunner)
        : await answerFromTeamDecisions(question.text, deps.teamDecisionStore);
  } catch (err) {
    result = {
      ok: false,
      outcome: 'error',
      durationMs: 0,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    await appendRecord(config.eventLogPath, question, config.brain, result);
  } catch (err) {
    result = {
      ok: false,
      outcome: 'error',
      durationMs: result.durationMs,
      reason: `usage log failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const answer = result.ok ? result.answer : formatBrainFailure(result);
  try {
    await postMessage(
      config.slackBotToken,
      question.channel,
      answer ?? formatBrainFailure(result),
      threadTs,
    );
  } catch (err) {
    if (!result.ok) throw err;
    const failure: BrainResult = {
      ok: false,
      outcome: 'error',
      durationMs: result.durationMs,
      reason: `Slack answer post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
    await postMessage(
      config.slackBotToken,
      question.channel,
      formatBrainFailure(failure),
      threadTs,
    );
  }
}

export async function respondToLinearIntakeIfNeeded(
  question: SlackQuestion,
  config: ResponderConfig,
  deps: ResponderDependencies,
  postMessage: SlackPoster = postSlackMessage,
): Promise<boolean> {
  const keyParts = intakeKeyPartsForQuestion(question);
  const key = intakeThreadKey(keyParts);
  const knownProjects =
    config.linearConfig === undefined ? [] : knownLinearProjectNames(config.linearConfig);
  const existingDraft = await deps.intakeDraftStore?.getDraft(key);
  const shouldHandle =
    existingDraft !== undefined && existingDraft !== null
      ? true
      : isLikelyLinearIntake(question.text, knownProjects);
  if (!shouldHandle) return false;

  const threadTs = question.threadTs ?? question.ts;
  if (
    config.linearConfig === undefined ||
    deps.intakeDraftStore === undefined ||
    deps.linearClient === undefined
  ) {
    await postMessage(
      config.slackBotToken,
      question.channel,
      'Linear intake is not configured on this responder. Missing Linear config creates no issue.',
      threadTs,
    );
    return true;
  }

  const brain = runIntakeBrain(question.text, { knownProjectNames: knownProjects });
  const mergedFields = { ...(existingDraft?.fields ?? {}), ...brain.fields };
  const projectId = resolveLinearProjectId(mergedFields.clientProject, config.linearConfig);
  const missing = missingIntakeFields(mergedFields, { knownProjectNames: knownProjects });
  const requester = requesterAttributionForSlackUser(
    config.cofounderIdentities ?? [],
    question.user,
  );
  const { draft, duplicate } = await deps.intakeDraftStore.recordMessage({
    key: keyParts,
    requester: { slack_user_id: question.user, label: requester },
    eventId: question.eventId ?? question.envelopeId,
    fields: mergedFields,
    ...(projectId !== null ? { projectId } : {}),
  });
  if (duplicate) return true;

  if (missing.length > 0 || projectId === null) {
    const questions = buildIntakeFollowupQuestions(
      projectId === null && mergedFields.clientProject !== undefined
        ? ['clientProject', ...missing.filter((field) => field !== 'clientProject')]
        : missing,
      { knownProjectNames: knownProjects },
    );
    await postMessage(
      config.slackBotToken,
      question.channel,
      formatIntakeFollowup(questions),
      threadTs,
    );
    return true;
  }

  const readyFields = intakeReadyFields(draft.fields);
  if (readyFields === null) {
    await postMessage(
      config.slackBotToken,
      question.channel,
      formatIntakeFollowup(
        buildIntakeFollowupQuestions(missing, { knownProjectNames: knownProjects }),
      ),
      threadTs,
    );
    return true;
  }

  const postConfirmCard = deps.postIntakeConfirmCard ?? postIntakeConfirmCard;
  await postConfirmCard(config.slackBotToken, question.channel, draft, readyFields, threadTs);
  return true;
}

export function extractDecisionAction(envelope: SlackEnvelope): DecisionAction | null {
  if (envelope.type !== 'interactive') return null;
  const payload = envelope.payload;
  if (payload === undefined) return null;
  const action = payload?.actions?.[0];
  const actionId = action?.action_id;
  const draftId = action?.value;
  const user = payload?.user?.id;
  const channel = payload?.channel?.id;
  if (
    actionId === undefined ||
    draftId === undefined ||
    user === undefined ||
    channel === undefined ||
    draftId.trim() === ''
  ) {
    return null;
  }
  const kind =
    actionId === 'echo_decision_confirm'
      ? 'confirm'
      : actionId === 'echo_decision_dismiss'
        ? 'dismiss'
        : actionId === 'echo_decision_edit'
          ? 'edit'
          : null;
  if (kind === null) return null;
  const message = payload.message;
  return {
    kind,
    draftId: draftId.trim(),
    channel,
    user,
    ts: message?.ts,
    threadTs: message?.thread_ts,
  };
}

export function extractIntakeAction(envelope: SlackEnvelope): IntakeAction | null {
  if (envelope.type !== 'interactive') return null;
  const payload = envelope.payload;
  if (payload === undefined) return null;
  const action = payload?.actions?.[0];
  const actionId = action?.action_id;
  const draftKey = action?.value;
  const user = payload?.user?.id;
  const channel = payload?.channel?.id;
  if (
    actionId === undefined ||
    draftKey === undefined ||
    user === undefined ||
    channel === undefined ||
    draftKey.trim() === ''
  ) {
    return null;
  }
  const kind =
    actionId === 'echo_intake_confirm'
      ? 'confirm'
      : actionId === 'echo_intake_dismiss'
        ? 'dismiss'
        : null;
  if (kind === null) return null;
  const message = payload.message;
  return {
    kind,
    draftKey: draftKey.trim(),
    channel,
    user,
    ts: message?.ts,
    threadTs: message?.thread_ts,
  };
}

export async function respondToDecisionAction(
  action: DecisionAction,
  config: ResponderConfig,
  deps: ResponderDependencies,
): Promise<void> {
  const postMessage = deps.postSlackMessage ?? postSlackMessage;
  const threadTs = action.threadTs ?? action.ts;
  if (deps.decisionDraftStore === undefined || deps.teamDecisionStore === undefined) {
    await postMessage(
      config.slackBotToken,
      action.channel,
      'Decision sharing is not configured on this responder.',
      threadTs,
    );
    return;
  }

  const actor = confirmAttributionForSlackUser(config.cofounderIdentities ?? [], action.user);
  if (action.kind === 'confirm') {
    const draft = await deps.decisionDraftStore.confirmDraft(action.draftId, actor, (input) =>
      deps.teamDecisionStore!.appendConfirmedDecision(input),
    );
    await postMessage(
      config.slackBotToken,
      action.channel,
      `Confirmed shared decision: ${draft.decision}`,
      threadTs,
    );
    return;
  }
  if (action.kind === 'dismiss') {
    await deps.decisionDraftStore.dismissDraft(action.draftId, actor);
    await postMessage(
      config.slackBotToken,
      action.channel,
      'Dismissed shared decision draft.',
      threadTs,
    );
    return;
  }
  await postMessage(
    config.slackBotToken,
    action.channel,
    'Edit this decision by submitting a revised /echo decision; nothing was shared.',
    threadTs,
  );
}

export async function respondToIntakeAction(
  action: IntakeAction,
  config: ResponderConfig,
  deps: ResponderDependencies,
): Promise<void> {
  const postMessage = deps.postSlackMessage ?? postSlackMessage;
  const threadTs = action.threadTs ?? action.ts;
  if (
    config.linearConfig === undefined ||
    deps.intakeDraftStore === undefined ||
    deps.linearClient === undefined
  ) {
    await postMessage(
      config.slackBotToken,
      action.channel,
      'Linear intake is not configured on this responder.',
      threadTs,
    );
    return;
  }

  const draft = await deps.intakeDraftStore.getDraft(action.draftKey);
  if (draft === null) {
    await postMessage(config.slackBotToken, action.channel, 'Intake draft not found.', threadTs);
    return;
  }
  if (draft.requester.slack_user_id !== action.user) {
    await postMessage(
      config.slackBotToken,
      action.channel,
      'Only the requester can confirm or dismiss this intake draft.',
      threadTs,
    );
    return;
  }

  const actor = requesterAttributionForSlackUser(config.cofounderIdentities ?? [], action.user);
  if (action.kind === 'dismiss') {
    await deps.intakeDraftStore.dismissDraft(action.draftKey, actor);
    await postMessage(config.slackBotToken, action.channel, 'Dismissed intake draft.', threadTs);
    return;
  }

  const result = await deps.intakeDraftStore.runCreateOnce(
    action.draftKey,
    actor,
    async (context) => {
      const projectName = context.fields.clientProject;
      const body = renderParentDeliverableIssue({
        fields: context.fields,
        requester: context.draft.requester.label,
        slackThreadUrl: slackThreadUrl(context.draft.channel_id, context.draft.root_ts),
        projectName,
        projectId: context.projectId,
      });
      return deps.linearClient!.createIssue({
        title: renderIssueTitle(context.fields),
        body,
        teamId: config.linearConfig!.teamId,
        projectId: context.projectId,
        stateId: config.linearConfig!.inboxStateId,
        assigneeId: config.linearConfig!.defaultAssigneeId,
      });
    },
  );

  if (result.outcome === 'created' || result.outcome === 'already_created') {
    const readyFields = intakeReadyFields(result.draft.fields);
    await postMessage(
      config.slackBotToken,
      action.channel,
      readyFields === null
        ? `Created ${result.issue.url} in Linear, status Inbox.`
        : formatCreatedIssueReceipt({
            issueUrl: result.issue.url,
            projectName: readyFields.clientProject,
            fields: readyFields,
          }),
      threadTs,
    );
    return;
  }
  if (result.outcome === 'needs_reconcile') {
    const appendFailure = deps.appendIntakeFailureRecord ?? appendIntakeFailureRecord;
    await appendFailure(config.eventLogPath, result.draft);
    await postMessage(
      config.slackBotToken,
      action.channel,
      `Linear create outcome is uncertain and needs manual reconciliation. No retry was attempted. Evidence: ${
        result.draft.failure?.message ?? 'unknown failure'
      }`,
      threadTs,
    );
    return;
  }
  if (result.outcome === 'dismissed') {
    await postMessage(config.slackBotToken, action.channel, 'Intake draft is dismissed.', threadTs);
    return;
  }
  await postMessage(
    config.slackBotToken,
    action.channel,
    'I cannot create the issue yet because required intake context is still missing.',
    threadTs,
  );
}

export function formatIntakeFollowup(questions: readonly string[]): string {
  if (questions.length === 0) {
    return 'I can create this issue once I have the missing context. Plain language is fine.';
  }
  return [
    'I can create this issue once I have the missing context:',
    '',
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    '',
    'Plain language is fine.',
  ].join('\n');
}

export function slackThreadUrl(channel: string, rootTs: string): string {
  return `https://slack.com/archives/${channel}/p${rootTs.replace('.', '')}`;
}

export function formatUsageRecord(
  question: SlackQuestion,
  brain: BrainName,
  result: BrainResult,
  answeredAt = new Date(),
): string {
  const timestamp = answeredAt.toISOString();
  const parts = [
    timestamp,
    'unprompted?=unknown',
    'satisfied-or-DMed-anyway=unknown',
    `channel=${question.channel}`,
    `thread=${question.threadTs ?? question.ts ?? 'none'}`,
    `user=${question.user}`,
    `brain=${brain}`,
    `outcome=${result.outcome}`,
    `duration_ms=${Math.max(0, Math.round(result.durationMs))}`,
  ];
  if (result.reason !== undefined && result.reason.trim() !== '') {
    parts.push(`reason="${escapeRecordValue(result.reason.slice(0, 200))}"`);
  }
  parts.push(`question="${escapeRecordValue(question.text)}"`);
  return `${parts.join(' · ')}\n`;
}

export async function appendUsageRecord(
  path: string,
  question: SlackQuestion,
  brain: BrainName,
  result: BrainResult,
  answeredAt = new Date(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, formatUsageRecord(question, brain, result, answeredAt), 'utf8');
}

export function formatIntakeFailureRecord(draft: IntakeDraft, recordedAt = new Date()): string {
  return [
    recordedAt.toISOString(),
    'linear-intake-failure',
    `key=${draft.key}`,
    `status=${draft.status}`,
    `phase=${draft.failure?.phase ?? 'unknown'}`,
    `message="${escapeRecordValue(draft.failure?.message ?? 'unknown failure')}"`,
  ].join(' · ');
}

export async function appendIntakeFailureRecord(
  path: string,
  draft: IntakeDraft,
  recordedAt = new Date(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${formatIntakeFailureRecord(draft, recordedAt)}\n`, 'utf8');
}

function escapeRecordValue(text: string): string {
  return text.replace(/\s+/g, ' ').replaceAll('"', '\\"');
}

export async function openSocketModeUrl(appToken: string): Promise<string> {
  const response = await fetch('https://slack.com/api/apps.connections.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const body = (await response.json()) as SlackApiResponse;
  if (!response.ok || body.ok !== true || body.url === undefined) {
    throw new Error(`Slack Socket Mode open failed: ${body.error ?? `HTTP ${response.status}`}`);
  }
  return body.url;
}

export async function postSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  threadTs?: string,
): Promise<void> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      ...(threadTs === undefined ? {} : { thread_ts: threadTs }),
    }),
  });
  const body = (await response.json()) as SlackApiResponse;
  if (!response.ok || body.ok !== true) {
    throw new Error(`Slack postMessage failed: ${body.error ?? `HTTP ${response.status}`}`);
  }
}

export async function postDecisionDraftCard(
  botToken: string,
  channel: string,
  draft: DecisionDraft,
): Promise<void> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text: `Confirm shared decision: ${draft.decision}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Proposed shared decision*\n*${draft.subject}*: ${draft.decision}${
              draft.rationale === undefined ? '' : `\n_Rationale:_ ${draft.rationale}`
            }`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Confirm' },
              style: 'primary',
              action_id: 'echo_decision_confirm',
              value: draft.draft_id,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Edit' },
              action_id: 'echo_decision_edit',
              value: draft.draft_id,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Dismiss' },
              style: 'danger',
              action_id: 'echo_decision_dismiss',
              value: draft.draft_id,
            },
          ],
        },
      ],
    }),
  });
  const body = (await response.json()) as SlackApiResponse;
  if (!response.ok || body.ok !== true) {
    throw new Error(`Slack decision draft post failed: ${body.error ?? `HTTP ${response.status}`}`);
  }
}

export async function postIntakeConfirmCard(
  botToken: string,
  channel: string,
  draft: IntakeDraft,
  fields: Required<IntakeFields>,
  threadTs?: string,
): Promise<void> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text: `Confirm Linear issue: ${fields.request}`,
      ...(threadTs === undefined ? {} : { thread_ts: threadTs }),
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '*Proposed Linear issue*',
              `*Project:* ${fields.clientProject}`,
              `*Request:* ${fields.request}`,
              `*Why:* ${fields.why}`,
              `*Done when:* ${fields.doneWhen}`,
            ].join('\n'),
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Confirm' },
              style: 'primary',
              action_id: 'echo_intake_confirm',
              value: draft.key,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Dismiss' },
              style: 'danger',
              action_id: 'echo_intake_dismiss',
              value: draft.key,
            },
          ],
        },
      ],
    }),
  });
  const body = (await response.json()) as SlackApiResponse;
  if (!response.ok || body.ok !== true) {
    throw new Error(`Slack intake confirm post failed: ${body.error ?? `HTTP ${response.status}`}`);
  }
}

export async function runSlackResponder(config: ResponderConfig): Promise<void> {
  await preflightBrain(config.brain);
  const socketUrl = await openSocketModeUrl(config.slackAppToken);
  const Socket = globalThis.WebSocket as unknown as SocketConstructor | undefined;
  if (Socket === undefined) {
    throw new Error('global WebSocket is unavailable; run with Node >=22');
  }
  const socket = new Socket(socketUrl);
  const deps = createResponderRuntimeDependencies(config);

  socket.addEventListener('message', (event) => {
    void handleSocketMessage(event, socket, config, deps);
  });
}

async function handleSocketMessage(
  event: unknown,
  socket: SocketLike,
  config: ResponderConfig,
  deps: ResponderDependencies,
): Promise<void> {
  const rawData =
    typeof event === 'object' && event !== null && 'data' in event
      ? (event as { data: unknown }).data
      : event;
  const raw =
    typeof rawData === 'string' ? rawData : Buffer.from(rawData as ArrayBuffer).toString('utf8');
  const envelope = JSON.parse(raw) as SlackEnvelope;
  if (envelope.envelope_id !== undefined) {
    socket.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
  }

  const action = extractDecisionAction(envelope);
  if (action !== null) {
    await respondToDecisionAction(action, config, deps);
    return;
  }

  const intakeAction = extractIntakeAction(envelope);
  if (intakeAction !== null) {
    await respondToIntakeAction(intakeAction, config, deps);
    return;
  }

  const question = extractQuestion(envelope, config.allowedChannelIds);
  if (question === null) return;

  await respondToQuestion(question, config, deps);
}
