import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { TeamDecisionAtom, TeamDecisionStore } from './decision-store.js';
import { normalizeProjectName } from './linear-client.js';

export type BrainName = 'codex' | 'claude';
export type BrainOutcome = 'ok' | 'timeout' | 'error';

export type IntakeFieldKey =
  | 'clientProject'
  | 'request'
  | 'why'
  | 'clientOutcome'
  | 'evidence'
  | 'doneWhen'
  | 'urgency'
  | 'clientFacing';

export interface IntakeFields {
  clientProject?: string;
  request?: string;
  why?: string;
  clientOutcome?: string;
  evidence?: string;
  doneWhen?: string;
  urgency?: string;
  clientFacing?: string;
}

export interface IntakeBrainOptions {
  knownProjectNames?: readonly string[];
  expectedFollowupFields?: readonly IntakeFieldKey[];
  inferRequest?: boolean;
}

export interface IntakeBrainResult {
  fields: IntakeFields;
  missing: IntakeFieldKey[];
  questions: string[];
  ready: boolean;
}

export interface BrainResult {
  ok: boolean;
  outcome: BrainOutcome;
  durationMs: number;
  answer?: string;
  reason?: string;
}

export interface BrainBinding {
  executable: string;
  versionArgs: readonly string[];
  argv(scopeRepoPath: string): readonly string[];
  capture: 'stdout-json' | 'stdout-text';
}

export interface BrainRunOptions {
  brain: BrainName;
  contextRepoPath: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  killGraceMs?: number;
  registry?: BrainRegistry;
}

export type BrainRegistry = Readonly<Record<BrainName, BrainBinding>>;

interface Invocation {
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  prompt: string;
  capture: BrainBinding['capture'];
}

const DEFAULT_KILL_GRACE_MS = 500;
const PREFLIGHT_TIMEOUT_MS = 5000;
const INTAKE_FIELDS: readonly IntakeFieldKey[] = [
  'clientProject',
  'request',
  'why',
  'clientOutcome',
  'evidence',
  'doneWhen',
  'urgency',
  'clientFacing',
];

// Checked at claim time on 2026-06-19:
// codex-cli 0.137.0 supports `codex exec -C <dir> --sandbox read-only --json -`.
// Claude Code 2.1.183 supports `claude --dangerously-skip-permissions -p`.
export const BRAIN_REGISTRY: BrainRegistry = {
  codex: {
    executable: 'codex',
    versionArgs: ['--version'],
    argv: (scopeRepoPath) => [
      'codex',
      'exec',
      '-C',
      scopeRepoPath,
      '--sandbox',
      'read-only',
      '--json',
      '-',
    ],
    capture: 'stdout-json',
  },
  claude: {
    executable: 'claude',
    versionArgs: ['--version'],
    argv: () => ['claude', '--dangerously-skip-permissions', '-p'],
    capture: 'stdout-text',
  },
};

export function parseBrainName(raw: string | undefined): BrainName {
  if (raw === undefined || raw.trim() === '') return 'codex';
  const value = raw.trim();
  if (value === 'codex' || value === 'claude') return value;
  throw new Error(`ECHO_CEO_BRAIN must be codex or claude, got ${raw}`);
}

export function buildBrainPrompt(question: string, scopeRepoPath: string): string {
  return [
    'You are the reasoning brain for the ECHO CEO Slack responder.',
    '',
    'Answer the Slack question from scoped ECHO context only.',
    `Scope repo path: ${scopeRepoPath}`,
    '',
    'Rules:',
    `- When using ECHO MCP tools, always pass repo_path exactly "${scopeRepoPath}".`,
    '- Do not search or infer from any other project or personal memory slice.',
    '- Synthesize a business why in clear terms; do not dump raw atoms or tool output.',
    '- Cite at least one concrete scoped fact such as a ticket, component, seam, or decision.',
    '- If scoped context is insufficient, say that directly and name the missing grounding.',
    '- Return only the final Slack-ready answer.',
    '',
    `Question: ${question}`,
  ].join('\n');
}

export function runIntakeBrain(text: string, options: IntakeBrainOptions = {}): IntakeBrainResult {
  const fields = extractIntakeFields(text, options);
  const missing = missingIntakeFields(fields, options);
  return {
    fields,
    missing,
    questions: buildIntakeFollowupQuestions(missing, options),
    ready: missing.length === 0,
  };
}

