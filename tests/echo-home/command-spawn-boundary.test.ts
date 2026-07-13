import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = process.cwd();

function source(path: string): string {
  return readFileSync(join(REPO, path), 'utf8');
}

describe('command spawn security boundary', () => {
  it('pins the cross-platform launcher as a direct production dependency', () => {
    const manifest = JSON.parse(source('package.json')) as {
      dependencies?: Record<string, string>;
    };
    expect(manifest.dependencies?.['cross-spawn']).toBe('7.0.6');
  });

  it('keeps production command names literal and removes direct child_process sinks', () => {
    const registration = source('src/echo-home/adapters/claude-code-mcp.ts');
    const probe = source('src/echo-home/wizard/probe.ts');

    expect(registration).not.toContain("from 'node:child_process'");
    expect(registration).toContain("crossSpawn('claude', args");
    expect(probe).not.toContain('spawn as nodeSpawn');
    expect(probe).toContain("crossSpawn('codex', args");
    expect(probe).toContain("crossSpawn('claude', args");
  });
});
