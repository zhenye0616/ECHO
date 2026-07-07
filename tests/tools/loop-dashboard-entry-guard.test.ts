import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Item 122 AC1 — two out-of-process guarantees the tool makes at its CLI edge:
//   1. Importing the module never starts the server (the 121 house entry-guard).
//   2. An invalid --port is a fatal startup error (one-line stderr + non-zero
//      exit), never a silent fall back to the default.
//
// Both must run in a NON-vitest child: inside vitest, argv[1] is the runner, so
// an in-process import can't tell the guard apart. The child is a plain
// `vite-node --script` run (the mode the npm script uses, where argv[1] carries
// the resolved script path).

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const VITE_NODE = join(REPO_ROOT, 'node_modules', '.bin', 'vite-node');
const FIXTURE = join(HERE, 'fixtures', 'import-loop-dashboard-entry.ts');
const TOOL = join(REPO_ROOT, 'tools', 'loop-dashboard.ts');

describe('loop-dashboard entry guard (item 122, AC1)', () => {
  it('importing the module via vite-node does not start the server', () => {
    const res = spawnSync(VITE_NODE, [FIXTURE], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
    });
    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
    // The server must NOT have started: no "ready at" banner.
    expect(out).not.toContain('ready at');
    // Import-only sentinel printed, clean exit — importable without side effects.
    expect(out).toContain('LOOP_DASHBOARD_IMPORT_ONLY_OK');
    expect(res.status).toBe(0);
  });

  it('an invalid --port is a fatal startup error (stderr + non-zero exit)', () => {
    const res = spawnSync(VITE_NODE, ['--script', TOOL, '--port', '99999'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
    });
    const err = `${res.stderr ?? ''}${res.stdout ?? ''}`;
    expect(res.status).not.toBe(0);
    expect(err.toLowerCase()).toContain('invalid --port');
    // Never a silent fall back: the default-port ready banner must not appear.
    expect(err).not.toContain('ready at');
  });

  it('a non-numeric --port is also fatal', () => {
    const res = spawnSync(VITE_NODE, ['--script', TOOL, '--port', 'abc'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
    });
    expect(res.status).not.toBe(0);
    expect(`${res.stderr ?? ''}`.toLowerCase()).toContain('invalid --port');
  });
});
