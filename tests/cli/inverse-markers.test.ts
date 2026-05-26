import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BEGIN_MARKER, END_MARKER } from '../../src/echo-home/adapters/markers.js';
import { stripEchoMarkers } from '../../src/cli/inverse/markers.js';

let tmpRoot: string;

describe('stripEchoMarkers', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-inverse-markers-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('removes only the ECHO marker block', () => {
    const path = join(tmpRoot, 'AGENTS.md');
    writeFileSync(
      path,
      `user before\n\n${BEGIN_MARKER}\necho owned\n${END_MARKER}\n\nuser after\n`,
    );

    const result = stripEchoMarkers({ filePath: path });

    expect(result.action).toBe('stripped');
    expect(readFileSync(path, 'utf8')).toBe('user before\nuser after\n');
  });

  it('reports malformed markers and symlinks as conflicts', () => {
    const malformed = join(tmpRoot, 'bad.md');
    writeFileSync(malformed, `${BEGIN_MARKER}\nmissing end\n`);
    expect(stripEchoMarkers({ filePath: malformed })).toEqual({
      action: 'conflict',
      filePath: malformed,
      reason: 'malformed-markers',
    });

    const target = join(tmpRoot, 'target.md');
    const link = join(tmpRoot, 'link.md');
    writeFileSync(target, 'x');
    symlinkSync(target, link);
    expect(stripEchoMarkers({ filePath: link })).toEqual({
      action: 'conflict',
      filePath: link,
      reason: 'symlink-target',
    });
  });
});
