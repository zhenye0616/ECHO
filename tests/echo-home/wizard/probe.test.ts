import { homedir } from 'node:os';
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

  it('accepts pong JSON wrapped in markdown code fences (claude-code 2.1.x output)', async () => {
    const wrapped = '```json\n{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}\n```';
    const out = await probeAgents(['codex'], { spawn: async () => ok(wrapped) });
    expect(out[0]!.probed).toBe(true);
  });

  it('accepts pong JSON preceded by log preamble lines', async () => {
    const noisy =
      '[info] spawning agent...\n[info] connecting MCP...\n{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}';
    const out = await probeAgents(['codex'], { spawn: async () => ok(noisy) });
    expect(out[0]!.probed).toBe(true);
  });

  it('regression: accepts pong even when the last line is unparseable (old lines.at(-1) approach)', async () => {
    // Pins that probe scans ALL lines, not just the last. If someone reverts to
    // `lines.at(-1)`, the closing ``` fence would be the last line and JSON.parse
    // would throw — this test would then fail.
    const wrapped = '```json\n{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}\n```';
    const lastLine = wrapped.trim().split('\n').filter(Boolean).at(-1);
    expect(lastLine).toBe('```'); // sanity: the last line really IS the closing fence
    expect(() => JSON.parse(lastLine!)).toThrow(); // sanity: parsing it would throw
    const out = await probeAgents(['codex'], { spawn: async () => ok(wrapped) });
    expect(out[0]!.probed).toBe(true); // but the probe still succeeds — proving it scans all lines
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

  it('passes the 30s default timeout and neutral home cwd to injected spawn', async () => {
    const options: Array<{ timeoutMs: number; cwd: string }> = [];
    const out = await probeAgents(['codex'], {
      spawn: async (_cmd, _args, opts) => {
        options.push(opts);
        return ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}');
      },
    });

    expect(out[0]!.probed).toBe(true);
    expect(options).toEqual([{ timeoutMs: 30_000, cwd: homedir() }]);
  });

  it('passes the codex trust-bypass flag so probes work outside git repos', async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    const out = await probeAgents(['codex'], {
      spawn: async (cmd, args) => {
        calls.push({ cmd, args });
        return ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}');
      },
    });

    expect(out[0]!.probed).toBe(true);
    expect(calls).toEqual([
      {
        cmd: 'codex',
        args: [
          'exec',
          '--skip-git-repo-check',
          '--sandbox',
          'read-only',
          '--',
          'Invoke the mcp tool mcp__echo__echo_ping with no arguments and return its result verbatim as JSON only — no commentary.',
        ],
      },
    ]);
  });

  it('lets an explicit timeout override the 30s default', async () => {
    const timeouts: number[] = [];
    const out = await probeAgents(['codex'], {
      timeoutMs: 5_000,
      spawn: async (_cmd, _args, opts) => {
        timeouts.push(opts.timeoutMs);
        return ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}');
      },
    });

    expect(out[0]!.probed).toBe(true);
    expect(timeouts).toEqual([5_000]);
  });

  it('passes an explicit probe cwd through to the spawned client', async () => {
    const cwds: string[] = [];
    const out = await probeAgents(['codex', 'claude-code'], {
      probeCwd: '/tmp/echo-neutral-probe',
      spawn: async (_cmd, _args, opts) => {
        cwds.push(opts.cwd);
        return ok('{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}');
      },
    });

    expect(out.every((result) => result.probed)).toBe(true);
    expect(cwds).toEqual(['/tmp/echo-neutral-probe', '/tmp/echo-neutral-probe']);
  });

  it('probes claude-code successfully with the same echo_ping payload contract', async () => {
    const out = await probeAgents(['claude-code'], {
      spawn: async (cmd, args) => {
        expect(cmd).toBe('claude');
        expect(args).toEqual([
          '--print',
          '--output-format',
          'text',
          '--allowedTools',
          'mcp__echo__echo_ping',
          '--',
          'Invoke the mcp tool mcp__echo__echo_ping with no arguments and return its result verbatim as JSON only — no commentary.',
        ]);
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

  it('rejects an unexpected runtime agent value without spawning', async () => {
    let calls = 0;
    const out = await probeAgents(['shell&calc' as never], {
      spawn: async () => {
        calls += 1;
        return ok('{}');
      },
    });
    expect(out[0]).toMatchObject({ probed: false, reason: 'unexpected-output' });
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
