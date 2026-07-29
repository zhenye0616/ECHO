import { describe, expect, it } from 'vitest';
import {
  ECHO_MCP_TOOL_ROSTER,
  renderEchoSection,
} from '../../../src/echo-home/wizard/render-echo-section.js';

describe('renderEchoSection', () => {
  it('embeds version, runtime version, and renderedAt fingerprints', () => {
    const out = renderEchoSection({
      agent: 'codex',
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: '0.1.0-beta.5',
      defaultProjectRepoRoot: '/repo/echo',
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(out).toContain('<!-- echo-version: 1.2.3');
    expect(out).toContain('· runtime-version: 0.1.0-beta.5');
    expect(out).toContain('· rendered-at: 2026-05-25T10:00:00.000Z');
  });

  it('names the server key and the mcp__echo__ tool prefix', () => {
    const out = renderEchoSection({
      agent: 'codex',
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: '0.1.0-beta.5',
      defaultProjectRepoRoot: null,
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(out).toContain('`echo` MCP server');
    expect(out).toContain('`mcp__echo__`');
    expect(out).toContain('http://127.0.0.1:39478/mcp');
  });

  it('routes agents through the installed skill before ECHO calls', () => {
    const out = renderEchoSection({
      agent: 'codex',
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: '0.1.0-beta.6',
      defaultProjectRepoRoot: null,
      renderedAt: '2026-07-29T17:00:55.000Z',
    });
    expect(out).toContain('Before calling ECHO');
    expect(out).toContain('`using-echo-mcp`');
    expect(out).toContain('version-bound dogfooding journal');
  });

  it('lists the full seven-tool roster', () => {
    const out = renderEchoSection({
      agent: 'claude-code',
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: '0.1.0-beta.5',
      defaultProjectRepoRoot: null,
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(ECHO_MCP_TOOL_ROSTER).toEqual([
      'find_clusters',
      'get_atoms',
      'get_atom',
      'search_memories',
      'echo_resolve_mru',
      'wait_for_new_turns',
      'echo_ping',
    ]);
    for (const tool of ECHO_MCP_TOOL_ROSTER) {
      expect(out).toContain(`\`${tool}\``);
    }
  });

  it('renders unknown when the runtime version is not recorded', () => {
    const out = renderEchoSection({
      agent: 'codex',
      mcpServerUrl: 'http://127.0.0.1:38478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: null,
      defaultProjectRepoRoot: null,
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(out).toContain('· runtime-version: unknown');
  });

  it('renders none chosen for a null default project', () => {
    const out = renderEchoSection({
      agent: 'claude-code',
      mcpServerUrl: 'http://127.0.0.1:38478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: null,
      defaultProjectRepoRoot: null,
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(out).toContain('none chosen');
  });

  it('is byte-identical for identical input', () => {
    const ctx = {
      agent: 'codex' as const,
      mcpServerUrl: 'http://127.0.0.1:38478/mcp',
      echoVersion: '1.2.3',
      runtimeVersion: '0.1.0-beta.5',
      defaultProjectRepoRoot: '/repo/echo',
      renderedAt: '2026-05-25T10:00:00.000Z',
    };
    expect(renderEchoSection(ctx)).toBe(renderEchoSection(ctx));
  });

  it('throws for cursor', () => {
    expect(() =>
      renderEchoSection({
        agent: 'cursor',
        mcpServerUrl: 'http://127.0.0.1:38478/mcp',
        echoVersion: '1.2.3',
        runtimeVersion: null,
        defaultProjectRepoRoot: '/repo/echo',
        renderedAt: '2026-05-25T10:00:00.000Z',
      }),
    ).toThrow('cursor');
  });
});
