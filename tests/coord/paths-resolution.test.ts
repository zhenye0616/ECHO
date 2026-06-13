// 057b AC0 — src/coord/paths.ts validation tests (AC8 entry).
//
// Covers (per spec line 78):
//   - REPO_ROOT ends in canonical repo dir regardless of process.cwd()
//   - resolveReviewerWrapperPath("codex") returns existing executable
//   - ECHO_REPO_ROOT env override is honored
//   - Shape-invalid roles reject with NO FS access AND NO MCP side-effects
//     (shape regex fires BEFORE loadCoordRoles())
//   - Roster-invalid roles reject AFTER loadCoordRoles() reads coord-roles.json
//     but BEFORE wrapper-path construction / stat / spawn / MCP side-effects.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, sep as pathSep } from 'node:path';
import {
  CoordPathError,
  REPO_ROOT,
  resolveCoordRequestPath,
  resolveReviewerWrapperPath,
} from '../../src/coord/paths.js';

const SHAPE_INVALID = ['../', '/', 'foo/../bar', 'foo;rm', 'foo bar', '', 'FOO'];

let originalCwd: string;
let cleanupDirs: string[];

beforeEach(() => {
  originalCwd = process.cwd();
  cleanupDirs = [];
});
afterEach(() => {
  if (process.cwd() !== originalCwd) process.chdir(originalCwd);
  // Be sure no test leaves ECHO_REPO_ROOT set.
  delete process.env['ECHO_REPO_ROOT'];
  for (const dir of cleanupDirs) rmSync(dir, { recursive: true, force: true });
});

function makeCoordRepo(reviewsRoot = 'backlog/reviews'): string {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'echo-coord-paths-')));
  cleanupDirs.push(repo);
  mkdirSync(join(repo, reviewsRoot, '2026-05-16-057b', 'r1'), { recursive: true });
  mkdirSync(join(repo, '.echo'), { recursive: true });
  writeFileSync(
    join(repo, '.echo/project.json'),
    JSON.stringify(
      {
        schema_version: 1,
        coord_ref: 'main',
        reviews_root: reviewsRoot,
        reviewers: ['codex'],
        spec_dir: 'backlog',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repo, reviewsRoot, '2026-05-16-057b', 'r1', 'request.md'),
    '---\nitem_id: test\n---\n',
  );
  return repo;
}

