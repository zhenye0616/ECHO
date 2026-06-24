export interface CofounderIdentity {
  id: string;
  slack_user_id: string;
  display_name?: string;
}

export function parseCofounderIdentities(raw: string | undefined): CofounderIdentity[] {
  if (raw === undefined || raw.trim() === '') return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('ECHO_TEAM_COFUNDER_IDENTITIES must be a JSON array');
  return parsed.map(parseIdentity);
}

export function resolveCofounderBySlackUser(
  identities: readonly CofounderIdentity[],
  slackUserId: string,
): CofounderIdentity | null {
  const user = slackUserId.trim();
  if (user === '') return null;
  return identities.find((identity) => identity.slack_user_id === user) ?? null;
}

export function confirmAttributionForSlackUser(
  identities: readonly CofounderIdentity[],
  slackUserId: string,
): string {
  return resolveCofounderBySlackUser(identities, slackUserId)?.id ?? slackUserId;
}

function parseIdentity(value: unknown): CofounderIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('cofounder identity must be an object');
  }
  const record = value as Record<string, unknown>;
  const id = stringField(record, 'id');
  const slackUserId = stringField(record, 'slack_user_id');
  const displayName = optionalStringField(record, 'display_name');
  return {
    id,
    slack_user_id: slackUserId,
    ...(displayName !== undefined ? { display_name: displayName } : {}),
  };
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`cofounder identity ${key} is required`);
  }
  return value.trim();
}

function optionalStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`cofounder identity ${key} must be a non-empty string when set`);
  }
  return value.trim();
}
