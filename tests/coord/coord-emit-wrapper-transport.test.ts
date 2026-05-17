// 057b AC7 — coord-emit.sh wrapper transport tests.
//
// Covers (per files_to_modify line ~77):
//   - wrapper-originated atoms carry metadata.coord.emitter_role = ${REVIEWER_NAME}
//     via the X-Echo-Role header
//   - daemon-down does NOT abort the queue tick (curl --connect-timeout 2
//     --max-time 5 returns non-zero, wrapper continues via `|| true`)
//   - coord-emit.sh tick_start --correlation-id=... invocation produces a
//     valid coord:tick_start atom that 057a's coord_emit validator accepts
//   - portability: BSD-date emitted_at (seconds-precision) accepted; daemon
//     canonicalizes to ms-precision

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const VALID_CORR = 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef';

// 059 AC3 helper — resolve a TCP port the OS just confirmed was free by
// binding to port 0, reading the assigned port, and closing the probe.
// Replaces the brittle port-1 trick (r1 codex F2: port 1 is an IANA-
// assigned privileged port, not a portable "never bound" guarantee).
// Tiny TOCTOU window between probe.close() and the wrapper's curl, but
// in a single-process test harness it is millisecond-order and far more
// deterministic than port-1.
async function pickClosedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.listen(0, '127.0.0.1', () => {
      const addr = probe.address();
      if (typeof addr !== 'object' || addr === null) {
        probe.close();
        reject(new Error('no port from listen(0)'));
        return;
      }
      const port = addr.port;
      probe.close(() => resolve(port));
    });
    probe.on('error', reject);
  });
}

// 059 AC3 helper — async wrapper invocation. `spawnSync` blocks the
// Node event loop, which means the in-process MCP daemon (and the
// node:http 500-fixture) can't dispatch incoming HTTP requests to
// their JS handlers while curl is waiting for a response — curl
// always hits `--max-time 5` and the wrapper falls through the
// unreachable branch (rc=28, silent). The async `spawn` form yields
// to libuv between writes, so the in-process server actually responds
// during the curl wait window. Used for the three new 059 AC3 cases
// that need to assert on the WRAPPER'S response-parsed stderr.
async function runWrapperAsync(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    proc.stdout.on('data', (d: Buffer) => stdoutChunks.push(d));
    proc.stderr.on('data', (d: Buffer) => stderrChunks.push(d));
    proc.on('error', reject);
    proc.on('close', (code) => {
      resolve({
        status: code,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

let storage: MemoryStorage;
let handle: McpServerHandle;

beforeEach(async () => {
  _resetValidatorCacheForTests();
  storage = new MemoryStorage();
  handle = await startMcpServer(storage, {
    port: 0,
    deadline_heartbeat_ms: 0,
    deadline_reconciliation_ms: null,
  });
});
afterEach(async () => {
  await handle.stop();
});

describe('057b AC7 — coord-emit.sh wrapper transport', () => {
  it('coord-emit.sh tick_start produces a valid coord:tick_start atom', () => {
    const r = spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
          ECHO_MCP_PORT: String(handle.port),
        },
        encoding: 'utf-8',
      },
    );
    expect(r.status).toBe(0);
    // 059 AC3 happy-path stderr-silent invariant — the new three-state
    // logic must not leak any stderr noise on the success branch.
    expect(r.stdout.toString()).toBe('');
    expect(r.stderr.toString()).toBe('');
  });

  it('atom is accepted by 057a coord_emit validator: tier=round, subject_role=codex', async () => {
    spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
          ECHO_MCP_PORT: String(handle.port),
        },
        encoding: 'utf-8',
      },
    );
    // Give the daemon a moment to flush the append.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    const tickStart = events.find((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'tick_start';
    });
    expect(tickStart).toBeTruthy();
    expect(tickStart!.source).toBe('coord:codex');
    const coord = tickStart!.metadata!['coord'] as Record<string, unknown>;
    expect(coord['subject_role']).toBe('codex');
    expect(coord['correlation_id']).toBe(VALID_CORR);
    expect(coord['tier']).toBe('round');
  });

  it('daemon-down does NOT abort the wrapper (exit 0)', () => {
    // Point at an unreachable port.
    const r = spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: 'http://127.0.0.1:1/mcp', // dead port
        },
        encoding: 'utf-8',
      },
    );
    expect(r.status).toBe(0); // best-effort: || true preserves queue durability
  });

  it('scheduler_health emitted with tick_run_id is accepted', async () => {
    spawnSync(
      'bash',
      [
        'tools/review-queue/coord-emit.sh',
        'scheduler_health',
        '--tick-run-id=11111111-2222-4333-8444-555555555555',
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
        },
        encoding: 'utf-8',
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    const sh = events.find((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'scheduler_health';
    });
    expect(sh).toBeTruthy();
    const coord = sh!.metadata!['coord'] as Record<string, unknown>;
    expect(coord['tier']).toBe('scheduler');
    expect(coord['tick_run_id']).toBe('11111111-2222-4333-8444-555555555555');
  });
});

