import { detectAgents, type DetectedAgent, type DetectAgentsDeps } from './detect-agents.js';
import {
  detectProjects,
  type DetectedProject,
  type DetectProjectsDeps,
} from './detect-projects.js';
import { probeAgents, type ProbeDeps, type ProbeOutcome } from './probe.js';
import {
  markOnboardingCompleted,
  readOnboardingStateSnapshot,
  updateProbedAgents,
  wire as wireAgents,
  type WireOpts,
  type WireResult,
} from './wire.js';
import type { AgentKind } from './detect-agents.js';
import type { OnboardingState } from '../paths.js';

export interface CreateWizardOpts {
  mcpServerUrl: string;
  echoVersion: string;
  detectAgentsDeps?: DetectAgentsDeps;
  detectProjectsDeps?: DetectProjectsDeps;
  wireDepsOverride?: Partial<WireOpts>;
  probeDeps?: ProbeDeps;
  now?: () => Date;
}

export interface WizardSummary {
  detected: DetectedAgent[] | null;
  projects: DetectedProject[] | null;
  wired: WireResult | null;
  probed: ProbeOutcome[] | null;
  onboardingStateSnapshot: OnboardingState | null;
}

export interface Wizard {
  detectAgents(): Promise<DetectedAgent[]>;
  detectProjects(): Promise<DetectedProject[]>;
  wire(
    opts: Pick<WireOpts, 'selectedAgents' | 'defaultProjectRepoRoot' | 'repoRoot'>,
  ): Promise<WireResult>;
  probe(agents: AgentKind[]): Promise<ProbeOutcome[]>;
  summary(): Promise<WizardSummary>;
  markCompleted(): Promise<void>;
}

export function createWizard(opts: CreateWizardOpts): Wizard {
  let detected: DetectedAgent[] | null = null;
  let projects: DetectedProject[] | null = null;
  let wired: WireResult | null = null;
  let probed: ProbeOutcome[] | null = null;
  const now = opts.now ?? (() => new Date());

  return {
    async detectAgents(): Promise<DetectedAgent[]> {
      detected = await detectAgents({ ...(opts.detectAgentsDeps ?? {}), now: now() });
      return detected;
    },

    async detectProjects(): Promise<DetectedProject[]> {
      projects = await detectProjects({ ...(opts.detectProjectsDeps ?? {}), now: now() });
      return projects;
    },

    async wire(
      wireOpts: Pick<WireOpts, 'selectedAgents' | 'defaultProjectRepoRoot' | 'repoRoot'>,
    ): Promise<WireResult> {
      wired = await wireAgents({
        ...(opts.wireDepsOverride ?? {}),
        ...wireOpts,
        mcpServerUrl: opts.mcpServerUrl,
        echoVersion: opts.echoVersion,
        now: now(),
      });
      return wired;
    },

    async probe(agents: AgentKind[]): Promise<ProbeOutcome[]> {
      const outcomes = await probeAgents(agents, opts.probeDeps);
      probed = outcomes;
      updateProbedAgents(outcomes, now());
      return outcomes;
    },

    async summary(): Promise<WizardSummary> {
      return {
        detected,
        projects,
        wired,
        probed,
        onboardingStateSnapshot: readOnboardingStateSnapshot(),
      };
    },

    async markCompleted(): Promise<void> {
      markOnboardingCompleted(now());
    },
  };
}