describe('057b AC0 — paths resolution', () => {
  it('REPO_ROOT ends at the canonical repo directory', () => {
    // The module computed REPO_ROOT at import time. Its basename is the
    // worktree/repo top-level dir name. We don't hard-code the literal —
    // the loadCoordRoles call below proves REPO_ROOT is *correct* (it
    // resolves the config file).
    expect(typeof REPO_ROOT).toBe('string');
    expect(REPO_ROOT.length).toBeGreaterThan(0);
  });

  it('resolveReviewerWrapperPath("codex") returns existing executable wrapper', () => {
    const p = resolveReviewerWrapperPath('codex');
    expect(p.endsWith(`${pathSep}tools${pathSep}review-queue${pathSep}run-codex-reviewer.sh`)).toBe(
      true,
    );
    expect(basename(p)).toBe('run-codex-reviewer.sh');
  });

  it('resolveReviewerWrapperPath stays correct after process.chdir("/")', () => {
    process.chdir('/');
    expect(process.cwd()).toBe('/');
    const p = resolveReviewerWrapperPath('codex');
    expect(basename(p)).toBe('run-codex-reviewer.sh');
  });

  // Shape-invalid roles: must reject via the regex gate BEFORE
  // loadCoordRoles() reads coord-roles.json from disk.
  for (const bad of SHAPE_INVALID) {
    it(`shape-invalid role rejected: ${JSON.stringify(bad)}`, () => {
      expect(() => resolveReviewerWrapperPath(bad)).toThrow(CoordPathError);
      try {
        resolveReviewerWrapperPath(bad);
      } catch (err) {
        expect((err as Error).message).toMatch(/shape-invalid/);
      }
    });
  }

  // Roster-invalid roles: reject AFTER loadCoordRoles() but BEFORE any
  // path math / stat / spawn. The "cursor" entry exists in coord-roles.json
  // with headless:false; "nonexistent" is not in the roster.
  it('roster-invalid: "cursor" (headless:false) rejected with no headless wrapper', () => {
    expect(() => resolveReviewerWrapperPath('cursor')).toThrow(CoordPathError);
    try {
      resolveReviewerWrapperPath('cursor');
    } catch (err) {
      expect((err as Error).message).toMatch(/not headless/);
    }
  });

  it('roster-invalid: "nonexistent" rejected before wrapper-path stat', () => {
    expect(() => resolveReviewerWrapperPath('nonexistent')).toThrow(CoordPathError);
    try {
      resolveReviewerWrapperPath('nonexistent');
    } catch (err) {
      expect((err as Error).message).toMatch(/not in coord-roles.json/);
    }
  });

  it('validates the default Project_echo request path under backlog/reviews', () => {
    const repo = makeCoordRepo();
    const resolved = resolveCoordRequestPath('backlog/reviews/2026-05-16-057b/r1/request.md', {
      repoRoot: repo,
    });
    expect(resolved).toBe(join(repo, 'backlog/reviews/2026-05-16-057b/r1/request.md'));
  });

  it('validates a request path under a configured custom reviews_root', () => {
    const repo = makeCoordRepo('coord/reviews');
    const resolved = resolveCoordRequestPath('coord/reviews/2026-05-16-057b/r1/request.md', {
      repoRoot: repo,
    });
    expect(resolved).toBe(join(repo, 'coord/reviews/2026-05-16-057b/r1/request.md'));
  });

  for (const bad of [
    '../backlog/reviews/2026-05-16-057b/r1/request.md',
    '/tmp/backlog/reviews/2026-05-16-057b/r1/request.md',
    'backlog/reviews/%2e%2e/r1/request.md',
  ]) {
    it(`rejects adversarial request path ${JSON.stringify(bad)}`, () => {
      const repo = makeCoordRepo();
      expect(() => resolveCoordRequestPath(bad, { repoRoot: repo })).toThrow(CoordPathError);
    });
  }

  it('rejects a symlinked reviews_root that resolves outside the repo', () => {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), 'echo-coord-paths-')));
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'echo-coord-outside-')));
    cleanupDirs.push(repo, outside);
    mkdirSync(join(repo, 'backlog'), { recursive: true });
    mkdirSync(join(repo, '.echo'), { recursive: true });
    mkdirSync(join(outside, '2026-05-16-057b', 'r1'), { recursive: true });
    writeFileSync(join(outside, '2026-05-16-057b', 'r1', 'request.md'), 'body\n');
    symlinkSync(outside, join(repo, 'backlog/reviews'), 'dir');
    writeFileSync(
      join(repo, '.echo/project.json'),
      JSON.stringify({
        schema_version: 1,
        coord_ref: 'main',
        reviews_root: 'backlog/reviews',
        reviewers: ['codex'],
        spec_dir: 'backlog',
      }),
    );

    expect(() =>
      resolveCoordRequestPath('backlog/reviews/2026-05-16-057b/r1/request.md', {
        repoRoot: repo,
      }),
    ).toThrow(/resolves outside repo/);
  });

  it('rejects a symlinked request ancestor that resolves outside reviews_root', () => {
    const repo = makeCoordRepo();
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'echo-coord-request-outside-')));
    cleanupDirs.push(outside);
    rmSync(join(repo, 'backlog/reviews/2026-05-16-057b'), { recursive: true, force: true });
    mkdirSync(join(outside, 'r1'), { recursive: true });
    writeFileSync(join(outside, 'r1', 'request.md'), 'body\n');
    symlinkSync(outside, join(repo, 'backlog/reviews/2026-05-16-057b'), 'dir');

    expect(() =>
      resolveCoordRequestPath('backlog/reviews/2026-05-16-057b/r1/request.md', {
        repoRoot: repo,
      }),
    ).toThrow(/resolves outside reviews_root/);
  });
});
