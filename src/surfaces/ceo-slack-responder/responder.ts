import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';

const DEFAULT_ECHO_MCP_URL = 'http://127.0.0.1:38478/mcp';
const DEFAULT_EVENT_LOG_PATH = 'raw/internal/ceo-loop-events.md';
const QUESTION_STOPWORDS: ReadonlySet<string> = new Set([
  'about',
  'are',
  'build',
  'built',
  'decide',
  'decided',
  'did',
  'does',
  'for',
  'have',
  'the',
  'this',
  'was',
  'were',
  'what',
  'why',
]);

export interface ResponderConfig {
  slackAppToken: string;
  slackBotToken: string;
  echoMcpUrl: string;
  contextRepoPath: string;
  allowedChannelIds: readonly string[];
  eventLogPath: string;
  maxMatches: number;
}

export interface SlackQuestion {
  envelopeId: string;
  channel: string;
  user: string;
  text: string;
  ts?: string;
  threadTs?: string;
}

export interface SearchMemoryMatch {
  id: string;
  source: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
  truncations?: string[];
}

export interface SearchMemoriesResult {
  matches: SearchMemoryMatch[];
  total_returned?: number;
  limit_applied?: number;
}

export interface EchoToolClient {
  callTool<T>(name: string, args: Record<string, unknown>): Promise<T>;
}

interface SlackMessageEvent {
  type?: string;
  subtype?: string;
  bot_id?: string;
  channel?: string;
  channel_type?: string;
  user?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
}

interface SlackEnvelope {
  envelope_id?: string;
  type?: string;
  payload?: {
    event?: SlackMessageEvent;
  };
}

interface SlackApiResponse {
  ok?: boolean;
  error?: string;
  url?: string;
}

interface JsonRpcEnvelope {
  result?: {
    isError?: boolean;
    content?: Array<{ type?: string; text?: string }>;
  };
  error?: {
    message?: string;
  };
}

interface SocketLike {
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: unknown) => void,
  ): void;
  send(data: string): void;
}

type SocketConstructor = new (url: string) => SocketLike;

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
  return {
    slackAppToken: requiredEnv(env, 'ECHO_SLACK_APP_TOKEN', 'SLACK_APP_TOKEN'),
    slackBotToken: requiredEnv(env, 'ECHO_SLACK_BOT_TOKEN', 'SLACK_BOT_TOKEN'),
    echoMcpUrl: env.ECHO_MCP_URL?.trim() || DEFAULT_ECHO_MCP_URL,
    contextRepoPath,
    allowedChannelIds: parseChannelList(env.ECHO_CEO_SLACK_CHANNEL_IDS),
    eventLogPath: env.ECHO_CEO_EVENT_LOG_PATH?.trim() || DEFAULT_EVENT_LOG_PATH,
    maxMatches: parsePositiveInt(env.ECHO_CEO_MAX_MATCHES, 5),
  };
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
    .replace(/\s+/g, ' ')
    .trim();
}

export async function answerQuestion(
  question: SlackQuestion,
  echo: EchoToolClient,
  config: Pick<ResponderConfig, 'contextRepoPath' | 'maxMatches'>,
): Promise<string> {
  let result = await searchScopedMemories(echo, question.text, config);
  const fallbackQuery = deriveFallbackQuery(question.text);
  if (result.matches.length === 0 && fallbackQuery !== null && fallbackQuery !== question.text) {
    result = await searchScopedMemories(echo, fallbackQuery, config);
  }
  return buildSlackAnswer(question.text, result.matches, config.contextRepoPath);
}

async function searchScopedMemories(
  echo: EchoToolClient,
  query: string,
  config: Pick<ResponderConfig, 'contextRepoPath' | 'maxMatches'>,
): Promise<SearchMemoriesResult> {
  return echo.callTool<SearchMemoriesResult>('search_memories', {
    query,
    repo_path: config.contextRepoPath,
    limit: config.maxMatches,
  });
}

