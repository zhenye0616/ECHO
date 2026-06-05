import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _isAllowedPathIn,
  _isAllowedRepoIn,
  readCaptureSourcesConfig,
} from '../src/capture/sources.js';
import { resolveDataDir, resolveDbPath } from '../src/daemon/lifecycle.js';
import { MemoryStorage } from '../src/storage/memory.js';
import { resolveCommand } from '../src/util/subprocess.js';

describe('R1 — path/source separator normalization', () => {
  it('_isAllowedPathIn matches a backslash path against a forward-slash allowlist', () => {
    const fsPaths = ['C:/Users/me/.codex/sessions/'];
    const windowsPath = 'C:\\Users\\me\\.codex\\sessions\\rollout.jsonl';
    expect(_isAllowedPathIn(windowsPath, fsPaths)).toBe(true);
  });

  it('_isAllowedPathIn enforces a path boundary and case-folds Windows paths', () => {
    expect(_isAllowedPathIn('C:\\FOO\\bar\\baz.jsonl', ['c:/foo'])).toBe(true);
    expect(_isAllowedPathIn('C:\\foobar\\baz.jsonl', ['C:/foo'])).toBe(false);
  });

  it('_isAllowedRepoIn matches a backslash repo path against a forward-slash entry', () => {
    expect(_isAllowedRepoIn('C:\\dev\\Project_echo', ['C:/dev/Project_echo'])).toBe(true);
    expect(_isAllowedRepoIn('C:\\DEV\\Project_echo', ['c:/dev/project_echo'])).toBe(true);
  });

  it('MemoryStorage.query matches a backslash-stored source via a forward-slash prefix', async () => {
    const storage = new MemoryStorage();
    await storage.append({
      source: 'C:\\Users\\me\\.codex\\sessions\\a.jsonl',
      timestamp: '2026-01-01T00:00:00.000Z',
      content: 'separator-token',
    });
    const byPrefix = await storage.query({ source_prefix: 'C:/Users/me/.codex/sessions/' });
    expect(byPrefix).toHaveLength(1);
    const byExact = await storage.query({ source: 'C:/Users/me/.codex/sessions/a.jsonl' });
    expect(byExact).toHaveLength(1);
  });
});

describe('F4 — UTF-8 BOM tolerance', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-bom-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('readCaptureSourcesConfig parses a BOM-prefixed capture-sources.json', () => {
    const file = join(dir, 'capture-sources.json');
    const body = JSON.stringify({
      schema_version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      git_repos: ['/dev/Project_echo'],
    });
    writeFileSync(file, `\ufeff${body}`, 'utf8');
    const config = readCaptureSourcesConfig(file);
    expect(config?.git_repos).toEqual(['/dev/Project_echo']);
  });
});

describe('R2 — cross-platform subprocess resolution', () => {
  it('resolves a Windows .cmd shim through cmd.exe without shell string joining', () => {
    const found = 'C:\\Tools\\codex.CMD';
    const result = resolveCommand('codex', {
      platform: 'win32',
      env: {
        PATH: 'C:\\Tools',
        PATHEXT: '.EXE;.CMD',
        ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      },
      existsSync: (path) => path === found,
    });
    expect(result).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      prependArgs: ['/d', '/s', '/c', found],
    });
  });
});

describe('data dir defaults', () => {
  it('keeps the macOS data dir unchanged', () => {
    expect(resolveDataDir({ platform: 'darwin', env: {}, homeDir: '/Users/me' })).toBe(
      '/Users/me/Library/Application Support/ECHO',
    );
  });

  it('uses LOCALAPPDATA then APPDATA on Windows and keeps ECHO_DATA_DIR highest precedence', () => {
    expect(
      resolveDataDir({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
        homeDir: 'C:\\Users\\me',
      }),
    ).toBe('C:\\Users\\me\\AppData\\Local\\ECHO');
    expect(
      resolveDataDir({
        platform: 'win32',
        env: { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' },
        homeDir: 'C:\\Users\\me',
      }),
    ).toBe('C:\\Users\\me\\AppData\\Roaming\\ECHO');
    expect(
      resolveDbPath({
        platform: 'win32',
        env: { ECHO_DATA_DIR: 'D:\\EchoData', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
        homeDir: 'C:\\Users\\me',
      }),
    ).toBe('D:\\EchoData\\echo.db');
  });

  it('uses XDG_DATA_HOME or ~/.local/share on Linux', () => {
    expect(
      resolveDataDir({ platform: 'linux', env: { XDG_DATA_HOME: '/var/data' }, homeDir: '/home/me' }),
    ).toBe('/var/data/ECHO');
    expect(resolveDataDir({ platform: 'linux', env: {}, homeDir: '/home/me' })).toBe(
      '/home/me/.local/share/ECHO',
    );
  });
});

describe('Codex skill — companion skill install', () => {
  it.todo('src/util/codex-skill exports installCodexSkillFromEchoHome (Ring-2 successor)');
});
