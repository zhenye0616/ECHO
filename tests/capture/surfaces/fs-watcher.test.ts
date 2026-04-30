import { mkdtempSync, rmSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CAPTURED_SOURCES, _isAllowedPathIn } from '../../../src/capture/sources.js';
import {
  classifyKind,
  startFsWatcher,
  type FsWatcherHandle,
} from '../../../src/capture/surfaces/fs-watcher.js';
import type { CaptureEvent } from '../../../src/storage/interface.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import { captureStdout } from '../../fixtures/stdout.js';

function resetAllowlist(): void {
  const apps = CAPTURED_SOURCES.apps as Record<string, unknown>;
  const domains = CAPTURED_SOURCES.domains as Record<string, unknown>;
  const fsPaths = CAPTURED_SOURCES.fs_paths as unknown as string[];
  const apis = CAPTURED_SOURCES.apis as unknown as string[];
  for (const k of Object.keys(apps)) delete apps[k];
  for (const k of Object.keys(domains)) delete domains[k];
  fsPaths.length = 0;
  apis.length = 0;
}

async function waitForCount(
  storage: MemoryStorage,
  target: number,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const n = await storage.count();
    if (n >= target) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`storage count never reached ${target}; current=${await storage.count()}`);
}

interface FsContent {
  event_type: string;
  path: string;
  mtime?: string;
  size?: number;
}

function parseContent(evt: CaptureEvent): FsContent {
  return JSON.parse(evt.content) as FsContent;
}

describe('startFsWatcher', () => {
  let dir: string;
  let storage: MemoryStorage;
  let handle: FsWatcherHandle | null = null;
  let originalFsPaths: string[];
  let restoreStdout: () => void;

  beforeEach(() => {
    // Snapshot the production allowlist so we can restore after each test
    const fsPaths = CAPTURED_SOURCES.fs_paths as unknown as string[];
    originalFsPaths = [...fsPaths];

    dir = mkdtempSync(join(tmpdir(), 'echo-fs-watcher-'));
    storage = new MemoryStorage();
    ({ restore: restoreStdout } = captureStdout());

    // Test-only allowlist mutation: include the temp dir as a prefix entry
    fsPaths.push(`${dir}/`);
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    restoreStdout();
    resetAllowlist();
    // Restore the production fs_paths entries snapshotted at beforeEach
    const fsPaths = CAPTURED_SOURCES.fs_paths as unknown as string[];
    for (const p of originalFsPaths) fsPaths.push(p);
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits an add event when a file is created', async () => {
    handle = await startFsWatcher([dir], storage);

    const filePath = join(dir, 'a.txt');
    writeFileSync(filePath, 'hello');

    await waitForCount(storage, 1);
    const all = await storage.query();
    const evt = all[0]!;
    expect(evt.source).toBe(`fs:${filePath}`);
    const content = parseContent(evt);
    expect(content.event_type).toBe('add');
    expect(content.path).toBe(filePath);
    expect(typeof content.mtime).toBe('string');
    expect(typeof content.size).toBe('number');
    expect(evt.metadata).toEqual({ surface: 'fs' });
  });

  it('emits a change event when a file is modified', async () => {
    const filePath = join(dir, 'b.txt');
    writeFileSync(filePath, 'first');

    handle = await startFsWatcher([dir], storage);

    appendFileSync(filePath, ' second');

    await waitForCount(storage, 1);
    const all = await storage.query();
    const matching = all.filter((e) => e.source === `fs:${filePath}`);
    expect(matching.length).toBeGreaterThanOrEqual(1);
    const types = matching.map((e) => parseContent(e).event_type);
    expect(types).toContain('change');
  });

  it('emits an unlink event when a file is deleted (no size in content)', async () => {
    const filePath = join(dir, 'c.txt');
    writeFileSync(filePath, 'gone soon');

    handle = await startFsWatcher([dir], storage);

    unlinkSync(filePath);

    await waitForCount(storage, 1);
    const all = await storage.query();
    const matching = all.filter((e) => parseContent(e).event_type === 'unlink');
    expect(matching.length).toBeGreaterThanOrEqual(1);
    const c = parseContent(matching[0]!);
    expect(c.path).toBe(filePath);
    expect(c.size).toBeUndefined();
  });

  it('does not fire for files that already exist when the watcher starts', async () => {
    const pre = join(dir, 'pre.txt');
    writeFileSync(pre, 'already here');
    // Let macOS FSEvents flush the create-event for pre.txt before the watcher
    // starts, so chokidar's initial-scan suppression (ignoreInitial=true) sees
    // it as old, not a fresh post-ready event.
    await new Promise((r) => setTimeout(r, 600));

    handle = await startFsWatcher([dir], storage);

    await new Promise((r) => setTimeout(r, 300));
    expect(await storage.count()).toBe(0);

    // A subsequent change should still fire
    const newer = join(dir, 'new.txt');
    writeFileSync(newer, 'fresh');
    await waitForCount(storage, 1);
  });

  it('stop() resolves and prevents further events from being captured', async () => {
    handle = await startFsWatcher([dir], storage);
    writeFileSync(join(dir, 'one.txt'), 'a');
    await waitForCount(storage, 1);
    const before = await storage.count();

    await handle.stop();
    handle = null;

    writeFileSync(join(dir, 'two.txt'), 'b');
    await new Promise((r) => setTimeout(r, 300));
    expect(await storage.count()).toBe(before);
  });
});

describe('classifyKind', () => {
  it("returns 'cursor-workspace' for paths under the Cursor workspace prefix", () => {
    const path = `${process.env['HOME']!}/Library/Application Support/Cursor/User/workspaceStorage/abc/state.vscdb`;
    expect(classifyKind(path)).toBe('cursor-workspace');
  });

  it("returns 'claude-project' for paths under ~/.claude/projects/", () => {
    const path = `${process.env['HOME']!}/.claude/projects/foo/session.jsonl`;
    expect(classifyKind(path)).toBe('claude-project');
  });

  it('returns undefined for unrelated paths', () => {
    expect(classifyKind('/tmp/foo.txt')).toBeUndefined();
  });
});

describe('_isAllowedPathIn tilde expansion (FS allowlist contract)', () => {
  it('accepts a Cursor workspace file under the tilde-prefixed allowlist entry', () => {
    const home = process.env['HOME']!;
    const concretePath = `${home}/Library/Application Support/Cursor/User/workspaceStorage/abc/state.vscdb`;
    const allowlist = ['~/Library/Application Support/Cursor/User/workspaceStorage/'];
    expect(_isAllowedPathIn(concretePath, allowlist)).toBe(true);
  });

  it('accepts a Claude Code project file under ~/.claude/projects/', () => {
    const home = process.env['HOME']!;
    const concretePath = `${home}/.claude/projects/foo/session.jsonl`;
    const allowlist = ['~/.claude/projects/'];
    expect(_isAllowedPathIn(concretePath, allowlist)).toBe(true);
  });

  it("rejects sibling paths that don't share the prefix", () => {
    const home = process.env['HOME']!;
    expect(
      _isAllowedPathIn(`${home}/Library/Other/foo`, [
        '~/Library/Application Support/Cursor/User/workspaceStorage/',
      ]),
    ).toBe(false);
  });

  it('confirms the production CAPTURED_SOURCES.fs_paths covers the two intended prefixes', () => {
    const fsPaths = CAPTURED_SOURCES.fs_paths as unknown as string[];
    expect(fsPaths).toContain('~/Library/Application Support/Cursor/User/workspaceStorage/');
    expect(fsPaths).toContain('~/.claude/projects/');
  });
});
