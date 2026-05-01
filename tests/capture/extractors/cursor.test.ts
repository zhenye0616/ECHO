import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CAPTURED_SOURCES, _isAllowedPathIn } from '../../../src/capture/sources.js';
import {
  extractCursorTurns,
  startCursorExtractor,
  type CursorExtractorHandle,
} from '../../../src/capture/extractors/cursor.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import { resetAllowlist, restoreFsPaths, snapshotFsPaths } from '../../fixtures/allowlist.js';
import {
  appendBubble,
  appendRawCursorDiskKVRow,
  createGlobalStorageFixture,
  createSchemaUnrecognizedFixture,
  createWorkspaceFixture,
  type FixtureBubble,
} from '../../fixtures/cursor-globalstorage.js';
import { captureStdout } from '../../fixtures/stdout.js';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'echo-cursor-'));
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('waitFor: timeout');
}

describe('extractCursorTurns (pure)', () => {
  let dir: string;
  let dbPath: string;
  let captured: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    dir = tmpDir();
    dbPath = join(dir, 'state.vscdb');
    captured = captureStdout();
  });

  afterEach(() => {
    captured.restore();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns all complete turns when lastSeenMap is empty', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'hello' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'hi back' },
      { composer_id: 'c1', bubble_id: 'b3', type: 1, text: 'follow up' },
      { composer_id: 'c1', bubble_id: 'b4', type: 2, text: 'response' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({
      composer_id: 'c1',
      user_bubble_id: 'b1',
      assistant_bubble_id: 'b2',
      user_message: 'hello',
      assistant_message: 'hi back',
    });
    expect(turns[1]).toMatchObject({
      user_bubble_id: 'b3',
      assistant_bubble_id: 'b4',
    });
    expect(turns[0]?.workspace_id).toBeUndefined();
  });

  it('tracks multiple composers independently', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'cA', bubble_id: 'b1', type: 1, text: 'a-q' },
      { composer_id: 'cA', bubble_id: 'b2', type: 2, text: 'a-a' },
      { composer_id: 'cB', bubble_id: 'b1', type: 1, text: 'b-q' },
      { composer_id: 'cB', bubble_id: 'b2', type: 2, text: 'b-a' },
    ];
    createGlobalStorageFixture(dbPath, bubbles, {
      composers: { cA: { createdAt: 100 }, cB: { createdAt: 200 } },
    });

    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(2);
    const composers = new Set(turns.map((t) => t.composer_id));
    expect(composers).toEqual(new Set(['cA', 'cB']));
  });

  it('returns only bubbles after the per-composer checkpoint', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'old-q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'old-a' },
      { composer_id: 'c1', bubble_id: 'b3', type: 1, text: 'new-q' },
      { composer_id: 'c1', bubble_id: 'b4', type: 2, text: 'new-a' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    const map = new Map<string, string>([['c1', 'b2']]);
    const turns = await extractCursorTurns(dbPath, map);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_bubble_id).toBe('b3');
    expect(turns[0]?.assistant_bubble_id).toBe('b4');
  });

  it('emits zero turns for a user-only trailing bubble; emits one once the assistant arrives', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'pending' },
    ]);

    const map = new Map<string, string>();
    let turns = await extractCursorTurns(dbPath, map);
    expect(turns).toHaveLength(0);

    appendBubble(dbPath, {
      composer_id: 'c1',
      bubble_id: 'b2',
      type: 2,
      text: 'finally',
    });
    turns = await extractCursorTurns(dbPath, map);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_bubble_id).toBe('b1');
    expect(turns[0]?.assistant_bubble_id).toBe('b2');
  });

  it('pairs one user bubble with all consecutive assistant bubbles (Cursor often splits responses)', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'fix the bug' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'thinking...' },
      { composer_id: 'c1', bubble_id: 'a2', type: 2, text: 'I see the issue' },
      { composer_id: 'c1', bubble_id: 'a3', type: 2, text: 'here is the fix' },
      { composer_id: 'c1', bubble_id: 'u2', type: 1, text: 'thanks' },
      { composer_id: 'c1', bubble_id: 'a4', type: 2, text: 'no problem' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);
    const turns = await extractCursorTurns(dbPath, new Map());

    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({
      user_bubble_id: 'u1',
      assistant_bubble_id: 'a3', // last bubble in cluster — used as checkpoint
      assistant_bubble_ids: ['a1', 'a2', 'a3'],
      user_message: 'fix the bug',
      assistant_message: 'thinking...\n\nI see the issue\n\nhere is the fix',
    });
    expect(turns[1]).toMatchObject({
      user_bubble_id: 'u2',
      assistant_bubble_id: 'a4',
      assistant_bubble_ids: ['a4'],
      assistant_message: 'no problem',
    });
  });

  it('uses the cluster-last bubble as the resume checkpoint (multi-assistant turns)', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q1' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'a1-part-1' },
      { composer_id: 'c1', bubble_id: 'a2', type: 2, text: 'a1-part-2' },
      { composer_id: 'c1', bubble_id: 'u2', type: 1, text: 'q2' },
      { composer_id: 'c1', bubble_id: 'a3', type: 2, text: 'a2' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    // Resuming from the LAST bubble of the first cluster should yield only the
    // second turn — proving the checkpoint advances correctly across clusters.
    const turns = await extractCursorTurns(dbPath, new Map([['c1', 'a2']]));
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_bubble_id).toBe('u2');
    expect(turns[0]?.assistant_bubble_id).toBe('a3');
  });

  it('logs warn and drops orphan assistant bubble (no preceding user)', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'b1', type: 2, text: 'orphan' },
      { composer_id: 'c1', bubble_id: 'b2', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b3', type: 2, text: 'a' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_bubble_id).toBe('b2');
    expect(captured.writes.join('')).toContain('orphan_assistant_bubble');
  });

  it('produces zero events and warns when cursorDiskKV table is missing', async () => {
    createSchemaUnrecognizedFixture(dbPath);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(0);
    expect(captured.writes.join('')).toContain('schema_unrecognized');
  });

  it('warns and returns empty when the DB file does not exist', async () => {
    const turns = await extractCursorTurns(join(dir, 'missing.vscdb'), new Map());
    expect(turns).toHaveLength(0);
    expect(captured.writes.join('')).toContain('open_failed');
  });

  it('warns and skips composer when checkpoint bubble is no longer present', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    const map = new Map<string, string>([['c1', 'b-evicted']]);
    const turns = await extractCursorTurns(dbPath, map);
    expect(turns).toHaveLength(0);
    expect(captured.writes.join('')).toContain('checkpoint_not_found');
  });

  it('warns and skips bubbles with malformed JSON or unrecognized type values', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    appendRawCursorDiskKVRow(dbPath, 'bubbleId:c1:b3', '{not valid json');
    appendRawCursorDiskKVRow(
      dbPath,
      'bubbleId:c1:b4',
      JSON.stringify({ _v: 3, type: 99, text: 'unknown', bubbleId: 'b4' }),
    );
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_bubble_id).toBe('b1');
    const log = captured.writes.join('');
    expect(log).toContain('unrecognized_bubble_shape');
    expect(log).toContain('json_parse');
    expect(log).toContain('unknown_type');
  });

  it('warns when a bubble has no parent composerData row', async () => {
    // A bubble row with a composer_id that has no corresponding composerData entry
    // should be dropped with `unrecognized_bubble_shape: no_composer_row`.
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    appendRawCursorDiskKVRow(
      dbPath,
      'bubbleId:c-orphan:bX',
      JSON.stringify({ _v: 3, type: 1, text: 'no parent', bubbleId: 'bX' }),
    );
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(captured.writes.join('')).toContain('no_composer_row');
  });
});

