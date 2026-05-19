import { describe, expect, it, afterEach } from 'vitest';
import {
  beginRecentMcpCall,
  failRecentMcpCall,
  finishRecentMcpCall,
  readRecentMcpCalls,
  resetRecentMcpCallLogForTests,
} from '../../src/mcp/request-log.js';

afterEach(() => {
  resetRecentMcpCallLogForTests();
});

function okResult(structuredContent: Record<string, unknown>) {
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

function errorResult(text: string) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
  };
}

describe('recent MCP request log', () => {
  it('appends calls and reads back in insertion order with redacted shapes', () => {
    const first = beginRecentMcpCall('search_memories', { query: 'secret query', limit: 3 }, 100);
    finishRecentMcpCall(first, 'search_memories', okResult({ matches: [], total_returned: 0, limit_applied: 3, warnings: [] }), 120);
    const second = beginRecentMcpCall('get_atoms', { atom_ids: ['atom-a', 'atom-b'], format: 'minimal' }, 130);
    finishRecentMcpCall(second, 'get_atoms', okResult({ atoms: [], atoms_dropped: 2, atoms_dropped_ids: ['atom-a', 'atom-b'], warnings: [] }), 140);

    const calls = readRecentMcpCalls();
    expect(calls.map((call) => call.tool)).toEqual(['search_memories', 'get_atoms']);
    expect(calls[0]?.status).toBe('ok');
    expect(calls[0]?.duration_ms).toBe(20);
    expect(calls[0]?.args_shape).toMatchObject({ query_length: 12, limit: 3 });
    expect(calls[1]?.args_shape).toMatchObject({ atom_ids_count: 2, format: 'minimal' });
    expect(JSON.stringify(calls)).not.toContain('secret query');
    expect(JSON.stringify(calls)).not.toContain('atom-a');
  });

  it('updates a pending call to ok in place', () => {
    const id = beginRecentMcpCall('echo_ping', { message: 'hello' }, 100);
    expect(readRecentMcpCalls()).toHaveLength(1);
    expect(readRecentMcpCalls()[0]?.status).toBe('pending');

    finishRecentMcpCall(id, 'echo_ping', okResult({ pong: true, received: 'hello' }), 135);

    const calls = readRecentMcpCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      tool: 'echo_ping',
      status: 'ok',
      duration_ms: 35,
      result_shape: { result_type: 'echo_ping', received_present: true },
    });
  });

  it('updates a pending call to error for thrown exceptions', () => {
    const id = beginRecentMcpCall('search_memories', { query: 'secret' }, 100);
    failRecentMcpCall(id, 'search_memories', new Error('boom'), 105);

    expect(readRecentMcpCalls()[0]).toMatchObject({
      status: 'error',
      duration_ms: 5,
      result_shape: { is_error: true, content_text_length: 4 },
    });
  });

  it('updates a pending call to error for MCP isError envelopes', () => {
    const id = beginRecentMcpCall('get_role_state', { task_id: 'missing', role: 'builder' }, 100);
    finishRecentMcpCall(id, 'get_role_state', errorResult('not found'), 130);

    expect(readRecentMcpCalls()[0]).toMatchObject({
      status: 'error',
      duration_ms: 30,
      result_shape: { is_error: true, content_text_length: 9 },
    });
  });

  it('caps the ring buffer at 1000 entries', () => {
    for (let i = 0; i < 1005; i += 1) {
      beginRecentMcpCall('echo_ping', { message: String(i) }, i);
    }

    const calls = readRecentMcpCalls();
    expect(calls).toHaveLength(1000);
    expect(calls[0]?.ts).toBe(5);
    expect(calls.at(-1)?.ts).toBe(1004);
  });

  it('filters by since, until, and status', () => {
    const first = beginRecentMcpCall('echo_ping', {}, 100);
    finishRecentMcpCall(first, 'echo_ping', okResult({ pong: true }), 101);
    const second = beginRecentMcpCall('get_role_state', {}, 200);
    finishRecentMcpCall(second, 'get_role_state', errorResult('nope'), 201);
    beginRecentMcpCall('find_clusters', {}, 300);

    expect(readRecentMcpCalls({ since: 150 }).map((call) => call.tool)).toEqual(['get_role_state', 'find_clusters']);
    expect(readRecentMcpCalls({ until: 250 }).map((call) => call.tool)).toEqual(['echo_ping', 'get_role_state']);
    expect(readRecentMcpCalls({ status: 'error' }).map((call) => call.tool)).toEqual(['get_role_state']);
    expect(readRecentMcpCalls({ status: 'pending' }).map((call) => call.tool)).toEqual(['find_clusters']);
  });

  it('no-ops when a pending entry is evicted before completion', () => {
    const evicted = beginRecentMcpCall('echo_ping', { message: 'oldest' }, 0);
    for (let i = 1; i <= 1000; i += 1) {
      beginRecentMcpCall('echo_ping', { message: String(i) }, i);
    }

    expect(() => finishRecentMcpCall(evicted, 'echo_ping', okResult({ pong: true }), 2000)).not.toThrow();
    const calls = readRecentMcpCalls();
    expect(calls).toHaveLength(1000);
    expect(calls[0]?.ts).toBe(1);
    expect(calls.some((call) => call.ts === 0)).toBe(false);
  });
});
