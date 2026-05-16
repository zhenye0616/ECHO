// 057a AC2 — r2 codex-ops F5 MED: the coord-roles loader must resolve the
// config file via a module-relative URL (import.meta.url) so the daemon
// works even when process.cwd() is unrelated to the repo (e.g. a launchd
// plist that sets WorkingDirectory=/ or omits it entirely).
//
// This test chdirs to / before calling startMcpServer() and asserts the
// loader still finds the canonical coord-roles.json + boots cleanly.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _resetValidatorCacheForTests } from '../../src/coord/roles.js';
import { startMcpServer } from '../../src/mcp/server.js';
import { MemoryStorage } from '../../src/storage/memory.js';

let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  _resetValidatorCacheForTests();
});

afterEach(() => {
  if (process.cwd() !== originalCwd) {
    process.chdir(originalCwd);
  }
});

describe('AC2 — cwd-independent coord-roles path resolution (r2 codex-ops F5 MED)', () => {
  it('startMcpServer loads coord-roles.json after chdir("/")', async () => {
    process.chdir('/');
    expect(process.cwd()).toBe('/');
    const storage = new MemoryStorage();
    const handle = await startMcpServer(storage, { port: 0 });
    try {
      expect(handle.port).toBeGreaterThan(0);
    } finally {
      await handle.stop();
    }
  });
});
