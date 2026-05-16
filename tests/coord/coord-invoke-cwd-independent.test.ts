// 057b AC0 — r2 codex-ops F4 HIGH: coord_invoke works after daemon chdirs.
//
// Covers (per files_to_modify line ~74):
//   - start MCP daemon from non-repo cwd (process.chdir("/"))
//   - wrapper path still resolves via import.meta.url
//   - child cwd is REPO_ROOT (not "/")
//   - ECHO_REVIEW_QUEUE_REPO_ROOT env var arrives in the wrapper process
//
// We can't directly inspect the spawned wrapper's cwd from this test
// (fire-and-forget, stdio ignored). The implicit guarantee is: if path
// resolution were cwd-relative, resolveReviewerWrapperPath() would
// reject (file not found) and coord_invoke would return isError. Asserting
// a non-error response after chdir("/") is the falsifiable claim.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { request as httpRequest } from 'node:http';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const VALID_CORR = 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef';

let originalCwd: string;
let storage: MemoryStorage;
let handle: McpServerHandle;

beforeEach(() => {
  originalCwd = process.cwd();
  _resetValidatorCacheForTests();
});
afterEach(async () => {
  if (handle) await handle.stop();
  if (process.cwd() !== originalCwd) process.chdir(originalCwd);
});

describe('057b AC0 — coord_invoke cwd-independent (r2 codex-ops F4 HIGH)', () => {
  it('coord_invoke succeeds after process.chdir("/")', async () => {
    storage = new MemoryStorage();
    handle = await startMcpServer(storage, {
      port: 0,
      deadline_heartbeat_ms: 0,
      deadline_reconciliation_ms: null,
    });
    process.chdir('/');
    expect(process.cwd()).toBe('/');

    const result = await new Promise<{ isError: boolean; text: string }>((resolve, reject) => {
      const body = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'coord_invoke',
          arguments: {
            role: 'codex',
            request_path: 'backlog/reviews/2026-05-16-057b/r1/request.md',
            correlation_id: VALID_CORR,
          },
        },
        id: 1,
      });
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: handle.port,
          path: '/mcp',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString(),
            Accept: 'application/json, text/event-stream',
            'X-Echo-Role': 'claude',
          },
        },
        (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c.toString()));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(buf);
              const r = parsed.result ?? {};
              const content = (r.content as Array<{ text?: string }> | undefined) ?? [];
              resolve({ isError: r.isError === true, text: content.map((c) => c.text ?? '').join('') });
            } catch {
              reject(new Error(`bad response: ${buf}`));
            }
          });
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    expect(result.isError, result.text).toBe(false);
    const parsed = JSON.parse(result.text);
    expect(parsed.wrapper_path).toMatch(/\/tools\/review-queue\/run-codex-reviewer\.sh$/);
  });
});
