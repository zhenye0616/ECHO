// 057a AC2 — coord-roles.json + TS loader validation tests.
//
// Each case maps to a sub-clause of AC8's "coord-roles-validation.test.ts"
// merge-blocking entry:
//   - well-formed config loads via the TS loader at src/coord/roles.ts
//   - bad-config (max_deadline_sec <= default_deadline_sec) causes
//     startMcpServer() to throw at daemon boot (NOT at a subsequent
//     coord_emit request — closes r1 codex F4 MED)
//   - IDE-mode entry (`headless: false`) missing `invoke_command` accepted
//   - headless entry missing `invoke_command` rejected at startup
//
// Boot-throw assertion uses startMcpServer() directly (not a coord_emit
// retry path) per r1 codex F4 MED.

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _resetValidatorCacheForTests, loadCoordRoles } from '../../src/coord/roles.js';
import { startMcpServer } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'echo-coord-roles-test-'));
  _resetValidatorCacheForTests();
});

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

function writeConfig(contents: unknown): string {
  const p = join(tmpDir, 'coord-roles.json');
  writeFileSync(p, JSON.stringify(contents), 'utf-8');
  return p;
}

const WELL_FORMED = {
  roles: [
    {
      name: 'codex',
      headless: true,
      invoke_command: ['codex', 'exec', '-C', '{{WT}}', '--sandbox', 'danger-full-access'],
      events: {
        reviewer_invoked: {
          default_deadline_sec: 90,
          max_deadline_sec: 300,
          expects: 'tick_start',
        },
      },
    },
    {
      name: 'cursor',
      headless: false,
      events: {
        reviewer_invoked: {
          default_deadline_sec: 7200,
          max_deadline_sec: 28800,
          expects: 'tick_start',
        },
      },
    },
  ],
};

describe('AC2 — loadCoordRoles direct', () => {
  it('well-formed config loads', () => {
    const path = writeConfig(WELL_FORMED);
    const config = loadCoordRoles(path);
    expect(config.roles).toHaveLength(2);
    expect(config.roles[0]!.name).toBe('codex');
    expect(config.roles[0]!.headless).toBe(true);
    expect(config.roles[1]!.headless).toBe(false);
    // Frozen — mutation must throw in strict mode
    expect(() => {
      (config.roles[0] as unknown as { name: string }).name = 'mutated';
    }).toThrow();
  });

  it('rejects cross-field violation: max_deadline_sec <= default_deadline_sec', () => {
    const bad = {
      roles: [
        {
          name: 'codex',
          headless: true,
          invoke_command: ['codex'],
          events: {
            tick_start: {
              default_deadline_sec: 600,
              max_deadline_sec: 600, // equal — should fail (must be strictly greater)
              expects: 'tick_end',
            },
          },
        },
      ],
    };
    const path = writeConfig(bad);
    expect(() => loadCoordRoles(path)).toThrow(
      /max_deadline_sec \(600\) must be > default_deadline_sec \(600\)/,
    );
  });

  it('rejects cross-field violation: max_deadline_sec < default_deadline_sec', () => {
    const bad = {
      roles: [
        {
          name: 'codex',
          headless: true,
          invoke_command: ['codex'],
          events: {
            tick_start: {
              default_deadline_sec: 1200,
              max_deadline_sec: 600,
              expects: 'tick_end',
            },
          },
        },
      ],
    };
    const path = writeConfig(bad);
    expect(() => loadCoordRoles(path)).toThrow(/must be > default_deadline_sec/);
  });

  it('rejects headless=true without invoke_command', () => {
    const bad = {
      roles: [
        {
          name: 'codex',
          headless: true,
          // no invoke_command
          events: {
            tick_start: {
              default_deadline_sec: 600,
              max_deadline_sec: 1200,
              expects: 'tick_end',
            },
          },
        },
      ],
    };
    const path = writeConfig(bad);
    expect(() => loadCoordRoles(path)).toThrow(/schema validation failed/);
  });

  it('accepts headless=false without invoke_command (IDE-mode)', () => {
    const ide = {
      roles: [
        {
          name: 'cursor',
          headless: false,
          events: {
            reviewer_invoked: {
              default_deadline_sec: 7200,
              max_deadline_sec: 28800,
              expects: 'tick_start',
            },
          },
        },
      ],
    };
    const path = writeConfig(ide);
    const config = loadCoordRoles(path);
    expect(config.roles[0]!.name).toBe('cursor');
    expect(config.roles[0]!.headless).toBe(false);
    expect(config.roles[0]!.invoke_command).toBeUndefined();
  });

  it('rejects duplicate role name', () => {
    const dup = {
      roles: [
        {
          name: 'codex',
          headless: true,
          invoke_command: ['codex'],
          events: { tick_start: { default_deadline_sec: 600, max_deadline_sec: 1200, expects: 'tick_end' } },
        },
        {
          name: 'codex',
          headless: true,
          invoke_command: ['codex'],
          events: { tick_start: { default_deadline_sec: 600, max_deadline_sec: 1200, expects: 'tick_end' } },
        },
      ],
    };
    const path = writeConfig(dup);
    expect(() => loadCoordRoles(path)).toThrow(/duplicate role name/);
  });

  it('rejects invalid slug', () => {
    const bad = {
      roles: [
        {
          name: 'Bad-Name', // capitals not allowed
          headless: true,
          invoke_command: ['x'],
          events: { x: { default_deadline_sec: 1, max_deadline_sec: 2, expects: 'y' } },
        },
      ],
    };
    const path = writeConfig(bad);
    expect(() => loadCoordRoles(path)).toThrow(/schema validation failed/);
  });

  it('rejects empty roles array', () => {
    const path = writeConfig({ roles: [] });
    expect(() => loadCoordRoles(path)).toThrow(/schema validation failed/);
  });

  it('rejects file-not-found', () => {
    const missing = join(tmpDir, 'does-not-exist.json');
    expect(() => loadCoordRoles(missing)).toThrow(/cannot read or parse/);
  });

  it('rejects invalid JSON', () => {
    const p = join(tmpDir, 'broken.json');
    writeFileSync(p, '{ not json', 'utf-8');
    expect(() => loadCoordRoles(p)).toThrow(/cannot read or parse/);
  });

  it('honors ECHO_COORD_ROLES_PATH env when configPath omitted', () => {
    const path = writeConfig(WELL_FORMED);
    const prev = process.env['ECHO_COORD_ROLES_PATH'];
    process.env['ECHO_COORD_ROLES_PATH'] = path;
    try {
      const config = loadCoordRoles();
      expect(config.roles).toHaveLength(2);
    } finally {
      if (prev === undefined) {
        delete process.env['ECHO_COORD_ROLES_PATH'];
      } else {
        process.env['ECHO_COORD_ROLES_PATH'] = prev;
      }
    }
  });
});

