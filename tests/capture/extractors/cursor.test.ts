import { mkdtempSync, mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPTURED_SOURCES, _isAllowedPathIn } from '../../../src/capture/sources.js';
import {
  CURSOR_REPOLL_INTERVAL_MS,
  extractCursorTurns,
  maxGlobalDbFamilyMtime,
  startCursorExtractor,
  tryExtractCodeBlocksText,
  tryExtractFileDiffText,
  tryExtractThinkingText,
  tryExtractToolFormerText,
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

  it('extracts attached_files / referenced_files / deleted_files into turn.context', async () => {
    const bubbles: FixtureBubble[] = [
      {
        composer_id: 'c1',
        bubble_id: 'u1',
        type: 1,
        text: 'fix README',
        attachedFileCodeChunksUris: ['/proj/README.md'],
      },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: 'looking…',
        codeBlocks: [{ path: '/proj/README.md', languageId: 'markdown' }],
      },
      {
        composer_id: 'c1',
        bubble_id: 'a2',
        type: 2,
        text: 'wrote it + cleaned up',
        codeBlocks: [
          { path: '/proj/README.md', languageId: 'markdown' }, // dedup target
          { path: '/proj/src/index.ts', languageId: 'typescript' },
        ],
        deletedFiles: ['/proj/old/legacy.md'],
      },
    ];
    createGlobalStorageFixture(dbPath, bubbles);
    const turns = await extractCursorTurns(dbPath, new Map());

    expect(turns).toHaveLength(1);
    expect(turns[0]?.context).toEqual({
      attached_files: ['/proj/README.md'],
      referenced_files: [
        { path: '/proj/README.md', language: 'markdown' },
        { path: '/proj/src/index.ts', language: 'typescript' },
      ],
      deleted_files: ['/proj/old/legacy.md'],
    });
  });

  it('omits turn.context entirely when no bubble carried any extracted context', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'hi' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'hello back' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);
    const turns = await extractCursorTurns(dbPath, new Map());

    expect(turns).toHaveLength(1);
    expect(turns[0]?.context).toBeUndefined();
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

  // Gap 2 (V1.5.7, surfaced 2026-05-08 17:01 PDT v1.5-livetest): when the
  // checkpoint lands inside an extended assistant cluster (Cursor streamed
  // more assistant bubbles after ECHO captured an earlier partial state),
  // the new bubbles should NOT be flagged as orphans. Pre-fix: ~250 spam
  // warnings per chokidar event × 1232 minutes = 902,716 warnings on the
  // same already-captured composers. Post-fix: silent fast-forward, no
  // warnings, and any subsequent REAL user turn captures cleanly.
  it('streaming continuation: assistant bubbles after the checkpoint are silently fast-forwarded (Gap 2)', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q1' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'a1-partial' },
      // Cursor extends the cluster after ECHO captured the partial state:
      { composer_id: 'c1', bubble_id: 'a2', type: 2, text: 'a1-extended-1' },
      { composer_id: 'c1', bubble_id: 'a3', type: 2, text: 'a1-extended-2' },
      // A second user turn arrives after the extended cluster:
      { composer_id: 'c1', bubble_id: 'u2', type: 1, text: 'q2' },
      { composer_id: 'c1', bubble_id: 'a4', type: 2, text: 'a2' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    // ECHO captured the partial state at a1 (single-asst cluster). Now
    // re-extracting with that checkpoint: a2 + a3 are extension bubbles
    // (silently skipped, not orphaned), and the q2/a4 turn is captured.
    const turns = await extractCursorTurns(dbPath, new Map([['c1', 'a1']]));
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_bubble_id).toBe('u2');
    expect(turns[0]?.assistant_bubble_id).toBe('a4');
    // CRITICAL: zero orphan warnings for the streaming-continuation bubbles.
    expect(captured.writes.join('')).not.toContain('orphan_assistant_bubble');
  });

  it('streaming continuation: empty store (no user after extension) emits zero turns + zero warnings', async () => {
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'partial' },
      { composer_id: 'c1', bubble_id: 'a2', type: 2, text: 'extended' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    const turns = await extractCursorTurns(dbPath, new Map([['c1', 'a1']]));
    expect(turns).toHaveLength(0);
    expect(captured.writes.join('')).not.toContain('orphan_assistant_bubble');
  });

  it('first-pass orphans (no checkpoint) still warn loudly — fix is scoped to the streaming-continuation case', async () => {
    // True orphans (assistant before any user, with no checkpoint)
    // remain warned. The Gap 2 fix only quietens the post-checkpoint
    // assistant case.
    const bubbles: FixtureBubble[] = [
      { composer_id: 'c1', bubble_id: 'b1', type: 2, text: 'orphan-asst' },
      { composer_id: 'c1', bubble_id: 'b2', type: 1, text: 'late-user' },
      { composer_id: 'c1', bubble_id: 'b3', type: 2, text: 'paired-asst' },
    ];
    createGlobalStorageFixture(dbPath, bubbles);

    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
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

// SKIPPED: every test in this block exercises the chokidar/FSEvents watcher
// lifecycle, and a chokidar `watcher.close()` race during teardown produces
// erratic flake under load. Across baseline and verification runs the failing
// test rotates unpredictably through the block (workspace_id, lastSeenMap,
// stop(), end-to-end appends, files_referenced flatten/omit, CandidateEvent
// emission, etc.), so per-test skips can't catch the moving target. The block
// is quarantined wholesale by item 2026-05-08-023-chokidar-flake-quarantine;
// test bodies are intact for when the underlying race is fixed.
describe.skip('startCursorExtractor (lifecycle + integration)', () => {
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
    const events = await storage.query({ order: 'asc' });
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
    const events = await storage.query({ order: 'asc' });
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
    const events = await storage.query({ order: 'asc' });
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
    const events = await storage.query({ order: 'asc' });
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
    const events = await storage.query({ order: 'asc' });
    const evt = events[0]!;
    expect(evt.metadata).toMatchObject({
      composer_id: 'c1',
      workspace_id: wsHash,
    });
  });

  it('populates session_id as the composer_id (canonical alias for cross-source correlation)', async () => {
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'composer-xyz', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'composer-xyz', bubble_id: 'b2', type: 2, text: 'a' },
    ]);

    await waitFor(async () => (await storage.count()) >= 1);
    const events = await storage.query({ order: 'asc' });
    const md = events[0]!.metadata as Record<string, unknown>;
    expect(md['session_id']).toBe('composer-xyz');
    expect(md['composer_id']).toBe('composer-xyz');
  });

  it('flattens turn.context paths into a deduped metadata.files_referenced array', async () => {
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    createGlobalStorageFixture(globalDbPath, [
      {
        composer_id: 'c1',
        bubble_id: 'u1',
        type: 1,
        text: 'fix README',
        attachedFileCodeChunksUris: ['/proj/README.md'],
      },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: 'looking',
        codeBlocks: [
          { path: '/proj/README.md', languageId: 'markdown' }, // dedup with attached
          { path: '/proj/src/index.ts', languageId: 'typescript' },
        ],
        deletedFiles: ['/proj/old/legacy.md'],
      },
    ]);

    await waitFor(async () => (await storage.count()) >= 1);
    const events = await storage.query({ order: 'asc' });
    const md = events[0]!.metadata as Record<string, unknown>;
    expect(md['files_referenced']).toEqual([
      '/proj/README.md',
      '/proj/src/index.ts',
      '/proj/old/legacy.md',
    ]);
  });

  it('omits metadata.files_referenced when no bubble carried any file references', async () => {
    handle = await startCursorExtractor(storage, { globalDbPath, workspacePrefix });

    createGlobalStorageFixture(globalDbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'hi' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'hello back' },
    ]);

    await waitFor(async () => (await storage.count()) >= 1);
    const events = await storage.query({ order: 'asc' });
    const md = events[0]!.metadata as Record<string, unknown>;
    expect(md).not.toHaveProperty('files_referenced');
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

    const events = await storage.query({ order: 'asc' });
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
    const events = await storage.query({ order: 'asc' });
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