export function extractIntakeFields(text: string, options: IntakeBrainOptions = {}): IntakeFields {
  const labeled = parseLabeledIntakeFields(text);
  const numbered = parseNumberedIntakeFields(text, options.expectedFollowupFields ?? []);
  const knownProject = findKnownProject(text, options.knownProjectNames ?? []);
  const shouldInferRequest = options.inferRequest ?? options.expectedFollowupFields === undefined;
  const request =
    labeled.request ??
    numbered.request ??
    (shouldInferRequest ? inferRequest(text, options.knownProjectNames ?? []) : undefined);
  const out: IntakeFields = {
    ...numbered,
    ...labeled,
    ...(knownProject !== undefined ? { clientProject: knownProject } : {}),
    ...(request !== undefined ? { request } : {}),
  };
  if (out.urgency === undefined) out.urgency = inferUrgency(text);
  if (out.clientFacing === undefined) out.clientFacing = inferClientFacing(text);
  return compactFields(out);
}

export function missingIntakeFields(
  fields: IntakeFields,
  options: IntakeBrainOptions = {},
): IntakeFieldKey[] {
  const missing: IntakeFieldKey[] = [];
  for (const field of INTAKE_FIELDS) {
    if (fields[field] === undefined || fields[field]?.trim() === '') {
      missing.push(field);
    }
  }
  if (
    fields.clientProject !== undefined &&
    options.knownProjectNames !== undefined &&
    options.knownProjectNames.length > 0 &&
    findKnownProject(fields.clientProject, options.knownProjectNames) === undefined &&
    !isInternalProjectName(fields.clientProject)
  ) {
    if (!missing.includes('clientProject')) missing.unshift('clientProject');
  }
  return missing;
}

export function intakeReadyFields(fields: IntakeFields): Required<IntakeFields> | null {
  for (const field of INTAKE_FIELDS) {
    if (fields[field] === undefined || fields[field]?.trim() === '') return null;
  }
  return {
    clientProject: fields.clientProject!.trim(),
    request: fields.request!.trim(),
    why: fields.why!.trim(),
    clientOutcome: fields.clientOutcome!.trim(),
    evidence: fields.evidence!.trim(),
    doneWhen: fields.doneWhen!.trim(),
    urgency: fields.urgency!.trim(),
    clientFacing: fields.clientFacing!.trim(),
  };
}

export function intakeFollowupFieldsToAsk(missing: readonly IntakeFieldKey[]): IntakeFieldKey[] {
  return missing.slice(0, 2);
}

export function buildIntakeFollowupQuestions(
  missing: readonly IntakeFieldKey[],
  options: IntakeBrainOptions = {},
): string[] {
  return intakeFollowupFieldsToAsk(missing).map((field) => questionForMissingField(field, options));
}

export function isLikelyLinearIntake(
  text: string,
  knownProjectNames: readonly string[] = [],
): boolean {
  const normalized = text.toLowerCase();
  if (findKnownProject(text, knownProjectNames) !== undefined) return true;
  return [
    'file this',
    'create an issue',
    'linear',
    'intake',
    'client-facing',
    'client facing',
    'done when',
    'needs ',
    'request:',
    'client/project:',
  ].some((needle) => normalized.includes(needle));
}

export function resolveBrainInvocation(question: string, options: BrainRunOptions): Invocation {
  const registry = options.registry ?? BRAIN_REGISTRY;
  const binding = registry[options.brain];
  return {
    argv: binding.argv(options.contextRepoPath),
    cwd: options.contextRepoPath,
    env: { ...process.env, ...options.env },
    prompt: buildBrainPrompt(question, options.contextRepoPath),
    capture: binding.capture,
  };
}

export async function preflightBrain(
  brain: BrainName,
  env: NodeJS.ProcessEnv = process.env,
  registry: BrainRegistry = BRAIN_REGISTRY,
): Promise<void> {
  const binding = registry[brain];
  const result = await runProcess({
    argv: [binding.executable, ...binding.versionArgs],
    cwd: process.cwd(),
    env,
    stdin: '',
    timeoutMs: PREFLIGHT_TIMEOUT_MS,
    killGraceMs: DEFAULT_KILL_GRACE_MS,
  });
  if (result.timedOut) {
    throw new Error(`selected brain "${brain}" version probe timed out`);
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `selected brain "${brain}" version probe failed: ${boundedReason(result.stderr)}`,
    );
  }
}

