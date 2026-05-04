import { mkdtempSync, mkdirSync, rmSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CAPTURED_SOURCES } from '../../../src/capture/sources.js';
import {
  extractClaudeCodeTurns,
  startClaudeCodeExtractor,
  type ClaudeCodeExtractorHandle,
} from '../../../src/capture/extractors/claude-code.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import { resetAllowlist, restoreFsPaths, snapshotFsPaths } from '../../fixtures/allowlist.js';
import { captureStdout } from '../../fixtures/stdout.js';

interface JsonlLine {
  type: 'user' | 'assistant';
  sessionId: string;
  cwd: string;
  message: { role: 'user' | 'assistant'; content: unknown };
  uuid: string;
  timestamp: string;
}

function userText(sessionId: string, uuid: string, text: string, ts = '2026-04-30T10:00:00Z'): JsonlLine {
  return {
    type: 'user',
    sessionId,
    cwd: '/Users/x/proj',
    message: { role: 'user', content: text },
    uuid,
    timestamp: ts,
  };
}

function assistantText(
  sessionId: string,
  uuid: string,
  text: string,
  ts = '2026-04-30T10:00:00Z',
): JsonlLine {
  return {
    type: 'assistant',
    sessionId,
    cwd: '/Users/x/proj',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
    uuid,
    timestamp: ts,
  };
}

function assistantToolUse(sessionId: string, uuid: string): JsonlLine {
  return {
    type: 'assistant',
    sessionId,
    cwd: '/Users/x/proj',
    message: {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { cmd: 'ls' } }],
    },
    uuid,
    timestamp: '2026-04-30T10:00:00Z',
  };
}

function userToolResult(sessionId: string, uuid: string): JsonlLine {
  return {
    type: 'user',
    sessionId,
    cwd: '/Users/x/proj',
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }],
    },
    uuid,
    timestamp: '2026-04-30T10:00:00Z',
  };
}

function writeJsonlFresh(path: string, lines: JsonlLine[]): void {
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : ''));
}

function appendJsonl(path: string, lines: JsonlLine[]): void {
  appendFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : ''));
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

