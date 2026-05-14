// 048 AC5 — skills/process-backlog.md final-handoff hook + adapter sync.
//
// Asserts (a) that the canonical process-backlog skill names the new
// builder-state final-refresh step in the protocol body (not just in the
// codex binding-specific notes), and (b) that the Claude Code adapter copy
// at .claude/commands/process-backlog.md is byte-identical to the canonical
// skill after sync. This closes the cross-tool protocol contract: the
// vendor-neutral skills/ tree is the source of truth.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = process.cwd();
const SKILL_PATH = join(REPO, 'skills/process-backlog.md');
const ADAPTER_PATH = join(REPO, '.claude/commands/process-backlog.md');
const SYNC_SCRIPT = join(REPO, 'tools/sync-skills.sh');

describe('048 AC5 — skills/process-backlog.md final builder-state hook', () => {
  const skill = readFileSync(SKILL_PATH, 'utf-8');

  it('contains a named final builder-state refresh substep', () => {
    // The named substep — must live in the protocol body, not only in the
    // codex binding-specific section at the bottom of the file.
    expect(skill).toMatch(/Final builder-state refresh/i);
    // Step numbering: between E2 and the final commit, with a distinct
    // header so future readers can grep for it.
    expect(skill).toMatch(/E2\.5/);
  });

  it('names the required entry points: task_state_ref, builder.md, patch-builder-state.py, pending_review/, lint.py', () => {
    expect(skill).toMatch(/task_state_ref/);
    // builder.md is referenced multiple times — make sure the section talks
    // about the pointer path explicitly.
    expect(skill).toMatch(
      /backlog\/task-state\/[^\s]*builder\.md/,
    );
    expect(skill).toMatch(/tools\/task-state\/patch-builder-state\.py/);
    expect(skill).toMatch(/backlog\/pending_review\//);
    expect(skill).toMatch(/tools\/task-state\/lint\.py/);
  });

  it('marks the final-refresh step as protocol-wide, not codex-only', () => {
    // The step must be presented as the single canonical implementation
    // site, with the codex section deferring to it rather than duplicating
    // its own final-handoff logic.
    expect(skill).toMatch(/protocol-wide/);
    expect(skill).toMatch(
      /(only canonical implementation site|not.*codex-only|not via codex-specific)/,
    );
  });

  it('positions the final-refresh step before the move-to-pending_review commit + push', () => {
    const refreshIdx = skill.indexOf('Final builder-state refresh');
    const commitIdx = skill.indexOf('Commit + push (single final commit)');
    expect(refreshIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(-1);
    expect(refreshIdx).toBeLessThan(commitIdx);
  });

  it('.claude/commands/process-backlog.md is byte-identical to the canonical skill after sync', () => {
    // Run sync --check; the script exits 0 iff every adapter matches its
    // canonical source. This is the same gate enforced by AC3.
    const r = spawnSync('bash', [SYNC_SCRIPT, '--check'], {
      cwd: REPO,
      encoding: 'utf-8',
    });
    expect(r.status, `sync --check stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);

    // Belt-and-suspenders: assert byte-identity directly so a regression
    // surfaces here even if the script itself ever softens its check.
    const canonical = readFileSync(SKILL_PATH, 'utf-8');
    const adapter = readFileSync(ADAPTER_PATH, 'utf-8');
    expect(adapter).toBe(canonical);
  });
});
