// 049 AC3 — tools/sync-skills.sh codex-adapter materialization tests.
//
// Asserts the codex adapter target behavior:
//   - sync materializes adapters/codex/skills/<name>/SKILL.md for canonical
//     skills that document `## Binding-specific notes — codex`.
//   - Frontmatter is codex-shaped (name + description + metadata.short-description)
//     AND parses as valid YAML even when canonical descriptions contain
//     tricky scalars (colons, quotes, apostrophes).
//   - Body bytes are identical between canonical and adapter (below frontmatter).
//   - --check passes / fails correctly on drift (body, frontmatter, missing,
//     unexpected adapter directory).
//   - --check skips canonical skills that don't document a codex notes section.
//
// Test isolation: each test seeds a fresh tmp REPO_ROOT under TMPDIR with a
// minimal tools/ + skills/ subset, copies the real tools/sync-skills.sh into
// it, runs the script, and asserts.

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const SCRIPT_REL = 'tools/sync-skills.sh';

function parseYaml(text: string): Record<string, unknown> {
  const r = spawnSync(
    'python3',
    [
      '-c',
      'import sys, json, yaml; print(json.dumps(yaml.safe_load(sys.stdin.read())))',
    ],
    { input: text, encoding: 'utf-8' },
  );
  if (r.status !== 0) {
    throw new Error(`yaml parse failed: ${r.stderr}`);
  }
  return JSON.parse(r.stdout) as Record<string, unknown>;
}

