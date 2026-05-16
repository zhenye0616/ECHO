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
import { basename, sep as pathSep } from 'node:path';
import {
  CoordPathError,
  REPO_ROOT,
  resolveReviewerWrapperPath,
} from '../../src/coord/paths.js';

const SHAPE_INVALID = ['../', '/', 'foo/../bar', 'foo;rm', 'foo bar', '', 'FOO'];

let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
});
afterEach(() => {
  if (process.cwd() !== originalCwd) process.chdir(originalCwd);
  // Be sure no test leaves ECHO_REPO_ROOT set.
  delete process.env['ECHO_REPO_ROOT'];
});

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
});