// AC2 — Parse-time fallback chain for tool-call / non-text bubble shapes.
// These tests target the pure parsers + extractCursorTurns directly so they
// live outside the chokidar quarantine. Item 034.
describe('parseBubbleRow fallback chain (AC2 — item 034)', () => {
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

  // Fixture (a) — pure text (regression: AC2 must not break the 99% path).
  it('case (a): pure text bubble emits with bubble_text_sources omitted', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'plain answer' },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_message).toBe('plain answer');
    // No-bloat 99% case: bubble_text_sources omitted when every bubble used 'text'.
    expect(turns[0]?.bubble_text_sources).toBeUndefined();
  });

  // Fixture (b) — toolFormerData only (assistant has no top-level text).
  it('case (b): toolFormerData-only bubble derives text + records source', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'run the tool' },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: '',
        toolFormerData: { text: 'tool produced this output' },
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_message).toBe('tool produced this output');
    expect(turns[0]?.bubble_text_sources).toEqual(['toolFormerData']);
  });

  // Fixture (c) — attachedHumanChanges.fileDiff only.
  it('case (c): attachedHumanChanges.fileDiff-only bubble derives text + records source', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'apply changes' },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: '',
        attachedHumanChanges: { fileDiff: '--- a/x\n+++ b/x\n@@ +line @@' },
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_message).toContain('+line');
    expect(turns[0]?.bubble_text_sources).toEqual(['fileDiff']);
  });

  // Fixture (d) — codeBlocks with body (positive case).
  it('case (d): codeBlocks with non-empty content body derives text + records source', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'show me code' },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: '',
        codeBlocks: [{ languageId: 'ts', content: 'const x = 1;' }],
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_message).toContain('const x = 1;');
    expect(turns[0]?.bubble_text_sources).toEqual(['codeBlocks']);
  });

  // Fixture (e) — codeBlocks path-only (NEGATIVE case from R1 Codex Finding 2).
  it('case (e): codeBlocks with only uri.path (no body) does NOT synthesize fake prose', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'ref this file' },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: '',
        codeBlocks: [{ path: '/proj/x.ts', languageId: 'ts' }],
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    // The user has no surviving assistant cluster → no turn emitted; the warn
    // records that the fallback chain returned nothing (no fake assistant
    // prose was synthesized from the path-only reference).
    expect(turns).toHaveLength(0);
    expect(captured.writes.join('')).toContain('missing_text_and_fallbacks');
  });

  // Fixture (f) — thinkingContent only.
  it('case (f): thinkingContent-only bubble derives text + records source', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'think hard' },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: '',
        thinkingContent: 'reasoning trace contents',
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_message).toBe('reasoning trace contents');
    expect(turns[0]?.bubble_text_sources).toEqual(['thinkingContent']);
  });

  // Fixture (g) — all four fallbacks present; precedence pinned: tfd wins.
  it('case (g): all fallbacks present → first-non-empty precedence (toolFormerData wins)', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'go' },
      {
        composer_id: 'c1',
        bubble_id: 'a1',
        type: 2,
        text: '',
        toolFormerData: { text: 'TFD-WINS' },
        attachedHumanChanges: { fileDiff: 'diff-loser' },
        codeBlocks: [{ content: 'code-loser' }],
        thinkingContent: 'think-loser',
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_message).toBe('TFD-WINS');
    expect(turns[0]?.bubble_text_sources).toEqual(['toolFormerData']);
  });

  // Fixture (h) — none of the above (empty bubble → silently dropped at
  // debug level, NOT warn). Cursor ships placeholder/cancelled bubbles
  // with no content fields; warning on these spams the log without
  // surfacing anything actionable. Real parser gaps (case (e)) still warn.
  it('case (h): bubble with no text and no fallback fields drops silently (no warn)', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: '' },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(0);
    expect(captured.writes.join('')).not.toContain('missing_text_and_fallbacks');
    expect(captured.writes.join('')).not.toContain('unrecognized_bubble_shape');
  });

  // Fixture (i) — multi-bubble cluster with mixed sources.
  // Validates R1 Codex Finding 1: bubble_text_sources is per-bubble plural,
  // not a singular field that loses per-bubble variation.
  it('case (i): multi-bubble cluster records bubble_text_sources per bubble', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'multi-step' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'I will think then code' },
      {
        composer_id: 'c1',
        bubble_id: 'a2',
        type: 2,
        text: '',
        toolFormerData: { text: 'tool ran' },
      },
      {
        composer_id: 'c1',
        bubble_id: 'a3',
        type: 2,
        text: '',
        codeBlocks: [{ languageId: 'ts', content: 'export const y = 2;' }],
      },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.assistant_bubble_ids).toEqual(['a1', 'a2', 'a3']);
    expect(turns[0]?.bubble_text_sources).toEqual(['text', 'toolFormerData', 'codeBlocks']);
  });

  // Fixture (j) — single-bubble 'text' cluster → bubble_text_sources omitted.
  it('case (j): single-bubble text-only cluster omits bubble_text_sources entirely', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'a' },
    ]);
    const turns = await extractCursorTurns(dbPath, new Map());
    expect(turns).toHaveLength(1);
    expect(turns[0]?.bubble_text_sources).toBeUndefined();
  });

  // Direct parser unit checks: each tryExtract* parser returns null on
  // shape mismatch and never throws. These cover the "≤30 lines, never
  // throw" contract from Implementation Notes.
  it('parsers return null on shape mismatch and never throw', () => {
    expect(tryExtractToolFormerText({})).toBeNull();
    expect(tryExtractToolFormerText({ toolFormerData: 'string-not-object' })).toBeNull();
    expect(tryExtractToolFormerText({ toolFormerData: { text: '' } })).toBeNull();
    expect(tryExtractToolFormerText({ toolFormerData: { params: {} } })).toBeNull();

    expect(tryExtractFileDiffText({})).toBeNull();
    expect(tryExtractFileDiffText({ attachedHumanChanges: {} })).toBeNull();
    expect(tryExtractFileDiffText({ attachedHumanChanges: { fileDiff: '' } })).toBeNull();

    expect(tryExtractCodeBlocksText({})).toBeNull();
    expect(tryExtractCodeBlocksText({ codeBlocks: [] })).toBeNull();
    expect(tryExtractCodeBlocksText({ codeBlocks: [{ uri: { path: '/p' } }] })).toBeNull();

    expect(tryExtractThinkingText({})).toBeNull();
    expect(tryExtractThinkingText({ thinkingContent: '' })).toBeNull();
    expect(tryExtractThinkingText({ thinkingContent: {} })).toBeNull();
  });
});

