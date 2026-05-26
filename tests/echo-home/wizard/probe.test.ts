import { describe, expect, it } from 'vitest';
import { probeAgents, type SpawnResult } from '../../../src/echo-home/wizard/probe.js';

function ok(stdout: string): SpawnResult {
  return { exitCode: 0, stdout, stderr: '', timedOut: false };
}

describe('probeAgents', () => {
  it('probes codex successfully only when pong and ts are present', async () => {
    const success = await probeAgents(['codex'], {
      spawn: async () => ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}'),
    });
    expect(success[0]!.probed).toBe(true);

    const missingTs = await probeAgents(['codex'], {
      spawn: async () => ok('{"pong":true}'),
    });
    expect(missingTs[0]).toMatchObject({ probed: false, reason: 'unexpected-output' });
  });

  it('maps unparseable codex stdout to unexpected-output', async () => {
    const out = await probeAgents(['codex'], {
      spawn: async () => ok('no clue what to do'),
    });
    expect(out[0]).toMatchObject({ probed: false, reason: 'unexpected-output' });
  });

  it('maps ENOENT spawn errors to cli-unavailable', async () => {
    const out = await probeAgents(['codex'], {
      spawn: async () => {
        const err = new Error('missing') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      },
    });
    expect(out[0]).toMatchObject({ probed: false, reason: 'cli-unavailable' });
  });

  it('maps login/auth stderr to auth-required', async () => {
    const out = await probeAgents(['codex'], {
      spawn: async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'Please run codex login first',
        timedOut: false,
      }),
    });
    expect(out[0]).toMatchObject({ probed: false, reason: 'auth-required' });
  });

  it('maps timed-out probes to timeout', async () => {
    const out = await probeAgents(['codex'], {
      spawn: async () => ({ exitCode: -1, stdout: '', stderr: '', timedOut: true }),
    });
    expect(out[0]).toMatchObject({ probed: false, reason: 'timeout' });
  });

  it('probes claude-code successfully with the same echo_ping payload contract', async () => {
    const out = await probeAgents(['claude-code'], {
      spawn: async (cmd) => {
        expect(cmd).toBe('claude');
        return ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}');
      },
    });
    expect(out[0]!.probed).toBe(true);
  });

  it('returns manual-only for cursor without spawning', async () => {
    let calls = 0;
    const out = await probeAgents(['cursor'], {
      spawn: async () => {
        calls += 1;
        return ok('{}');
      },
    });
    expect(out).toEqual([{ agent: 'cursor', probed: false, reason: 'manual-only' }]);
    expect(calls).toBe(0);
  });

  it('returns mixed-agent results in input order and probes sequentially', async () => {
    const calls: string[] = [];
    const out = await probeAgents(['codex', 'cursor', 'claude-code'], {
      spawn: async (cmd) => {
        calls.push(cmd);
        return ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}');
      },
    });
    expect(out.map((result) => result.agent)).toEqual(['codex', 'cursor', 'claude-code']);
    expect(calls).toEqual(['codex', 'claude']);
  });

  it('maps claude-code MCP-missing text to mcp-not-configured only for claude-code', async () => {
    for (const text of [
      'mcp__echo__echo_ping not found',
      'unknown tool: mcp__echo__echo_ping',
      'mcp server not configured',
      'no such tool: mcp__echo__echo_ping',
    ]) {
      const out = await probeAgents(['claude-code'], {
        spawn: async () => ({ exitCode: 1, stdout: text, stderr: '', timedOut: false }),
      });
      expect(out[0]).toMatchObject({ agent: 'claude-code', reason: 'mcp-not-configured' });
    }

    const codex = await probeAgents(['codex'], {
      spawn: async () => ({
        exitCode: 1,
        stdout: 'mcp server not configured',
        stderr: '',
        timedOut: false,
      }),
    });
    expect(codex[0]).toMatchObject({ agent: 'codex', reason: 'unexpected-output' });
  });
});
