/**
 * n-reviewer-framework.test.ts — falsifications for 043 AC1-AC4, AC6.
 *
 * Covers the load-bearing assertions:
 *  - AC1: per-round roster honored end-to-end (codex-only round, required×mode×timeout matrix)
 *  - AC1f: dispatch-next-round.py propagates roster from r<N> to r<N+1>
 *  - AC2: reviewers.json validation + cache semantics
 *  - AC3: shared helper scripts gate on REVIEWER_NAME existence + mode
 *  - AC4: reviewer-prompt late-response race guard (extracted to test form)
 *  - AC6: N-way verdict roll-up — partial_responses, divergent, proceed*-mix
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { combineScript, dispatchScript, REPO, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-13-043-fixture-spec';
const SHA = 'abc1234';

function setupRoot(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-nrev-')));
}

function writeRequest(
  root: string,
  round: number,
  reviewers: string[],
  requestedAt = '2026-05-13T08:00:00Z',
): string {
  const dir = join(root, 'backlog/reviews', ITEM_ID, `r${round}`);
  mkdirSync(dir, { recursive: true });
  const lines = [
    '---',
    `item_id: "${ITEM_ID}"`,
    `round: ${round}`,
    `spec_commit_sha: "${SHA}"`,
    `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
    'class: "narrow"',
    `requested_at: "${requestedAt}"`,
    'requested_reviewers:',
  ];
  for (const r of reviewers) lines.push(`  - "${r}"`);
  lines.push('---', '', 'body', '');
  writeFileSync(join(dir, 'request.md'), lines.join('\n'));
  return dir;
}

function writeReviewer(
  roundDir: string,
  reviewer: string,
  round: number,
  verdict: string,
  findings: { severity: string; where: string; finding: string }[] = [],
) {
  const lines = [
    '---',
    `item_id: "${ITEM_ID}"`,
    `round: ${round}`,
    `reviewer: "${reviewer}"`,
    `artifact_sha: "${SHA}"`,
    'completed_at: "2026-05-13T09:00:00Z"',
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
  writeFileSync(join(roundDir, `${reviewer}.md`), lines.join('\n'));
}

function readCombinedFm(roundDir: string): Record<string, unknown> {
  const text = readFileSync(join(roundDir, 'combined.md'), 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let val: unknown = kv[2].trim();
    if (val === 'null') val = null;
    else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (typeof val === 'string' && /^-?\d+$/.test(val)) val = Number(val);
    else if (typeof val === 'string') val = val.replace(/^['"](.*)['"]$/, '$1');
    fm[kv[1]] = val;
  }
  return fm;
}

function runCombine(root: string, extra: string[] = []) {
  return runPython([combineScript(), `--repo-root=${root}`, '--no-git', '--all', ...extra]);
}

// --- AC1: per-round roster honored end-to-end ---

describe('043 AC1 — per-round roster (codex-only round)', () => {
  let root: string;
  beforeEach(() => {
    root = setupRoot();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('AC1b: codex-only-requested round becomes eligible immediately + emits cursor_response:null', () => {
    // Default reviewers.json has codex required + cursor required. A round
    // that only requested [codex] is eligible the moment codex.md lands;
    // cursor.md should never appear, and combined.md must encode
    // cursor_response: null so validate.py accepts it.
    const dir = writeRequest(root, 1, ['codex']);
    writeReviewer(dir, 'codex', 1, 'proceed');
    const r = runCombine(root);
    expect(r.code, r.stderr).toBe(0);
    const fm = readCombinedFm(dir);
    expect(fm.combined_verdict).toBe('proceed');
    expect(fm.escalated_to_founder).toBe(false);
    expect(fm.cursor_response).toBe(null);
    expect(fm.codex_response).toBe('codex.md');
    // validate.py must accept the result (schema-required cursor_response
    // is satisfied by the null emission).
    const validate = runPython([
      join(REPO, 'tools/review-queue/validate.py'),
      'combined',
      join(dir, 'combined.md'),
    ]);
    expect(validate.code, validate.stderr).toBe(0);
  });

  it('AC1c: required cursor missing BEFORE timeout, codex present → NOT eligible', () => {
    // requested_at 5min before "now" — well inside the 2h cursor timeout.
    const dir = writeRequest(root, 1, ['codex', 'cursor'], '2026-05-13T07:55:00Z');
    writeReviewer(dir, 'codex', 1, 'proceed');
    const r = runCombine(root, ['--now=2026-05-13T08:00:00Z']);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/no rounds to combine/);
    expect(existsSync(join(dir, 'combined.md'))).toBe(false);
  });

  it('AC1d: required cursor missing AFTER timeout, codex present → partial_responses + escalated', () => {
    // requested_at 3h ago — past the default 2h timeout.
    const dir = writeRequest(root, 1, ['codex', 'cursor'], '2026-05-13T05:00:00Z');
    writeReviewer(dir, 'codex', 1, 'proceed');
    const r = runCombine(root, ['--now=2026-05-13T08:00:00Z']);
    expect(r.code, r.stderr).toBe(0);
    const fm = readCombinedFm(dir);
    expect(fm.combined_verdict).toBe('partial_responses');
    expect(fm.escalated_to_founder).toBe(true);
    expect(fm.cursor_response).toBe(null);
    const body = readFileSync(join(dir, 'combined.md'), 'utf-8');
    // Body enumerates codex's verdict explicitly (043 AC6 partial_responses
    // body contract).
    expect(body).toMatch(/codex: proceed/);
  });
});

// --- AC1f: dispatch-next-round.py roster propagation ---

describe('043 AC1f — dispatch-next-round.py propagates roster', () => {
  let root: string;
  beforeEach(() => {
    root = setupRoot();
    // Set up minimal git so dispatch + request.py can resolve SHA without
    // shelling out to a live git repo.
    spawnSync('git', ['init', '-q', root], { encoding: 'utf-8' });
    spawnSync('git', ['-C', root, 'config', 'user.email', 'test@example.com']);
    spawnSync('git', ['-C', root, 'config', 'user.name', 'test']);
    spawnSync('git', ['-C', root, 'commit', '--allow-empty', '-q', '-m', 'bootstrap']);
    // Drop a backlog item file so request.py find_artifact works.
    const itemDir = join(root, 'backlog/ready');
    mkdirSync(itemDir, { recursive: true });
    writeFileSync(join(itemDir, `${ITEM_ID}.md`), '---\nstatus: ready\n---\n');
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('r2/request.requested_reviewers preserves r1 roster (cursor-only)', () => {
    // r1: requested_reviewers=[codex,cursor] — but for falsification we
    // restrict to [cursor] so that dispatch can't accidentally land the
    // default. After dispatch (b), r2/request.md should also have [cursor].
    const r1 = writeRequest(root, 1, ['cursor']);
    // Make a fake combined.md so dispatch's _branch_b can read it + update
    // next_round.
    writeFileSync(
      join(r1, 'combined.md'),
      [
        '---',
        `item_id: ${ITEM_ID}`,
        'round: 1',
        'combined_at: "2026-05-13T09:30:00Z"',
        'codex_response: null',
        'cursor_response: "cursor.md"',
        'patch_commit_sha: null',
        'next_round: null',
        'combined_verdict: "proceed_after_patches"',
        'escalated_to_founder: false',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
      encoding: 'utf-8',
    }).stdout.trim();
    const r = runPython([
      dispatchScript(),
      ITEM_ID,
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=true',
      '--class=narrow',
      `--repo-root=${root}`,
      `--spec-sha=${head}`,
    ]);
    expect(r.code, r.stderr).toBe(0);
    const r2 = readFileSync(
      join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md'),
      'utf-8',
    );
    expect(r2).toMatch(/requested_reviewers:\s*\n\s*-\s*cursor/);
    // codex must NOT appear in r2's roster — would prove dispatch silently
    // re-injected the default.
    const fmBlock = r2.split('---')[1];
    expect(fmBlock).not.toMatch(/-\s*codex(\s|$)/);
  });
});

// --- AC2: reviewers.json validation + cache ---

describe('043 AC2 — _reviewers.py validation + cache', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-rq-revcfg-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function loadWithConfig(path: string): { code: number; stdout: string; stderr: string } {
    return runPython([
      '-c',
      `import sys
sys.path.insert(0, ${JSON.stringify(join(REPO, 'tools/review-queue'))})
import _reviewers
from pathlib import Path
try:
    revs = _reviewers.load_reviewers(config_path=Path(${JSON.stringify(path)}))
    print(','.join(r.name for r in revs))
except ValueError as e:
    print(f'VE:{e}', flush=True)
    sys.exit(1)
`,
    ]);
  }

  it('AC2a: invalid mode rejected with reviewer name + offending field', () => {
    const cfg = join(dir, 'reviewers.json');
    writeFileSync(
      cfg,
      JSON.stringify({
        reviewers: [
          { name: 'codex', mode: 'banana', required: true, timeout_hours: null, slash_command: 'x' },
        ],
      }),
    );
    const r = loadWithConfig(cfg);
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/invalid mode 'banana'/);
    expect(r.stdout + r.stderr).toMatch(/codex/);
  });

  it('AC2a: duplicate slug rejected', () => {
    const cfg = join(dir, 'reviewers.json');
    writeFileSync(
      cfg,
      JSON.stringify({
        reviewers: [
          { name: 'codex', mode: 'headless', required: true, timeout_hours: null, slash_command: 'a' },
          { name: 'codex', mode: 'ide', required: true, timeout_hours: 2, slash_command: 'b' },
        ],
      }),
    );
    const r = loadWithConfig(cfg);
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/duplicate slug 'codex'/);
  });

  it('AC2d: mode=headless requires timeout_hours=null', () => {
    const cfg = join(dir, 'reviewers.json');
    writeFileSync(
      cfg,
      JSON.stringify({
        reviewers: [
          { name: 'codex', mode: 'headless', required: true, timeout_hours: 2, slash_command: 'x' },
        ],
      }),
    );
    const r = loadWithConfig(cfg);
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/mode=headless.*timeout_hours=2/);
  });

  it('AC2d: mode=ide requires positive timeout_hours', () => {
    const cfg = join(dir, 'reviewers.json');
    writeFileSync(
      cfg,
      JSON.stringify({
        reviewers: [
          { name: 'cursor', mode: 'ide', required: true, timeout_hours: null, slash_command: 'x' },
        ],
      }),
    );
    const r = loadWithConfig(cfg);
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/mode=ide.*timeout_hours=null/);
  });
});

// --- AC3: shared helpers fail-fast on bad REVIEWER_NAME ---

describe('043 AC3 — _run_reviewer.sh gating', () => {
  const runner = join(REPO, 'tools/review-queue/_run_reviewer.sh');

  function runWrapper(env: Record<string, string>) {
    return spawnSync(runner, [], {
      env: { ...process.env, ...env },
      encoding: 'utf-8',
    });
  }

  it('AC3a: _run_reviewer.sh is executable in the index', () => {
    const r = spawnSync(
      'git',
      ['-C', REPO, 'ls-files', '--stage', 'tools/review-queue/_run_reviewer.sh'],
      { encoding: 'utf-8' },
    );
    // mode 100755 = file + +x.
    expect(r.stdout).toMatch(/^100755 /);
  });

  it('AC3b: REVIEWER_NAME missing → exit non-zero with clear stderr', () => {
    const r = runWrapper({ ECHO_REVIEW_QUEUE_REPO_ROOT: REPO });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/REVIEWER_NAME env var required/);
  });

  it('AC3c: REVIEWER_NAME=ghost → "ghost not found in reviewers.json"', () => {
    const r = runWrapper({ REVIEWER_NAME: 'ghost', ECHO_REVIEW_QUEUE_REPO_ROOT: REPO });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/ghost not found in reviewers\.json/);
  });

  it('AC3d: REVIEWER_NAME=cursor (mode=ide) → "cursor has mode=ide, not headless"', () => {
    const r = runWrapper({ REVIEWER_NAME: 'cursor', ECHO_REVIEW_QUEUE_REPO_ROOT: REPO });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/cursor has mode=ide, not headless/);
  });
});

// --- AC4: late-response race guard (extracted to test form) ---

describe('043 AC4 — late-response race guard', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-rq-race-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function runGuard(roundDir: string, codexExists = false, combinedExists = false): {
    code: number;
    stderr: string;
  } {
    if (combinedExists) writeFileSync(join(roundDir, 'combined.md'), 'existing combined');
    if (codexExists) writeFileSync(join(roundDir, 'codex.md'), 'existing codex');
    // The exact prompt body Python snippet, run as a test.
    const script = `
import os, uuid, sys
final = ${JSON.stringify(join(roundDir, 'codex.md'))}
content = "new codex content"
round_dir = os.path.dirname(final)
if os.path.exists(os.path.join(round_dir, "combined.md")):
    raise SystemExit(0)
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)
try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
`;
    return runPython(['-c', script]);
  }

  it('AC4a: combined.md already exists → exit 0, codex.md NOT written', () => {
    const dirPath = join(dir, 'r1');
    mkdirSync(dirPath, { recursive: true });
    const r = runGuard(dirPath, false, true);
    expect(r.code).toBe(0);
    expect(existsSync(join(dirPath, 'codex.md'))).toBe(false);
  });

  it('AC4b: no combined.md → codex.md written cleanly', () => {
    const dirPath = join(dir, 'r1');
    mkdirSync(dirPath, { recursive: true });
    const r = runGuard(dirPath, false, false);
    expect(r.code).toBe(0);
    expect(existsSync(join(dirPath, 'codex.md'))).toBe(true);
    // No tmp leftover
    const leftover = readFileSync(join(dirPath, 'codex.md'), 'utf-8');
    expect(leftover).toMatch(/new codex content/);
  });

  it('AC4c: codex.md already exists → exit 0 cleanly (FileExistsError fall-through)', () => {
    const dirPath = join(dir, 'r1');
    mkdirSync(dirPath, { recursive: true });
    const r = runGuard(dirPath, true, false);
    expect(r.code).toBe(0);
    // Existing codex.md preserved
    const text = readFileSync(join(dirPath, 'codex.md'), 'utf-8');
    expect(text).toBe('existing codex');
  });
});

// --- AC6: N-way verdict roll-up ---

describe('043 AC6 — N-way verdict roll-up', () => {
  let root: string;
  beforeEach(() => {
    root = setupRoot();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('AC6: default 2-reviewer convergent proceed → combined_verdict=proceed', () => {
    const dir = writeRequest(root, 1, ['codex', 'cursor']);
    writeReviewer(dir, 'codex', 1, 'proceed');
    writeReviewer(dir, 'cursor', 1, 'proceed');
    const r = runCombine(root);
    expect(r.code, r.stderr).toBe(0);
    const fm = readCombinedFm(dir);
    expect(fm.combined_verdict).toBe('proceed');
    expect(fm.escalated_to_founder).toBe(false);
  });

  it('AC6: 2-reviewer proceed + proceed_after_patches → proceed_after_patches', () => {
    const dir = writeRequest(root, 1, ['codex', 'cursor']);
    writeReviewer(dir, 'codex', 1, 'proceed');
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches');
    const r = runCombine(root);
    expect(r.code, r.stderr).toBe(0);
    const fm = readCombinedFm(dir);
    expect(fm.combined_verdict).toBe('proceed_after_patches');
    expect(fm.escalated_to_founder).toBe(false);
  });

  it('AC6: 2-reviewer proceed + pushback → divergent + escalated', () => {
    const dir = writeRequest(root, 1, ['codex', 'cursor']);
    writeReviewer(dir, 'codex', 1, 'proceed');
    writeReviewer(dir, 'cursor', 1, 'pushback');
    const r = runCombine(root);
    expect(r.code, r.stderr).toBe(0);
    const fm = readCombinedFm(dir);
    expect(fm.combined_verdict).toBe('divergent');
    expect(fm.escalated_to_founder).toBe(true);
  });
});
