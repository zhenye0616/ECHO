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
    expect(skill).toContain('usable absolute `journal_root`');
  });

  it('detects the live runtime instead of trusting cached or client versions', () => {
    expect(skill).toContain('Read `bound_port` from `~/.echo/state/onboarding.json`');
    expect(skill).toContain('http://127.0.0.1:<bound_port>/healthz');
    expect(skill).toContain('`components.runtime.details.version`');
    expect(skill).toContain('Do not infer it from `echoctl --version`');
    expect(skill).toContain('make no ECHO call at all');
  });

  it('fails closed and prompts before using an unmapped runtime', () => {
    expect(skill).toContain('do not call ECHO');
    expect(skill).toContain('do not silently\n   create or reuse a different version');
    expect(skill).toContain(
      '`ECHO runtime <version> has no dogfooding journal. Create it now and make it current?`',
    );
    expect(skill).toContain('If the founder answers yes');
    expect(skill).toContain('`<journal_root>/dogfooding/<version>/JOURNAL.md`');
    expect(skill).toContain('atomically add that exact\nversion mapping');
  });

  it('logs one compact version-bound entry per ECHO-using turn', () => {
    expect(skill).toContain('regular-file `JOURNAL.md`');
    expect(skill).toContain('`current_version`');
    expect(skill).toContain('Claude Code uses\n`claude`');
    expect(skill).toContain('Codex uses `codex`');
    expect(skill).toContain('one entry may\ncover several calls');
    expect(skill).toContain('Log errors and zero-result calls too');
  });

  it('binds the semantic version to the live artifact when both are known', () => {
    expect(skill).toContain('If both health and the mapping provide `artifact_digest`');
    expect(skill).toContain('they must match');
    expect(skill).toContain('mode `0700`');
    expect(skill).toContain('`0600`');
  });
});