// AC1 — Periodic re-poll path. Tests use the `__testHooks` seam (per the
// R2 contract) to invoke `triggerRepollExtraction()` directly so they
// don't depend on chokidar firing or on real-time setInterval ticks.
// Item 034.
describe('startCursorExtractor periodic re-poll (AC1 — item 034)', () => {
  let dir: string;
  let dbPath: string;
  let storage: MemoryStorage;
  let handle: CursorExtractorHandle | null = null;
  let originalFsPaths: string[];
  let captured: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    originalFsPaths = snapshotFsPaths();
    dir = tmpDir();
    dbPath = join(dir, 'state.vscdb');
    storage = new MemoryStorage();
    captured = captureStdout();
    (CAPTURED_SOURCES.fs_paths as unknown as string[]).push(`${dir}/`);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    captured.restore();
    resetAllowlist();
    restoreFsPaths(originalFsPaths);
    rmSync(dir, { recursive: true, force: true });
  });

  // Test 1 — first tick after checkpoint reset captures seeded fixture.
  // R2 Codex Finding 3: the checkpoint auto-inits at extractor start to
  // the current family-max mtime, so a naive "seed → start → trigger →
  // expect atom" short-circuits. The fix is to reset the checkpoint via
  // __testHooks.setLastSeenScanMtime(0) immediately after start.
  it('test 1: first tick after checkpoint reset captures seeded fixture (1 pair → 1 atom)', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000, // large so real setInterval never fires during the test
      exposeTestHooks: true,
    });
    handle.__testHooks!.setLastSeenScanMtime(0);
    await handle.__testHooks!.triggerRepoll();
    expect(await storage.count()).toBe(1);
  });

  // Test 2 — no mtime change → short-circuit.
  it('test 2: second tick with no mtime change short-circuits (no new atom)', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
    });
    handle.__testHooks!.setLastSeenScanMtime(0);
    await handle.__testHooks!.triggerRepoll();
    const after1 = await storage.count();
    // Trigger again with no DB mutation in between.
    await handle.__testHooks!.triggerRepoll();
    expect(await storage.count()).toBe(after1);
  });

  // Test 3 — mtime advances → run captures new pair.
  it('test 3: mtime advances between ticks → second tick captures new pair (1 → 2 atoms)', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q1' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a1' },
    ]);
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
    });
    handle.__testHooks!.setLastSeenScanMtime(0);
    await handle.__testHooks!.triggerRepoll();
    expect(await storage.count()).toBe(1);

    appendBubble(dbPath, { composer_id: 'c1', bubble_id: 'b3', type: 1, text: 'q2' });
    appendBubble(dbPath, { composer_id: 'c1', bubble_id: 'b4', type: 2, text: 'a2' });
    // Force state.vscdb mtime forward to ensure the guard sees an advance.
    const future = new Date(Date.now() + 5000);
    utimesSync(dbPath, future, future);
    await handle.__testHooks!.triggerRepoll();
    expect(await storage.count()).toBe(2);
  });

  // Test 4 — WAL mtime advances while state.vscdb mtime stays stale.
  // R2 Codex HIGH #1: SQLite WAL mode can advance state.vscdb-wal mtime
  // while the main DB's mtime is frozen until the next checkpoint.
  // Reading only state.vscdb's mtime would miss the writes; the
  // family-max guard must detect the -wal advance.
  it('test 4 (WAL-only): -wal mtime advances → family-max guard detects + scan runs', async () => {
    createGlobalStorageFixture(dbPath, [
      { composer_id: 'c1', bubble_id: 'b1', type: 1, text: 'q' },
      { composer_id: 'c1', bubble_id: 'b2', type: 2, text: 'a' },
    ]);
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
    });
    // Lock state.vscdb at a known mtime T0; reset checkpoint to T0
    // (matches the main DB → main-DB alone would NOT advance the guard).
    const t0Date = new Date(Date.now() - 5000);
    utimesSync(dbPath, t0Date, t0Date);
    const t0 = statSync(dbPath).mtimeMs;
    handle.__testHooks!.setLastSeenScanMtime(t0);

    // Create -wal with FUTURE mtime; do NOT touch state.vscdb. The
    // family-max should now be > checkpoint.
    const walPath = `${dbPath}-wal`;
    writeFileSync(walPath, '');
    const futureDate = new Date(Date.now() + 5000);
    utimesSync(walPath, futureDate, futureDate);

    const beforeMax = await maxGlobalDbFamilyMtime(dbPath);
    expect(beforeMax).toBeGreaterThan(t0);

    await handle.__testHooks!.triggerRepoll();
    // The pre-seeded pair was already in the DB before the extractor
    // started; with checkpoint reset to T0 (state.vscdb mtime) and -wal
    // advanced beyond it, the trigger must run the scan and capture
    // the pair.
    expect(await storage.count()).toBe(1);

    // Counter: touch state.vscdb to an OLDER timestamp, with no -wal
    // advance → maxMtime falls below checkpoint → short-circuit.
    const olderHandle = await startCursorExtractor(new MemoryStorage(), {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
    });
    try {
      const olderStorage = (olderHandle as unknown as { _storage?: never })._storage;
      void olderStorage;
      const veryFuture = new Date(Date.now() + 999_999);
      olderHandle.__testHooks!.setLastSeenScanMtime(veryFuture.getTime());
      // No file mutation; current max < checkpoint → short-circuit.
      const beforeTrigger = olderHandle.__testHooks!.getLastSeenScanMtime();
      await olderHandle.__testHooks!.triggerRepoll();
      // Checkpoint unchanged (guard short-circuited before updating it).
      expect(olderHandle.__testHooks!.getLastSeenScanMtime()).toBe(beforeTrigger);
    } finally {
      await olderHandle.stop();
    }
  });
});