function runSync(repoRoot: string, ...args: string[]) {
  return spawnSync('bash', [join(repoRoot, SCRIPT_REL), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
}

function seedRepo(repoRoot: string): void {
  mkdirSync(join(repoRoot, 'tools'), { recursive: true });
  mkdirSync(join(repoRoot, 'skills'), { recursive: true });
  mkdirSync(join(repoRoot, '.claude/commands'), { recursive: true });
  cpSync(join(REPO, SCRIPT_REL), join(repoRoot, SCRIPT_REL));
  chmodSync(join(repoRoot, SCRIPT_REL), 0o755);
}

function withCodexNotes(description: string, body: string): string {
  return `---\ndescription: ${description}\n---\n\n${body}\n\n## Binding-specific notes — codex\n\nplaceholder\n`;
}

function withoutCodexNotes(description: string, body: string): string {
  return `---\ndescription: ${description}\n---\n\n${body}\n`;
}

function readBody(path: string): string {
  const text = readFileSync(path, 'utf-8');
  const m = text.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return m ? m[1] : text;
}

function readFrontmatter(path: string): string {
  const text = readFileSync(path, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  return m ? m[1] : '';
}

let workRoot: string;

beforeEach(() => {
  workRoot = mkdtempSync(join(tmpdir(), 'echo-sync-skills-test-'));
});

afterEach(() => {
  rmSync(workRoot, { recursive: true, force: true });
});

describe('049 AC3 — sync-skills.sh codex adapter materialization', () => {
  it('materialized SKILL.md has codex-valid frontmatter', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      withCodexNotes('Claim and work a backlog item.', 'Body for process-backlog.'),
    );

    const r = runSync(workRoot);
    expect(r.status).toBe(0);

    const adapter = join(
      workRoot,
      'adapters/codex/skills/process-backlog/SKILL.md',
    );
    expect(existsSync(adapter)).toBe(true);

    const fm = parseYaml(readFrontmatter(adapter)) as Record<string, unknown>;
    expect(fm.name).toBe('process-backlog');
    expect(fm.description).toBe('Claim and work a backlog item.');
    const meta = fm.metadata as Record<string, unknown>;
    expect(typeof meta['short-description']).toBe('string');
    const short = meta['short-description'] as string;
    expect(short.length).toBeGreaterThan(0);
    expect(short.length).toBeLessThanOrEqual(80);
  });

  it('YAML-safe serialization for tricky descriptions', () => {
    seedRepo(workRoot);
    const tricky = `Use when X: do Y with 'quoted' Z`;
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      withCodexNotes(tricky, 'Body.'),
    );

    const r = runSync(workRoot);
    expect(r.status).toBe(0);

    const adapter = join(
      workRoot,
      'adapters/codex/skills/process-backlog/SKILL.md',
    );
    const fmText = readFrontmatter(adapter);
    // Must parse as YAML at all.
    const fm = parseYaml(fmText) as Record<string, unknown>;
    // Round-trip equality on the description scalar.
    expect(fm.description).toBe(tricky);
  });

  it('body byte-identity holds', () => {
    seedRepo(workRoot);
    const body =
      'This is the body.\n\nIt has multiple paragraphs.\n\n## Binding-specific notes — codex\n\nstuff\n';
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      `---\ndescription: D.\n---\n\n${body}`,
    );

    const r = runSync(workRoot);
    expect(r.status).toBe(0);

    const canonical = join(workRoot, 'skills/process-backlog.md');
    const adapter = join(
      workRoot,
      'adapters/codex/skills/process-backlog/SKILL.md',
    );
    expect(readBody(adapter)).toBe(readBody(canonical));
  });

  it('--check passes on synced state', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      withCodexNotes('Desc.', 'Body.'),
    );
    expect(runSync(workRoot).status).toBe(0);
    const r = runSync(workRoot, '--check');
    expect(r.status).toBe(0);
  });

  it('--check fails on adapter body drift', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      withCodexNotes('Desc.', 'Body.'),
    );
    expect(runSync(workRoot).status).toBe(0);

    const adapter = join(
      workRoot,
      'adapters/codex/skills/process-backlog/SKILL.md',
    );
    const mutated = readFileSync(adapter, 'utf-8') + '\n\nDRIFT INJECTED\n';
    writeFileSync(adapter, mutated);

    const r = runSync(workRoot, '--check');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/process-backlog/);
  });

  it('--check fails on adapter frontmatter drift', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      withCodexNotes('Original desc.', 'Body.'),
    );
    expect(runSync(workRoot).status).toBe(0);

    const adapter = join(
      workRoot,
      'adapters/codex/skills/process-backlog/SKILL.md',
    );
    const text = readFileSync(adapter, 'utf-8');
    const mutated = text.replace(
      'description: Original desc.',
      'description: Different desc.',
    );
    writeFileSync(adapter, mutated);

    const r = runSync(workRoot, '--check');
    expect(r.status).not.toBe(0);
  });

  it('--check fails on missing adapter', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/process-backlog.md'),
      withCodexNotes('Desc.', 'Body.'),
    );
    expect(runSync(workRoot).status).toBe(0);

    rmSync(join(workRoot, 'adapters/codex/skills/process-backlog/SKILL.md'));

    const r = runSync(workRoot, '--check');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/process-backlog/);
  });

  it('--check skips out-of-scope canonical skills', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/no-codex-notes.md'),
      withoutCodexNotes('No codex section.', 'Body.'),
    );
    expect(runSync(workRoot).status).toBe(0);

    // No adapter should have been created for this skill.
    expect(
      existsSync(join(workRoot, 'adapters/codex/skills/no-codex-notes')),
    ).toBe(false);

    const r = runSync(workRoot, '--check');
    expect(r.status).toBe(0);
  });

  it('--check rejects unexpected adapter directories', () => {
    seedRepo(workRoot);
    writeFileSync(
      join(workRoot, 'skills/in-scope.md'),
      withCodexNotes('In scope.', 'Body.'),
    );
    // A skill that does NOT document codex notes — must NOT have an adapter.
    writeFileSync(
      join(workRoot, 'skills/merge-and-cleanup.md'),
      withoutCodexNotes('No codex notes here.', 'Body.'),
    );

    expect(runSync(workRoot).status).toBe(0);
    expect(
      existsSync(join(workRoot, 'adapters/codex/skills/merge-and-cleanup')),
    ).toBe(false);

    // Now pre-create the stray adapter directory + SKILL.md.
    const strayDir = join(workRoot, 'adapters/codex/skills/merge-and-cleanup');
    mkdirSync(strayDir, { recursive: true });
    writeFileSync(
      join(strayDir, 'SKILL.md'),
      '---\nname: merge-and-cleanup\ndescription: stray\nmetadata:\n  short-description: stray\n---\n\nstray\n',
    );

    const r = runSync(workRoot, '--check');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/merge-and-cleanup/);
    expect(r.stderr).toMatch(/unexpected/);
  });
});
