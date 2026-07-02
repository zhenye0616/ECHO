import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';

import { createLogger } from '../../logging/index.js';
import { SqliteStorage } from '../../storage/sqlite.js';
import {
  answerFromTeamDecisions,
  buildIntakeFollowupQuestions,
  formatBrainFailure,
  intakeFollowupFieldsToAsk,
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
  type IntakeFieldKey,
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
import { parseSeedMarker, type MeetingProvenance } from './intake-seed.js';
import {
  createIntakeIssueRenderer,
  parseIntakeAgentMaxTurns,
  parseIntakeAgentProvider,
  renderDeterministicIssueDraft,
  type IntakeAgentProvider,
  type IntakeIssueDraft,
  type IntakeIssueRenderContext,
} from './intake-agent.js';
import { formatCreatedIssueReceipt } from './issue-render.js';
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
const SOCKET_DRAIN_TIMEOUT_MS = 30000;
const SOCKET_EXIT_DELAY_MS = 25;
const ACK_MESSAGE = 'Looking...';
const log = createLogger('ceo-slack-responder');
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
  intakeOnly?: boolean;
  intakeAgentProvider?: IntakeAgentProvider;
  intakeAgentModel?: string;
  intakeAgentMaxTurns?: number;
  teamDecisionStorePath?: string;
  teamDecisionDraftStorePath?: string;
  decisionConfirmTarget?: string;
  cofounderIdentities?: readonly CofounderIdentity[];
  linearConfig?: LinearConfig;
  linearIntakeDraftStorePath?: string;
  // Item 109 seed carve-out. The responder accepts a bot-authored message as an
  // intake seed only when BOTH are set (and Linear intake is configured): the
  // author bot id equals seedAcceptBotId AND the channel equals
  // seedAcceptChannelId. Same-channel/same-bot equality with the daemon is a
  // deploy invariant, not machine-checked here.
  seedAcceptBotId?: string;
  seedAcceptChannelId?: string;
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
type IntakeSlackPostFailureAppender = typeof appendIntakeSlackPostFailureRecord;
type IntakeSeedDismissalAppender = typeof appendIntakeSeedDismissalRecord;
type IntakeIssueRenderer = (input: IntakeIssueRenderContext) => Promise<IntakeIssueDraft>;

interface IntakeSlackPostFailureRecord {
  phase: string;
  draftKey: string;
  channel: string;
  message: string;
  threadTs?: string;
  issueUrl?: string;
}

interface ResponderDependencies {
  runBrain?: BrainRunner;
  postSlackMessage?: SlackPoster;
  appendUsageRecord?: UsageAppender;
  appendIntakeFailureRecord?: IntakeFailureAppender;
  appendIntakeSlackPostFailureRecord?: IntakeSlackPostFailureAppender;
  appendIntakeSeedDismissalRecord?: IntakeSeedDismissalAppender;
  postIntakeConfirmCard?: IntakeConfirmPoster;
  intakeIssueRenderer?: IntakeIssueRenderer;
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

export interface IntakeSeed {
  envelopeId: string;
  eventId: string;
  teamId: string;
  channel: string;
  ts: string;
  candidateKey: string;
  ownerSlackId: string;
  fields: IntakeFields;
  meetingProvenance?: MeetingProvenance;
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

function parseBooleanFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === '') return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function loadResponderConfig(env: NodeJS.ProcessEnv = process.env): ResponderConfig {
  const contextRepoPath = requiredEnv(env, 'ECHO_CEO_CONTEXT_REPO_PATH');
  if (!isAbsolute(contextRepoPath)) {
    throw new Error('ECHO_CEO_CONTEXT_REPO_PATH must be an absolute path');
  }
  const linearConfig = shouldLoadLinearConfig(env) ? loadLinearConfig(env) : undefined;
  const allowedChannelIds = parseChannelList(env.ECHO_CEO_SLACK_CHANNEL_IDS);
  const intakeOnly = parseBooleanFlag(env.ECHO_SLACK_RESPONDER_INTAKE_ONLY);
  if (intakeOnly && allowedChannelIds.length === 0) {
    throw new Error(
      'ECHO_CEO_SLACK_CHANNEL_IDS is required when ECHO_SLACK_RESPONDER_INTAKE_ONLY=true so plain Slack thread replies are accepted',
    );
  }
  return {
    slackAppToken: requiredEnv(env, 'ECHO_SLACK_APP_TOKEN', 'SLACK_APP_TOKEN'),
    slackBotToken: requiredEnv(env, 'ECHO_SLACK_BOT_TOKEN', 'SLACK_BOT_TOKEN'),
    echoMcpUrl: env.ECHO_MCP_URL?.trim() || DEFAULT_ECHO_MCP_URL,
    contextRepoPath,
    allowedChannelIds,
    eventLogPath: env.ECHO_CEO_EVENT_LOG_PATH?.trim() || DEFAULT_EVENT_LOG_PATH,
    maxMatches: parsePositiveInt(env.ECHO_CEO_MAX_MATCHES, 5),
    brain: parseBrainName(env.ECHO_CEO_BRAIN),
    brainTimeoutMs: parsePositiveInt(env.ECHO_CEO_BRAIN_TIMEOUT_MS, DEFAULT_BRAIN_TIMEOUT_MS),
    intakeOnly,
    intakeAgentProvider: parseIntakeAgentProvider(env.ECHO_INTAKE_AGENT_PROVIDER),
    intakeAgentMaxTurns: parseIntakeAgentMaxTurns(env.ECHO_INTAKE_AGENT_MAX_TURNS),
    ...(env.ECHO_INTAKE_AGENT_MODEL?.trim()
      ? { intakeAgentModel: env.ECHO_INTAKE_AGENT_MODEL.trim() }
      : {}),
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
    ...(env.ECHO_INTAKE_SEED_BOT_ID?.trim()
      ? { seedAcceptBotId: env.ECHO_INTAKE_SEED_BOT_ID.trim() }
      : {}),
    ...(env.ECHO_INTAKE_SEED_CHANNEL_ID?.trim()
      ? { seedAcceptChannelId: env.ECHO_INTAKE_SEED_CHANNEL_ID.trim() }
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
    deps.intakeIssueRenderer = createIntakeIssueRenderer({
      provider: config.intakeAgentProvider ?? 'deterministic',
      ...(config.intakeAgentModel === undefined ? {} : { model: config.intakeAgentModel }),
      maxTurns: config.intakeAgentMaxTurns ?? 4,
    });
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

  if (config.intakeOnly) {
    await postMessage(
      config.slackBotToken,
      question.channel,
      [
        'I can help turn a request into a Linear issue from this channel.',
        '',
        'Send the client/project, request, why it matters, desired outcome, evidence/example, done-when, urgency, and whether it is client-facing. Plain language is fine.',
      ].join('\n'),
      threadTs,
    );
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

  const expectedFollowupFields =
    existingDraft === undefined || existingDraft === null
      ? undefined
      : (existingDraft.asked_fields ??
        intakeFollowupFieldsToAsk(
          nextIntakeFollowupFields(existingDraft.fields, config.linearConfig, knownProjects),
        ));
  const brain = runIntakeBrain(question.text, {
    knownProjectNames: knownProjects,
    ...(expectedFollowupFields === undefined
      ? {}
      : { expectedFollowupFields, inferRequest: false }),
  });
  const mergedFields = { ...(existingDraft?.fields ?? {}), ...brain.fields };
  const projectId = resolveLinearProjectId(mergedFields.clientProject, config.linearConfig);
  const missing = nextIntakeFollowupFields(mergedFields, config.linearConfig, knownProjects);
  log.debug('linear_intake_message_parsed', {
    draft_key: key,
    existing_draft: existingDraft !== undefined && existingDraft !== null,
    parsed_fields: Object.keys(brain.fields),
    missing_fields: missing,
    project_resolved: projectId !== null,
  });
  const requester = requesterAttributionForSlackUser(
    config.cofounderIdentities ?? [],
    question.user,
  );
  const { draft, duplicate } = await deps.intakeDraftStore.recordMessage({
    key: keyParts,
    requester: { slack_user_id: question.user, label: requester },
    eventId: question.eventId ?? question.envelopeId,
    fields: mergedFields,
    askedFields: intakeFollowupFieldsToAsk(missing),
    ...(projectId !== null ? { projectId } : {}),
  });
  if (duplicate) return true;

  await driveIntakeDraftReply(draft, config, deps, postMessage, question.channel, threadTs);
  return true;
}

/**
 * Post the next follow-up questions or the confirm card for an intake draft.
 * Shared by the human-typed intake path (respondToLinearIntakeIfNeeded) and the
 * Granola seed path (respondToIntakeSeed), so both surfaces resolve missing
 * fields / project the same way and only ever create through a human confirm.
 */
async function driveIntakeDraftReply(
  draft: IntakeDraft,
  config: ResponderConfig,
  deps: ResponderDependencies,
  postMessage: SlackPoster,
  channel: string,
  threadTs: string | undefined,
): Promise<void> {
  if (config.linearConfig === undefined) return;
  const knownProjects = knownLinearProjectNames(config.linearConfig);
  const missing = nextIntakeFollowupFields(draft.fields, config.linearConfig, knownProjects);
  const projectId = resolveLinearProjectId(draft.fields.clientProject, config.linearConfig);

  if (missing.length > 0 || projectId === null) {
    const questions = buildIntakeFollowupQuestions(missing, { knownProjectNames: knownProjects });
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel,
      text: formatIntakeFollowup(questions),
      threadTs,
      failure: {
        phase: projectId === null ? 'project_followup_post' : 'field_followup_post',
        draftKey: draft.key,
      },
    });
    return;
  }

  const readyFields = intakeReadyFields(draft.fields);
  if (readyFields === null) {
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel,
      text: formatIntakeFollowup(
        buildIntakeFollowupQuestions(missing, { knownProjectNames: knownProjects }),
      ),
      threadTs,
      failure: { phase: 'not_ready_followup_post', draftKey: draft.key },
    });
    return;
  }

  const postConfirmCard = deps.postIntakeConfirmCard ?? postIntakeConfirmCard;
  await postIntakeConfirmCardOrRecordFailure(config, deps, postConfirmCard, {
    channel,
    draft,
    fields: readyFields,
    threadTs,
    failure: { phase: 'confirm_card_post', draftKey: draft.key },
  });
}

function nextIntakeFollowupFields(
  fields: IntakeFields,
  linearConfig: LinearConfig,
  knownProjectNames: readonly string[],
): IntakeFieldKey[] {
  const missing = missingIntakeFields(fields, { knownProjectNames });
  const projectId = resolveLinearProjectId(fields.clientProject, linearConfig);
  return projectId === null && fields.clientProject !== undefined
    ? ['clientProject', ...missing.filter((field) => field !== 'clientProject')]
    : missing;
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

/**
 * Item 109 seed carve-out. Accept a bot-authored message as an intake seed ONLY
 * when ALL validate: (1) the author bot id equals the responder's configured
 * seedAcceptBotId, (2) the channel equals the configured seedAcceptChannelId,
 * (3) the marker parses with a supported version, (4) the marker carries a
 * well-formed candidate key. Every negative case returns null and falls through
 * to the normal (bot messages ignored) path: human-typed marker text (no
 * bot_id), non-self bots, malformed/unsupported markers, and the responder's own
 * follow-ups/confirm cards (which never carry a marker).
 */
export function extractIntakeSeed(
  envelope: SlackEnvelope,
  config: Pick<ResponderConfig, 'seedAcceptBotId' | 'seedAcceptChannelId'>,
): IntakeSeed | null {
  if (config.seedAcceptBotId === undefined || config.seedAcceptChannelId === undefined) return null;
  if (envelope.type !== 'events_api') return null;
  if (envelope.envelope_id === undefined || envelope.envelope_id.trim() === '') return null;
  const event = envelope.payload?.event;
  if (event === undefined) return null;
  if (event.type !== 'message') return null;
  if (event.bot_id === undefined || event.bot_id !== config.seedAcceptBotId) return null;
  if (event.channel === undefined || event.channel !== config.seedAcceptChannelId) return null;
  if (event.text === undefined || event.ts === undefined) return null;

  const marker = parseSeedMarker(event.text);
  if (marker === null) return null;

  const ownerSlackId = marker.ownerSlackId ?? firstSlackMention(event.text);
  if (ownerSlackId === undefined) return null;

  return {
    envelopeId: envelope.envelope_id,
    eventId: envelope.payload?.event_id ?? envelope.envelope_id,
    teamId: envelope.payload?.team_id ?? event.team ?? envelope.team_id ?? 'unknown-team',
    channel: event.channel,
    ts: event.ts,
    candidateKey: marker.candidateKey,
    ownerSlackId,
    fields: marker.fields ?? {},
    ...(marker.provenance === undefined ? {} : { meetingProvenance: marker.provenance }),
  };
}

function firstSlackMention(text: string): string | undefined {
  const match = /<@([A-Z0-9]+)>/.exec(text);
  return match?.[1];
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

/**
 * Item 109 seed handling. Durable-write-before-ack on the seed path: the draft
 * (candidate-key dedupe + the event-id handled marking, which live in the same
 * durable record) is written BEFORE the Slack envelope is acked, so a crash
 * after ack cannot silently lose the seed. A duplicate candidate key or a
 * replayed event id is a no-op (no second draft, no duplicate reply).
 */
export async function respondToIntakeSeed(
  seed: IntakeSeed,
  config: ResponderConfig,
  deps: ResponderDependencies,
  ackEnvelope: () => void = () => undefined,
): Promise<void> {
  const postMessage = deps.postSlackMessage ?? postSlackMessage;
  if (config.linearConfig === undefined || deps.intakeDraftStore === undefined) {
    ackEnvelope();
    log.debug('intake_seed_unconfigured', {
      channel: seed.channel,
      candidate_key: seed.candidateKey,
    });
    return;
  }

  const knownProjects = knownLinearProjectNames(config.linearConfig);
  const projectId = resolveLinearProjectId(seed.fields.clientProject, config.linearConfig);
  const missing = nextIntakeFollowupFields(seed.fields, config.linearConfig, knownProjects);
  const requesterLabel = requesterAttributionForSlackUser(
    config.cofounderIdentities ?? [],
    seed.ownerSlackId,
  );

  const { draft, outcome } = await deps.intakeDraftStore.recordSeed({
    candidateKey: seed.candidateKey,
    key: { teamId: seed.teamId, channelId: seed.channel, rootTs: seed.ts },
    requester: { slack_user_id: seed.ownerSlackId, label: requesterLabel },
    eventId: seed.eventId,
    fields: seed.fields,
    askedFields: intakeFollowupFieldsToAsk(missing),
    ...(projectId !== null ? { projectId } : {}),
    ...(seed.meetingProvenance === undefined
      ? {}
      : { meetingProvenance: seed.meetingProvenance }),
  });

  // Durable write complete — ack only now (write-before-ack on the seed path).
  ackEnvelope();

  if (outcome !== 'created') {
    log.debug('intake_seed_duplicate', { candidate_key: seed.candidateKey, outcome });
    return;
  }

  await driveIntakeDraftReply(draft, config, deps, postMessage, seed.channel, seed.ts);
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
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel: action.channel,
      text: 'Intake draft not found.',
      threadTs,
      failure: { phase: 'draft_not_found_post', draftKey: action.draftKey },
    });
    return;
  }
  if (draft.requester.slack_user_id !== action.user) {
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel: action.channel,
      text: 'Only the requester can confirm or dismiss this intake draft.',
      threadTs,
      failure: { phase: 'requester_mismatch_post', draftKey: action.draftKey },
    });
    return;
  }

  const actor = requesterAttributionForSlackUser(config.cofounderIdentities ?? [], action.user);
  if (action.kind === 'dismiss') {
    const dismissed = await deps.intakeDraftStore.dismissDraft(action.draftKey, actor);
    // A dismissed Granola-seeded draft is durably recorded WITH its originating
    // candidate key (not only the draft key) as a noise-tuning signal (AC6).
    if (dismissed.candidate_key !== undefined) {
      const appendDismissal =
        deps.appendIntakeSeedDismissalRecord ?? appendIntakeSeedDismissalRecord;
      await appendDismissal(config.eventLogPath, dismissed);
      log.info('granola_intake_seed_dismissed', {
        draft_key: dismissed.key,
        candidate_key: dismissed.candidate_key,
      });
    }
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel: action.channel,
      text: 'Dismissed intake draft.',
      threadTs,
      failure: { phase: 'dismissed_post', draftKey: action.draftKey },
    });
    return;
  }

  const result = await deps.intakeDraftStore.runCreateOnce(
    action.draftKey,
    actor,
    async (context) => {
      const projectName = context.fields.clientProject;
      const issueDraft = await renderIssueDraftWithFallback(deps.intakeIssueRenderer, {
        fields: context.fields,
        requester: context.draft.requester.label,
        slackThreadUrl: slackThreadUrl(context.draft.channel_id, context.draft.root_ts),
        projectName,
        projectId: context.projectId,
        knownProjectNames: knownLinearProjectNames(config.linearConfig!),
        ...(context.draft.meeting_provenance === undefined
          ? {}
          : { meetingProvenance: context.draft.meeting_provenance }),
      });
      return deps.linearClient!.createIssue({
        title: issueDraft.title,
        body: issueDraft.body,
        teamId: config.linearConfig!.teamId,
        projectId: context.projectId,
        stateId: config.linearConfig!.inboxStateId,
        assigneeId: config.linearConfig!.defaultAssigneeId,
      });
    },
  );

  if (result.outcome === 'created' || result.outcome === 'already_created') {
    const readyFields = intakeReadyFields(result.draft.fields);
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel: action.channel,
      text:
        readyFields === null
          ? `Created ${result.issue.url} in Linear, status Inbox.`
          : formatCreatedIssueReceipt({
              issueUrl: result.issue.url,
              projectName: readyFields.clientProject,
              fields: readyFields,
            }),
      threadTs,
      failure: {
        phase: `${result.outcome}_receipt_post`,
        draftKey: result.draft.key,
        issueUrl: result.issue.url,
      },
    });
    return;
  }
  if (result.outcome === 'needs_reconcile') {
    const appendFailure = deps.appendIntakeFailureRecord ?? appendIntakeFailureRecord;
    await appendFailure(config.eventLogPath, result.draft);
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel: action.channel,
      text: `Linear create outcome is uncertain and needs manual reconciliation. No retry was attempted. Evidence: ${
        result.draft.failure?.message ?? 'unknown failure'
      }`,
      threadTs,
      failure: { phase: 'needs_reconcile_post', draftKey: result.draft.key },
    });
    return;
  }
  if (result.outcome === 'dismissed') {
    await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
      channel: action.channel,
      text: 'Intake draft is dismissed.',
      threadTs,
      failure: { phase: 'already_dismissed_post', draftKey: result.draft.key },
    });
    return;
  }
  await postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, {
    channel: action.channel,
    text: 'I cannot create the issue yet because required intake context is still missing.',
    threadTs,
    failure: { phase: 'not_ready_post', draftKey: result.draft.key },
  });
}

