// 057b AC0 step 6 + AC7 — r1 codex-ops F2 HIGH best-effort emission.
//
// Covers:
//   - coord-emit.sh against unreachable daemon exits 0 (queue durability)
//   - coord_invoke wrapper-side callers tolerate non-zero rc via `|| true`

import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const VALID_CORR = 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef';

describe('057b AC0/AC7 — daemon-down tolerance', () => {
  it('coord-emit.sh tick_start against dead port exits 0', () => {
    const r = spawnSync(
      'bash',
      ['tools/review-queue/coord-emit.sh', 'tick_start', `--correlation-id=${VALID_CORR}`],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'codex',
          ECHO_MCP_URL: 'http://127.0.0.1:1/mcp',
        },
        encoding: 'utf-8',
        timeout: 10_000,
      },
    );
    expect(r.status).toBe(0);
  });

  it('coord-emit.sh scheduler_health against dead port exits 0', () => {
    const r = spawnSync(
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
          ECHO_MCP_URL: 'http://127.0.0.1:1/mcp',
        },
        encoding: 'utf-8',
        timeout: 10_000,
      },
    );
    expect(r.status).toBe(0);
  });

  it('coord-emit.sh exits 0 with explicit unset tier key (best-effort)', () => {
    const r = spawnSync('bash', ['tools/review-queue/coord-emit.sh', 'tick_end'], {
      env: { ...process.env, REVIEWER_NAME: 'codex' },
      encoding: 'utf-8',
    });
    // Missing tier key → log + exit 0 (queue durability preserved).
    expect(r.status).toBe(0);
  });
});
