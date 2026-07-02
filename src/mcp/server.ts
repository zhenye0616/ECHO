import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type Server as HttpServer } from 'node:http';
import { DeadlineTracker, type DeadlineTrackerHandle } from '../coord/deadlines.js';
import { loadCoordRoles, type CoordRolesConfig } from '../coord/roles.js';
import { createLogger } from '../logging/index.js';
import type { Storage } from '../storage/interface.js';
import {
  instrumentMcpServer,
  readRecentMcpCalls,
  type RecentMcpCallStatus,
} from './request-log.js';
import { registerCoordEmit } from './tools/coord-emit.js';
import { registerCoordInvoke } from './tools/coord-invoke.js';
import { registerCoordStatus } from './tools/coord-status.js';
import { registerEchoPing } from './tools/echo-ping.js';
import { registerEchoResolveMru } from './tools/echo-resolve-mru.js';
import { registerFindClusters } from './tools/find-clusters.js';
import { registerGetAtom } from './tools/get-atom.js';
import { registerGetAtoms } from './tools/get-atoms.js';
import { registerGetRoleState } from './tools/get-role-state.js';
import { registerListTaskStates } from './tools/list-task-states.js';
import { registerPendingDecisions } from './tools/pending-decisions.js';
import { registerRecentWorkContext } from './tools/recent-work-context.js';
import { registerSearchMemories } from './tools/search-memories.js';
import { registerWaitForNewTurns } from './tools/wait-for-new-turns.js';

const log = createLogger('mcp.server');

type ProposeDecisionRegistrar = (server: McpServer) => void;

export interface McpServerHandle {
  stop: () => Promise<void>;
  port: number;
  url: string;
}

export interface StartMcpServerOptions {
  port?: number;
  host?: string;
  /**
   * Repo root used by `get_role_state` / `list_task_states` (046 AC4).
   * Resolution priority: explicit option > `ECHO_REPO_ROOT` env > process
   * `cwd()`. Captured ONCE at server-start; tool handlers never re-read
   * `process.cwd()`.
   */
  repo_root?: string;
  /**
   * 057a AC2 — explicit coord-roles config path override. When omitted, the
   * loader resolves via `ECHO_COORD_ROLES_PATH` env or the module-relative
   * default (cwd-independent, per 057a r2 codex-ops F5 MED). Test-only;
   * production callers should rely on the env / default.
   */
  coord_roles_path?: string;
  /**
   * 057a AC3 — when true (default), startMcpServer constructs a
   * DeadlineTracker, awaits its boot reconstruction (HARD STARTUP GATE
   * — server doesn't accept connections until reconstruction finishes),
   * and starts the heartbeat + reconciliation timers. Tests that don't
   * need the tracker set this to false to avoid timer noise.
   */
  enable_deadlines?: boolean;
  /**
   * 057a AC3 — test-only override for the heartbeat interval. Production
   * uses the default 1s.
   */
  deadline_heartbeat_ms?: number;
  /**
   * 057a AC3 — test-only override for the periodic reconciliation
   * interval. Production uses the default 10min. `null` disables.
   */
  deadline_reconciliation_ms?: number | null;
}

function resolveRepoRoot(option?: string): string {
  if (option !== undefined && option !== '') return option;
  const env = process.env.ECHO_REPO_ROOT;
  if (env !== undefined && env !== '') return env;
  return process.cwd();
}