export function deriveFallbackQuery(text: string): string | null {
  const tokens = text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9_-]*/g)
    ?.filter((token) => token.length >= 3 && !QUESTION_STOPWORDS.has(token));
  if (tokens === undefined || tokens.length === 0) return null;
  return tokens.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function buildSlackAnswer(
  questionText: string,
  matches: readonly SearchMemoryMatch[],
  contextRepoPath: string,
): string {
  const header = `Scoped ECHO context: ${contextRepoPath}`;
  if (matches.length === 0) {
    return `${header}\n\nI did not find scoped context for: "${questionText}".`;
  }

  const lines = matches.slice(0, 3).map((match, index) => {
    const content = compactWhitespace(match.content).slice(0, 420);
    const truncation =
      match.truncations !== undefined && match.truncations.length > 0 ? ' (truncated)' : '';
    return `${index + 1}. ${content}${truncation}\n   Source: ${match.source} @ ${match.timestamp}`;
  });
  return `${header}\n\nBest scoped context I found for: "${questionText}"\n\n${lines.join('\n\n')}`;
}

export function formatUsageRecord(question: SlackQuestion, answeredAt = new Date()): string {
  const timestamp = answeredAt.toISOString();
  const escapedQuestion = question.text.replaceAll('\n', ' ').replaceAll('"', '\\"');
  return `${timestamp} · unprompted?=unknown · satisfied-or-DMed-anyway=unknown · channel=${question.channel} · user=${question.user} · question="${escapedQuestion}"\n`;
}

export async function appendUsageRecord(
  path: string,
  question: SlackQuestion,
  answeredAt = new Date(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, formatUsageRecord(question, answeredAt), 'utf8');
}

function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseMcpPayload(raw: string): JsonRpcEnvelope {
  const dataLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('data: '));
  const payload = dataLine === undefined ? raw : dataLine.slice('data: '.length);
  return JSON.parse(payload) as JsonRpcEnvelope;
}

function parseToolResult<T>(envelope: JsonRpcEnvelope): T {
  if (envelope.error !== undefined) {
    throw new Error(envelope.error.message ?? 'ECHO MCP JSON-RPC error');
  }
  const content = envelope.result?.content ?? [];
  const text = content.find((item) => item.type === 'text' && typeof item.text === 'string')?.text;
  if (text === undefined) {
    throw new Error('ECHO MCP response missing text content');
  }
  if (envelope.result?.isError === true) {
    throw new Error(text);
  }
  return JSON.parse(text) as T;
}

export class HttpEchoToolClient implements EchoToolClient {
  private nextId = 1;
  private initialized = false;
  private sessionId: string | null = null;

  constructor(private readonly url: string) {}

  async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    await this.ensureInitialized();
    const envelope = await this.postJson({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    });
    return parseToolResult<T>(envelope);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    const envelope = await this.postJson({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'echo-ceo-slack-responder', version: '0.0.0' },
      },
    });
    if (envelope.error !== undefined) {
      throw new Error(envelope.error.message ?? 'ECHO MCP initialize failed');
    }
    await this.postNotification({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    this.initialized = true;
  }

  private async postNotification(payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`ECHO MCP notification failed: HTTP ${response.status}`);
    }
  }

  private async postJson(payload: Record<string, unknown>): Promise<JsonRpcEnvelope> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const sessionId = response.headers.get('mcp-session-id');
    if (sessionId !== null && sessionId.trim() !== '') {
      this.sessionId = sessionId;
    }
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`ECHO MCP request failed: HTTP ${response.status}: ${raw.slice(0, 200)}`);
    }
    return parseMcpPayload(raw);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    };
    if (this.sessionId !== null) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }
    return headers;
  }
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

export async function runSlackResponder(config: ResponderConfig): Promise<void> {
  const socketUrl = await openSocketModeUrl(config.slackAppToken);
  const Socket = globalThis.WebSocket as unknown as SocketConstructor | undefined;
  if (Socket === undefined) {
    throw new Error('global WebSocket is unavailable; run with Node >=22');
  }
  const socket = new Socket(socketUrl);
  const echo = new HttpEchoToolClient(config.echoMcpUrl);

  socket.addEventListener('message', (event) => {
    void handleSocketMessage(event, socket, echo, config);
  });
}

async function handleSocketMessage(
  event: unknown,
  socket: SocketLike,
  echo: EchoToolClient,
  config: ResponderConfig,
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

  const question = extractQuestion(envelope, config.allowedChannelIds);
  if (question === null) return;

  const answer = await answerQuestion(question, echo, config);
  await postSlackMessage(
    config.slackBotToken,
    question.channel,
    answer,
    question.threadTs ?? question.ts,
  );
  await appendUsageRecord(config.eventLogPath, question);
}
