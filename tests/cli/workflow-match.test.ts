import { describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OnboardedAgentProfile } from '../../src/echo-home/paths.js';
import type { Role } from '../../src/echo-home/roles.js';
import { loadRolesFromDir } from '../../src/echo-home/roles.js';
import { AGENT_CAPABILITIES_BY_KIND } from '../../src/cli/commands/init.js';
import { matchRolesToAgents } from '../../src/cli/workflow/match.js';
import { loadWorkflow } from '../../src/cli/workflow/load.js';
import type { WorkflowStep } from '../../src/cli/workflow/load.js';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function role(name = 'reviewer'): Role {
  return {
    name,
    description: 'Review',
    sandbox: 'workspace-write',
    skills: [],
    requires: { mcpServers: ['echo'], capabilities: ['fs.write', 'mcp.echo.write'] },
    output: { format: 'markdown', requiredFields: ['verdict'] },
    sourcePath: '/roles/reviewer.toml',
  };
}

function agent(
  id: OnboardedAgentProfile['id'],
  wiredAt: string | null,
  capabilities: string[],
): OnboardedAgentProfile {
  return {
    id,
    detected_at: '2026-05-26T00:00:00.000Z',
    wired_at: wiredAt,
    probed_at: null,
    capabilities,
    wire_error: null,
  };
}

const step: WorkflowStep = { role: 'reviewer', prompt: 'x', inputs: {} };

describe('matchRolesToAgents', () => {
  it('picks the earliest wired capable agent and carries sandbox', () => {
    const matches = matchRolesToAgents({
      steps: [step],
      roles: [role()],
      onboarded: [
        agent('cursor', '2026-05-26T00:00:00.000Z', [...AGENT_CAPABILITIES_BY_KIND.cursor]),
        agent('claude-code', '2026-05-26T00:00:02.000Z', [
          ...AGENT_CAPABILITIES_BY_KIND['claude-code'],
        ]),
        agent('codex', '2026-05-26T00:00:01.000Z', [...AGENT_CAPABILITIES_BY_KIND.codex]),
      ],
    });

    expect(matches[0]).toMatchObject({
      pickedAgent: 'codex',
      reason: 'matched',
      resolvedSandbox: 'workspace-write',
    });
  });

  it('distinguishes role-unknown, no-onboarded-agent, and capability-mismatch', () => {
    const unknown = matchRolesToAgents({ steps: [step], roles: [], onboarded: [] })[0]!;
    expect(unknown).toMatchObject({ reason: 'role-unknown' });
    expect(unknown.resolvedSandbox).toBeUndefined();
    const none = matchRolesToAgents({ steps: [step], roles: [role()], onboarded: [] })[0]!;
    expect(none).toMatchObject({
      reason: 'no-onboarded-agent',
    });
    expect(none.resolvedSandbox).toBeUndefined();
    const mismatch = matchRolesToAgents({
      steps: [step],
      roles: [role()],
      onboarded: [agent('codex', '2026-05-26T00:00:00.000Z', ['mcp.echo.read'])],
    })[0]!;
    expect(mismatch).toMatchObject({ reason: 'capability-mismatch' });
    expect(mismatch.resolvedSandbox).toBeUndefined();
  });

  it('validates overrides against wired agents and capabilities', () => {
    const matches = matchRolesToAgents({
      steps: [step],
      roles: [role()],
      onboarded: [
        agent('codex', '2026-05-26T00:00:00.000Z', [...AGENT_CAPABILITIES_BY_KIND.codex]),
        agent('cursor', '2026-05-26T00:00:01.000Z', [...AGENT_CAPABILITIES_BY_KIND.cursor]),
      ],
      override: new Map([['reviewer', 'codex']]),
    });
    expect(matches[0]).toMatchObject({ pickedAgent: 'codex', resolvedSandbox: 'workspace-write' });

    const bad = matchRolesToAgents({
      steps: [step],
      roles: [role()],
      onboarded: [
        agent('cursor', '2026-05-26T00:00:01.000Z', [...AGENT_CAPABILITIES_BY_KIND.cursor]),
      ],
      override: new Map([['reviewer', 'cursor']]),
    });
    expect(bad[0]).toMatchObject({ reason: 'capability-mismatch' });
  });

  it('matches shipped change-review workflow to the default reviewer role and codex profile', () => {
    const workflow = loadWorkflow(join(repoRoot, 'assets/echo-workflows/change-review.toml'));
    const roles = loadRolesFromDir(join(repoRoot, 'assets/echo-roles'), {
      skillsRoot: join(repoRoot, 'assets/echo-skills'),
    });

    const matches = matchRolesToAgents({
      steps: workflow.steps,
      roles,
      onboarded: [
        agent('codex', '2026-05-26T00:00:00.000Z', [...AGENT_CAPABILITIES_BY_KIND.codex]),
        agent('cursor', '2026-05-26T00:00:01.000Z', [...AGENT_CAPABILITIES_BY_KIND.cursor]),
      ],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      role: 'reviewer',
      pickedAgent: 'codex',
      reason: 'matched',
      resolvedSandbox: 'read-only',
    });
  });

  it('uses wired_at ordering for shipped change-review when codex and claude-code both match', () => {
    const workflow = loadWorkflow(join(repoRoot, 'assets/echo-workflows/change-review.toml'));
    const roles = loadRolesFromDir(join(repoRoot, 'assets/echo-roles'), {
      skillsRoot: join(repoRoot, 'assets/echo-skills'),
    });

    const codexFirst = matchRolesToAgents({
      steps: workflow.steps,
      roles,
      onboarded: [
        agent('codex', '2026-05-26T00:00:00.000Z', [...AGENT_CAPABILITIES_BY_KIND.codex]),
        agent('claude-code', '2026-05-26T00:00:01.000Z', [
          ...AGENT_CAPABILITIES_BY_KIND['claude-code'],
        ]),
      ],
    });
    expect(codexFirst[0]!.pickedAgent).toBe('codex');

    const claudeFirst = matchRolesToAgents({
      steps: workflow.steps,
      roles,
      onboarded: [
        agent('codex', '2026-05-26T00:00:01.000Z', [...AGENT_CAPABILITIES_BY_KIND.codex]),
        agent('claude-code', '2026-05-26T00:00:00.000Z', [
          ...AGENT_CAPABILITIES_BY_KIND['claude-code'],
        ]),
      ],
    });
    expect(claudeFirst[0]!.pickedAgent).toBe('claude-code');
  });
});