function isOptionalProposeDecisionMissing(err: unknown): boolean {
  if (!(err instanceof Error) || !('code' in err)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  return (
    (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') &&
    err.message.includes('ceo-slack-responder/propose-decision-tool')
  );
}

async function loadOptionalProposeDecisionTool(): Promise<ProposeDecisionRegistrar | null> {
  try {
    const mod = await import('../surfaces/ceo-slack-responder/propose-decision-tool.js');
    return mod.registerProposeDecision;
  } catch (err) {
    if (isOptionalProposeDecisionMissing(err)) {
      log.warn('propose_decision_skipped', { reason: 'module_not_found' });
      return null;
    }
    throw err;
  }
}

const MAX_BODY_BYTES = 4 * 1024 * 1024;

class BodyTooLargeError extends Error {
  constructor() {
    super('request body exceeds limit');
  }
}

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > MAX_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(buf);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function methodNotAllowed(
  res: import('node:http').ServerResponse,
  method: string | undefined,
  allow = 'POST',
): void {
  res.statusCode = 405;
  res.setHeader('Allow', allow);
  res.setHeader('content-type', 'application/json');
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Method Not Allowed: ${method ?? 'unknown'} (${allow} only)`,
      },
      id: null,
    }),
  );
}

function handleRecentCalls(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  host: string,
  boundPort: number,
): boolean {
  const url = new URL(req.url ?? '/', `http://${host}:${boundPort}`);
  if (url.pathname !== '/mcp/recent-calls') return false;
  if (req.method !== 'GET') {
    methodNotAllowed(res, req.method, 'GET');
    return true;
  }

  const since = parseNumberParam(url.searchParams.get('since'), 0);
  const until = parseNumberParam(url.searchParams.get('until'), Number.POSITIVE_INFINITY);
  const status = parseStatusParam(url.searchParams.get('status'));
  if (since === null || until === null || status === null) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'invalid recent-calls query parameters' }));
    return true;
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(
    JSON.stringify({
      calls: readRecentMcpCalls({ since, until, ...(status !== undefined ? { status } : {}) }),
    }),
  );
  return true;
}

