import type { CaptureEvent } from '../../storage/interface.js';
import {
  conversationArtifact,
  fileArtifact,
  repoArtifact,
} from '../artifacts.js';
import type {
  Adapter,
  ArtifactRef,
  ContextRef,
  NormalizedContextEvent,
} from '../types.js';
import {
  buildProvenance,
  extractOpenLoopHints,
  fail,
  getBoolean,
  getNumber,
  getRecord,
  getString,
  getStringArray,
  tryParseTurnPair,
} from './_shared.js';

export const CODEX_VERSION = 'codex@1';

export const CODEX_SOURCE_RE = /^fs:.*\/\.codex\/sessions\/.*\.jsonl$/;

export function matchesCodex(source: string): boolean {
  return CODEX_SOURCE_RE.test(source);
}

export const adaptCodex: Adapter = (
  event: CaptureEvent,
): NormalizedContextEvent | null => {
  // Source-prefix dispatch is coarse — see claude-code adapter for context.
  const pair = tryParseTurnPair(event.content);
  if (pair === null) return null;

  const meta = event.metadata;
  const session_id = getString(meta, 'session_id');
  if (session_id === undefined) {
    fail(event, 'codex: missing metadata.session_id');
  }

  const turn_index = getNumber(meta, 'turn_index');
  const had_tool_use = getBoolean(meta, 'had_tool_use') === true;
  const repo_root = getString(meta, 'repo_root') ?? getString(meta, 'cwd');
  const filesReferenced = getStringArray(meta, 'files_referenced');
  const codex = getRecord(meta, 'codex');
  const git = getRecord(meta, 'git');
  const model = codex !== undefined ? getString(codex, 'model') : undefined;

  const repo = buildRepoArtifact(repo_root, git);
  const artifacts: ArtifactRef[] = [conversationArtifact('codex', session_id)];
  if (repo !== null) artifacts.push(repo.artifact);

  if (filesReferenced !== undefined) {
    for (const path of filesReferenced) {
      artifacts.push(fileArtifact(repo?.id ?? null, path, repo_root));
    }
  }

  const ambient: Record<string, string> = {};
  if (had_tool_use) ambient.had_tool_use = 'true';
  if (codex !== undefined) {
    const cliVersion = getString(codex, 'cli_version');
    if (cliVersion !== undefined) ambient.cli_version = cliVersion;
    const codexSource = getString(codex, 'source');
    if (codexSource !== undefined) ambient.codex_source = codexSource;
    const reasoning = getString(codex, 'reasoning_effort');
    if (reasoning !== undefined) ambient.reasoning_effort = reasoning;
    const approval = getString(codex, 'approval_policy');
    if (approval !== undefined) ambient.approval_policy = approval;
    const sandbox = getString(codex, 'sandbox_policy_type');
    if (sandbox !== undefined) ambient.sandbox_policy_type = sandbox;
  }
  if (git !== undefined) {
    const branch = getString(git, 'branch');
    if (branch !== undefined) ambient.branch = branch;
  }

  const context: ContextRef | undefined =
    Object.keys(ambient).length > 0 ? { ambient } : undefined;

  const provider = codex !== undefined ? getString(codex, 'model_provider') ?? 'openai' : 'openai';
  const out: NormalizedContextEvent = {
    schema_version: 1,
    id: event.id,
    time: { occurred_at: event.timestamp },
    source: {
      app: 'codex',
      surface: 'jsonl',
      raw_pointer: event.source,
    },
    actors: [
      { role: 'user' },
      buildAssistant(model, provider),
    ],
    action: {
      kind: 'message',
      input: pair.user,
      output: pair.assistant,
    },
    artifacts,
    provenance: buildProvenance(event, CODEX_VERSION),
    conversation: buildConversation(session_id, turn_index),
  };

  if (context !== undefined) out.context = context;
  const hints = extractOpenLoopHints(pair.user, pair.assistant);
  if (hints.length > 0) out.open_loop_hints = hints;

  return out;
};

function buildAssistant(
  model: string | undefined,
  provider: string,
): NormalizedContextEvent['actors'][number] {
  const a: NormalizedContextEvent['actors'][number] = { role: 'assistant', provider };
  if (model !== undefined) a.model = model;
  return a;
}

function buildConversation(
  session_id: string,
  turn_index: number | undefined,
): NormalizedContextEvent['conversation'] {
  const conv: NonNullable<NormalizedContextEvent['conversation']> = {
    provider: 'codex',
    session_id,
  };
  if (turn_index !== undefined) conv.turn_index = turn_index;
  return conv;
}

function buildRepoArtifact(
  repo_root: string | undefined,
  git: Record<string, unknown> | undefined,
): { artifact: ArtifactRef; id: string } | null {
  if (repo_root === undefined) return null;
  const remote = git !== undefined ? getString(git, 'origin_url') : undefined;
  const artifact = repoArtifact(remote ?? null, repo_root);
  return { artifact, id: artifact.id };
}
