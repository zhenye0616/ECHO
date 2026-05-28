import { mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PathsModule = typeof import('../../src/echo-home/paths.js');

let originalEchoHome: string | undefined;
let cleanupDirs: string[];

async function loadPaths(): Promise<PathsModule> {
  return import('../../src/echo-home/paths.js');
}

describe('ECHO home paths', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    cleanupDirs = [];
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) {
      delete process.env.ECHO_HOME;
    } else {
      process.env.ECHO_HOME = originalEchoHome;
    }
    for (const dir of cleanupDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    vi.resetModules();
  });

  it('defaults to ~/.echo when ECHO_HOME is unset', async () => {
    delete process.env.ECHO_HOME;

    const { ECHO_HOME_PATHS } = await loadPaths();

    expect(ECHO_HOME_PATHS.root).toBe(join(homedir(), '.echo'));
    expect(ECHO_HOME_PATHS.root.endsWith(`${sep}.echo`)).toBe(true);
    expect(ECHO_HOME_PATHS.skills).toBe(join(ECHO_HOME_PATHS.root, 'skills'));
    expect(ECHO_HOME_PATHS.roles).toBe(join(ECHO_HOME_PATHS.root, 'roles'));
    expect(ECHO_HOME_PATHS.adapters).toBe(join(ECHO_HOME_PATHS.root, 'adapters'));
    expect(ECHO_HOME_PATHS.state).toBe(join(ECHO_HOME_PATHS.root, 'state'));
    expect(ECHO_HOME_PATHS.stateOnboarding).toBe(
      join(ECHO_HOME_PATHS.root, 'state', 'onboarding.json'),
    );
    expect(ECHO_HOME_PATHS.stateProjects).toBe(
      join(ECHO_HOME_PATHS.root, 'state', 'projects.json'),
    );
    expect(ECHO_HOME_PATHS.stateCaptureSources).toBe(
      join(ECHO_HOME_PATHS.root, 'state', 'capture-sources.json'),
    );
  });

  it('honors ECHO_HOME at module load', async () => {
    const base = mkdtempSync(join(tmpdir(), 'echo-home-paths-'));
    cleanupDirs.push(base);
    const override = join(base, 'custom-home');
    process.env.ECHO_HOME = override;

    const { ECHO_HOME_PATHS } = await loadPaths();

    expect(ECHO_HOME_PATHS.root).toBe(resolve(override));
    expect(ECHO_HOME_PATHS.stateOnboarding).toBe(
      join(resolve(override), 'state', 'onboarding.json'),
    );
  });

  it('validates initial state shapes and rejects missing schema_version', async () => {
    const { validateOnboardingState, validateProjectsState } = await loadPaths();
    const now = new Date().toISOString();

    expect(
      validateOnboardingState({
        schema_version: 1,
        created_at: now,
        last_updated_at: now,
        completed: false,
        agents: [],
      }),
    ).toBe(true);
    expect(
      validateOnboardingState({
        created_at: now,
        last_updated_at: now,
        completed: false,
        agents: [],
      }),
    ).toBe(false);

    expect(
      validateProjectsState({
        schema_version: 1,
        last_refreshed_at: now,
        default_project: null,
        projects: [],
      }),
    ).toBe(true);
    expect(
      validateProjectsState({
        last_refreshed_at: now,
        default_project: null,
        projects: [],
      }),
    ).toBe(false);
  });
});