describe('extractClaudeCodeTurns (pure)', () => {
  let dir: string;
  let captured: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-cc-'));
    captured = captureStdout();
  });

  afterEach(() => {
    captured.restore();
    rmSync(dir, { recursive: true, force: true });
  });

  it('parses the static fixture: turns paired correctly, tools surfaced via had_tool_use', async () => {
    const fixturePath = join(__dirname, '..', '..', 'fixtures', 'claude-code-session.jsonl');
    const { turns, newOffset } = await extractClaudeCodeTurns(fixturePath, 0);

    expect(turns.map((t) => [t.user_message, t.assistant_message])).toEqual([
      ['First question', 'First answer'],
      ['Now with tools', 'Found two files.'],
      ['Thanks', "You're welcome"],
    ]);
    expect(turns[0]?.had_tool_use).toBe(false);
    expect(turns[1]?.had_tool_use).toBe(true);
    expect(turns[2]?.had_tool_use).toBe(false);
    expect(turns.every((t) => t.session_id === 'claude-code-session')).toBe(true);
    expect(turns.every((t) => t.byte_offset > 0)).toBe(true);
    // newOffset matches file size since the fixture ends with a newline.
    const fixtureSize = readFileSync(fixturePath).length;
    expect(newOffset).toBe(fixtureSize);
  });

  it('returns all turns when reading from offset 0 on a fresh JSONL', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [
      userText('s1', 'u1', 'Q1'),
      assistantText('s1', 'a1', 'A1'),
      userText('s1', 'u2', 'Q2'),
      assistantText('s1', 'a2', 'A2'),
    ]);

    const { turns, newOffset } = await extractClaudeCodeTurns(path, 0);
    expect(turns).toHaveLength(2);
    expect(turns[0]?.user_message).toBe('Q1');
    expect(turns[0]?.assistant_message).toBe('A1');
    expect(turns[1]?.user_message).toBe('Q2');
    expect(turns[0]?.byte_offset).toBeLessThan(turns[1]!.byte_offset);
    expect(newOffset).toBe(readFileSync(path).length);
  });

  it('resumes from a prior newOffset and returns only newly-appended turns', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    const first = await extractClaudeCodeTurns(path, 0);
    expect(first.turns).toHaveLength(1);

    appendJsonl(path, [userText('s1', 'u2', 'Q2'), assistantText('s1', 'a2', 'A2')]);
    const second = await extractClaudeCodeTurns(path, first.newOffset);
    expect(second.turns).toHaveLength(1);
    expect(second.turns[0]?.user_message).toBe('Q2');
    expect(second.newOffset).toBe(readFileSync(path).length);
  });

  it('partial line: bytes without trailing newline are NOT consumed; next call after newline returns full turn', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    const first = await extractClaudeCodeTurns(path, 0);

    // Append a partial line (no trailing newline)
    const partial = JSON.stringify(userText('s1', 'u2', 'Q2'));
    appendFileSync(path, partial);
    const second = await extractClaudeCodeTurns(path, first.newOffset);
    expect(second.turns).toHaveLength(0);
    expect(second.newOffset).toBe(first.newOffset);

    // Complete the line, then add the assistant
    appendFileSync(path, '\n');
    appendFileSync(path, JSON.stringify(assistantText('s1', 'a2', 'A2')) + '\n');
    const third = await extractClaudeCodeTurns(path, second.newOffset);
    expect(third.turns).toHaveLength(1);
    expect(third.turns[0]?.user_message).toBe('Q2');
    expect(third.newOffset).toBe(readFileSync(path).length);
  });

  it('incomplete turn (only user, no assistant yet) emits zero turns', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1')]);
    const { turns, newOffset } = await extractClaudeCodeTurns(path, 0);
    expect(turns).toHaveLength(0);
    expect(newOffset).toBe(readFileSync(path).length);
  });

  it('drops orphan assistant (no preceding user) and warns', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [
      assistantText('s1', 'a1', 'orphan'),
      userText('s1', 'u1', 'Q1'),
      assistantText('s1', 'a2', 'A1'),
    ]);
    const { turns } = await extractClaudeCodeTurns(path, 0);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_message).toBe('Q1');
    expect(captured.writes.join('')).toContain('orphan_assistant');
  });

  it('skips malformed JSON lines and continues', async () => {
    const path = join(dir, 'sess.jsonl');
    const lines = [
      JSON.stringify(userText('s1', 'u1', 'Q1')),
      '{not valid json',
      JSON.stringify(assistantText('s1', 'a1', 'A1')),
    ];
    writeFileSync(path, lines.join('\n') + '\n');
    const { turns } = await extractClaudeCodeTurns(path, 0);
    expect(turns).toHaveLength(1);
  });

  it('byte_offset on emitted turn equals the offset just past the assistant line', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    const fileSize = readFileSync(path).length;
    const { turns } = await extractClaudeCodeTurns(path, 0);
    expect(turns[0]?.byte_offset).toBe(fileSize);
  });

  it('handles tool-only assistant followed by orphan-text assistant: tool flag persists', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [
      userText('s1', 'u1', 'Q1'),
      assistantToolUse('s1', 'a1'),
      userToolResult('s1', 'u2'),
      assistantText('s1', 'a2', 'tool-mediated answer'),
    ]);
    const { turns } = await extractClaudeCodeTurns(path, 0);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.user_message).toBe('Q1');
    expect(turns[0]?.assistant_message).toBe('tool-mediated answer');
    expect(turns[0]?.had_tool_use).toBe(true);
  });

  it('returns no turns and same offset when file does not exist', async () => {
    const { turns, newOffset } = await extractClaudeCodeTurns(join(dir, 'missing.jsonl'), 0);
    expect(turns).toHaveLength(0);
    expect(newOffset).toBe(0);
  });

  it('returns no turns and same offset when offset is at or past EOF', async () => {
    const path = join(dir, 'sess.jsonl');
    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    const fileSize = readFileSync(path).length;
    const r = await extractClaudeCodeTurns(path, fileSize);
    expect(r.turns).toHaveLength(0);
    expect(r.newOffset).toBe(fileSize);
  });
});

