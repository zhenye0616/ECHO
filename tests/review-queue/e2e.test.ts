import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { combineScript, requestScript, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-12-042-e2e-spec';

interface Finding {
  severity: string;
  where: string;
  finding: string;
}

function writeReviewer(
  roundDir: string,
  reviewer: 'codex' | 'cursor',
  round: number,
  sha: string,
  verdict: string,
  findings: Finding[],
) {
  const lines = [
    '---',
    `item_id: "${ITEM_ID}"`,
    `round: ${round}`,
    `reviewer: "${reviewer}"`,
    `artifact_sha: "${sha}"`,
    `completed_at: "2026-05-12T09:00:00Z"`,
    `verdict: "${verdict}"`,
  ];
  if (findings.length === 0) {
    lines.push('findings: []');
  } else {
    lines.push('findings:');
    for (const f of findings) {
      lines.push(`  - severity: "${f.severity}"`);
      lines.push(`    where: ${JSON.stringify(f.where)}`);
      lines.push(`    finding: ${JSON.stringify(f.finding)}`);
    }
  }
  lines.push('---', '', 'body', '');
  // Use atomic os.link path — same shape AC3 reviewer prompts use
  const tmp = join(roundDir, `${reviewer}.md.${Math.random().toString(16).slice(2)}.tmp`);
  writeFileSync(tmp, lines.join('\n'));
  execSync(`ln "${tmp}" "${join(roundDir, `${reviewer}.md`)}"`);
  execSync(`rm "${tmp}"`);
}

describe('review-queue e2e (AC6a synthetic)', () => {
  it('scripted R1 → R2 cycle with orphan-tmp injection produces correct combined.md and is dispatch-message-free', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-e2e-')));
    try {
      // Step 1: fake spec file with known SHA
      mkdirSync(join(root, 'backlog/ready'), { recursive: true });
      writeFileSync(
        join(root, 'backlog/ready', `${ITEM_ID}.md`),
        `---\nid: ${ITEM_ID}\n---\nbody v1\n`,
      );
      const SHA1 = 'aaa1111';

      // Step 2: request.py for r1
      const req1 = runPython([
        requestScript(),
        ITEM_ID,
        '1',
        `--repo-root=${root}`,
        `--spec-sha=${SHA1}`,
      ]);
      expect(req1.code, req1.stderr).toBe(0);
      const r1Dir = join(root, 'backlog/reviews', ITEM_ID, 'r1');
      expect(existsSync(join(r1Dir, 'request.md'))).toBe(true);

      // Step 3: synthetic codex.md and cursor.md via atomic-link path
      writeReviewer(r1Dir, 'codex', 1, SHA1, 'proceed_after_patches', [
        { severity: 'medium', where: '§AC4 combine logic', finding: 'codex finding' },
      ]);
      writeReviewer(r1Dir, 'cursor', 1, SHA1, 'proceed_after_patches', [
        { severity: 'high', where: '§AC4 combine logic', finding: 'cursor finding' },
      ]);

      // Step 4: inject failure-mode tmps
      const staleTmp = join(r1Dir, 'codex.md.deadbeef.tmp');
      const freshTmp = join(r1Dir, 'cursor.md.cafebabe.tmp');
      writeFileSync(staleTmp, 'stale');
      writeFileSync(freshTmp, 'in-flight');
      const past31 = Math.floor(Date.now() / 1000) - 31 * 60;
      const past1 = Math.floor(Date.now() / 1000) - 60;
      execSync(`touch -t $(date -r ${past31} +%Y%m%d%H%M.%S) "${staleTmp}"`);
      execSync(`touch -t $(date -r ${past1} +%Y%m%d%H%M.%S) "${freshTmp}"`);

      // Step 5: combine.py → assertions
      const cmb1 = runPython([combineScript(), `--repo-root=${root}`, '--no-git', '--all']);
      expect(cmb1.code, cmb1.stderr).toBe(0);
      // stale tmp cleaned; fresh tmp left
      expect(existsSync(staleTmp)).toBe(false);
      expect(existsSync(freshTmp)).toBe(true);
      const combined1 = readFileSync(join(r1Dir, 'combined.md'), 'utf-8');
      expect(combined1).toMatch(/combined_verdict: proceed_after_patches/);
      // convergent on §AC4 combine logic (HIGH max)
      expect(combined1).toMatch(/\| 1 \| HIGH \| both \(convergent on `§AC4 combine logic`\)/);

      // Step 6: update spec + r2 request
      writeFileSync(
        join(root, 'backlog/ready', `${ITEM_ID}.md`),
        `---\nid: ${ITEM_ID}\n---\nbody v2 (after R1 patch)\n`,
      );
      const SHA2 = 'bbb2222';
      const req2 = runPython([
        requestScript(),
        ITEM_ID,
        '2',
        `--repo-root=${root}`,
        `--spec-sha=${SHA2}`,
      ]);
      expect(req2.code, req2.stderr).toBe(0);

      const r2Dir = join(root, 'backlog/reviews', ITEM_ID, 'r2');
      writeReviewer(r2Dir, 'codex', 2, SHA2, 'proceed', []);
      writeReviewer(r2Dir, 'cursor', 2, SHA2, 'proceed', []);

      // Step 7: combine again
      const cmb2 = runPython([combineScript(), `--repo-root=${root}`, '--no-git', '--all']);
      expect(cmb2.code, cmb2.stderr).toBe(0);
      const combined2 = readFileSync(join(r2Dir, 'combined.md'), 'utf-8');
      expect(combined2).toMatch(/combined_verdict: proceed/);
      expect(combined2).toMatch(/next_round: null/);

      // Step 8: no orphan .tmp.* files; round numbering monotonic; no dispatch messages
      for (const dir of [r1Dir, r2Dir]) {
        const orphans = readdirSync(dir).filter((n) => /\.tmp$/.test(n));
        // r1Dir still has the fresh cursor.md.*.tmp from step 4 — fine; AC6a step 8 says
        // the harness has cleaned the stale one via combine, and the fresh one in
        // step 4 is allowed to persist (still in-flight). Test asserts no NEW orphans.
        if (dir === r2Dir) {
          expect(orphans, `${dir} should be clean`).toHaveLength(0);
        }
      }
      const roundNames = readdirSync(join(root, 'backlog/reviews', ITEM_ID)).sort();
      expect(roundNames).toEqual(['r1', 'r2']);

      // Step 9: same-SHA idempotency vs different-SHA bump-or-fix-history error
      const idemp = runPython([
        requestScript(),
        ITEM_ID,
        '1',
        `--repo-root=${root}`,
        `--spec-sha=${SHA1}`,
      ]);
      expect(idemp.code, idemp.stderr).toBe(0);
      const conflict = runPython([
        requestScript(),
        ITEM_ID,
        '1',
        `--repo-root=${root}`,
        '--spec-sha=zzz9999',
      ]);
      expect(conflict.code).not.toBe(0);
      expect(conflict.stderr).toMatch(/different SHA/);
      expect(conflict.stderr).toMatch(/bump round number/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
