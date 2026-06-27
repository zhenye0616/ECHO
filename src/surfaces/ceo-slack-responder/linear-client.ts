export interface LinearConfig {
  apiKey: string;
  teamId: string;
  inboxStateId: string;
  defaultAssigneeId: string;
  defaultProjectId: string;
  projectMap: Readonly<Record<string, string>>;
}

export interface LinearIssueCreateInput {
  title: string;
  body: string;
  teamId: string;
  projectId: string;
  stateId: string;
  assigneeId: string;
}

export interface LinearIssueCreated {
  id: string;
  url: string;
}

export interface LinearClient {
  createIssue(input: LinearIssueCreateInput): Promise<LinearIssueCreated>;
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface LinearGraphqlResponse {
  data?: {
    issueCreate?: {
      success?: boolean;
      issue?: {
        id?: string;
        url?: string;
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const DEFAULT_TIMEOUT_MS = 10000;

export class LinearGraphqlClient implements LinearClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    requireNonEmpty(apiKey, 'LINEAR_API_KEY');
  }

  async createIssue(input: LinearIssueCreateInput): Promise<LinearIssueCreated> {
    validateCreateInput(input);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(LINEAR_API_URL, {
        method: 'POST',
        headers: {
          Authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          query: `
            mutation EchoCreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id
                  url
                }
              }
            }
          `,
          variables: {
            input: {
              teamId: input.teamId,
              projectId: input.projectId,
              stateId: input.stateId,
              assigneeId: input.assigneeId,
              title: input.title,
              description: input.body,
            },
          },
        }),
      });
      const body = (await response.json()) as LinearGraphqlResponse;
      if (!response.ok) {
        throw new Error(`Linear createIssue failed: HTTP ${response.status}`);
      }
      if (body.errors !== undefined && body.errors.length > 0) {
        throw new Error(`Linear createIssue failed: ${formatLinearErrors(body.errors)}`);
      }
      const issue = body.data?.issueCreate?.issue;
      if (
        body.data?.issueCreate?.success !== true ||
        issue?.id === undefined ||
        issue.url === undefined
      ) {
        throw new Error('Linear createIssue failed: missing created issue id/url');
      }
      return { id: issue.id, url: issue.url };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Linear createIssue timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createLinearClient(
  config: Pick<LinearConfig, 'apiKey'>,
  fetchImpl: FetchLike = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): LinearClient {
  return new LinearGraphqlClient(config.apiKey, fetchImpl, timeoutMs);
}

export function loadLinearConfig(env: NodeJS.ProcessEnv): LinearConfig {
  const apiKey = requiredEnv(env, 'LINEAR_API_KEY');
  const teamId = requiredEnv(env, 'LINEAR_TEAM_ID');
  const inboxStateId = requiredEnv(env, 'LINEAR_INBOX_STATE_ID');
  const defaultAssigneeId = requiredEnv(env, 'LINEAR_DEFAULT_ASSIGNEE_ID');
  const defaultProjectId = requiredEnv(env, 'LINEAR_DEFAULT_PROJECT_ID');
  const projectMap = parseProjectMap(requiredEnv(env, 'LINEAR_PROJECT_MAP'));
  return {
    apiKey,
    teamId,
    inboxStateId,
    defaultAssigneeId,
    defaultProjectId,
    projectMap,
  };
}

export function shouldLoadLinearConfig(env: NodeJS.ProcessEnv): boolean {
  return (
    env.ECHO_LINEAR_INTAKE_ENABLED === '1' ||
    env.ECHO_LINEAR_INTAKE_ENABLED === 'true' ||
    [
      'LINEAR_API_KEY',
      'LINEAR_TEAM_ID',
      'LINEAR_INBOX_STATE_ID',
      'LINEAR_DEFAULT_ASSIGNEE_ID',
      'LINEAR_DEFAULT_PROJECT_ID',
      'LINEAR_PROJECT_MAP',
    ].some((key) => env[key] !== undefined && env[key]?.trim() !== '')
  );
}

export function resolveLinearProjectId(
  clientProject: string | undefined,
  config: LinearConfig,
): string | null {
  const normalized = normalizeProjectName(clientProject ?? '');
  if (normalized === '') return null;
  if (normalized === 'internal' || normalized === 'echo' || normalized === 'no client') {
    return config.defaultProjectId;
  }
  return config.projectMap[normalized] ?? null;
}

export function knownLinearProjectNames(config: Pick<LinearConfig, 'projectMap'>): string[] {
  return Object.keys(config.projectMap).sort((a, b) => a.localeCompare(b));
}

export function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseProjectMap(raw: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`LINEAR_PROJECT_MAP must be JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('LINEAR_PROJECT_MAP must be a JSON object of name to project ID');
  }
  const out: Record<string, string> = {};
  for (const [name, id] of Object.entries(parsed)) {
    if (name.trim() === '' || typeof id !== 'string' || id.trim() === '') {
      throw new Error('LINEAR_PROJECT_MAP entries must be non-empty string project IDs');
    }
    out[normalizeProjectName(name)] = id.trim();
  }
  if (Object.keys(out).length === 0) {
    throw new Error('LINEAR_PROJECT_MAP must include at least one project');
  }
  return out;
}

function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  return requireNonEmpty(value, key);
}

function validateCreateInput(input: LinearIssueCreateInput): void {
  requireNonEmpty(input.title, 'title');
  requireNonEmpty(input.body, 'body');
  requireNonEmpty(input.teamId, 'teamId');
  requireNonEmpty(input.projectId, 'projectId');
  requireNonEmpty(input.stateId, 'stateId');
  requireNonEmpty(input.assigneeId, 'assigneeId');
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function formatLinearErrors(errors: Array<{ message?: string }>): string {
  return errors.map((err) => err.message ?? 'unknown error').join('; ');
}
