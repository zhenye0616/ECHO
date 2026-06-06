import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { main } from '../../src/cli/index.js';
import {
  SELFTEST_CHECK_IDS,
  runSelftest,
  type SelfTestDeps,
  type SelfTestReport,
  type SelfTestSandbox,
} from '../../src/cli/commands/selftest.js';

let tmpRoots: string[] = [];

afterEach(() => {
  for (const root of tmpRoots) rmSync(root, { recursive: true, force: true });
  tmpRoots = [];
});

function tmpRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), name));
  tmpRoots.push(root);
  return root;
}

function writeInitArtifacts(sandbox: SelfTestSandbox): void {
  mkdirSync(join(sandbox.echoHome, 'state'), { recursive: true });
  writeFileSync(
    join(sandbox.echoHome, 'state', 'onboarding.json'),
    `${JSON.stringify({ schema_version: 1, completed: true, agents: [], profile: 'customer' })}\n`,
  );
  mkdirSync(join(sandbox.home, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(sandbox.home, '.claude', 'CLAUDE.md'), 'ECHO http://127.0.0.1:41001/mcp\n');
  writeFileSync(join(sandbox.home, '.claude', 'commands', 'using-echo-mcp.md'), '# mcp\n');
  mkdirSync(join(sandbox.codexHome, 'skills', 'using-echo-mcp'), { recursive: true });
  writeFileSync(
    join(sandbox.codexHome, 'AGENTS.md'),
    '<!-- BEGIN ECHO -->\nECHO http://127.0.0.1:41001/mcp\n<!-- END ECHO -->\n',
  );
  writeFileSync(join(sandbox.codexHome, 'config.toml'), '[mcp_servers.echo]\nurl = "x"\n');
  writeFileSync(
    join(sandbox.codexHome, 'skills', 'using-echo-mcp', 'SKILL.md'),
    "---\nname: 'using-echo-mcp'\n---\n# skill\n",
  );
}

function makeDeps(
  opts: {
    captureRepoPath?: (repo: string) => string;
    failCapture?: boolean;
    hangAfterStart?: boolean;
    onCommand?: (args: readonly string[], env: NodeJS.ProcessEnv) => void;
    onMcpUrl?: (url: string) => void;
  } = {},
): {
  deps: SelfTestDeps;
  starts: { env: NodeJS.ProcessEnv; port: number }[];
  stops: number[];
  sandboxes: SelfTestSandbox[];
} {
  let nextPort = 41000;
  const starts: { env: NodeJS.ProcessEnv; port: number }[] = [];
  const stops: number[] = [];
  const sandboxes: SelfTestSandbox[] = [];
  const testFile = fileURLToPath(import.meta.url);

  const deps: SelfTestDeps = {
    paths: {
      cliEntry: testFile,
      daemonEntry: testFile,
      packageRoot: tmpRoot('echo-selftest-pkg-'),
    },
    onSandbox: (sandbox) => sandboxes.push(sandbox),
    loadSqlite: () => true,
    hasEventsTable: () => true,
    sleep: async () => {},
    startDaemon: async ({ env, sandbox }) => {
      const port = ++nextPort;
      starts.push({ env: { ...env }, port });
      mkdirSync(sandbox.dataDir, { recursive: true });
      writeFileSync(join(sandbox.dataDir, 'daemon.pid'), String(10_000 + port));
      return { port, url: `http://127.0.0.1:${port}/mcp` };
    },
    stopDaemon: ({ handle }) => {
      if (handle !== null) stops.push(handle.port);
    },
    mcpRequest: async (url, method, params) => {
      opts.onMcpUrl?.(url);
      expect(url).not.toContain('38478');
      if (opts.hangAfterStart === true && method === 'tools/list') {
        await new Promise(() => {});
      }
      if (method === 'tools/list') {
        return JSON.stringify({
          tools: [
            { name: 'echo_ping' },
            { name: 'search_memories' },
            { name: 'find_clusters' },
            { name: 'get_atoms' },
          ],
        });
      }
      const call = params as { name?: string; arguments?: Record<string, unknown> };
      if (call.name === 'echo_ping') return JSON.stringify({ pong: true });
      if (call.name === 'search_memories') {
        return opts.failCapture === true
          ? JSON.stringify({ matches: [] })
          : JSON.stringify({ matches: [{ content: call.arguments?.query }] });
      }
      if (call.name === 'find_clusters') return JSON.stringify({ clusters: [{ atom_ids: ['a'] }] });
      return JSON.stringify({});
    },
    runCommand: ({ env, file, args, cwd }) => {
      opts.onCommand?.(args, env);
      expect(env.ECHO_MCP_PORT).not.toBe('38478');
      if (file === 'git') return { code: 0, out: '' };
      const sandbox = sandboxes[0]!;
      if (args[1] === 'init') {
        writeInitArtifacts(sandbox);
        return { code: 0, out: JSON.stringify({ event: 'init.done' }) };
      }
      if (args[1] === 'project') {
        const repo = typeof args[3] === 'string' ? args[3] : (cwd ?? join(sandbox.sandbox, 'repo'));
        const persistedRepo = opts.captureRepoPath?.(repo) ?? repo;
        mkdirSync(join(sandbox.echoHome, 'state'), { recursive: true });
        writeFileSync(
          join(sandbox.echoHome, 'state', 'capture-sources.json'),
          `${JSON.stringify({
            schema_version: 1,
            updated_at: '2026-05-28T00:00:00.000Z',
            git_repos: [persistedRepo],
          })}\n`,
        );
        return { code: 0, out: '' };
      }
      if (args[1] === 'doctor') {
        return { code: 0, out: `${JSON.stringify({ daemon: { mcpReachable: true } })}\n` };
      }
      return { code: 0, out: '' };
    },
  };
  return { deps, starts, stops, sandboxes };
}

function parseReport(stdout: string[]): SelfTestReport {
  return JSON.parse(stdout.join('').trim()) as SelfTestReport;
}

async function tryListen38478(): Promise<{ server: Server; requests: () => number } | null> {
  let requests = 0;
  const server = createServer((_req, res) => {
    requests += 1;
    res.statusCode = 503;
    res.end('sentinel');
  });
  return await new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') resolve(null);
      else reject(err);
    });
    server.listen(38478, '127.0.0.1', () => resolve({ server, requests: () => requests }));
  });
}

