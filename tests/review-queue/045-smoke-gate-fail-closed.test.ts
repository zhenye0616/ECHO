/**
 * 045-smoke-gate-fail-closed.test.ts — AC2 fixture tests.
 *
 * Falsifies the fail-closed smoke gate in
 * `tools/review-queue/_install_reviewer_launchd.sh`:
 *   * --smoke + missing smoke runner → exit 1; NO plist written; launchctl
 *     stub recorded ZERO invocations.
 *   * --smoke + present smoke runner → exit 0; plist installed; launchctl
 *     stub recorded the expected bootout + bootstrap + kickstart sequence.
 *   * No --smoke flag → exit 0; plist installed; launchctl stub recorded
 *     bootout + bootstrap but NO kickstart.
 *
 * Isolation requirements (spec disposition for r2 convergent MED):
 *   * `HOME` is a tempdir so `$HOME/Library/LaunchAgents/` is owned by the
 *     test.
 *   * `PATH` is prepended with stubs for `launchctl`, `sw_vers`, and `id`
 *     that record their argv to a fixture log instead of running real
 *     binaries. The stubs return canned exit codes / strings so the script
 *     can complete end-to-end without touching the operator's real
 *     launchd domain.
 *   * The tools/review-queue/ tree is copied into the temp HOME so the
 *     installer script's TOOL_DIR resolves inside the isolation; the
 *     `_reviewer_gate.py` config gate is pointed at a temp reviewers.json
 *     that contains a synthetic `mock-reviewer` slug.
 *   * afterEach cleans up the temp HOME + temp stub dir; HOME and PATH
 *     are restored on the process.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REPO } from './_helpers.js';

const REVIEWER = 'mock-reviewer';
const LABEL = `com.echo.review-queue-${REVIEWER}`;

interface Fixture {
  home: string;
  pathStubDir: string;
  toolDir: string;
  installer: string;
  launchctlLog: string;
  reviewersJson: string;
}

function makeStub(dir: string, name: string, body: string) {
  const path = join(dir, name);
  writeFileSync(path, body, { mode: 0o755 });
  chmodSync(path, 0o755);
}

function setup(opts: { withSmokeRunner: boolean }): Fixture {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-045-ac2-home-')));
  const pathStubDir = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-045-ac2-stubs-')));
  const launchctlLog = join(home, 'launchctl.log');
  writeFileSync(launchctlLog, '');

  // Stubs that record argv to the log. `launchctl` returns 0 unconditionally;
  // `sw_vers -productVersion` returns a fixed string (Sonoma 14.0 → macOS
  // major 14 so the script takes the bootout/bootstrap path); `id -u` returns
  // a fixed numeric uid.
  makeStub(
    pathStubDir,
    'launchctl',
    `#!/usr/bin/env bash\nprintf 'launchctl %s\\n' "$*" >> "${launchctlLog}"\nexit 0\n`,
  );
  makeStub(
    pathStubDir,
    'sw_vers',
    `#!/usr/bin/env bash\nif [ "$1" = "-productVersion" ]; then echo "14.0"; exit 0; fi\nexit 0\n`,
  );
  makeStub(pathStubDir, 'id', `#!/usr/bin/env bash\nif [ "$1" = "-u" ]; then echo 501; exit 0; fi\nexit 0\n`);

  // Copy tools/review-queue/ into HOME so TOOL_DIR resolves inside isolation.
  // The installer dereferences $(dirname $0) at runtime so we invoke the
  // copied installer, not the production one.
  const toolDir = join(home, 'tools/review-queue');
  mkdirSync(toolDir, { recursive: true });
  cpSync(join(REPO, 'tools/review-queue'), toolDir, { recursive: true });

  // Replace the codex smoke runner with a mock-reviewer one, conditional on
  // the test variant. The script's gate checks for
  // `smoke-test-${REVIEWER}-runner.sh`.
  const smokeRunner = join(toolDir, `smoke-test-${REVIEWER}-runner.sh`);
  if (opts.withSmokeRunner) {
    writeFileSync(
      smokeRunner,
      `#!/usr/bin/env bash\necho "mock smoke ran"\nexit 0\n`,
      { mode: 0o755 },
    );
    chmodSync(smokeRunner, 0o755);
  } else if (existsSync(smokeRunner)) {
    rmSync(smokeRunner);
  }

  // Author the wrapper the installer requires (the script aborts early
  // with `wrapper not executable` if missing).
  const wrapper = join(toolDir, `run-${REVIEWER}-reviewer.sh`);
  writeFileSync(
    wrapper,
    `#!/usr/bin/env bash\nexec env REVIEWER_NAME=${REVIEWER} "$(dirname "$0")/_run_reviewer.sh"\n`,
    { mode: 0o755 },
  );
  chmodSync(wrapper, 0o755);

  // Replace reviewers.json with a synthetic mock-reviewer entry so the
  // installer's `_reviewer_gate.py` accepts the slug.
  const reviewersJson = join(toolDir, 'reviewers.json');
  writeFileSync(
    reviewersJson,
    JSON.stringify(
      {
        $schema: './schemas/reviewers-config.schema.json',
        reviewers: [
          {
            name: REVIEWER,
            mode: 'headless',
            required: true,
            timeout_hours: null,
            slash_command: `review-queue-${REVIEWER}`,
            // 056 AC5 part 1 — headless reviewers require invoke_command.
            invoke_command: 'echo mock < {{PROMPT}}',
          },
        ],
      },
      null,
      2,
    ),
  );

  // The installer script needs to be invoked from inside the temp toolDir
  // so $(dirname $0) lands there.
  const installer = join(toolDir, '_install_reviewer_launchd.sh');
  chmodSync(installer, 0o755);

  return { home, pathStubDir, toolDir, installer, launchctlLog, reviewersJson };
}

function runInstaller(fx: Fixture, args: string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  // Prepend stub dir to PATH so launchctl/sw_vers/id route to stubs.
  const env: Record<string, string> = {
    ...process.env,
    HOME: fx.home,
    PATH: `${fx.pathStubDir}:${process.env.PATH}`,
    // Point _lib.REVIEWERS_CONFIG at the temp reviewers.json (used by
    // _reviewer_gate.py via _reviewers.load_reviewers()).
    ECHO_REVIEWERS_CONFIG: fx.reviewersJson,
  };
  const r = spawnSync(fx.installer, args, {
    cwd: fx.toolDir,
    encoding: 'utf-8',
    env,
  });
  return {
    status: typeof r.status === 'number' ? r.status : 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

function readLaunchctlInvocations(log: string): string[] {
  if (!existsSync(log)) return [];
  return readFileSync(log, 'utf-8').split('\n').filter((l) => l.length > 0);
}

describe('045 AC2 — _install_reviewer_launchd.sh smoke gate fail-closed', () => {
  let fixtures: Fixture[] = [];

  beforeEach(() => {
    fixtures = [];
  });

  afterEach(() => {
    for (const fx of fixtures) {
      rmSync(fx.home, { recursive: true, force: true });
      rmSync(fx.pathStubDir, { recursive: true, force: true });
    }
    fixtures = [];
  });

  it('AC2a — --smoke + missing smoke runner: exit 1, NO plist, NO launchctl invocations', () => {
    const fx = setup({ withSmokeRunner: false });
    fixtures.push(fx);

    const r = runInstaller(fx, [REVIEWER, '--smoke']);

    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toMatch(/smoke runner missing/);

    // Production-side state untouched: NO plist created.
    const plistPath = join(fx.home, 'Library/LaunchAgents', `${LABEL}.plist`);
    expect(existsSync(plistPath), `unexpected plist at ${plistPath}`).toBe(false);

    // Launchctl stub recorded ZERO invocations on the fail path.
    const invocations = readLaunchctlInvocations(fx.launchctlLog);
    expect(invocations).toEqual([]);
  });

  it('AC2b — install without --smoke flag: exit 0, plist installed, bootout + bootstrap recorded, NO kickstart', () => {
    const fx = setup({ withSmokeRunner: false });
    fixtures.push(fx);

    const r = runInstaller(fx, [REVIEWER]);

    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(0);

    // Plist installed.
    const plistPath = join(fx.home, 'Library/LaunchAgents', `${LABEL}.plist`);
    expect(existsSync(plistPath)).toBe(true);

    // Launchctl invocations: bootout + bootstrap, but NO kickstart.
    const invocations = readLaunchctlInvocations(fx.launchctlLog);
    expect(invocations.some((l) => l.startsWith('launchctl bootout'))).toBe(true);
    expect(invocations.some((l) => l.startsWith('launchctl bootstrap'))).toBe(true);
    expect(invocations.some((l) => l.startsWith('launchctl kickstart'))).toBe(false);
  });

  it('AC2c — --smoke + present smoke runner: exit 0, plist installed, bootout + bootstrap + kickstart recorded', () => {
    const fx = setup({ withSmokeRunner: true });
    fixtures.push(fx);

    const r = runInstaller(fx, [REVIEWER, '--smoke']);

    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(0);

    // Plist installed.
    const plistPath = join(fx.home, 'Library/LaunchAgents', `${LABEL}.plist`);
    expect(existsSync(plistPath)).toBe(true);

    // Launchctl recorded bootout + bootstrap + kickstart.
    const invocations = readLaunchctlInvocations(fx.launchctlLog);
    expect(invocations.some((l) => l.startsWith('launchctl bootout'))).toBe(true);
    expect(invocations.some((l) => l.startsWith('launchctl bootstrap'))).toBe(true);
    expect(invocations.some((l) => l.startsWith('launchctl kickstart'))).toBe(true);

    // Mock smoke runner output confirms it actually ran.
    expect(r.stdout).toMatch(/mock smoke ran/);
  });
});
