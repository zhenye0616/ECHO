import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _isAllowedPathIn,
  _isAllowedRepoIn,
  readCaptureSourcesConfig,
} from '../src/capture/sources.js';
import { MemoryStorage } from '../src/storage/memory.js';

// 090 quarantine: this is the cross-platform red board, not a voting gate yet.
// 091 un-skips the F4/R1/R2 rows when the actual src/ compat fixes land.

describe.skip('R1 — path/source separator normalization (unskip in 091)', () => {
  it('_isAllowedPathIn matches a backslash path against a forward-slash allowlist', () => {
    const fsPaths = ['C:/Users/me/.codex/sessions/'];
    const windowsPath = 'C:\\Users\\me\\.codex\\sessions\\rollout.jsonl';
    expect(_isAllowedPathIn(windowsPath, fsPaths)).toBe(true);
  });

  it('_isAllowedRepoIn matches a backslash repo path against a forward-slash entry', () => {
    expect(_isAllowedRepoIn('C:\\dev\\Project_echo', ['C:/dev/Project_echo'])).toBe(true);
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

describe.skip('F4 — UTF-8 BOM tolerance (unskip in 091)', () => {
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
  it.todo('src/util/subprocess exports resolveCommandForSpawn (unskip in 091)');
});

describe('Codex skill — companion skill install', () => {
  it.todo('src/util/codex-skill exports installCodexSkillFromEchoHome (Ring-2 successor)');
});
