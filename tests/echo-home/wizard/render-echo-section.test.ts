import { describe, expect, it } from 'vitest';
import { renderEchoSection } from '../../../src/echo-home/wizard/render-echo-section.js';

describe('renderEchoSection', () => {
  it('embeds version and renderedAt fingerprints', () => {
    const out = renderEchoSection({
      agent: 'codex',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '1.2.3',
      defaultProjectRepoRoot: '/repo/echo',
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(out).toContain('<!-- echo-version: 1.2.3');
    expect(out).toContain('· rendered-at: 2026-05-25T10:00:00.000Z');
  });

  it('renders none chosen for a null default project', () => {
    const out = renderEchoSection({
      agent: 'claude-code',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '1.2.3',
      defaultProjectRepoRoot: null,
      renderedAt: '2026-05-25T10:00:00.000Z',
    });
    expect(out).toContain('none chosen');
  });

  it('is byte-identical for identical input', () => {
    const ctx = {
      agent: 'codex' as const,
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '1.2.3',
      defaultProjectRepoRoot: '/repo/echo',
      renderedAt: '2026-05-25T10:00:00.000Z',
    };
    expect(renderEchoSection(ctx)).toBe(renderEchoSection(ctx));
  });

  it('throws for cursor', () => {
    expect(() =>
      renderEchoSection({
        agent: 'cursor',
        mcpServerUrl: 'http://127.0.0.1:38478',
        echoVersion: '1.2.3',
        defaultProjectRepoRoot: '/repo/echo',
        renderedAt: '2026-05-25T10:00:00.000Z',
      }),
    ).toThrow('cursor');
  });
});