export async function runBrain(question: string, options: BrainRunOptions): Promise<BrainResult> {
  const started = Date.now();
  const invocation = resolveBrainInvocation(question, options);
  const result = await runProcess({
    argv: invocation.argv,
    cwd: invocation.cwd,
    env: invocation.env,
    stdin: invocation.prompt,
    timeoutMs: options.timeoutMs,
    killGraceMs: options.killGraceMs ?? DEFAULT_KILL_GRACE_MS,
  });
  const durationMs = Date.now() - started;

  if (result.timedOut) {
    return {
      ok: false,
      outcome: 'timeout',
      durationMs,
      reason: `timed out after ${options.timeoutMs}ms`,
    };
  }
  if (result.exitCode !== 0) {
    return {
      ok: false,
      outcome: 'error',
      durationMs,
      reason: boundedReason(result.stderr || `brain exited ${result.exitCode}`),
    };
  }

  let answer: string;
  try {
    answer =
      invocation.capture === 'stdout-json'
        ? parseCodexJsonFinalMessage(result.stdout)
        : result.stdout.trim();
  } catch (err) {
    return {
      ok: false,
      outcome: 'error',
      durationMs,
      reason: err instanceof Error ? boundedReason(err.message) : boundedReason(String(err)),
    };
  }
  if (answer === '') {
    return {
      ok: false,
      outcome: 'error',
      durationMs,
      reason: 'empty final answer',
    };
  }
  return {
    ok: true,
    outcome: 'ok',
    durationMs,
    answer,
  };
}

export function parseCodexJsonFinalMessage(stdout: string): string {
  const candidates: string[] = [];
  let jsonErrors = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const text = assistantText(parsed);
      if (text !== null && text.trim() !== '') {
        candidates.push(text.trim());
      }
    } catch {
      jsonErrors += 1;
    }
  }
  const answer = candidates.at(-1);
  if (answer === undefined) {
    throw new Error(`no assistant message found in codex JSON stdout (json_errors=${jsonErrors})`);
  }
  return answer;
}

export function formatBrainFailure(result: BrainResult): string {
  const reason = boundedReason(result.reason ?? result.outcome);
  return `Could not synthesize an answer - ${reason}`;
}

export async function answerFromTeamDecisions(
  question: string,
  decisionStore: TeamDecisionStore,
): Promise<BrainResult> {
  const started = Date.now();
  if (asksForRawContext(question)) {
    return {
      ok: true,
      outcome: 'ok',
      durationMs: Date.now() - started,
      answer:
        'I can answer from confirmed shared decisions only. Raw sessions, diffs, transcripts, and machine-scoped context stay on the owner machine.',
    };
  }

  const decisions = await decisionStore.queryLatestDecisions({ query: question, limit: 5 });
  return {
    ok: true,
    outcome: 'ok',
    durationMs: Date.now() - started,
    answer: formatTeamDecisionAnswer(decisions),
  };
}

export function asksForRawContext(question: string): boolean {
  const normalized = question.toLowerCase();
  return [
    'raw',
    'diff',
    'session',
    'transcript',
    'log',
    'terminal',
    'file contents',
    'source context',
  ].some((needle) => normalized.includes(needle));
}

function parseLabeledIntakeFields(text: string): IntakeFields {
  const fields: IntakeFields = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([^:]{2,40}):\s*(.+?)\s*$/);
    if (match === null) continue;
    const key = intakeFieldFromLabel(match[1] ?? '');
    if (key === null) continue;
    fields[key] = (match[2] ?? '').trim();
  }
  return fields;
}

interface IntakeListMarker {
  ordinal: number;
  index: number;
  contentStart: number;
}

const MONTH_BEFORE_MARKER_PATTERN =
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.?$/i;

function findIntakeListMarkers(text: string): IntakeListMarker[] {
  const acceptInlineMarkers = /^\s*1[.)]\s/.test(text);
  const markers: IntakeListMarker[] = [];
  for (const match of text.matchAll(/(\d{1,2})[.)]\s+/g)) {
    const index = match.index ?? 0;
    if (index > 0 && !/\s/.test(text[index - 1] ?? '')) continue;
    const lineStart = text.lastIndexOf('\n', index - 1) + 1;
    const linePrefix = text.slice(lineStart, index);
    const atLineStart = linePrefix.trim() === '';
    if (!atLineStart && !acceptInlineMarkers) continue;
    if (MONTH_BEFORE_MARKER_PATTERN.test(linePrefix.trimEnd())) continue;
    markers.push({
      ordinal: Number.parseInt(match[1] ?? '', 10),
      index,
      contentStart: index + match[0].length,
    });
  }
  return markers;
}

