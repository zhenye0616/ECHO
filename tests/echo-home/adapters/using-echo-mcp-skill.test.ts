import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const skill = readFileSync(
  join(process.cwd(), 'assets', 'echo-skills', 'using-echo-mcp.md'),
  'utf8',
);

describe('using-echo-mcp optional dogfooding contract', () => {
  it('stays opt-in for customer machines', () => {
    expect(skill).toContain('~/.echo/state/dogfooding-journals.json');
    expect(skill).toContain('contains `"enabled": true`');
    expect(skill).toContain('Otherwise skip it completely');
  });

  it('detects the live runtime instead of trusting cached or client versions', () => {
    expect(skill).toContain('Read `bound_port` from `~/.echo/state/onboarding.json`');
    expect(skill).toContain('http://127.0.0.1:<bound_port>/healthz');
    expect(skill).toContain('`components.runtime.details.version`');
    expect(skill).toContain('Do not infer it from `echoctl --version`');
    expect(skill).toContain('do not call ECHO under an assumed version');
  });

  it('fails closed and prompts before using an unmapped runtime', () => {
    expect(skill).toContain('do not call ECHO');
    expect(skill).toContain('do not silently\n   create or reuse a different version');
    expect(skill).toContain(
      '`ECHO runtime <version> has no dogfooding journal. Create it now and make it current?`',
    );
  });

  it('logs one compact version-bound entry per ECHO-using turn', () => {
    expect(skill).toContain('`journal_dir` containing `JOURNAL.md`');
    expect(skill).toContain('`current_version`');
    expect(skill).toContain('`claude`, `codex`, `codex-ops`, or `cursor`');
    expect(skill).toContain('one entry may cover several calls');
    expect(skill).toContain('Log errors and zero-result calls too');
  });
});
