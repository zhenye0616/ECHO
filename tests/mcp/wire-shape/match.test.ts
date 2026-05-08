import { describe, expect, it } from 'vitest';
import { WIRE_SHAPE_CAPS } from '../../../src/mcp/wire-shape/caps.js';
import { projectMatch } from '../../../src/mcp/wire-shape/match.js';
import type { CaptureEvent } from '../../../src/storage/interface.js';

function ev(overrides: Partial<CaptureEvent>): CaptureEvent {
  return {
    id: 'fixed-id',
    source: 'fs:/tmp/x.jsonl',
    timestamp: '2026-05-08T22:00:00.000Z',
    content: '',
    ...overrides,
  };
}

describe('projectMatch — content cap', () => {
  it('content under cap passes verbatim, no bytes_elided field', () => {
    const m = projectMatch(ev({ content: 'short turn that fits' }));
    expect(m.content).toBe('short turn that fits');
    expect(m.bytes_elided).toBeUndefined();
  });

  it('content over cap is clipped to head + marker + tail; bytes_elided populated', () => {
    const head = 'HEAD_SENTINEL_' + 'a'.repeat(50_000);
    const tail = 'b'.repeat(50_000) + '_TAIL_SENTINEL';
    const big = head + tail;
    const m = projectMatch(ev({ content: big }));
    expect(m.content.length).toBeLessThanOrEqual(WIRE_SHAPE_CAPS.match_content + 100);
    expect(m.content.startsWith('HEAD_SENTINEL_')).toBe(true);
    expect(m.content.endsWith('_TAIL_SENTINEL')).toBe(true);
    expect(m.content).toMatch(/\[\d+\s*chars elided\]/);
    expect(m.bytes_elided).toBeGreaterThan(0);
  });
});

describe('projectMatch — per-metadata-value cap', () => {
  it('all-small metadata passes verbatim, no metadata_*_elided fields', () => {
    const m = projectMatch(
      ev({
        metadata: {
          session_id: 'abc',
          turn_index: 5,
          git_state: { branch: 'main', head_sha: 'deadbeef' },
        },
      }),
    );
    expect(m.metadata).toEqual({
      session_id: 'abc',
      turn_index: 5,
      git_state: { branch: 'main', head_sha: 'deadbeef' },
    });
    expect(m.metadata_bytes_elided).toBeUndefined();
    expect(m.metadata_keys_elided).toBeUndefined();
  });

  it('large variadic value (e.g. tool_calls) is replaced; small neighbours pass through', () => {
    const big_tool_calls = Array.from({ length: 50 }, (_, i) => ({
      name: 'Bash',
      args: 'a'.repeat(2_000),
      output: 'b'.repeat(4_000),
      call_id: `call_${i}`,
    }));
    const m = projectMatch(
      ev({
        metadata: {
          session_id: 'abc',
          tool_calls: big_tool_calls,
          git_state: { branch: 'main' },
        },
      }),
    );
    expect(m.metadata).toBeDefined();
    expect(m.metadata!['session_id']).toBe('abc');
    expect(m.metadata!['git_state']).toEqual({ branch: 'main' });
    expect(m.metadata!['tool_calls']).toMatchObject({
      __elided: true,
      original_size: expect.any(Number),
    });
    expect(m.metadata_keys_elided).toEqual(['tool_calls']);
    expect(m.metadata_bytes_elided).toBeGreaterThan(0);
  });

  it('multiple oversized keys: all replaced, keys_elided lists each', () => {
    const m = projectMatch(
      ev({
        metadata: {
          a: 'x'.repeat(5_000),
          b: { nested: 'y'.repeat(5_000) },
          ok: 'small',
        },
      }),
    );
    expect(m.metadata!['ok']).toBe('small');
    expect(m.metadata_keys_elided?.sort()).toEqual(['a', 'b']);
    expect(m.metadata_bytes_elided).toBeGreaterThan(0);
  });
});

describe('projectMatch — realistic-density envelope', () => {
  it('10 matches, each carrying 100KB tool_calls (the 16:14 PDT failure mode), serialize under 25k bytes', () => {
    // Reproduce the live failure: substring-grep over a busy Codex window
    // returns ~10 matches, each atom carries ~100KB tool_calls metadata
    // alongside ~1KB content. Pre-projector this overflowed at 305k chars.
    const matches = Array.from({ length: 10 }, (_, i) =>
      projectMatch(
        ev({
          id: `id_${i}`,
          source: `fs:/Users/redacted/.codex/sessions/rollout-${i}.jsonl`,
          timestamp: `2026-05-08T22:00:${i.toString().padStart(2, '0')}.000Z`,
          content: `USER: question ${i} about JSON-RPC\n\nASSISTANT: long answer about ` +
            'm'.repeat(600), // ~640 chars of content (well under match_content cap)
          metadata: {
            session_id: `019e09${i}d`,
            turn_index: i,
            cwd: '/Users/redacted/Desktop/Project_echo',
            byte_offset: 100_000 + i * 1000,
            git_state: { branch: 'main', head_sha: 'deadbeef' },
            tool_calls: Array.from({ length: 30 }, (_, j) => ({
              name: 'exec_command',
              args: 'a'.repeat(2_000),
              output: 'b'.repeat(1_000),
              call_id: `c_${j}`,
            })), // ~95KB serialized — the dominant byte source pre-fix
          },
        }),
      ),
    );
    const envelope = JSON.stringify({ matches });
    expect(envelope.length).toBeLessThan(25_000);
    // Every match SHOULD have its tool_calls clipped on this fixture.
    expect(matches.every((m) => m.metadata_keys_elided?.includes('tool_calls'))).toBe(
      true,
    );
  });
});
