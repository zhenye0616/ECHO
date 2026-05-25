import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { Ajv, type AnySchema, type ValidateFunction } from 'ajv';
import { isNonEmptyString } from '../guards.js';

const root = isNonEmptyString(process.env['ECHO_HOME'])
  ? resolve(process.env['ECHO_HOME'])
  : join(homedir(), '.echo');

export const ECHO_HOME_PATHS = Object.freeze({
  root,
  skills: join(root, 'skills'),
  roles: join(root, 'roles'),
  adapters: join(root, 'adapters'),
  state: join(root, 'state'),
  stateOnboarding: join(root, 'state', 'onboarding.json'),
  stateProjects: join(root, 'state', 'projects.json'),
});

export interface OnboardingState {
  schema_version: 1;
  created_at: string;
  last_updated_at: string;
  completed: boolean;
  agents: OnboardedAgentProfile[];
}

export interface OnboardedAgentProfile {
  id: 'codex' | 'claude-code' | 'cursor' | string;
  detected_at: string;
  wired_at: string | null;
  probed_at: string | null;
  capabilities: string[];
  wire_error: string | null;
}

export interface ProjectsState {
  schema_version: 1;
  last_refreshed_at: string;
  default_project: string | null;
  projects: ProjectRecord[];
}

export interface ProjectRecord {
  repo_root: string;
  last_seen: string;
  source_breakdown: Record<string, number>;
}

const onboardingStateSchema: AnySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'created_at', 'last_updated_at', 'completed', 'agents'],
  properties: {
    schema_version: { const: 1 },
    created_at: { type: 'string' },
    last_updated_at: { type: 'string' },
    completed: { type: 'boolean' },
    agents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'detected_at', 'wired_at', 'probed_at', 'capabilities', 'wire_error'],
        properties: {
          id: { type: 'string' },
          detected_at: { type: 'string' },
          wired_at: { type: ['string', 'null'] },
          probed_at: { type: ['string', 'null'] },
          capabilities: { type: 'array', items: { type: 'string' } },
          wire_error: { type: ['string', 'null'] },
        },
      },
    },
  },
};

const projectsStateSchema: AnySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'last_refreshed_at', 'default_project', 'projects'],
  properties: {
    schema_version: { const: 1 },
    last_refreshed_at: { type: 'string' },
    default_project: { type: ['string', 'null'] },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['repo_root', 'last_seen', 'source_breakdown'],
        properties: {
          repo_root: { type: 'string' },
          last_seen: { type: 'string' },
          source_breakdown: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
        },
      },
    },
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });

export const validateOnboardingState: ValidateFunction<OnboardingState> =
  ajv.compile<OnboardingState>(onboardingStateSchema);

export const validateProjectsState: ValidateFunction<ProjectsState> =
  ajv.compile<ProjectsState>(projectsStateSchema);