function parseNumberParam(raw: string | null, fallback: number): number | null {
  if (raw === null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStatusParam(raw: string | null): RecentMcpCallStatus | undefined | null {
  if (raw === null || raw === '') return undefined;
  if (raw === 'pending' || raw === 'ok' || raw === 'error' || raw === 'killed_during_shutdown') {
    return raw;
  }
  return null;
}

export async function startMcpServer(
  storage: Storage,
  options: StartMcpServerOptions = {},
): Promise<McpServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const requestedPort = options.port ?? 38478;
  const repoRoot = resolveRepoRoot(options.repo_root);
  const registerProposeDecision = await loadOptionalProposeDecisionTool();

  // 057a AC2 — load coord-roles config BEFORE any tool registration. Bad
  // config (schema violation OR cross-field `max_deadline_sec <= default`)
  // throws here; the throw propagates out of startMcpServer, causing the
  // daemon to exit non-zero with a clear stderr diagnostic. This is the
  // hard startup gate required by r1 codex F4 MED — the operator sees a
  // boot failure rather than a per-request error every 10 minutes.
  //
  // The returned config is held in a `const` available to future
  // coord-emit / coord-status / deadlines registrations (AC1/AC3/AC6).
  // 057a-AC2-only: nothing consumes it yet, but the throw-at-boot path is
  // exercised by tests.
  const coordRoles: CoordRolesConfig = loadCoordRoles(options.coord_roles_path);
  log.info('coord_roles_loaded', { role_count: coordRoles.roles.length });

  // 057a AC3 — HARD STARTUP GATE. The deadline tracker boot
  // reconstruction MUST complete before the MCP server accepts a single
  // request. r1 codex-ops F6 HIGH: a coord_emit racing in mid-replay
  // could produce a transient open-record state that diverges from the
  // durable ledger. Awaiting reconstruction here closes that window —
  // by the time `await server.listen()` returns control, the lane has
  // replayed the full ledger.
  const serverStartedAt = new Date();
  let deadlineHandle: DeadlineTrackerHandle | null = null;
  let deadlines: DeadlineTracker | null = null;
  if (options.enable_deadlines !== false) {
    const trackerOpts: ConstructorParameters<typeof DeadlineTracker>[2] = {};
    if (options.deadline_heartbeat_ms !== undefined) {
      trackerOpts.heartbeatIntervalMs = options.deadline_heartbeat_ms;
    }
    if (options.deadline_reconciliation_ms !== undefined) {
      trackerOpts.reconciliationIntervalMs = options.deadline_reconciliation_ms;
    }
    deadlines = new DeadlineTracker(storage, coordRoles, trackerOpts);
    await deadlines.reconstruct();
    deadlineHandle = deadlines.start();
    log.info('deadlines_started', {});
  }

  let boundPort = requestedPort;

  // Stateless: per-request McpServer + StreamableHTTPServerTransport.
  // Storage is shared (process-scoped); only the MCP protocol/session wrapper
  // is request-scoped, so daemon restart no longer invalidates client sessions.
  async function handlePost(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    body: unknown,
  ): Promise<void> {
    // 057a AC1+AC5 — extract X-Echo-Role from the raw HTTP request BEFORE
    // tool registration so coord_emit can server-derive the emitter
    // identity. Native MCP clients (Cursor IDE-mode) don't set this
    // header, which is the correct V1 behavior — they get a clear
    // CoordIdentityError on coord_emit and can't pollute the coord
    // surface. Wrapper-side curl callers set it explicitly.
    const xEchoRoleRaw = req.headers['x-echo-role'];
    const xEchoRoleHeader =
      typeof xEchoRoleRaw === 'string'
        ? xEchoRoleRaw
        : Array.isArray(xEchoRoleRaw) && xEchoRoleRaw.length > 0
          ? String(xEchoRoleRaw[0])
          : null;

    const mcp = new McpServer({ name: 'echo-daemon', version: '0.0.0' });
    instrumentMcpServer(mcp);
    registerEchoPing(mcp);
    if (registerProposeDecision !== null) registerProposeDecision(mcp);
    registerSearchMemories(mcp, storage);
    // Deprecated wrapper — kept registered until the 2026-05-17 follow-up
    // (item 038 / AC3 + R2 Codex HIGH #1; founder declined override).
    registerRecentWorkContext(mcp, storage);
    // V1.6 (item 030) — atomic decomposition + group-session subscription.
    registerFindClusters(mcp, storage);
    registerPendingDecisions(mcp);
    registerGetAtoms(mcp, storage);
    registerWaitForNewTurns(mcp, storage);
    // V1.6 (item 033) — full-atom recovery escape hatch.
    registerGetAtom(mcp, storage);
    // Item 038 / AC1 — MRU resolver primitive (returns search_memories-ready
    // descriptors for the most-recently-active source(s) under a predicate).
    registerEchoResolveMru(mcp, storage);
    // Item 046 / AC4 — role-typed task-state read surface (repo_root pinned).
    registerGetRoleState(mcp, repoRoot);
    registerListTaskStates(mcp, repoRoot);
    // 057a AC1 — coord substrate append seam. The emitter identity is
    // resolved per-request from X-Echo-Role; native MCP clients without
    // the header get a clear identity error on every call (r1 codex F4 MED).
    registerCoordEmit(mcp, {
      storage,
      coordRoles,
      xEchoRoleHeader,
      ...(deadlines !== null ? { deadlines } : {}),
    });
    // 057a AC6 — coord substrate read surface. Only registered when the
    // deadline tracker is enabled (its currentSnapshot() feeds the
    // open_deadlines field).
    if (deadlines !== null) {
      registerCoordStatus(mcp, {
        storage,
        coordRoles,
        deadlines,
        serverStartedAt,
      });
      // 057b AC0 — strategist-side active-trigger seam. Requires the
      // deadline tracker (the pre-spawn deadline is opened by the
      // internal-emitter helper); skipped together with coord_status
      // when deadlines are disabled.
      registerCoordInvoke(mcp, {
        storage,
        coordRoles,
        deadlines,
      });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts: [`127.0.0.1:${boundPort}`, `localhost:${boundPort}`],
    });

    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } finally {
      await transport.close();
      await mcp.close();
    }
  }

  const httpServer: HttpServer = createServer((req, res) => {
    void (async () => {
      if (handleRecentCalls(req, res, host, boundPort)) {
        return;
      }

      if (req.method !== 'POST') {
        methodNotAllowed(res, req.method);
        return;
      }

      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        if (err instanceof BodyTooLargeError) {
          res.statusCode = 413;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32000, message: 'request body too large' },
              id: null,
            }),
          );
          return;
        }
        throw err;
      }

      await handlePost(req, res, body);
    })().catch((err: unknown) => {
      log.error('handle_request_failed', {
        message: (err as Error).message,
      });
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end();
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => {
      httpServer.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = (): void => {
      httpServer.removeListener('error', onError);
      resolve();
    };
    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(requestedPort, host);
  });

  const addr = httpServer.address();
  boundPort = typeof addr === 'object' && addr !== null ? addr.port : requestedPort;
  const url = `http://${host}:${boundPort}/mcp`;

  log.info('started', { port: boundPort, url, host });

  return {
    port: boundPort,
    url,
    stop: async () => {
      if (deadlineHandle !== null) {
        await deadlineHandle.stop();
      }
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          resolve();
        });
        httpServer.closeAllConnections?.();
      });
      log.info('stopped', {});
    },
  };
}