describe('startCursorExtractor (lifecycle + integration)', () => {
  let dir: string;
  let globalDbPath: string;
  let workspacePrefix: string;
  let storage: MemoryStorage;
  let handle: CursorExtractorHandle | null = null;
  let originalFsPaths: string[];
  let captured: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    originalFsPaths = snapshotFsPaths();
    dir = tmpDir();
    workspacePrefix = `${dir}/workspaceStorage/`;
    mkdirSync(workspacePrefix, { recursive: true });
    globalDbPath = join(dir, 'state.vscdb');
    storage = new MemoryStorage();
    captured = captureStdout();
    (CAPTURED_SOURCES.fs_paths as unknown as string[]).push(`${dir}/`);
  });

  afterEach(async () => {
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    captured.restore();
    resetAllowlist();
    restoreFsPaths(originalFsPaths);
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits a CandidateEvent per turn through the pipeline on globalStorage change', async () => {
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    createGlobalStorageFixture(
      globalDbPath,
      [
        { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q1' },
        { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a1' },
      ],
      { composerCreatedAt: 1000 },
    );

    await waitFor(async () => (await storage.count()) >= 1);
    const events = await storage.query();
    expect(events).toHaveLength(1);
    const evt = events[0]!;
    expect(evt.source).toBe(`fs:${globalDbPath}`);
    expect(evt.content).toBe('USER: q1\n\nASSISTANT: a1');
    expect(evt.timestamp).toBe(new Date(1001).toISOString());
    expect(evt.metadata).toMatchObject({
      composer_id: 'c1',
      user_bubble_id: 'b1',
      assistant_bubble_id: 'b2',
    });
    expect(evt.metadata).not.toHaveProperty('workspace_id');
  });

  it('emits a CandidateEvent when the globalStorage WAL changes', async () => {
    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q1' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a1' },
    ]);
    const walPath = `${globalDbPath}-wal`;
    writeFileSync(walPath, '');

    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    const touchedAt = new Date(Date.now() + 1000);
    utimesSync(walPath, touchedAt, touchedAt);

    await waitFor(async () => (await storage.count()) >= 1);
    const events = await storage.query();
    expect(events).toHaveLength(1);
    expect(events[0]!.source).toBe(`fs:${globalDbPath}`);
    expect(events[0]!.content).toBe('USER: q1\n\nASSISTANT: a1');
  });

  it('coalesces rapid globalStorage WAL changes into one emitted capture', async () => {
    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q1' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a1' },
    ]);
    const walPath = `${globalDbPath}-wal`;
    writeFileSync(walPath, '');

    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    for (let i = 0; i < 3; i += 1) {
      const touchedAt = new Date(Date.now() + 1000 + i * 1000);
      utimesSync(walPath, touchedAt, touchedAt);
    }

    await waitFor(async () => (await storage.count()) >= 1);
    await new Promise((r) => setTimeout(r, 150));
    const events = await storage.query();
    expect(events).toHaveLength(1);
    expect(events[0]!.content).toBe('USER: q1\n\nASSISTANT: a1');
  });

  it('emits distinct timestamps for multiple turns flushed in a single FS event', async () => {
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    createGlobalStorageFixture(
      globalDbPath,
      [
        { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q1' },
        { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a1' },
        { composer_id: 'c1', bubble_id: 'b3', type: 1, text: 'q2' },
        { composer_id: 'c1', bubble_id: 'b4', type: 2, text: 'a2' },
      ],
      { composerCreatedAt: 1000 },
    );

    await waitFor(async () => (await storage.count()) >= 2);
    const events = await storage.query();
    expect(events).toHaveLength(2);
    const timestamps = events.map((e) => e.timestamp);
    expect(new Set(timestamps).size).toBe(2);
    expect(timestamps).toEqual([new Date(1001).toISOString(), new Date(1003).toISOString()]);
  });

  it('populates workspace_id when the per-workspace inference index has the composer', async () => {
    const wsHash = 'ws-abc';
    const wsDir = join(workspacePrefix, wsHash);
    mkdirSync(wsDir, { recursive: true });
    const wsDbPath = join(wsDir, 'state.vscdb');

    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    // Create the workspace DB AFTER the watcher is ready so chokidar sees the
    // 'add' event and the workspace-inference handler runs before the global
    // chat is created.
    createWorkspaceFixture(wsDbPath, ['c1']);

    // Wait for the watcher to process the workspace add. waitFor on an
    // observable side-effect would be ideal, but the map is internal — so
    // sleep briefly. The serialized processing chain ensures the workspace
    // event is handled before the global event below.
    await new Promise((r) => setTimeout(r, 200));

    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);

    await waitFor(async () => (await storage.count()) >= 1);
    const events = await storage.query();
    const evt = events[0]!;
    expect(evt.metadata).toMatchObject({
      composer_id: 'c1',
      workspace_id: wsHash,
    });
  });

  it('end-to-end: chronological appends produce ordered, non-duplicate turns', async () => {
    createGlobalStorageFixture(globalDbPath, []);
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    const turnPairs: FixtureBubble[][] = [
      [
        { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q1' },
        { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a1' },
      ],
      [
        { composer_id: 'c1', bubble_id: 'b3', type: 1, text: 'q2' },
        { composer_id: 'c1', bubble_id: 'b4', type: 2, text: 'a2' },
      ],
      [
        { composer_id: 'c1', bubble_id: 'b5', type: 1, text: 'q3' },
        { composer_id: 'c1', bubble_id: 'b6', type: 2, text: 'a3' },
      ],
    ];

    let expected = 0;
    for (const pair of turnPairs) {
      for (const b of pair) appendBubble(globalDbPath, b);
      expected += 1;
      await waitFor(async () => (await storage.count()) >= expected);
    }

    const events = await storage.query();
    expect(events).toHaveLength(3);
    const userBubbleIds = events.map(
      (e) => (e.metadata as Record<string, unknown>)['user_bubble_id'],
    );
    expect(userBubbleIds).toEqual(['b1', 'b3', 'b5']);
    const contents = events.map((e) => e.content);
    expect(contents).toEqual([
      'USER: q1\n\nASSISTANT: a1',
      'USER: q2\n\nASSISTANT: a2',
      'USER: q3\n\nASSISTANT: a3',
    ]);
  });

  it('backfills lastSeenMap from prior storage events on boot', async () => {
    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'old-q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'old-a' },
    ]);

    await storage.append({
      source: `fs:${globalDbPath}`,
      timestamp: '2026-04-30T00:00:00Z',
      content: 'USER: old-q\n\nASSISTANT: old-a',
      metadata: { composer_id: 'c1', user_bubble_id: 'b1', assistant_bubble_id: 'b2' },
    });

    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    appendBubble(globalDbPath, {
      composer_id: 'c1',
      bubble_id: 'b3',
      type: 1,
      text: 'new-q',
    });
    appendBubble(globalDbPath, {
      composer_id: 'c1',
      bubble_id: 'b4',
      type: 2,
      text: 'new-a',
    });

    await waitFor(async () => (await storage.count()) >= 2);
    const events = await storage.query();
    expect(events).toHaveLength(2);
    const fresh = events.find((e) => e.timestamp !== '2026-04-30T00:00:00Z');
    expect(fresh).toBeDefined();
    expect(fresh!.metadata).toMatchObject({
      composer_id: 'c1',
      user_bubble_id: 'b3',
      assistant_bubble_id: 'b4',
    });
  });

  it('stop() resolves cleanly and prevents further events', async () => {
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });
    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    await waitFor(async () => (await storage.count()) >= 1);
    const before = await storage.count();

    await handle.stop();
    handle = null;

    appendBubble(globalDbPath, {
      composer_id: 'c1',
      bubble_id: 'b3',
      type: 1,
      text: 'q2',
    });
    appendBubble(globalDbPath, {
      composer_id: 'c1',
      bubble_id: 'b4',
      type: 2,
      text: 'a2',
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(await storage.count()).toBe(before);
  });
});

describe('CAPTURED_SOURCES allowlist update for globalStorage', () => {
  it('declares globalStorage path under fs_paths', () => {
    expect(CAPTURED_SOURCES.fs_paths).toContain(
      '~/Library/Application Support/Cursor/User/globalStorage/',
    );
  });

  it('_isAllowedPathIn accepts a globalStorage path under the allowlist entry', () => {
    const home = process.env['HOME']!;
    const path = `${home}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
    expect(_isAllowedPathIn(path, CAPTURED_SOURCES.fs_paths)).toBe(true);
  });
});
