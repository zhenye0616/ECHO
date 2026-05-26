import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { ECHO_HOME_PATHS } from '../paths.js';
import { atomicWrite } from '../adapters/atomic-write.js';
import type { AgentKind } from './detect-agents.js';

export interface AdapterCacheRecord {
  schema_version: 1;
  agent: AgentKind;
  last_written_at: string;
  echoSection: string | null;
  mcpServerConfig: Record<string, unknown> | null;
}

export class AdapterCacheError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'AdapterCacheError';
  }
}

function cachePath(kind: AgentKind): string {
  return join(ECHO_HOME_PATHS.adapters, `${kind}.json`);
}

function fail(filePath: string, field: string, message: string): never {
  throw new AdapterCacheError(`${filePath}: ${message}`, filePath, field);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRecord(
  value: unknown,
  filePath: string,
  expectedAgent: AgentKind,
): AdapterCacheRecord {
  if (!isObject(value)) fail(filePath, 'root', 'expected object');
  if (value['schema_version'] !== 1) {
    fail(
      filePath,
      'schema_version',
      `unsupported schema_version ${String(value['schema_version'])}; expected 1`,
    );
  }
  if (value['agent'] !== expectedAgent) {
    fail(filePath, 'agent', `agent must equal ${expectedAgent}`);
  }
  if (typeof value['last_written_at'] !== 'string') {
    fail(filePath, 'last_written_at', 'missing or invalid last_written_at');
  }
  if (typeof value['echoSection'] !== 'string' && value['echoSection'] !== null) {
    fail(filePath, 'echoSection', 'echoSection must be string or null');
  }
  if (value['mcpServerConfig'] !== null && !isObject(value['mcpServerConfig'])) {
    fail(filePath, 'mcpServerConfig', 'mcpServerConfig must be object or null');
  }
  return {
    schema_version: 1,
    agent: expectedAgent,
    last_written_at: value['last_written_at'],
    echoSection: value['echoSection'],
    mcpServerConfig: value['mcpServerConfig'],
  };
}

export function readAdapterCache(kind: AgentKind): AdapterCacheRecord | null {
  const filePath = cachePath(kind);
  if (!existsSync(filePath)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new AdapterCacheError(
      `${filePath}: failed to parse JSON: ${(err as Error).message}`,
      filePath,
    );
  }
  return validateRecord(parsed, filePath, kind);
}

export function writeAdapterCache(record: AdapterCacheRecord): void {
  mkdirSync(ECHO_HOME_PATHS.adapters, { recursive: true });
  atomicWrite({
    filePath: cachePath(record.agent),
    content: `${JSON.stringify(record, null, 2)}\n`,
    secretSensitive: true,
  });
}

export function deleteAdapterCache(kind: AgentKind): void {
  try {
    unlinkSync(cachePath(kind));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}