function parseNumberedIntakeFields(
  text: string,
  expectedFields: readonly IntakeFieldKey[],
): IntakeFields {
  const fields: IntakeFields = {};
  if (expectedFields.length === 0) return fields;
  const markers = findIntakeListMarkers(text).filter(
    (marker) => marker.ordinal >= 1 && marker.ordinal <= expectedFields.length,
  );
  for (const [markerIndex, marker] of markers.entries()) {
    const field = expectedFields[marker.ordinal - 1];
    if (field === undefined) continue;
    const end = markers[markerIndex + 1]?.index ?? text.length;
    const value = text.slice(marker.contentStart, end).trim();
    if (value !== '') assignIntakeValue(fields, field, value);
  }
  if (Object.keys(fields).length === 0 && expectedFields.length === 1) {
    const value = text.trim();
    if (value !== '') assignIntakeValue(fields, expectedFields[0]!, value);
  }
  return compactFields(fields);
}

function assignIntakeValue(fields: IntakeFields, field: IntakeFieldKey, value: string): void {
  const labeled = splitLeadingFieldLabel(value);
  if (labeled === null) {
    fields[field] = value;
    return;
  }
  if (labeled.value !== '') fields[labeled.field] = labeled.value;
}

function splitLeadingFieldLabel(value: string): { field: IntakeFieldKey; value: string } | null {
  const match = value.match(/^\s*([^:]{2,40}):\s*(.+?)\s*$/);
  if (match === null) return null;
  const field = intakeFieldFromLabel(match[1] ?? '');
  if (field === null) return null;
  return { field, value: (match[2] ?? '').trim() };
}

function intakeFieldFromLabel(label: string): IntakeFieldKey | null {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (['client project', 'client', 'project', 'who is this for'].includes(normalized)) {
    return 'clientProject';
  }
  if (['request', 'ask', 'what do you want changed'].includes(normalized)) return 'request';
  if (['why', 'why now', 'why does it matter'].includes(normalized)) return 'why';
  if (['client outcome', 'outcome', 'user outcome'].includes(normalized)) {
    return 'clientOutcome';
  }
  if (['evidence', 'evidence example', 'example', 'current state'].includes(normalized)) {
    return 'evidence';
  }
  if (['done when', 'done', 'definition of done'].includes(normalized)) return 'doneWhen';
  if (['urgency', 'priority'].includes(normalized)) return 'urgency';
  if (
    ['client facing', 'client facing yes no', 'client facing yes no not sure'].includes(normalized)
  ) {
    return 'clientFacing';
  }
  return null;
}

function findKnownProject(text: string, knownProjectNames: readonly string[]): string | undefined {
  const normalized = ` ${normalizeProjectName(text)} `;
  return knownProjectNames.find((name) => {
    const project = normalizeProjectName(name);
    return project !== '' && normalized.includes(` ${project} `);
  });
}

