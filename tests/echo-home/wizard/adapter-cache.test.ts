import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpRoot: string;
let echoHome: string;
let originalEchoHome: string | undefined;

async function loadModule(): Promise<
  typeof import('../../../src/echo-home/wizard/adapter-cache.js')
> {
  return import('../../../src/echo-home/wizard/adapter-cache.js');
}

async function loadPaths(): Promise<typeof import('../../../src/echo-home/paths.js')> {
  return import('../../../src/echo-home/paths.js');
}

describe('adapter cache', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-073-adapter-cache-'));
    echoHome = join(tmpRoot, 'echo-home');
    process.env.ECHO_HOME = echoHome;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('returns null when the cache file is missing', async () => {
    const { readAdapterCache } = await loadModule();
    expect(readAdapterCache('codex')).toBeNull();
  });

  it('writes and reads the same record', async () => {
    const { readAdapterCache, writeAdapterCache } = await loadModule();
    const record = {
      schema_version: 1 as const,
      agent: 'codex' as const,
      last_written_at: '2026-05-25T10:00:00.000Z',
      echoSection: '# ECHO\n',
      mcpServerConfig: { url: 'http://127.0.0.1:38478' },
    };
    writeAdapterCache(record);
    expect(readAdapterCache('codex')).toEqual(record);
  });

  it('throws AdapterCacheError for unsupported schema_version', async () => {
    const { ECHO_HOME_PATHS } = await loadPaths();
    mkdirSync(ECHO_HOME_PATHS.adapters, { recursive: true });
    writeFileSync(
      join(ECHO_HOME_PATHS.adapters, 'codex.json'),
      JSON.stringify({ schema_version: 2, agent: 'codex' }),
    );
    const { readAdapterCache, AdapterCacheError } = await loadModule();
    expect(() => readAdapterCache('codex')).toThrow(AdapterCacheError);
    expect(() => readAdapterCache('codex')).toThrow('schema_version');
  });

  it('throws AdapterCacheError naming a missing required field', async () => {
    const { ECHO_HOME_PATHS } = await loadPaths();
    mkdirSync(ECHO_HOME_PATHS.adapters, { recursive: true });
    writeFileSync(
      join(ECHO_HOME_PATHS.adapters, 'codex.json'),
      JSON.stringify({
        schema_version: 1,
        agent: 'codex',
        echoSection: null,
        mcpServerConfig: null,
      }),
    );
    const { readAdapterCache } = await loadModule();
    expect(() => readAdapterCache('codex')).toThrow('last_written_at');
  });

  it('recreates the adapters directory on write', async () => {
    const { ECHO_HOME_PATHS } = await loadPaths();
    mkdirSync(ECHO_HOME_PATHS.adapters, { recursive: true });
    rmSync(ECHO_HOME_PATHS.adapters, { recursive: true, force: true });
    const { writeAdapterCache } = await loadModule();
    writeAdapterCache({
      schema_version: 1,
      agent: 'cursor',
      last_written_at: '2026-05-25T10:00:00.000Z',
      echoSection: null,
      mcpServerConfig: { url: 'http://127.0.0.1:38478' },
    });
    expect(existsSync(join(ECHO_HOME_PATHS.adapters, 'cursor.json'))).toBe(true);
  });

  it('writes cache files without group/other readable permission bits', async () => {
    const { ECHO_HOME_PATHS } = await loadPaths();
    const { writeAdapterCache } = await loadModule();
    writeAdapterCache({
      schema_version: 1,
      agent: 'claude-code',
      last_written_at: '2026-05-25T10:00:00.000Z',
      echoSection: '# ECHO\n',
      mcpServerConfig: null,
    });
    const mode = statSync(join(ECHO_HOME_PATHS.adapters, 'claude-code.json')).mode & 0o777;
    expect(mode & 0o600).toBe(0o600);
    expect(mode & 0o077).toBe(0);
    expect(readFileSync(join(ECHO_HOME_PATHS.adapters, 'claude-code.json'), 'utf8')).toContain(
      'claude-code',
    );
  });
});