describe('startClaudeCodeExtractor (lifecycle + integration)', () => {
  let dir: string;
  let projectsPrefix: string;
  let projDir: string;
  let storage: MemoryStorage;
  let handle: ClaudeCodeExtractorHandle | null = null;
  let originalFsPaths: string[];
  let captured: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    originalFsPaths = snapshotFsPaths();
    dir = mkdtempSync(join(tmpdir(), 'echo-cc-int-'));
    projectsPrefix = `${dir}/projects/`;
    projDir = join(projectsPrefix, 'my-proj');
    mkdirSync(projDir, { recursive: true });
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

  it('emits one CandidateEvent per turn through the pipeline on file growth', async () => {
    handle = await startClaudeCodeExtractor(storage, { projectsPrefix });
    const path = join(projDir, 'sess.jsonl');

    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    await waitFor(async () => (await storage.count()) >= 1);

    const events = await storage.query();
    expect(events).toHaveLength(1);
    const evt = events[0]!;
    expect(evt.source).toBe(`fs:${path}`);
    expect(evt.content).toBe('USER: Q1\n\nASSISTANT: A1');
    expect(evt.metadata).toMatchObject({
      project: 'my-proj',
      session_id: 'sess',
      turn_index: 0,
    });
    expect(evt.metadata).toHaveProperty('byte_offset');
  });

  it('populates metadata.repo_root from the cwd field on JSONL lines', async () => {
    handle = await startClaudeCodeExtractor(storage, { projectsPrefix });
    const path = join(projDir, 'sess.jsonl');

    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    await waitFor(async () => (await storage.count()) >= 1);

    const evt = (await storage.query())[0]!;
    expect((evt.metadata as Record<string, unknown>)['repo_root']).toBe('/Users/x/proj');
  });

  it('end-to-end: chronological appends produce ordered, non-duplicate events', async () => {
    handle = await startClaudeCodeExtractor(storage, { projectsPrefix });
    const path = join(projDir, 'sess.jsonl');

    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    await waitFor(async () => (await storage.count()) >= 1);

    appendJsonl(path, [userText('s1', 'u2', 'Q2'), assistantText('s1', 'a2', 'A2')]);
    await waitFor(async () => (await storage.count()) >= 2);

    appendJsonl(path, [userText('s1', 'u3', 'Q3'), assistantText('s1', 'a3', 'A3')]);
    await waitFor(async () => (await storage.count()) >= 3);

    const events = await storage.query();
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.content)).toEqual([
      'USER: Q1\n\nASSISTANT: A1',
      'USER: Q2\n\nASSISTANT: A2',
      'USER: Q3\n\nASSISTANT: A3',
    ]);
    expect(events.map((e) => (e.metadata as Record<string, unknown>)['turn_index'])).toEqual([0, 1, 2]);
  });

  it('backfills offset map from prior storage events; resumes without duplicating', async () => {
    const path = join(projDir, 'sess.jsonl');
    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    const fileSize = readFileSync(path).length;

    // Pre-populate storage as if a prior daemon run had emitted this turn.
    await storage.append({
      source: `fs:${path}`,
      timestamp: '2026-04-30T00:00:00Z',
      content: 'USER: Q1\n\nASSISTANT: A1',
      metadata: {
        project: 'my-proj',
        session_id: 'sess',
        turn_index: 0,
        byte_offset: fileSize,
      },
    });

    handle = await startClaudeCodeExtractor(storage, { projectsPrefix });
    appendJsonl(path, [userText('s1', 'u2', 'Q2'), assistantText('s1', 'a2', 'A2')]);
    await waitFor(async () => (await storage.count()) >= 2);

    const events = await storage.query();
    expect(events).toHaveLength(2);
    const fresh = events.find((e) => e.timestamp !== '2026-04-30T00:00:00Z')!;
    expect(fresh.content).toBe('USER: Q2\n\nASSISTANT: A2');
    expect((fresh.metadata as Record<string, unknown>)['turn_index']).toBe(1);
  });

  it('stop() resolves cleanly and prevents further events', async () => {
    handle = await startClaudeCodeExtractor(storage, { projectsPrefix });
    const path = join(projDir, 'sess.jsonl');

    writeJsonlFresh(path, [userText('s1', 'u1', 'Q1'), assistantText('s1', 'a1', 'A1')]);
    await waitFor(async () => (await storage.count()) >= 1);
    const before = await storage.count();

    await handle.stop();
    handle = null;

    appendJsonl(path, [userText('s1', 'u2', 'Q2'), assistantText('s1', 'a2', 'A2')]);
    await new Promise((r) => setTimeout(r, 300));
    expect(await storage.count()).toBe(before);
  });
});
