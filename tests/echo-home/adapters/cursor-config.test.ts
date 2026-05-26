import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncCursorMcpEntry } from '../../../src/echo-home/adapters/cursor-config.js';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'echo-072-cursor-'));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const SERVER_V1 = {
  url: 'http://localhost:7117/mcp',
};

describe('syncCursorMcpEntry', () => {
  it('add: file does not have mcpServers.echo → entry is added', () => {
    const target = join(tmpRoot, 'mcp.json');
    writeFileSync(
      target,
      JSON.stringify({ mcpServers: { dart: { command: 'dart', args: ['mcp'] } } }, null, 2),
    );
    const result = syncCursorMcpEntry({ filePath: target, serverConfig: SERVER_V1 });
    expect(result.action).toBe('add');
    const parsed = JSON.parse(readFileSync(target, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers.echo).toEqual(SERVER_V1);
    expect(parsed.mcpServers.dart).toEqual({ command: 'dart', args: ['mcp'] });
  });

  it('update: existing echo matches previous → entry is rewritten', () => {
    const target = join(tmpRoot, 'mcp.json');
    writeFileSync(
      target,
      JSON.stringify(
        { mcpServers: { echo: { url: 'http://old:1234/mcp' } } },
        null,
        2,
      ),
    );
    const result = syncCursorMcpEntry({
      filePath: target,
      serverConfig: SERVER_V1,
      previousServerConfig: { url: 'http://old:1234/mcp' },
    });
    expect(result.action).toBe('update');
    const parsed = JSON.parse(readFileSync(target, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers.echo).toEqual(SERVER_V1);
  });

  it('noop: existing echo equals new serverConfig → no write', () => {
    const target = join(tmpRoot, 'mcp.json');
    const original = `${JSON.stringify({ mcpServers: { echo: SERVER_V1 } }, null, 2)}\n`;
    writeFileSync(target, original);
    const before = readFileSync(target);
    const result = syncCursorMcpEntry({ filePath: target, serverConfig: SERVER_V1 });
    expect(result.action).toBe('noop');
    expect(readFileSync(target).equals(before)).toBe(true);
  });

  it('conflict: existing differs from both previous and new → no write', () => {
    const target = join(tmpRoot, 'mcp.json');
    writeFileSync(
      target,
      JSON.stringify({ mcpServers: { echo: { url: 'http://user-edited' } } }, null, 2),
    );
    const before = readFileSync(target);
    const result = syncCursorMcpEntry({
      filePath: target,
      serverConfig: SERVER_V1,
      previousServerConfig: { url: 'http://old:1234/mcp' },
    });
    expect(result.action).toBe('conflict');
    expect(readFileSync(target).equals(before)).toBe(true);
  });

  it('missing file: creates with mcpServers.echo at 0600', () => {
    const subdir = join(tmpRoot, '.cursor');
    mkdirSync(subdir);
    const target = join(subdir, 'mcp.json');
    const result = syncCursorMcpEntry({ filePath: target, serverConfig: SERVER_V1 });
    expect(result.action).toBe('add');
    const parsed = JSON.parse(readFileSync(target, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers.echo).toEqual(SERVER_V1);
    expect(statSync(target).mode & 0o777).toBe(0o600);
  });

  it('sibling mcpServers entries (dart stdio, supabase URL) preserved after add', () => {
    const target = join(tmpRoot, 'mcp.json');
    const original = {
      mcpServers: {
        dart: { command: 'dart', args: ['mcp'] },
        supabase: { url: 'https://supabase.example.com/mcp' },
      },
    };
    writeFileSync(target, JSON.stringify(original, null, 2));
    syncCursorMcpEntry({ filePath: target, serverConfig: SERVER_V1 });
    const parsed = JSON.parse(readFileSync(target, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers.dart).toEqual(original.mcpServers.dart);
    expect(parsed.mcpServers.supabase).toEqual(original.mcpServers.supabase);
    expect(parsed.mcpServers.echo).toEqual(SERVER_V1);
  });

  it('mode preservation on existing file (0600)', () => {
    const target = join(tmpRoot, 'mcp.json');
    writeFileSync(
      target,
      JSON.stringify({ mcpServers: { echo: { url: 'http://old:1234/mcp' } } }, null, 2),
    );
    chmodSync(target, 0o600);
    syncCursorMcpEntry({
      filePath: target,
      serverConfig: SERVER_V1,
      previousServerConfig: { url: 'http://old:1234/mcp' },
    });
    expect(statSync(target).mode & 0o777).toBe(0o600);
  });
});