describe('echoctl selftest command', () => {
  it('is wired into the top-level CLI help path', async () => {
    const out: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      await expect(main(['selftest', '--help'])).resolves.toBe(0);
    } finally {
      process.stdout.write = original;
    }
    expect(out.join('')).toContain('Usage: echoctl selftest');
  });

  it('emits the stable JSON check-id inventory and exits 0 when fake checks pass', async () => {
    const { deps, starts, stops } = makeDeps();
    const out: string[] = [];
    const code = await runSelftest({
      json: true,
      stdout: { write: (s) => (out.push(String(s)), true) },
      deps,
    });
    const report = parseReport(out);

    expect(code).toBe(0);
    expect(report.failedIds).toEqual([]);
    expect(report.checks.map((check) => check.id)).toEqual([...SELFTEST_CHECK_IDS]);
    expect(starts.map((start) => start.env.ECHO_MCP_PORT)).toEqual(['0', '0']);
    expect(starts.map((start) => start.port)).toHaveLength(2);
    expect(stops).toEqual(starts.map((start) => start.port));
  });

  it('normalizes capture-sources repo paths before evaluating INIT-06', async () => {
    const { deps } = makeDeps({
      captureRepoPath: (repo) => repo.replace(/\//g, '\\'),
    });
    const out: string[] = [];
    const code = await runSelftest({
      json: true,
      stdout: { write: (s) => (out.push(String(s)), true) },
      deps,
    });
    const report = parseReport(out);

    expect(code).toBe(0);
    expect(report.failedIds).not.toContain('INIT-06');
    expect(report.checks.find((check) => check.id === 'INIT-06')?.ok).toBe(true);
  });

  it('exits 1 and reports failedIds when a fake check fails', async () => {
    const { deps } = makeDeps({ failCapture: true });
    const out: string[] = [];
    const code = await runSelftest({
      json: true,
      stdout: { write: (s) => (out.push(String(s)), true) },
      deps,
    });
    const report = parseReport(out);

    expect(code).toBe(1);
    expect(report.failedIds).toContain('CAP-02');
  });

  it('keeps port 38478 untouched even when a sentinel listener is present', async () => {
    const sentinel = await tryListen38478();
    const touchedUrls: string[] = [];
    const touchedCommands: string[][] = [];
    const { deps } = makeDeps({
      onMcpUrl: (url) => touchedUrls.push(url),
      onCommand: (args) => touchedCommands.push([...args]),
    });

    try {
      const out: string[] = [];
      const code = await runSelftest({
        json: true,
        stdout: { write: (s) => (out.push(String(s)), true) },
        deps,
      });
      expect(code).toBe(0);
      expect(touchedUrls.join('\n')).not.toContain('38478');
      expect(JSON.stringify(touchedCommands)).not.toContain('38478');
      if (sentinel !== null) expect(sentinel.requests()).toBe(0);
    } finally {
      if (sentinel !== null) await new Promise((resolve) => sentinel.server.close(resolve));
    }
  });

  it('runs concurrently without port collision or production-port use', async () => {
    const a = makeDeps();
    const b = makeDeps();
    const outA: string[] = [];
    const outB: string[] = [];
    const [codeA, codeB] = await Promise.all([
      runSelftest({
        json: true,
        stdout: { write: (s) => (outA.push(String(s)), true) },
        deps: a.deps,
      }),
      runSelftest({
        json: true,
        stdout: { write: (s) => (outB.push(String(s)), true) },
        deps: b.deps,
      }),
    ]);

    expect([codeA, codeB]).toEqual([0, 0]);
    expect(a.starts.every((start) => start.env.ECHO_MCP_PORT === '0')).toBe(true);
    expect(b.starts.every((start) => start.env.ECHO_MCP_PORT === '0')).toBe(true);
    expect(parseReport(outA).port).not.toBe(38478);
    expect(parseReport(outB).port).not.toBe(38478);
  });

  it.each([
    ['success', {}],
    ['failure', { failCapture: true }],
    ['timeout', { hangAfterStart: true }],
  ] as const)('removes temp state and stops daemons on %s', async (_label, opts) => {
    const hangs = 'hangAfterStart' in opts && opts.hangAfterStart === true;
    const { deps, sandboxes, stops } = makeDeps(opts);
    const out: string[] = [];
    await runSelftest({
      json: true,
      timeoutMs: hangs ? 10 : 5_000,
      stdout: { write: (s) => (out.push(String(s)), true) },
      deps,
    });

    expect(sandboxes).toHaveLength(1);
    expect(existsSync(sandboxes[0]!.sandbox)).toBe(false);
    expect(stops.length).toBeGreaterThan(0);
    if (hangs) expect(parseReport(out).failedIds).toContain('SELF-01');
  });

  it('can retain the sandbox for debugging when requested', async () => {
    const { deps, sandboxes } = makeDeps();
    await runSelftest({ json: true, keepSandbox: true, stdout: { write: () => true }, deps });
    expect(sandboxes).toHaveLength(1);
    expect(existsSync(sandboxes[0]!.sandbox)).toBe(true);
    expect(
      (
        JSON.parse(
          readFileSync(join(sandboxes[0]!.echoHome, 'state', 'onboarding.json'), 'utf8'),
        ) as { completed?: unknown }
      ).completed,
    ).toBe(true);
  });
});
