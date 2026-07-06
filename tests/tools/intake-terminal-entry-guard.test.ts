import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// AC2 — importing the module must never start the tool.
//
// This has to run in a NON-vitest child process: inside vitest, argv[1] is the
// vitest runner (new guard already skips main) and VITEST is set (old guard
// already skips main), so an in-process import cannot tell the guards apart.
// The child is a plain `vite-node` run of a fixture that imports a helper from
// tools/intake-terminal.ts; we pass a deliberately invalid CLI arg so that IF
// the module wrongly runs main() on import, parseArgs rejects the arg and main
// prints USAGE + exits 2 BEFORE the fixture's sentinel — a deterministic,
// side-effect-free signal that never opens the DB or calls the brain.

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const VITE_NODE = join(REPO_ROOT, 'node_modules', '.bin', 'vite-node');
const FIXTURE = join(HERE, 'fixtures', 'import-intake-terminal-entry.ts');

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('intake-terminal entry guard (item 121, AC2)', () => {
  it('importing the module via vite-node does not start the tool', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'echo-entry-guard-'));
    tempDirs.push(scratch);

    // Clone the env but UNSET VITEST so the child exercises the non-vitest
    // path (the whole point: the old guard only skips main when VITEST is set).
    // Scratch ECHO_HOME / ECHO_DB_PATH sandbox any accidental side effect away
    // from the real state dir and DB.
    const childEnv: NodeJS.ProcessEnv = { ...process.env };
    delete childEnv['VITEST'];
    delete childEnv['VITEST_WORKER_ID'];
    delete childEnv['VITEST_POOL_ID'];
    childEnv['ECHO_HOME'] = scratch;
    childEnv['ECHO_DB_PATH'] = join(scratch, 'echo.db');

    const res = spawnSync(VITE_NODE, [FIXTURE, '--echo-entry-guard-invalid-arg'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
      env: childEnv,
    });

    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;

    // The tool must NOT have started: no USAGE banner from main().
    expect(out).not.toContain('Usage: npm run intake:terminal');
    // Import-only sentinel printed, clean exit — the module was importable
    // without side effects.
    expect(out).toContain('INTAKE_TERMINAL_IMPORT_ONLY_OK');
    expect(res.status).toBe(0);
  });
});
