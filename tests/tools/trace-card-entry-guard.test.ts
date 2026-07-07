import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// AC3 — importing tools/trace-card.ts must never start the tool. Same shape as
// the item 121 intake-terminal entry-guard test: a plain (non-vitest)
// `vite-node` run of a fixture that imports a helper, with a deliberately
// invalid CLI arg. IF the module wrongly ran its main path on import,
// parseTraceCardArgs would reject the arg and print USAGE before the fixture's
// sentinel — a deterministic, side-effect-free signal.

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const VITE_NODE = join(REPO_ROOT, 'node_modules', '.bin', 'vite-node');
const FIXTURE = join(HERE, 'fixtures', 'import-trace-card-entry.ts');

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('trace-card entry guard (item 123, AC3)', () => {
  it('importing the module via vite-node does not start the tool', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'echo-trace-card-guard-'));
    tempDirs.push(scratch);

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
    expect(out).not.toContain('Usage: npm run trace:card');
    expect(out).toContain('TRACE_CARD_IMPORT_ONLY_OK');
    expect(res.status).toBe(0);
  });
});