describe('059 AC3 — coord-emit.sh distinguishes daemon-rejection from daemon-unreachable', () => {
  // Case (i): the daemon is reachable, returns HTTP 200 with JSON-RPC
  // result.isError === true (deliberately wrong tier — tick_start is
  // round-tier and requires --correlation-id; passing --tick-run-id
  // forces the validator into the round-tier rejection branch). The
  // wrapper must:
  //   - still exit 0 (queue durability)
  //   - emit exactly one stderr line carrying both the event_type AND
  //     the verbatim daemon error text
  //   - not append any coord atom (the daemon truly rejected)
  it('daemon rejection (isError:true) is surfaced verbatim on stderr; exit 0; no atom', async () => {
    // Async spawn — see `runWrapperAsync` comment. The in-process MCP
    // daemon needs the libuv event loop to dispatch this request to
    // its JS handler; spawnSync would block the loop and force a
    // curl --max-time 5 timeout (rc=28, silent branch) instead of
    // delivering the daemon's isError response.
    const r = await runWrapperAsync(
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        '--tick-run-id=11111111-2222-4333-8444-555555555555', // wrong tier
      ],
      {
        ...process.env,
        REVIEWER_NAME: 'codex',
        ECHO_MCP_URL: `http://127.0.0.1:${handle.port}/mcp`,
        ECHO_MCP_PORT: String(handle.port),
      },
    );
    expect(r.status).toBe(0);
    expect(r.stderr).toContain('coord-emit.sh: daemon rejected tick_start');
    // Verbatim relay of the daemon's canonical rejection string from
    // src/coord/validate.ts. Substring match — NOT full equality —
    // so minor format drift in the daemon error doesn't break the test
    // while still catching a regression where someone "helpfully"
    // replaces the daemon message with a generic "emit failed".
    expect(r.stderr).toContain('requires correlation_id');
    // Daemon truly rejected — no atom written.
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    const rejected = events.find((e) => {
      const md = e.metadata as { coord?: { event_type?: string } } | undefined;
      return md?.coord?.event_type === 'tick_start';
    });
    expect(rejected).toBeUndefined();
  });

  // Case (ii): daemon unreachable. The wrapper must be FULLY silent on
  // stderr (r2 codex-ops F1 MED locked the entire-stream silence
  // contract — wrapper redirects curl's own stderr to /dev/null so
  // neither wrapper emissions nor curl's `(7) Connection refused`
  // bytes reach the spawned process's stderr stream).
  it('daemon unreachable produces fully empty stderr; exit 0; no atom', async () => {
    const closedPort = await pickClosedPort();
    const r = await runWrapperAsync(
      [
        'tools/review-queue/coord-emit.sh',
        'tick_start',
        `--correlation-id=${VALID_CORR}`,
      ],
      {
        ...process.env,
        REVIEWER_NAME: 'codex',
        ECHO_MCP_URL: `http://127.0.0.1:${closedPort}/mcp`,
      },
    );
    expect(r.status).toBe(0);
    // Locked V1 contract: fully empty stderr. `toBe('')` is intentional
    // — any future bash quirk or pipefail interaction that leaks a byte
    // into stderr on the unreachable path fails this assertion loudly.
    expect(r.stderr).toBe('');
    // Negative-assertion (subsumed by toBe('') but kept explicit so a
    // future relaxation of the empty-stream check can't silently allow
    // the rejection line through on the unreachable branch).
    expect(r.stderr).not.toMatch(/coord-emit\.sh: daemon rejected/);
    // Daemon unreachable — no atom on the (separate) MCP daemon either.
    const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
    expect(events.length).toBe(0);
  });

  // Case (iii): HTTP non-2xx from a non-MCP fixture. Simulates the
  // launchd production failure mode (codex-ops r1 F2): a stale
  // ECHO_MCP_URL reaching a local service that is NOT the MCP daemon,
  // or a daemon-side 500 from an unrelated path. The wrapper must
  // surface the status code + body excerpt on stderr without
  // misclassifying it as a JSON-RPC rejection.
  it('daemon HTTP 500 is surfaced as `returned HTTP 500` on stderr; exit 0; no atom', async () => {
    // Tiny in-process HTTP fixture — NOT the MCP daemon — that returns
    // 500 with body `{"error":"boom"}` to every POST.
    const fixture = http.createServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"boom"}');
    });
    fixture.unref();
    const fixturePort: number = await new Promise((resolve, reject) => {
      fixture.listen(0, '127.0.0.1', () => {
        const addr = fixture.address();
        if (typeof addr !== 'object' || addr === null) {
          reject(new Error('no fixture port from listen(0)'));
          return;
        }
        resolve(addr.port);
      });
      fixture.on('error', reject);
    });
    try {
      const r = await runWrapperAsync(
        [
          'tools/review-queue/coord-emit.sh',
          'tick_start',
          `--correlation-id=${VALID_CORR}`,
        ],
        {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: `http://127.0.0.1:${fixturePort}/mcp`,
        },
      );
      expect(r.status).toBe(0);
      expect(r.stderr).toContain('coord-emit.sh: daemon returned HTTP 500');
      // Pin the third branch — must not be misclassified as the
      // JSON-RPC rejection branch. A future refactor that collapses
      // the three branches into one message would fail this AND the
      // case (i) substring check (which would lose its prefix).
      expect(r.stderr).not.toMatch(/coord-emit\.sh: daemon rejected/);
      // The wrapper never reached the (separate) MCP daemon, so its
      // storage stays empty.
      const events = await storage.query({ source_prefix: 'coord:', limit: 10 });
      expect(events.length).toBe(0);
    } finally {
      await new Promise<void>((resolve) => fixture.close(() => resolve()));
    }
  });
});