describe('AC2 — startMcpServer boot gate', () => {
  it('bad-config (max <= default) causes startMcpServer() to THROW at boot (NOT at later request)', async () => {
    const bad = {
      roles: [
        {
          name: 'codex',
          headless: true,
          invoke_command: ['codex'],
          events: {
            tick_start: {
              default_deadline_sec: 600,
              max_deadline_sec: 600, // bad — must be strictly greater
              expects: 'tick_end',
            },
          },
        },
      ],
    };
    const path = writeConfig(bad);
    const storage = new MemoryStorage();
    // The throw must come out of startMcpServer itself, before the daemon
    // is reachable for any tool call. This is the r1 codex F4 MED
    // contract: bad config = daemon-startup failure, NOT per-request error.
    await expect(
      startMcpServer(storage, { port: 0, coord_roles_path: path }),
    ).rejects.toThrow(/max_deadline_sec \(600\) must be > default_deadline_sec \(600\)/);
  });

  it('headless without invoke_command causes startMcpServer() to throw at boot', async () => {
    const bad = {
      roles: [
        {
          name: 'codex',
          headless: true,
          // no invoke_command
          events: {
            tick_start: { default_deadline_sec: 600, max_deadline_sec: 1200, expects: 'tick_end' },
          },
        },
      ],
    };
    const path = writeConfig(bad);
    const storage = new MemoryStorage();
    await expect(
      startMcpServer(storage, { port: 0, coord_roles_path: path }),
    ).rejects.toThrow(/schema validation failed/);
  });

  it('well-formed config boots cleanly', async () => {
    const path = writeConfig(WELL_FORMED);
    const storage = new MemoryStorage();
    const handle = await startMcpServer(storage, { port: 0, coord_roles_path: path });
    try {
      expect(handle.port).toBeGreaterThan(0);
    } finally {
      await handle.stop();
    }
  });
});

describe('AC2 — canonical config at tools/review-queue/coord-roles.json', () => {
  it('the checked-in config validates', () => {
    // Module-relative resolution via the default path. This exercises the
    // import.meta.url-based DEFAULT_CONFIG_URL — no need to chdir; the
    // test runs from the repo root via vitest.
    const config = loadCoordRoles();
    expect(config.roles.length).toBeGreaterThanOrEqual(1);
    // Sanity: every event has the required shape and max > default.
    for (const role of config.roles) {
      expect(role.name).toMatch(/^[a-z][a-z0-9-]*$/);
      for (const [, ev] of Object.entries(role.events)) {
        expect(ev.max_deadline_sec).toBeGreaterThan(ev.default_deadline_sec);
        expect(ev.expects.length).toBeGreaterThan(0);
      }
      if (role.headless) {
        expect(role.invoke_command).toBeDefined();
        expect(role.invoke_command!.length).toBeGreaterThan(0);
      }
    }
  });
});
