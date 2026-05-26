import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { removeCursorMcpEntry } from '../../src/cli/inverse/cursor-config.js';

let tmpRoot: string;

describe('removeCursorMcpEntry', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-inverse-cursor-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('removes only mcpServers.echo', () => {
    const path = join(tmpRoot, 'mcp.json');
    writeFileSync(
      path,
      JSON.stringify({ mcpServers: { echo: { url: 'u' }, other: { url: 'v' } }, keep: true }),
    );

    expect(removeCursorMcpEntry({ filePath: path })).toEqual({ action: 'removed' });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      mcpServers: { other: { url: 'v' } },
      keep: true,
    });
  });

  it('reports parse errors and missing entries', () => {
    const bad = join(tmpRoot, 'bad.json');
    writeFileSync(bad, '{');
    expect(removeCursorMcpEntry({ filePath: bad })).toEqual({
      action: 'conflict',
      reason: 'parse-error',
    });

    const missing = join(tmpRoot, 'missing.json');
    writeFileSync(missing, JSON.stringify({ mcpServers: {} }));
    expect(removeCursorMcpEntry({ filePath: missing })).toEqual({
      action: 'noop',
      reason: 'entry-missing',
    });
  });
});
