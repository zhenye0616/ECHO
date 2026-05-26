import type { AgentKind } from './detect-agents.js';

export interface EchoSectionContext {
  agent: AgentKind;
  mcpServerUrl: string;
  echoVersion: string;
  defaultProjectRepoRoot: string | null;
  renderedAt: string;
}

export function renderEchoSection(ctx: EchoSectionContext): string {
  if (ctx.agent === 'cursor') {
    throw new Error('renderEchoSection does not support cursor');
  }
  const project = ctx.defaultProjectRepoRoot ?? 'none chosen';
  return `# ECHO

ECHO is wired to the daemon at \`${ctx.mcpServerUrl}\`. Default project: \`${project}\`.

Use ECHO MCP tools (\`find_clusters\`, \`search_memories\`, \`get_atom\`, ...) to retrieve your prior cross-tool context. See \`~/.echo/state/onboarding.json\` for the install record.

<!-- echo-version: ${ctx.echoVersion} · rendered-at: ${ctx.renderedAt} -->
`;
}
