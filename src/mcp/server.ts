import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import { createLogger } from '../logging/index.js';
import type { Storage } from '../storage/interface.js';
import { registerEchoPing } from './tools/echo-ping.js';

const log = createLogger('mcp.server');

export interface McpServerHandle {
  stop: () => Promise<void>;
  port: number;
  url: string;
}

export interface StartMcpServerOptions {
  port?: number;
  host?: string;
}

interface Session {
  transport: StreamableHTTPServerTransport;
  mcp: McpServer;
}

const MAX_BODY_BYTES = 4 * 1024 * 1024;

class BodyTooLargeError extends Error {
  constructor() {
    super('request body exceeds limit');
  }
}

async function readJsonBody(
  req: import('node:http').IncomingMessage,
): Promise<unknown> {
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

export async function startMcpServer(
  _storage: Storage,
  options: StartMcpServerOptions = {},
): Promise<McpServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const requestedPort = options.port ?? 38478;

  const sessions = new Map<string, Session>();
  let boundPort = requestedPort;

  async function createSession(): Promise<Session> {
    const mcp = new McpServer({ name: 'echo-daemon', version: '0.0.0' });
    registerEchoPing(mcp);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableDnsRebindingProtection: true,
      allowedHosts: [`127.0.0.1:${boundPort}`, `localhost:${boundPort}`],
      onsessionclosed: (sid: string) => {
        const session = sessions.get(sid);
        if (session !== undefined) {
          sessions.delete(sid);
          void session.mcp.close();
        }
      },
    });
    await mcp.connect(transport);
    return { transport, mcp };
  }

  const httpServer: HttpServer = createServer((req, res) => {
    void (async () => {
      const sessionIdHeader = req.headers['mcp-session-id'];
      const sessionId =
        typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined;

      let session = sessionId !== undefined ? sessions.get(sessionId) : undefined;
      let body: unknown;

      if (req.method === 'POST') {
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
              }),
            );
            return;
          }
          throw err;
        }
      }

      if (session === undefined) {
        if (req.method === 'POST' && isInitializeRequest(body)) {
          session = await createSession();
          await session.transport.handleRequest(req, res, body);
          if (session.transport.sessionId !== undefined) {
            sessions.set(session.transport.sessionId, session);
          }
          return;
        }
        res.statusCode = 400;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: no active session' },
          }),
        );
        return;
      }

      await session.transport.handleRequest(req, res, body);
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
      for (const session of sessions.values()) {
        await session.mcp.close();
      }
      sessions.clear();
      log.info('stopped', {});
    },
  };
}
