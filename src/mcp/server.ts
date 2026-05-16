import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type Server as HttpServer } from 'node:http';
import { loadCoordRoles, type CoordRolesConfig } from '../coord/roles.js';
import { createLogger } from '../logging/index.js';
import type { Storage } from '../storage/interface.js';
import { registerCoordEmit } from './tools/coord-emit.js';
import { registerEchoPing } from './tools/echo-ping.js';
import { registerEchoResolveMru } from './tools/echo-resolve-mru.js';
import { registerFindClusters } from './tools/find-clusters.js';
import { registerGetAtom } from './tools/get-atom.js';
import { registerGetAtoms } from './tools/get-atoms.js';
import { registerGetRoleState } from './tools/get-role-state.js';
import { registerListTaskStates } from './tools/list-task-states.js';
import { registerRecentWorkContext } from './tools/recent-work-context.js';
import { registerSearchMemories } from './tools/search-memories.js';
import { registerWaitForNewTurns } from './tools/wait-for-new-turns.js';

const log = createLogger('mcp.server');

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
}

function resolveRepoRoot(option?: string): string {
  if (option !== undefined && option !== '') return option;
  const env = process.env.ECHO_REPO_ROOT;
  if (env !== undefined && env !== '') return env;
  return process.cwd();
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
): void {
  res.statusCode = 405;
  res.setHeader('Allow', 'POST');
  res.setHeader('content-type', 'application/json');
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Method Not Allowed: ${method ?? 'unknown'} (POST only)`,
      },
      id: null,
    }),
  );
}

export async function startMcpServer(
  storage: Storage,
  options: StartMcpServerOptions = {},
): Promise<McpServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const requestedPort = options.port ?? 38478;
  const repoRoot = resolveRepoRoot(options.repo_root);

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
    registerEchoPing(mcp);
    registerSearchMemories(mcp, storage);
    // Deprecated wrapper — kept registered until the 2026-05-17 follow-up
    // (item 038 / AC3 + R2 Codex HIGH #1; founder declined override).
    registerRecentWorkContext(mcp, storage);
    // V1.6 (item 030) — atomic decomposition + group-session subscription.
    registerFindClusters(mcp, storage);
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
    registerCoordEmit(mcp, { storage, coordRoles, xEchoRoleHeader });

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
