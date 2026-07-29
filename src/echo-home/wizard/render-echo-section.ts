import type { AgentKind } from './detect-agents.js';

export const ECHO_MCP_TOOL_ROSTER = [
  'find_clusters',
  'get_atoms',
  'get_atom',
  'search_memories',
  'echo_resolve_mru',
  'wait_for_new_turns',
  'echo_ping',
] as const;

export interface EchoSectionContext {
  agent: AgentKind;
  mcpServerUrl: string;
  echoVersion: string;
  runtimeVersion: string | null;
  defaultProjectRepoRoot: string | null;
  renderedAt: string;
}

export function renderEchoSection(ctx: EchoSectionContext): string {
  if (ctx.agent === 'cursor') {
    throw new Error('renderEchoSection does not support cursor');
  }
  const project = ctx.defaultProjectRepoRoot ?? 'none chosen';
  const runtime = ctx.runtimeVersion ?? 'unknown';
  const roster = ECHO_MCP_TOOL_ROSTER.map((tool) => `\`${tool}\``).join(', ');
  return `# ECHO

ECHO is wired to the \`echo\` MCP server (tools prefixed \`mcp__echo__\`) at \`${ctx.mcpServerUrl}\`. Default project: \`${project}\`.

Before calling ECHO, follow the installed \`using-echo-mcp\` skill for retrieval contracts and any enabled version-bound dogfooding journal. Use the ECHO tools ${roster} to retrieve your prior cross-tool context. See \`~/.echo/state/onboarding.json\` for the install record.

<!-- echo-version: ${ctx.echoVersion} · runtime-version: ${runtime} · rendered-at: ${ctx.renderedAt} -->
`;
}
