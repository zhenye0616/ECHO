// 057b AC0 — coord_invoke input validation tests (AC8 entry).
//
// Covers (per files_to_modify lines 66+):
//   - shell metacharacters + path traversal in request_path rejected
//   - bad uuid4 (loose format pre-r3) rejected
//   - role shape-invalid values ("../", "/", "foo;rm", " ", "FOO") rejected
//     before ANY config-file read OR FS access (no spawn, no atom)
//   - role roster-invalid values ("cursor" [headless:false], "nonexistent")
//     rejected AFTER loadCoordRoles() but BEFORE wrapper-path / stat / spawn
//   - On rejection: no spawn AND no coord:reviewer_invoked atom appended.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { request as httpRequest } from 'node:http';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer, type McpServerHandle } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { COORD_REQUEST_PATH, installCoordRequestFixture } from './coord-request-fixture.js';

const VALID_CORR = 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef';
const VALID_REQ_PATH = COORD_REQUEST_PATH;

let storage: MemoryStorage;
let handle: McpServerHandle;
let cleanupRequestFixture: (() => void) | undefined;

async function callMcp(
  port: number,
  tool: string,
  args: Record<string, unknown>,
  role: string | null = 'claude',
): Promise<{ isError: boolean; text: string }> {
  return await new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: tool, arguments: args },
      id: 1,
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body).toString(),
      Accept: 'application/json, text/event-stream',
    };
    if (role !== null) headers['X-Echo-Role'] = role;
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers,
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c.toString()));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(buf);
            const result = parsed.result ?? {};
            const isError = result.isError === true;
            const content = (result.content as Array<{ text?: string }> | undefined) ?? [];
            const text = content.map((c) => c.text ?? '').join('');
            resolve({ isError, text });
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
}

beforeEach(async () => {
  _resetValidatorCacheForTests();
  cleanupRequestFixture = installCoordRequestFixture();
  storage = new MemoryStorage();
  handle = await startMcpServer(storage, {
    port: 0,
    deadline_heartbeat_ms: 0,
    deadline_reconciliation_ms: null,
  });
});
afterEach(async () => {
  await handle.stop();
  cleanupRequestFixture?.();
});

async function countReviewerInvokedAtoms(): Promise<number> {
  const events = await storage.query({ source_prefix: 'coord:', limit: 100 });
  return events.filter((e) => {
    const md = e.metadata as { coord?: { event_type?: string } } | undefined;
    return md?.coord?.event_type === 'reviewer_invoked';
  }).length;
}

describe('057b AC0 — coord_invoke input validation', () => {
  it('bad uuid4 (loose 36-char a-f0-9) rejected; no atom', async () => {
    const r = await callMcp(handle.port, 'coord_invoke', {
      role: 'codex',
      request_path: VALID_REQ_PATH,
      correlation_id: 'aaaaaaaa-bbbb-bbbb-bbbb-aaaaaaaaaaaa', // wrong version nibble
    });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/correlation_id/);
    expect(await countReviewerInvokedAtoms()).toBe(0);
  });

  it('request_path with traversal rejected; no atom', async () => {
    const r = await callMcp(handle.port, 'coord_invoke', {
      role: 'codex',
      request_path: '../../../etc/passwd',
      correlation_id: VALID_CORR,
    });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/request_path/);
    expect(await countReviewerInvokedAtoms()).toBe(0);
  });

  it('request_path with shell metacharacter rejected; no atom', async () => {
    const r = await callMcp(handle.port, 'coord_invoke', {
      role: 'codex',
      request_path: 'backlog/reviews/foo$(whoami)/r1/request.md',
      correlation_id: VALID_CORR,
    });
    expect(r.isError).toBe(true);
    expect(await countReviewerInvokedAtoms()).toBe(0);
  });

  for (const bad of ['../', '/', 'foo;rm', 'foo bar', 'FOO', '']) {
    it(`shape-invalid role ${JSON.stringify(bad)} rejected; no atom`, async () => {
      const r = await callMcp(handle.port, 'coord_invoke', {
        role: bad,
        request_path: VALID_REQ_PATH,
        correlation_id: VALID_CORR,
      });
      expect(r.isError).toBe(true);
      expect(await countReviewerInvokedAtoms()).toBe(0);
    });
  }

  it('roster-invalid role "cursor" (headless:false) rejected; no atom', async () => {
    const r = await callMcp(handle.port, 'coord_invoke', {
      role: 'cursor',
      request_path: VALID_REQ_PATH,
      correlation_id: VALID_CORR,
    });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/not headless/);
    expect(await countReviewerInvokedAtoms()).toBe(0);
  });

  it('roster-invalid role "nonexistent" rejected; no atom', async () => {
    const r = await callMcp(handle.port, 'coord_invoke', {
      role: 'nonexistent',
      request_path: VALID_REQ_PATH,
      correlation_id: VALID_CORR,
    });
    expect(r.isError).toBe(true);
    expect(await countReviewerInvokedAtoms()).toBe(0);
  });
});