function inferRequest(text: string, knownProjectNames: readonly string[] = []): string | undefined {
  const cleaned = text.replace(/<@[A-Z0-9]+>/g, '').trim();
  if (cleaned === '') return undefined;
  if (findIntakeListMarkers(cleaned).length > 1) return undefined;
  const candidates = cleaned
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((candidate) =>
      candidate
        .replace(/^\s*[-*]\s+/, '')
        .replace(/^\s*\d{1,2}[.)]\s+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((candidate) => candidate !== '')
    .map((candidate) => stripMetaLinearIssuePrefix(candidate))
    .filter((candidate) => candidate !== '')
    .filter((candidate) => !isMetaLinearIssueRequest(candidate))
    .filter((candidate) => !isLowInformationRequest(candidate, knownProjectNames));
  return candidates[0];
}

function stripMetaLinearIssuePrefix(candidate: string): string {
  if (!isMetaLinearIssueRequest(candidate)) return candidate;
  const colonIndex = candidate.indexOf(':');
  if (colonIndex === -1) return candidate;
  const remainder = candidate.slice(colonIndex + 1).trim();
  return remainder === '' ? candidate : remainder;
}

function isMetaLinearIssueRequest(candidate: string): boolean {
  const normalized = candidate.toLowerCase();
  return (
    /\b(?:can you|could you|please)\b/.test(normalized) &&
    /\b(?:linear|issue|ticket)\b/.test(normalized) &&
    /\b(?:this|it)\b/.test(normalized)
  );
}

function isLowInformationRequest(candidate: string, knownProjectNames: readonly string[]): boolean {
  const normalized = normalizeProjectName(candidate);
  if (['yes', 'no', 'not sure', 'urgent', 'high', 'medium', 'low'].includes(normalized)) {
    return true;
  }
  return knownProjectNames.some((name) => normalized === normalizeProjectName(name));
}

function inferUrgency(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (/\b(urgent|asap|today|blocker|blocking)\b/.test(normalized)) return 'urgent';
  if (/\b(this week|soon|high priority|high)\b/.test(normalized)) return 'high';
  if (/\b(next week|medium priority|medium)\b/.test(normalized)) return 'medium';
  if (/\b(low priority|low|whenever)\b/.test(normalized)) return 'low';
  return undefined;
}

function inferClientFacing(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (/\b(client-facing|client facing|customer-facing|customer facing)\b/.test(normalized)) {
    return 'yes';
  }
  if (/\b(internal only|not client-facing|not client facing)\b/.test(normalized)) return 'no';
  return undefined;
}

function compactFields(fields: IntakeFields): IntakeFields {
  const out: IntakeFields = {};
  for (const field of INTAKE_FIELDS) {
    const value = fields[field];
    if (value !== undefined && value.trim() !== '') out[field] = value.trim();
  }
  return out;
}

function isInternalProjectName(name: string): boolean {
  return ['internal', 'echo', 'no client'].includes(normalizeProjectName(name));
}

function questionForMissingField(field: IntakeFieldKey, options: IntakeBrainOptions): string {
  switch (field) {
    case 'clientProject': {
      const choices = options.knownProjectNames?.join(', ');
      return choices === undefined || choices === ''
        ? 'Which client or project is this for?'
        : `Which project should this go under? Choose one: ${choices}, or say internal/Echo.`;
    }
    case 'request':
      return 'What do you want changed or created?';
    case 'why':
      return 'Why does this matter now?';
    case 'clientOutcome':
      return 'What should the teammate or client be able to do when this is done?';
    case 'evidence':
      return 'What example, current behavior, or evidence shows the need?';
    case 'doneWhen':
      return 'What would done look like in plain language?';
    case 'urgency':
      return 'How urgent is this: urgent, high, medium, or low?';
    case 'clientFacing':
      return 'Is this client-facing: yes, no, or not sure?';
  }
}

function formatTeamDecisionAnswer(decisions: readonly TeamDecisionAtom[]): string {
  if (decisions.length === 0) {
    return "I don't have a confirmed shared decision for that yet.";
  }
  return decisions
    .map((decision) => {
      const rationale =
        decision.rationale === undefined || decision.rationale.trim() === ''
          ? ''
          : ` Rationale: ${decision.rationale}`;
      return `Decision on ${decision.subject}: ${decision.decision}${rationale} Confirmed by ${decision.confirmed_by} at ${decision.confirmed_at}.`;
    })
    .join('\n');
}

function assistantText(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const type = stringValue(value.type) ?? '';
  const role = stringValue(value.role) ?? '';
  if (role === 'assistant' || type.includes('assistant') || type === 'agent_message') {
    for (const key of ['message', 'text', 'content', 'final_message', 'output']) {
      const text = textFromContent(value[key]);
      if (text !== null) return text;
    }
  }
  for (const key of ['item', 'message', 'data', 'event']) {
    const nested = assistantText(value[key]);
    if (nested !== null) return nested;
  }
  return null;
}

function textFromContent(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return null;
  const parts: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      parts.push(item);
    } else if (isRecord(item)) {
      const text = stringValue(item.text) ?? stringValue(item.content);
      if (text !== null) parts.push(text);
    }
  }
  const joined = parts.join('').trim();
  return joined === '' ? null : joined;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface ProcessRunOptions {
  argv: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdin: string;
  timeoutMs: number;
  killGraceMs: number;
}

interface ProcessRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

function runProcess(options: ProcessRunOptions): Promise<ProcessRunResult> {
  return new Promise((resolve) => {
    const [executable, ...args] = options.argv;
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(executable, args, {
        cwd: options.cwd,
        env: options.env,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      resolve({
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        timedOut: false,
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;
    let termTimer: NodeJS.Timeout | undefined;
    let settleTimer: NodeJS.Timeout | undefined;

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      killProcessGroup(child, 'SIGTERM');
      termTimer = setTimeout(() => {
        killProcessGroup(child, 'SIGKILL');
      }, options.killGraceMs);
      termTimer.unref();
      settleTimer = setTimeout(() => {
        finish(null);
      }, options.killGraceMs * 2);
      settleTimer.unref();
    }, options.timeoutMs);
    timeoutTimer.unref();

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      stderr += err.message;
      finish(1);
    });
    child.on('close', (code) => {
      finish(code);
    });
    child.stdin.end(options.stdin);

    function finish(exitCode: number | null): void {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutTimer);
      if (termTimer !== undefined) clearTimeout(termTimer);
      if (settleTimer !== undefined) clearTimeout(settleTimer);
      resolve({ stdout, stderr, exitCode, timedOut });
    }
  });
}

function killProcessGroup(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Best effort; runProcess still returns a bounded timeout result.
    }
  }
}

function boundedReason(reason: string): string {
  return reason.replace(/\s+/g, ' ').trim().slice(0, 200) || 'unknown error';
}
