import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { removeCodexMcpEntry } from '../../src/cli/inverse/codex-config.js';

let tmpRoot: string;

describe('removeCodexMcpEntry', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-inverse-codex-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('removes the echo table without deleting following user tables', () => {
    const path = join(tmpRoot, 'config.toml');
    writeFileSync(
      path,
      '# user config\n[model]\nname = "gpt"\n\n[mcp_servers.echo]\nurl = "http://127.0.0.1:38478/mcp"\n\n[profiles.work]\nmodel = "x"\n',
    );

    expect(removeCodexMcpEntry({ filePath: path })).toEqual({ action: 'removed' });
    expect(readFileSync(path, 'utf8')).toBe(
      '# user config\n[model]\nname = "gpt"\n[profiles.work]\nmodel = "x"\n',
    );
  });

  it('preserves CRLF and no trailing newline around surviving content', () => {
    const path = join(tmpRoot, 'config.toml');
    writeFileSync(path, '[model]\r\nname = "gpt"\r\n\r\n[mcp_servers.echo]\r\nurl = "u"');

    removeCodexMcpEntry({ filePath: path });

    expect(readFileSync(path, 'utf8')).toBe('[model]\r\nname = "gpt"\r\n');
  });

  it('conflicts on parse errors and noops when the entry is absent', () => {
    const bad = join(tmpRoot, 'bad.toml');
    writeFileSync(bad, '[broken\n');
    expect(removeCodexMcpEntry({ filePath: bad })).toEqual({
      action: 'conflict',
      reason: 'parse-error',
    });

    const missing = join(tmpRoot, 'missing.toml');
    writeFileSync(missing, '[model]\nname = "gpt"\n');
    expect(removeCodexMcpEntry({ filePath: missing })).toEqual({
      action: 'noop',
      reason: 'entry-missing',
    });
  });
});