// AC3 integration — end-to-end revert mechanism. These tests prove that
// each fix (periodic re-poll, fallback chain) is independently
// load-bearing for the 8-pair mixed-shape demo fixture. Item 034.
describe('startCursorExtractor 034 revert-mechanism (AC3 — item 034)', () => {
  let dir: string;
  let dbPath: string;
  let storage: MemoryStorage;
  let handle: CursorExtractorHandle | null = null;
  let originalFsPaths: string[];
  let captured: ReturnType<typeof captureStdout>;

  // 8-pair fixture: pairs 1 + 2 have text-only assistants; pair 3's
  // assistant is tool-call-only (drops without fallbacks → loop breaks
  // because u3 has no surviving assistant). Pairs 4–8 mix toolFormerData,
  // fileDiff, codeBlocks body, thinkingContent; all need the fallback
  // chain to capture.
  function eightPairFixture(): FixtureBubble[] {
    return [
      { composer_id: 'c1', bubble_id: 'u1', type: 1, text: 'q1' },
      { composer_id: 'c1', bubble_id: 'a1', type: 2, text: 'a1-text' },
      { composer_id: 'c1', bubble_id: 'u2', type: 1, text: 'q2' },
      { composer_id: 'c1', bubble_id: 'a2', type: 2, text: 'a2-text' },
      { composer_id: 'c1', bubble_id: 'u3', type: 1, text: 'q3-runs-tool' },
      {
        composer_id: 'c1',
        bubble_id: 'a3',
        type: 2,
        text: '',
        toolFormerData: { text: 'tool-output-3' },
      },
      { composer_id: 'c1', bubble_id: 'u4', type: 1, text: 'q4-diff' },
      {
        composer_id: 'c1',
        bubble_id: 'a4',
        type: 2,
        text: '',
        attachedHumanChanges: { fileDiff: 'diff-4' },
      },
      { composer_id: 'c1', bubble_id: 'u5', type: 1, text: 'q5-code' },
      {
        composer_id: 'c1',
        bubble_id: 'a5',
        type: 2,
        text: '',
        codeBlocks: [{ languageId: 'ts', content: 'const z = 5;' }],
      },
      { composer_id: 'c1', bubble_id: 'u6', type: 1, text: 'q6-think' },
      {
        composer_id: 'c1',
        bubble_id: 'a6',
        type: 2,
        text: '',
        thinkingContent: 'reasoning-6',
      },
      { composer_id: 'c1', bubble_id: 'u7', type: 1, text: 'q7' },
      { composer_id: 'c1', bubble_id: 'a7', type: 2, text: 'a7-text' },
      { composer_id: 'c1', bubble_id: 'u8', type: 1, text: 'q8-tool' },
      {
        composer_id: 'c1',
        bubble_id: 'a8',
        type: 2,
        text: '',
        toolFormerData: { text: 'tool-output-8' },
      },
    ];
  }

  beforeEach(() => {
    originalFsPaths = snapshotFsPaths();
    dir = tmpDir();
    dbPath = join(dir, 'state.vscdb');
    storage = new MemoryStorage();
    captured = captureStdout();
    (CAPTURED_SOURCES.fs_paths as unknown as string[]).push(`${dir}/`);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (handle !== null) {
      await handle.stop();
      handle = null;
    }
    captured.restore();
    resetAllowlist();
    restoreFsPaths(originalFsPaths);
    rmSync(dir, { recursive: true, force: true });
  });

  // Control — both fixes active. Periodic re-poll captures all 8 pairs.
  it('control (both fixes active): all 8 pairs reach storage.append', async () => {
    createGlobalStorageFixture(dbPath, eightPairFixture());
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
    });
    handle.__testHooks!.setLastSeenScanMtime(0);
    await handle.__testHooks!.triggerRepoll();
    expect(await storage.count()).toBe(8);
  });

  // Cadence-gap revert — only the first tick fires. Seeds 2 pairs, runs
  // the tick (captures 2), then seeds 6 more pairs WITHOUT triggering
  // another tick. With fake timers the chokidar-driven setTimeout never
  // fires either, so the second batch sits uncaptured — proving the
  // periodic re-poll is what closes the cadence gap.
  it('cadence-gap revert (no second tick): ≥ 3 turn-pairs missing → proves AC1 load-bearing', async () => {
    const all = eightPairFixture();
    // Seed first 2 pairs (4 bubbles).
    createGlobalStorageFixture(dbPath, all.slice(0, 4));
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
    });
    handle.__testHooks!.setLastSeenScanMtime(0);
    await handle.__testHooks!.triggerRepoll();
    expect(await storage.count()).toBe(2);

    // Seed remaining 6 pairs into the SAME DB; chokidar fires `change`
    // events but the debounced setTimeout never resolves under fake
    // timers, simulating "only initial chokidar fired" — and we do NOT
    // call triggerRepoll() again.
    for (const b of all.slice(4)) appendBubble(dbPath, b);

    // No extra trigger. Storage still at 2.
    expect(await storage.count()).toBe(2);
    // 8 - 2 = 6 missing pairs → ≥ 3 as required by the spec.
  });

  // Parse-gap revert — __disableToolCallFallbacks restores V1 behavior
  // (drop bubbles with missing text). With the 8-pair fixture, pair 3's
  // tool-call-only assistant drops, the cluster loop breaks, and only
  // pairs 1–2 capture. Proves the fallback chain is what closes the
  // parse gap.
  it('parse-gap revert (__disableToolCallFallbacks): ≥ 3 turn-pairs missing → proves AC2 load-bearing', async () => {
    createGlobalStorageFixture(dbPath, eightPairFixture());
    handle = await startCursorExtractor(storage, {
      globalDbPath: dbPath,
      workspacePrefix: `${dir}/workspaceStorage/`,
      repollIntervalMs: 60_000,
      exposeTestHooks: true,
      __disableToolCallFallbacks: true,
    });
    handle.__testHooks!.setLastSeenScanMtime(0);
    await handle.__testHooks!.triggerRepoll();
    // Pairs 1 + 2 capture; pair 3's a3 drops (no .text, fallbacks
    // disabled), u3 has no surviving assistant follow-up, loop breaks.
    // 6 pairs missing.
    expect(await storage.count()).toBeLessThanOrEqual(2);
    expect(8 - (await storage.count())).toBeGreaterThanOrEqual(3);
  });
});

// Configuration sanity — the source-constant default and the override
// option are the only knobs. No process.env.* lookup was added. Item 034.
describe('CURSOR_REPOLL_INTERVAL_MS configuration (AC1 — item 034)', () => {
  it('source constant is 15_000 ms', () => {
    expect(CURSOR_REPOLL_INTERVAL_MS).toBe(15_000);
  });
});
