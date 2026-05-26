import type { OnboardedAgentProfile } from '../../echo-home/paths.js';
import type { Role, RoleSandbox } from '../../echo-home/roles.js';
import type { AgentKind } from '../../echo-home/wizard/detect-agents.js';
import type { WorkflowStep } from './load.js';

export interface AgentMatch {
  role: string;
  pickedAgent: AgentKind | null;
  reason: 'matched' | 'no-onboarded-agent' | 'role-unknown' | 'capability-mismatch';
  resolvedSandbox?: RoleSandbox;
}

function isAgentKind(value: string): value is AgentKind {
  return value === 'codex' || value === 'claude-code' || value === 'cursor';
}

function hasCapabilities(agent: OnboardedAgentProfile, role: Role): boolean {
  const capabilities = new Set(agent.capabilities);
  return role.requires.capabilities.every((capability) => capabilities.has(capability));
}

function byWiredAt(a: OnboardedAgentProfile, b: OnboardedAgentProfile): number {
  return String(a.wired_at).localeCompare(String(b.wired_at));
}

function picked(profile: OnboardedAgentProfile, role: Role): AgentMatch {
  return {
    role: role.name,
    pickedAgent: profile.id as AgentKind,
    reason: 'matched',
    resolvedSandbox: role.sandbox,
  };
}

export function matchRolesToAgents(opts: {
  steps: readonly WorkflowStep[];
  roles: readonly Role[];
  onboarded: readonly OnboardedAgentProfile[];
  override?: ReadonlyMap<string, AgentKind>;
}): readonly AgentMatch[] {
  const rolesByName = new Map(opts.roles.map((role) => [role.name, role]));
  return opts.steps.map((step) => {
    const role = rolesByName.get(step.role);
    if (role === undefined) {
      return { role: step.role, pickedAgent: null, reason: 'role-unknown' };
    }
    const pool = opts.onboarded.filter((agent) => isAgentKind(agent.id) && agent.wired_at !== null);
    const override = opts.override?.get(step.role);
    if (override !== undefined) {
      const profile = pool.find((agent) => agent.id === override);
      if (profile === undefined) {
        return { role: step.role, pickedAgent: null, reason: 'no-onboarded-agent' };
      }
      if (!hasCapabilities(profile, role)) {
        return { role: step.role, pickedAgent: null, reason: 'capability-mismatch' };
      }
      return picked(profile, role);
    }
    if (pool.length === 0) {
      return { role: step.role, pickedAgent: null, reason: 'no-onboarded-agent' };
    }
    const candidates = pool.filter((agent) => hasCapabilities(agent, role)).sort(byWiredAt);
    if (candidates[0] === undefined) {
      return { role: step.role, pickedAgent: null, reason: 'capability-mismatch' };
    }
    return picked(candidates[0], role);
  });
}