async function renderIssueDraftWithFallback(
  renderer: IntakeIssueRenderer | undefined,
  input: IntakeIssueRenderContext,
): Promise<IntakeIssueDraft> {
  const selectedRenderer = renderer ?? renderDeterministicIssueDraft;
  try {
    return await selectedRenderer(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderDeterministicIssueDraft({
      ...input,
      statusNote: `Agent issue renderer failed; deterministic fallback used. ${message.slice(
        0,
        160,
      )}`,
    });
  }
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

export function formatIntakeSlackPostFailureRecord(
  failure: IntakeSlackPostFailureRecord,
  recordedAt = new Date(),
): string {
  const parts = [
    recordedAt.toISOString(),
    'linear-intake-slack-post-failure',
    `key=${failure.draftKey}`,
    `phase=${failure.phase}`,
    `channel=${failure.channel}`,
  ];
  if (failure.threadTs !== undefined) parts.push(`thread=${failure.threadTs}`);
  if (failure.issueUrl !== undefined) {
    parts.push(`issue_url="${escapeRecordValue(failure.issueUrl)}"`);
  }
  parts.push(`message="${escapeRecordValue(failure.message)}"`);
  return parts.join(' · ');
}

export async function appendIntakeSlackPostFailureRecord(
  path: string,
  failure: IntakeSlackPostFailureRecord,
  recordedAt = new Date(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${formatIntakeSlackPostFailureRecord(failure, recordedAt)}\n`, 'utf8');
}

export function formatIntakeSeedDismissalRecord(
  draft: IntakeDraft,
  recordedAt = new Date(),
): string {
  return [
    recordedAt.toISOString(),
    'granola-intake-seed-dismissed',
    `key=${draft.key}`,
    `candidate_key=${draft.candidate_key ?? 'unknown'}`,
    `dismissed_by=${draft.dismissed_by ?? 'unknown'}`,
  ].join(' · ');
}

export async function appendIntakeSeedDismissalRecord(
  path: string,
  draft: IntakeDraft,
  recordedAt = new Date(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${formatIntakeSeedDismissalRecord(draft, recordedAt)}\n`, 'utf8');
}

async function postIntakeSlackMessageOrRecordFailure(
  config: ResponderConfig,
  deps: ResponderDependencies,
  postMessage: SlackPoster,
  input: {
    channel: string;
    text: string;
    threadTs?: string;
    failure: Omit<IntakeSlackPostFailureRecord, 'channel' | 'message' | 'threadTs'>;
  },
): Promise<void> {
  try {
    await postMessage(config.slackBotToken, input.channel, input.text, input.threadTs);
  } catch (err) {
    const appendFailure =
      deps.appendIntakeSlackPostFailureRecord ?? appendIntakeSlackPostFailureRecord;
    await appendFailure(config.eventLogPath, {
      ...input.failure,
      channel: input.channel,
      ...(input.threadTs === undefined ? {} : { threadTs: input.threadTs }),
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function postIntakeConfirmCardOrRecordFailure(
  config: ResponderConfig,
  deps: ResponderDependencies,
  postConfirmCard: IntakeConfirmPoster,
  input: {
    channel: string;
    draft: IntakeDraft;
    fields: Required<IntakeFields>;
    threadTs?: string;
    failure: Omit<IntakeSlackPostFailureRecord, 'channel' | 'message' | 'threadTs'>;
  },
): Promise<void> {
  try {
    await postConfirmCard(
      config.slackBotToken,
      input.channel,
      input.draft,
      input.fields,
      input.threadTs,
    );
  } catch (err) {
    const appendFailure =
      deps.appendIntakeSlackPostFailureRecord ?? appendIntakeSlackPostFailureRecord;
    await appendFailure(config.eventLogPath, {
      ...input.failure,
      channel: input.channel,
      ...(input.threadTs === undefined ? {} : { threadTs: input.threadTs }),
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
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
  if (!config.intakeOnly) {
    await preflightBrain(config.brain);
  }
  log.info('slack_responder_starting', {
    intake_only: config.intakeOnly === true,
    brain: config.brain,
    linear_enabled: config.linearConfig !== undefined,
    allowed_channel_count: config.allowedChannelIds.length,
    event_log_path: config.eventLogPath,
  });
  const socketUrl = await openSocketModeUrl(config.slackAppToken);
  const Socket = globalThis.WebSocket as unknown as SocketConstructor | undefined;
  if (Socket === undefined) {
    throw new Error('global WebSocket is unavailable; run with Node >=22');
  }
  const socket = new Socket(socketUrl);
  const deps = createResponderRuntimeDependencies(config);

  const inFlight = new Set<Promise<void>>();
  let shuttingDown = false;

  socket.addEventListener('open', () => {
    log.info('slack_socket_open');
  });
  socket.addEventListener('message', (event) => {
    if (shuttingDown) return;
    const pending = handleSocketMessage(event, socket, config, deps).catch((err: unknown) => {
      log.error('slack_socket_message_failed', errorPayload(err));
    });
    inFlight.add(pending);
    void pending.finally(() => {
      inFlight.delete(pending);
    });
  });
  const onDisconnect = (kind: 'close' | 'error', event: unknown): void => {
    log.error('slack_socket_disconnected', {
      kind,
      ...socketEventPayload(event),
    });
    process.exitCode = 1;
    if (shuttingDown) return;
    shuttingDown = true;
    void exitAfterSocketDisconnect(inFlight);
  };
  socket.addEventListener('close', (event) => {
    onDisconnect('close', event);
  });
  socket.addEventListener('error', (event) => {
    onDisconnect('error', event);
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
  log.debug('slack_envelope_received', envelopeLogPayload(envelope));
  const ackEnvelope = (): void => {
    if (envelope.envelope_id !== undefined) {
      socket.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
    }
  };

  // Seed path is write-before-ack (respondToIntakeSeed acks after the durable
  // draft write); every other path acks immediately here.
  const seed = extractIntakeSeed(envelope, config);
  if (seed !== null) {
    log.debug('slack_intake_seed_received', {
      channel: seed.channel,
      candidate_key: seed.candidateKey,
      thread_ts: seed.ts,
    });
    await respondToIntakeSeed(seed, config, deps, ackEnvelope);
    return;
  }

  ackEnvelope();

  const action = extractDecisionAction(envelope);
  if (action !== null) {
    log.debug('slack_decision_action_received', {
      kind: action.kind,
      channel: action.channel,
      user: action.user,
      thread_ts: action.threadTs ?? action.ts,
    });
    await respondToDecisionAction(action, config, deps);
    return;
  }

  const intakeAction = extractIntakeAction(envelope);
  if (intakeAction !== null) {
    log.debug('slack_intake_action_received', {
      kind: intakeAction.kind,
      channel: intakeAction.channel,
      user: intakeAction.user,
      thread_ts: intakeAction.threadTs ?? intakeAction.ts,
      draft_key: intakeAction.draftKey,
    });
    await respondToIntakeAction(intakeAction, config, deps);
    return;
  }

  const question = extractQuestion(envelope, config.allowedChannelIds);
  if (question === null) {
    log.debug('slack_event_ignored', {
      ...envelopeLogPayload(envelope),
      reason: ignoredQuestionReason(envelope, config.allowedChannelIds),
    });
    return;
  }

  log.debug('slack_question_received', {
    event_id: question.eventId,
    channel: question.channel,
    user: question.user,
    thread_ts: question.threadTs ?? question.ts,
  });
  await respondToQuestion(question, config, deps);
}

async function exitAfterSocketDisconnect(
  inFlight: ReadonlySet<Promise<void>>,
): Promise<void> {
  await drainInFlightWork(inFlight, SOCKET_DRAIN_TIMEOUT_MS);
  const timer = setTimeout(() => {
    process.exit(1);
  }, SOCKET_EXIT_DELAY_MS);
  timer.unref?.();
}

async function drainInFlightWork(
  inFlight: ReadonlySet<Promise<void>>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (inFlight.size > 0) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return;
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        Promise.all([...inFlight]),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, remainingMs);
          timer.unref?.();
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}

function errorPayload(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { message: String(err) };
}

function socketEventPayload(event: unknown): Record<string, unknown> {
  if (typeof event !== 'object' || event === null) return { event: String(event) };
  const input = event as Record<string, unknown>;
  return {
    code: input['code'],
    reason: input['reason'],
    message: input['message'],
    type: input['type'],
  };
}

function envelopeLogPayload(envelope: SlackEnvelope): Record<string, unknown> {
  const event = envelope.payload?.event;
  return {
    envelope_id: envelope.envelope_id,
    envelope_type: envelope.type,
    payload_type: envelope.payload?.type,
    event_id: envelope.payload?.event_id,
    event_type: event?.type,
    channel: event?.channel ?? envelope.payload?.channel?.id,
    channel_type: event?.channel_type,
    user: event?.user ?? envelope.payload?.user?.id,
    thread_ts: event?.thread_ts ?? envelope.payload?.message?.thread_ts,
    ts: event?.ts ?? envelope.payload?.message?.ts,
  };
}

function ignoredQuestionReason(
  envelope: SlackEnvelope,
  allowedChannelIds: readonly string[],
): string {
  if (envelope.type !== 'events_api') return 'not_events_api';
  if (envelope.envelope_id === undefined || envelope.envelope_id.trim() === '') {
    return 'missing_envelope_id';
  }
  const event = envelope.payload?.event;
  if (event === undefined) return 'missing_event';
  if (event.type !== 'message' && event.type !== 'app_mention') return 'unsupported_event_type';
  if (event.subtype !== undefined || event.bot_id !== undefined) return 'bot_or_subtyped_message';
  if (event.channel === undefined || event.user === undefined || event.text === undefined) {
    return 'missing_event_fields';
  }
  const allowed = allowedChannelIds.length === 0 || allowedChannelIds.includes(event.channel);
  const isDirectMessage = event.channel_type === 'im';
  const isMention = event.type === 'app_mention';
  if (!allowed) return 'channel_not_allowlisted';
  if (!isDirectMessage && !isMention && !allowedChannelIds.includes(event.channel)) {
    return 'unmentioned_channel_message_requires_allowlist';
  }
  if (normalizeSlackQuestionText(event.text) === '') return 'empty_text';
  return 'unknown';
}
