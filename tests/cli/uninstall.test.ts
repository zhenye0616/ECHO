import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BEGIN_MARKER, END_MARKER } from '../../src/echo-home/adapters/markers.js';
import { makeNonInteractivePrompt } from '../../src/cli/io/prompt.js';

let tmpRoot: string;
let echoHome: string;
let home: string;
let originalEchoHome: string | undefined;

async function loadUninstall(): Promise<typeof import('../../src/cli/commands/uninstall.js')> {
  return import('../../src/cli/commands/uninstall.js');
}

function writeState(agents: unknown[]): void {
  mkdirSync(join(echoHome, 'state'), { recursive: true });
  writeFileSync(
    join(echoHome, 'state/onboarding.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        created_at: '2026-05-26T00:00:00.000Z',
        last_updated_at: '2026-05-26T00:00:00.000Z',
        completed: true,
        agents,
      },
      null,
      2,
    )}\n`,
  );
}

describe('runUninstall', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-uninstall-'));
    echoHome = join(tmpRoot, 'echo-home');
    home = join(tmpRoot, 'home');
    process.env.ECHO_HOME = echoHome;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('cleans wired adapters and keeps state by default', async () => {
    writeState([
      {
        id: 'codex',
        detected_at: 't',
        wired_at: 't',
        probed_at: null,
        capabilities: [],
        wire_error: null,
      },
    ]);
    mkdirSync(join(home, '.codex'), { recursive: true });
    writeFileSync(
      join(home, '.codex/AGENTS.md'),
      `before\n${BEGIN_MARKER}\necho\n${END_MARKER}\nafter\n`,
    );
    writeFileSync(
      join(home, '.codex/config.toml'),
      '[mcp_servers.echo]\nurl = "u"\n[model]\nname = "x"\n',
    );
    const out: string[] = [];
    const { runUninstall } = await loadUninstall();

    const code = await runUninstall({
      yes: true,
      homeDir: home,
      stdout: {
        write: (s) => {
          out.push(String(s));
          return true;
        },
      },
    });

    expect(code).toBe(0);
    expect(readFileSync(join(home, '.codex/AGENTS.md'), 'utf8')).toBe('before\nafter\n');
    expect(readFileSync(join(home, '.codex/config.toml'), 'utf8')).toContain('[model]');
    expect(readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8')).toContain('"completed"');
  });

  it('blocks purge when cleanup conflicts remain unless force-purge is set', async () => {
    writeState([
      {
        id: 'claude-code',
        detected_at: 't',
        wired_at: 't',
        probed_at: null,
        capabilities: [],
        wire_error: null,
      },
    ]);
    mkdirSync(join(home, '.claude'), { recursive: true });
    const target = join(tmpRoot, 'target.md');
    writeFileSync(target, 'user');
    symlinkSync(target, join(home, '.claude/CLAUDE.md'));
    const { runUninstall } = await loadUninstall();

    const blocked = await runUninstall({ yes: true, purgeState: true, homeDir: home });
    const forced = await runUninstall({
      yes: true,
      purgeState: true,
      forcePurge: true,
      homeDir: home,
      prompt: makeNonInteractivePrompt({}),
    });

    expect(blocked).toBe(1);
    expect(forced).toBe(0);
    expect(() => readFileSync(join(echoHome, 'state/onboarding.json'), 'utf8')).toThrow();
  });
});
