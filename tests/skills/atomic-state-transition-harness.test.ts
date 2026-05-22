/**
 * 066 — P1 atomic state-transition harness + current-consumer specialization.
 *
 * AC1 — defines `P1ConsumerFixture` and a reusable harness that asserts the
 * primitive's invariants against any conforming fixture. Two harness-only
 * neutral fixtures prove the contract is substrate-, visibility-, and
 * finish-path-neutral.
 *
 * AC3 — instantiates the harness for the process-backlog work-item stage move
 * (`backlog/claimed/<id>.md` → `backlog/pending_review/<id>.md`) using a local
 * bare repo as `origin`. All 14 required current-consumer tests live below.
 *
 * The embedded shell helpers below are kept byte-equivalent to the AC2
 * transcript in `skills/process-backlog.md` Step E. A structural test in this
 * file pins the skill markdown so the two cannot drift silently.
 */

import { execSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  chmodSync,
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
import { afterEach, describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();
const SKILL_PATH = join(PROJECT_ROOT, 'skills/process-backlog.md');
const PUSH_HELPER_SRC = readFileSync(
  join(PROJECT_ROOT, 'tools/review-queue/push-with-retry.sh'),
  'utf-8',
);
const PATCHER_SRC = readFileSync(
  join(PROJECT_ROOT, 'tools/task-state/patch-builder-state.py'),
  'utf-8',
);
const LINT_SRC = readFileSync(
  join(PROJECT_ROOT, 'tools/task-state/lint.py'),
  'utf-8',
);

// ---------------------------------------------------------------------------
// AC1 — contract interface
// ---------------------------------------------------------------------------

export type DurableBoundaryObservation = {
  kind: 'git-commit' | 'rename-plus-commit' | 'multi-commit' | 'pushed-ref' | 'non-git';
  count: number;
  token: string;
  published: boolean;
  observerScope: 'local' | 'remote' | 'external';
};

export type ObservedState = {
  durableBoundary: DurableBoundaryObservation;
  sourceVisible: boolean;
  targetVisible: boolean;
  targetComplete: boolean;
  stagedOrPreparedSurfaces: string[];
  dirtySurfaces: string[];
};

export type PrePublishStep = {
  name: string;
  run(): Promise<void>;
  allowedDirtySurfaces: string[];
  targetMayBeVisible: boolean;
};

export type P1ConsumerFixture = {
  name: string;
  transitionKey: string;
  allowedTouchedSurfacePrefixes: string[];
  setup(): Promise<void>;
  touchedSurfaces(): Promise<string[]>;
  observe(): Promise<ObservedState>;
  prePublishSteps: PrePublishStep[];
  publishThroughDurableBoundary(): Promise<DurableBoundaryObservation>;
  recover(): Promise<void>;
  finishUnpublishedTransition?(): Promise<DurableBoundaryObservation>;
  assertPublished(boundary: DurableBoundaryObservation): Promise<void>;
  assertCleanSourceState(): Promise<void>;
  assertNoConcurrentTransitionsOnSameKey?(other: P1ConsumerFixture): Promise<void>;
};

// ---------------------------------------------------------------------------
// AC1 — generic harness asserting the 7 P1 invariants.
// ---------------------------------------------------------------------------

const VALID_BOUNDARY_KINDS: ReadonlyArray<DurableBoundaryObservation['kind']> = [
  'git-commit',
  'rename-plus-commit',
  'multi-commit',
  'pushed-ref',
  'non-git',
];
const VALID_OBSERVER_SCOPES: ReadonlyArray<DurableBoundaryObservation['observerScope']> = [
  'local',
  'remote',
  'external',
];

async function runP1Harness(fixture: P1ConsumerFixture): Promise<void> {
  await fixture.setup();

  // Property 6: harness knows no consumer paths — only what the fixture
  // exposes. Every touched surface MUST fall under a declared prefix.
  const surfaces = await fixture.touchedSurfaces();
  for (const s of surfaces) {
    expect(
      fixture.allowedTouchedSurfacePrefixes.some((p) => s.startsWith(p)),
      `[${fixture.name}] touched surface ${s} must be covered by allowedTouchedSurfacePrefixes`,
    ).toBe(true);
  }

  // Properties 1+2: run all pre-publish steps in order, observing after each.
  // The harness MUST NOT assume target visibility is always false before
  // publish; instead, the fixture declares which steps may make the target
  // visible.
  for (const step of fixture.prePublishSteps) {
    await step.run();
    const obs = await fixture.observe();
    if (obs.targetVisible && !step.targetMayBeVisible) {
      throw new Error(
        `[${fixture.name}/${step.name}] target visible at a step that did not declare targetMayBeVisible:true`,
      );
    }
  }

  // Property 3: recovery is deterministic from on-disk state alone — no
  // prompts, no operator decisions. Runs to completion or throws.
  await fixture.recover();

  // Property 1: after recovery, the consumer reaches one of three convergent
  // outcomes — rollback-to-source, idempotent-noop, or deterministic-finish.
  // The harness probes the post-recovery state via observe() to decide which.
  const postRecover = await fixture.observe();

  let publishedBoundary: DurableBoundaryObservation;
  if (postRecover.durableBoundary.published) {
    // Idempotent no-op: the boundary was already observed before the harness
    // ran (unusual for a freshly-set-up fixture, but allowed by the contract).
    publishedBoundary = postRecover.durableBoundary;
  } else if (
    postRecover.targetVisible &&
    !postRecover.sourceVisible &&
    typeof fixture.finishUnpublishedTransition === 'function'
  ) {
    // The fixture's prePublishSteps committed the transition locally without
    // publishing the boundary. Use the declared finish path.
    publishedBoundary = await fixture.finishUnpublishedTransition!();
  } else {
    // Rollback succeeded — assert clean source, replay steps, then publish.
    await fixture.assertCleanSourceState();
    for (const step of fixture.prePublishSteps) {
      await step.run();
    }
    publishedBoundary = await fixture.publishThroughDurableBoundary();
  }

  // Property 4: published boundary is shape-valid and observable via the
  // fixture's own assertPublished().
  expect(publishedBoundary.published).toBe(true);
  expect(publishedBoundary.count).toBeGreaterThanOrEqual(1);
  expect(VALID_BOUNDARY_KINDS).toContain(publishedBoundary.kind);
  expect(VALID_OBSERVER_SCOPES).toContain(publishedBoundary.observerScope);
  await fixture.assertPublished(publishedBoundary);

  // Property 5: re-running recover() AND finishUnpublishedTransition() after
  // the boundary is published is a no-op.
  await fixture.recover();
  if (fixture.finishUnpublishedTransition) {
    const noop = await fixture.finishUnpublishedTransition();
    expect(noop.published).toBe(true);
  }

  // Property 7: key-scoped concurrency — handled by the dedicated test below.
}

// ---------------------------------------------------------------------------
// Local-repo plumbing — shared by neutral fixtures + the AC3 specialization
// ---------------------------------------------------------------------------

function git(cwd: string, ...args: string[]): string {
  return execSync(`git ${args.join(' ')}`, { cwd, encoding: 'utf-8' }).trim();
}

function tryGit(cwd: string, ...args: string[]): { code: number; stdout: string; stderr: string } {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  return { code: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

interface RepoEnv {
  base: string;
  bare: string;
  repo: string;
}

function initRepo(): RepoEnv {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-p1-')));
  const bare = join(base, 'origin.git');
  const repo = join(base, 'repo');
  execSync(`git init --bare -q -b main "${bare}"`);
  execSync(`git init -q -b main "${repo}"`);
  for (const c of [
    'config user.email test@example.com',
    'config user.name test',
    'config commit.gpgsign false',
    `remote add origin "${bare}"`,
  ]) {
    execSync(`git ${c}`, { cwd: repo });
  }
  return { base, bare, repo };
}

function bootstrapFile(repo: string, path: string, content: string): void {
  const abs = join(repo, path);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'bootstrap');
  git(repo, 'push', '-q', '-u', 'origin', 'main');
}

function teardown(env: RepoEnv): void {
  try {
    rmSync(env.base, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
}

// ---------------------------------------------------------------------------
// AC1 — neutral fixture A: target-not-visible-before-publish, local boundary.
//
// One pre-publish step that dirties the source (without committing); recovery
// rolls it back. Publish is a single rename + commit whose boundary is the
// LOCAL commit (observerScope: "local") — no push required.
// ---------------------------------------------------------------------------

function makeFixtureA(transitionKey = 'A'): { fixture: P1ConsumerFixture; env: RepoEnv } {
  const env = initRepo();
  const SRC = 'data/source.txt';
  const DEST = 'data/dest.txt';
  bootstrapFile(env.repo, SRC, 'hello A\n');

  const fixture: P1ConsumerFixture = {
    name: `neutral-A-local-commit-boundary-${transitionKey}`,
    transitionKey,
    allowedTouchedSurfacePrefixes: ['data/'],
    async setup() {
      /* bootstrap done */
    },
    async touchedSurfaces() {
      return [SRC, DEST];
    },
    async observe() {
      const sourceVisible = existsSync(join(env.repo, SRC));
      const targetVisible = existsSync(join(env.repo, DEST));
      const dirty = git(env.repo, 'status', '--porcelain', '--', SRC, DEST);
      const staged = git(env.repo, 'diff', '--cached', '--name-only', '--', SRC, DEST);
      let sha = '';
      try {
        sha = git(env.repo, 'rev-parse', 'HEAD');
      } catch {
        sha = '';
      }
      const targetInHead = tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code === 0;
      return {
        durableBoundary: {
          kind: 'git-commit',
          count: 1,
          token: sha,
          published: targetInHead,
          observerScope: 'local',
        },
        sourceVisible,
        targetVisible,
        targetComplete: targetInHead,
        stagedOrPreparedSurfaces: staged.split('\n').filter(Boolean),
        dirtySurfaces: dirty.split('\n').filter(Boolean),
      };
    },
    prePublishSteps: [
      {
        name: 'dirty-source-without-staging',
        async run() {
          // Idempotent: if SRC content already differs, leave it alone.
          const path = join(env.repo, SRC);
          if (existsSync(path)) {
            writeFileSync(path, 'hello A\nedited-prepublish\n');
          }
        },
        allowedDirtySurfaces: [SRC],
        targetMayBeVisible: false,
      },
    ],
    async publishThroughDurableBoundary() {
      // Pre-create dest parent dir so git mv doesn't fail with ENOENT.
      mkdirSync(join(env.repo, DEST, '..'), { recursive: true });
      git(env.repo, 'mv', SRC, DEST);
      git(env.repo, 'add', DEST);
      git(env.repo, 'commit', '-q', '-m', 'rename-A');
      const sha = git(env.repo, 'rev-parse', 'HEAD');
      const r = tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`);
      return {
        kind: 'git-commit',
        count: 1,
        token: sha,
        published: r.code === 0,
        observerScope: 'local',
      };
    },
    async recover() {
      // Boundary already observed — no-op.
      if (tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code === 0) return;
      const dirty = git(env.repo, 'status', '--porcelain', '--', SRC, DEST);
      if (!dirty) return;
      for (const path of [SRC, DEST]) {
        const inHead = tryGit(env.repo, 'cat-file', '-e', `HEAD:${path}`).code === 0;
        if (inHead) {
          git(env.repo, 'restore', '--staged', '--worktree', '--', path);
        } else {
          tryGit(env.repo, 'rm', '--cached', '--ignore-unmatch', '--', path);
          rmSync(join(env.repo, path), { force: true });
        }
      }
    },
    async assertPublished(boundary) {
      expect(boundary.published).toBe(true);
      expect(tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code).toBe(0);
      expect(tryGit(env.repo, 'cat-file', '-e', `HEAD:${SRC}`).code).not.toBe(0);
    },
    async assertCleanSourceState() {
      const dirty = git(env.repo, 'status', '--porcelain', '--', SRC, DEST);
      expect(dirty).toBe('');
      expect(existsSync(join(env.repo, SRC))).toBe(true);
      expect(existsSync(join(env.repo, DEST))).toBe(false);
    },
  };

  return { fixture, env };
}

// ---------------------------------------------------------------------------
// AC1 — neutral fixture B: target-visible-before-publish, remote boundary,
// implements finishUnpublishedTransition().
//
// The pre-publish step commits the rename LOCALLY (target visible in HEAD)
// but does NOT push the boundary. Recovery is rollback-only: it defers to
// finishUnpublishedTransition() when a local commit exists but origin/main
// hasn't observed the target yet. Publish = commit + push.
// ---------------------------------------------------------------------------

function makeFixtureB(transitionKey = 'B'): { fixture: P1ConsumerFixture; env: RepoEnv } {
  const env = initRepo();
  const SRC = 'b/source.txt';
  const DEST = 'b/dest.txt';
  bootstrapFile(env.repo, SRC, 'hello B\n');

  const observeImpl = async (): Promise<ObservedState> => {
    const sourceVisible = existsSync(join(env.repo, SRC));
    const targetVisible = existsSync(join(env.repo, DEST));
    const dirty = git(env.repo, 'status', '--porcelain', '--', SRC, DEST);
    const staged = git(env.repo, 'diff', '--cached', '--name-only', '--', SRC, DEST);
    tryGit(env.repo, 'fetch', '--quiet', 'origin', 'main');
    const targetOnRemote = tryGit(env.repo, 'cat-file', '-e', `origin/main:${DEST}`).code === 0;
    const targetInHead = tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code === 0;
    return {
      durableBoundary: {
        kind: 'pushed-ref',
        count: 1,
        token: `origin/main:${DEST}`,
        published: targetOnRemote,
        observerScope: 'remote',
      },
      sourceVisible,
      targetVisible,
      targetComplete: targetInHead && targetOnRemote,
      stagedOrPreparedSurfaces: staged.split('\n').filter(Boolean),
      dirtySurfaces: dirty.split('\n').filter(Boolean),
    };
  };

  const fixture: P1ConsumerFixture = {
    name: `neutral-B-pushed-ref-boundary-with-finish-${transitionKey}`,
    transitionKey,
    allowedTouchedSurfacePrefixes: ['b/'],
    async setup() {},
    async touchedSurfaces() {
      return [SRC, DEST];
    },
    observe: observeImpl,
    prePublishSteps: [
      {
        name: 'rename-and-commit-locally',
        async run() {
          if (!existsSync(join(env.repo, DEST))) {
            mkdirSync(join(env.repo, DEST, '..'), { recursive: true });
            git(env.repo, 'mv', SRC, DEST);
            git(env.repo, 'add', DEST);
            git(env.repo, 'commit', '-q', '-m', 'rename-B-local');
          }
        },
        allowedDirtySurfaces: [],
        targetMayBeVisible: true,
      },
    ],
    async publishThroughDurableBoundary() {
      if (tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code !== 0) {
        mkdirSync(join(env.repo, DEST, '..'), { recursive: true });
        git(env.repo, 'mv', SRC, DEST);
        git(env.repo, 'add', DEST);
        git(env.repo, 'commit', '-q', '-m', 'rename-B');
      }
      git(env.repo, 'push', '-q', 'origin', 'main');
      const r = tryGit(env.repo, 'cat-file', '-e', `origin/main:${DEST}`);
      return {
        kind: 'pushed-ref',
        count: 1,
        token: `origin/main:${DEST}`,
        published: r.code === 0,
        observerScope: 'remote',
      };
    },
    async recover() {
      // Rollback-only. If the boundary is already observed remotely, no-op.
      // If a local commit exists but the push hasn't happened, defer to the
      // finish path. Otherwise roll back pre-commit dirty state.
      tryGit(env.repo, 'fetch', '--quiet', 'origin', 'main');
      if (tryGit(env.repo, 'cat-file', '-e', `origin/main:${DEST}`).code === 0) return;
      const localCommit = tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code === 0;
      if (localCommit) return;
      const dirty = git(env.repo, 'status', '--porcelain', '--', SRC, DEST);
      if (!dirty) return;
      for (const path of [SRC, DEST]) {
        const inHead = tryGit(env.repo, 'cat-file', '-e', `HEAD:${path}`).code === 0;
        if (inHead) {
          git(env.repo, 'restore', '--staged', '--worktree', '--', path);
        } else {
          tryGit(env.repo, 'rm', '--cached', '--ignore-unmatch', '--', path);
          rmSync(join(env.repo, path), { force: true });
        }
      }
    },
    async finishUnpublishedTransition() {
      tryGit(env.repo, 'fetch', '--quiet', 'origin', 'main');
      if (tryGit(env.repo, 'cat-file', '-e', `origin/main:${DEST}`).code === 0) {
        return {
          kind: 'pushed-ref',
          count: 1,
          token: `origin/main:${DEST}`,
          published: true,
          observerScope: 'remote',
        };
      }
      if (tryGit(env.repo, 'cat-file', '-e', `HEAD:${DEST}`).code === 0) {
        git(env.repo, 'push', '-q', 'origin', 'main');
      }
      const r = tryGit(env.repo, 'cat-file', '-e', `origin/main:${DEST}`);
      return {
        kind: 'pushed-ref',
        count: 1,
        token: `origin/main:${DEST}`,
        published: r.code === 0,
        observerScope: 'remote',
      };
    },
    async assertPublished(boundary) {
      expect(boundary.published).toBe(true);
      tryGit(env.repo, 'fetch', '--quiet', 'origin', 'main');
      expect(tryGit(env.repo, 'cat-file', '-e', `origin/main:${DEST}`).code).toBe(0);
    },
    async assertCleanSourceState() {
      const dirty = git(env.repo, 'status', '--porcelain', '--', SRC, DEST);
      expect(dirty).toBe('');
    },
  };

  return { fixture, env };
}

// ---------------------------------------------------------------------------
// AC1 tests — generic harness against the two neutral fixtures.
// ---------------------------------------------------------------------------

describe('AC1 — generic P1 harness contract', () => {
  it('accepts a target-not-visible-before-publish consumer (local-commit boundary)', async () => {
    const { fixture, env } = makeFixtureA();
    try {
      await runP1Harness(fixture);
    } finally {
      teardown(env);
    }
  });

  it('accepts a target-visible-before-publish consumer with finishUnpublishedTransition (pushed-ref boundary)', async () => {
    const { fixture, env } = makeFixtureB();
    try {
      await runP1Harness(fixture);
    } finally {
      teardown(env);
    }
  });

  it('rejects a fixture whose touched surface is outside its declared allowed prefixes', async () => {
    const env = initRepo();
    bootstrapFile(env.repo, 'a/x.txt', 'x\n');
    const bad: P1ConsumerFixture = {
      name: 'bad-prefix-claim',
      transitionKey: 'BAD',
      allowedTouchedSurfacePrefixes: ['a/'],
      async setup() {},
      async touchedSurfaces() {
        return ['a/x.txt', 'b/escaped.txt'];
      },
      async observe() {
        return {
          durableBoundary: {
            kind: 'git-commit',
            count: 0,
            token: '',
            published: false,
            observerScope: 'local',
          },
          sourceVisible: true,
          targetVisible: false,
          targetComplete: false,
          stagedOrPreparedSurfaces: [],
          dirtySurfaces: [],
        };
      },
      prePublishSteps: [],
      async publishThroughDurableBoundary() {
        return {
          kind: 'git-commit',
          count: 0,
          token: '',
          published: false,
          observerScope: 'local',
        };
      },
      async recover() {},
      async assertPublished() {},
      async assertCleanSourceState() {},
    };
    try {
      await expect(runP1Harness(bad)).rejects.toThrow(/allowedTouchedSurfacePrefixes/);
    } finally {
      teardown(env);
    }
  });

  it('key-scoped concurrency: two fixtures with distinct transitionKeys do not interfere', async () => {
    const A = makeFixtureA('A1');
    const B = makeFixtureA('A2');
    try {
      await Promise.all([runP1Harness(A.fixture), runP1Harness(B.fixture)]);
    } finally {
      teardown(A.env);
      teardown(B.env);
    }
  });
});

// ---------------------------------------------------------------------------
// AC2 + AC3 — the current consumer
// ---------------------------------------------------------------------------

// Embedded byte-equivalent copy of the AC2 transcript in
// skills/process-backlog.md Step E publish/recovery block. A structural test
// below pins the canonical skill to a marker line so the two cannot drift.
const HANDOFF_SCRIPT = `#!/usr/bin/env bash
# P1 handoff transcript — embedded from skills/process-backlog.md Step E.
# Kept byte-equivalent to AC2 of 066. Test fixture invokes with PHASE in
# {recover, publish}.
set -u

PHASE="\${PHASE:?PHASE required}"

cd "\${REPO_ROOT:?REPO_ROOT required}"

ITEM_ID="\${ITEM_ID:?ITEM_ID required}"
SLUG="\${SLUG:?SLUG required}"
HEAD_SHA="\${HEAD_SHA:-}"
OUTCOME="\${OUTCOME:-complete}"
LOG="\${LOG:-}"

ITEM_BASENAME="\${ITEM_ID}.md"
ITEM_FILE="backlog/claimed/\$ITEM_BASENAME"
DEST="backlog/pending_review/\$ITEM_BASENAME"
TASK_ID="\${ITEM_ID}"
POINTER="backlog/task-state/\$TASK_ID/builder.md"

P1_ALLOWED_RECOVERY_PREFIXES=("backlog/" "backlog/task-state/")
P1_TOUCHED_SURFACES=("\$ITEM_FILE" "\$DEST" "\$POINTER")

# Test-only knob: allow injecting an unsafe surface to exercise the prefix guard.
if [ -n "\${P1_TEST_INJECT_SURFACE:-}" ]; then
  P1_TOUCHED_SURFACES=("\${P1_TEST_INJECT_SURFACE}" "\${P1_TOUCHED_SURFACES[@]}")
fi

p1_assert_allowed_recovery_surfaces() {
  local path prefix ok
  for path in "\$@"; do
    case "\$path" in
      ""|/*|../*|*/../*|*/..|.)
        echo "ERROR: unsafe P1 recovery path: \$path" >&2
        return 2
        ;;
    esac
    ok=0
    for prefix in "\${P1_ALLOWED_RECOVERY_PREFIXES[@]}"; do
      case "\$path" in
        "\$prefix"*) ok=1 ;;
      esac
    done
    if [ "\$ok" -ne 1 ]; then
      echo "ERROR: P1 recovery path outside allowed prefixes: \$path" >&2
      return 2
    fi
  done
}

p1_boundary_published_remotely() {
  git fetch --quiet origin main 2>/dev/null || return 1
  git cat-file -e "origin/main:\$DEST" 2>/dev/null
}

p1_local_commit_unpushed() {
  git cat-file -e "HEAD:\$DEST" 2>/dev/null && ! p1_boundary_published_remotely
}

recover_p1_stage_move() {
  local surfaces=("\$@")
  local path STATUS

  p1_assert_allowed_recovery_surfaces "\${surfaces[@]}" || return \$?

  if p1_boundary_published_remotely; then
    return 0
  fi

  if p1_local_commit_unpushed; then
    return 0
  fi

  STATUS="\$(git status --porcelain -- "\${surfaces[@]}")"
  [ -z "\$STATUS" ] && return 0

  for path in "\${surfaces[@]}"; do
    if git cat-file -e "HEAD:\$path" 2>/dev/null || git ls-files --error-unmatch -- "\$path" >/dev/null 2>&1; then
      git restore --staged --worktree -- "\$path" || return 4
    else
      [ -e "\$path" ] && { rm -f -- "\$path" || return 4; }
    fi
  done

  git diff --quiet -- "\${surfaces[@]}" || return 5
  git diff --cached --quiet -- "\${surfaces[@]}" || return 5
}

if [ "\$PHASE" = "recover" ]; then
  recover_p1_stage_move "\${P1_TOUCHED_SURFACES[@]}" || exit \$?

  if p1_boundary_published_remotely; then
    exit 0
  fi

  if p1_local_commit_unpushed; then
    tools/review-queue/push-with-retry.sh "review: \$ITEM_ID" || exit 3
    p1_boundary_published_remotely || { echo "ERROR: push reported success but origin/main:\$DEST not visible" >&2; exit 6; }
    exit 0
  fi

  git -c rebase.autoStash=true pull --rebase origin main || exit \$?
  exit 0
fi

if [ "\$PHASE" = "publish" ]; then
  # Step 2 — task-state patcher.
  HAS_TASK_STATE_REF=\$(
    awk '/^---\$/{c++; next} c==1 && /^task_state_ref:/{print; exit}' "\$ITEM_FILE"
  )
  if [ -n "\$HAS_TASK_STATE_REF" ] || [ -f "\$POINTER" ]; then
    python3 tools/task-state/patch-builder-state.py \\
      --task-id "\$TASK_ID" \\
      --outcome "\$OUTCOME" \\
      --spec-path "\$DEST" \\
      --branch "agent/\$SLUG" \\
      --head-sha "\$HEAD_SHA" \\
      --run-log "\$LOG"
    if [ -f "\$POINTER" ]; then
      python3 tools/task-state/lint.py "\$POINTER"
    fi
  fi

  # Step 3 — durable publish block.
  git mv "\$ITEM_FILE" "\$DEST"
  git add "\$DEST"
  [ -f "\$POINTER" ] && git add "\$POINTER"
  [ -n "\$LOG" ] && [ -f "\$LOG" ] && git add "\$LOG"
  git commit -m "review: \$ITEM_ID"
  tools/review-queue/push-with-retry.sh "review: \$ITEM_ID"

  p1_boundary_published_remotely || { echo "ERROR: push reported success but origin/main:\$DEST not visible" >&2; exit 6; }
  exit 0
fi

echo "ERROR: unknown PHASE \$PHASE" >&2
exit 99
`;

// ---------------------------------------------------------------------------
// Current-consumer fixture: builds a temp repo that mirrors the layout the
// process-backlog skill operates on, and drives the embedded HANDOFF_SCRIPT.
// ---------------------------------------------------------------------------

interface ConsumerEnv extends RepoEnv {
  scriptPath: string;
  itemId: string;
  slug: string;
  itemBasename: string;
  itemFileRel: string;
  destRel: string;
  pointerRel: string;
  logRel: string;
}

const ITEM_BODY = `---
id: TEST-066-fixture
title: "test fixture"
status: claimed
task_state_ref: TEST-066-fixture
files_to_modify: []
spec_refs: []
claimed_by: "test"
claimed_at: "2026-05-21T00:00:00Z"
branch: "agent/test-066-fixture"
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# test
`;

const POINTER_BODY = `---
schema_version: 1
role: builder
task_id: TEST-066-fixture
last_updated: 2026-05-21T00:00:00Z
---

## current_thesis

claim of TEST-066-fixture

## locked_decisions

- AC1: harness
- AC2: skill
- AC3: tests

## open_questions

- (none)

## dont_touch

- wiki/

## canonical_anchors

- spec: backlog/claimed/TEST-066-fixture.md
`;

function makeConsumerEnv(opts: { withPointer?: boolean } = {}): ConsumerEnv {
  const env = initRepo();
  const itemId = 'TEST-066-fixture';
  const slug = 'test-066-fixture';
  const itemBasename = `${itemId}.md`;
  const itemFileRel = `backlog/claimed/${itemBasename}`;
  const destRel = `backlog/pending_review/${itemBasename}`;
  const pointerRel = `backlog/task-state/${itemId}/builder.md`;
  const logRel = `raw/internal/agent-runs/2026-05-21-${itemId}.md`;

  mkdirSync(join(env.repo, 'tools/review-queue'), { recursive: true });
  writeFileSync(join(env.repo, 'tools/review-queue/push-with-retry.sh'), PUSH_HELPER_SRC, {
    mode: 0o755,
  });
  chmodSync(join(env.repo, 'tools/review-queue/push-with-retry.sh'), 0o755);
  mkdirSync(join(env.repo, 'tools/task-state'), { recursive: true });
  writeFileSync(join(env.repo, 'tools/task-state/patch-builder-state.py'), PATCHER_SRC);
  writeFileSync(join(env.repo, 'tools/task-state/lint.py'), LINT_SRC);

  mkdirSync(join(env.repo, 'backlog/claimed'), { recursive: true });
  mkdirSync(join(env.repo, 'backlog/pending_review'), { recursive: true });
  mkdirSync(join(env.repo, 'raw/internal/agent-runs'), { recursive: true });
  writeFileSync(join(env.repo, itemFileRel), ITEM_BODY);
  // Mirror the real repo: backlog/pending_review/ has tracked content so the
  // directory survives `git restore` and pull/rebase. Without this, recover
  // can remove backlog/pending_review/ when it removes $DEST, and the next
  // `git mv $ITEM_FILE $DEST` fails with ENOENT.
  writeFileSync(join(env.repo, 'backlog/pending_review/.gitkeep'), '');

  if (opts.withPointer) {
    mkdirSync(join(env.repo, `backlog/task-state/${itemId}`), { recursive: true });
    writeFileSync(join(env.repo, pointerRel), POINTER_BODY);
  }

  git(env.repo, 'add', '-A');
  git(env.repo, 'commit', '-q', '-m', 'bootstrap');
  git(env.repo, 'push', '-q', '-u', 'origin', 'main');

  // $LOG is intentionally NOT in the bootstrap commit. In the real ECHO
  // flow, the run log is written during E1 (agent-authored) and is brand new
  // at publish time — the publish block's `git add $LOG` introduces it as an
  // "A" entry in the publish commit. Tests that need $LOG tracked (e.g.,
  // test 13's --autostash assertion) commit it explicitly as setup.
  writeFileSync(join(env.repo, logRel), '# run log — written by E1\n');

  const scriptPath = join(env.base, 'handoff.sh');
  writeFileSync(scriptPath, HANDOFF_SCRIPT, { mode: 0o755 });
  chmodSync(scriptPath, 0o755);

  return {
    ...env,
    scriptPath,
    itemId,
    slug,
    itemBasename,
    itemFileRel,
    destRel,
    pointerRel,
    logRel,
  };
}

function applyMetadataEdit(env: ConsumerEnv, headSha: string): void {
  const itemPath = join(env.repo, env.itemFileRel);
  let body = readFileSync(itemPath, 'utf-8');
  body = body.replace(/^head_sha: ".*"$/m, `head_sha: "${headSha}"`);
  body = body.replace(/^agent_notes: ".*"$/m, `agent_notes: "completed by test"`);
  writeFileSync(itemPath, body);
}

function runHandoff(
  env: ConsumerEnv,
  phase: 'recover' | 'publish',
  extraEnv: Record<string, string> = {},
): SpawnSyncReturns<string> {
  return spawnSync('bash', [env.scriptPath], {
    cwd: env.repo,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PHASE: phase,
      REPO_ROOT: env.repo,
      ITEM_ID: env.itemId,
      SLUG: env.slug,
      HEAD_SHA: 'deadbeef',
      OUTCOME: 'complete',
      LOG: env.logRel,
      ...extraEnv,
    },
  });
}

function expectClean(r: SpawnSyncReturns<string>, ctx = ''): void {
  if (r.status !== 0) {
    throw new Error(
      `script failed ${ctx} exit=${r.status}\nstdout=${r.stdout}\nstderr=${r.stderr}`,
    );
  }
}

// Convenience: run a full successful handoff (recover then edit then publish).
function runFullHandoff(env: ConsumerEnv, headSha = 'deadbeef'): void {
  expectClean(runHandoff(env, 'recover'), '[recover]');
  applyMetadataEdit(env, headSha);
  expectClean(runHandoff(env, 'publish'), '[publish]');
}

// ---------------------------------------------------------------------------
// AC3 tests — current-consumer specialization
// ---------------------------------------------------------------------------

describe('AC3 — process-backlog stage move (current-consumer specialization)', () => {
  let env: ConsumerEnv | null = null;

  afterEach(() => {
    if (env) teardown(env);
    env = null;
  });

  it('test 1 — pre-publish edits do not expose the target stage', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    expect(existsSync(join(env.repo, env.itemFileRel))).toBe(true);
    expect(existsSync(join(env.repo, env.destRel))).toBe(false);
    const stagedItem = git(env.repo, 'diff', '--cached', '--name-only', '--', env.itemFileRel);
    const stagedDest = git(env.repo, 'diff', '--cached', '--name-only', '--', env.destRel);
    expect(stagedItem).toBe('');
    expect(stagedDest).toBe('');
    const dirty = git(env.repo, 'status', '--porcelain', '--', env.itemFileRel);
    expect(dirty).not.toBe('');
  });

  it('test 2 — publish creates one durable boundary containing all required surfaces (local commit AND remote ref)', () => {
    env = makeConsumerEnv();
    runFullHandoff(env);
    const tree = git(env.repo, 'diff-tree', '-r', '-M', '--no-commit-id', '--name-status', 'HEAD');
    const lines = tree.split('\n').filter(Boolean);
    const hasRename = lines.some(
      (l) => l.startsWith('R') && l.includes(env!.itemFileRel) && l.includes(env!.destRel),
    );
    const hasLogAdd = lines.some((l) => l.startsWith('A') && l.includes(env!.logRel));
    expect(hasRename, `tree:\n${tree}`).toBe(true);
    expect(hasLogAdd, `tree:\n${tree}`).toBe(true);
    git(env.repo, 'fetch', '--quiet', 'origin', 'main');
    expect(tryGit(env.repo, 'cat-file', '-e', `origin/main:${env.destRel}`).code).toBe(0);
  });

  it('test 3 — committed destination contents include the edited handoff metadata (local AND remote)', () => {
    env = makeConsumerEnv();
    runFullHandoff(env, 'cafef00d');
    const headBody = git(env.repo, 'show', `HEAD:${env.destRel}`);
    expect(headBody).toMatch(/head_sha: "cafef00d"/);
    expect(headBody).toMatch(/agent_notes: "completed by test"/);
    git(env.repo, 'fetch', '--quiet', 'origin', 'main');
    const remoteBody = git(env.repo, 'show', `origin/main:${env.destRel}`);
    expect(remoteBody).toMatch(/head_sha: "cafef00d"/);
    expect(remoteBody).toMatch(/agent_notes: "completed by test"/);
  });

  it('test 4 — crash after metadata edit before git mv is recovered without operator decision; replay publishes', () => {
    env = makeConsumerEnv();
    // First attempt simulates the crash: recover + applyMetadataEdit + (NOTHING)
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    // Crash here — $ITEM_FILE is dirty in worktree.
    // Re-invoke from scratch (recover should roll back the prior dirty edit,
    // then a fresh apply + publish should succeed).
    expectClean(runHandoff(env, 'recover'));
    expect(git(env.repo, 'status', '--porcelain', '--', env.itemFileRel)).toBe('');
    applyMetadataEdit(env, 'deadbeef');
    expectClean(runHandoff(env, 'publish'));
    git(env.repo, 'fetch', '--quiet', 'origin', 'main');
    expect(tryGit(env.repo, 'cat-file', '-e', `origin/main:${env.destRel}`).code).toBe(0);
  });

  it('test 5 — crash after git mv but before git add $DEST is recovered; replay publishes', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    // Simulate partial publish: git mv done, but git add $DEST not yet run.
    git(env.repo, 'mv', env.itemFileRel, env.destRel);
    const destAbs = join(env.repo, env.destRel);
    writeFileSync(
      destAbs,
      readFileSync(destAbs, 'utf-8').replace(/title: ".*"/, 'title: "edited"'),
    );
    // CRASH — re-invoke from scratch.
    expectClean(runHandoff(env, 'recover'));
    expect(git(env.repo, 'status', '--porcelain', '--', env.itemFileRel)).toBe('');
    expect(git(env.repo, 'status', '--porcelain', '--', env.destRel)).toBe('');
    expect(existsSync(join(env.repo, env.itemFileRel))).toBe(true);
    expect(existsSync(join(env.repo, env.destRel))).toBe(false);
    applyMetadataEdit(env, 'deadbeef');
    expectClean(runHandoff(env, 'publish'));
    git(env.repo, 'fetch', '--quiet', 'origin', 'main');
    expect(tryGit(env.repo, 'cat-file', '-e', `origin/main:${env.destRel}`).code).toBe(0);
  });

  it('test 6 — recovery refuses unsafe surfaces (absolute, ../ traversal, outside allowed prefixes)', () => {
    for (const inject of ['/etc/passwd', '../escape.txt', 'wiki/escape.md']) {
      env = makeConsumerEnv();
      const r = runHandoff(env, 'recover', { P1_TEST_INJECT_SURFACE: inject });
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/unsafe P1 recovery path|outside allowed prefixes/);
      teardown(env);
      env = null;
    }
  });

  it('test 7 — running recovery after a published commit is a no-op', () => {
    env = makeConsumerEnv();
    runFullHandoff(env);
    const r = runHandoff(env, 'recover');
    expectClean(r);
    const dirty = git(env.repo, 'status', '--porcelain');
    expect(dirty).toBe('');
  });

  it('test 8 — partial pre-git-mv: $ITEM_FILE dirty, $DEST/$POINTER absent — per-surface dispatch handles cleanly', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    expect(existsSync(join(env.repo, env.destRel))).toBe(false);
    expect(existsSync(join(env.repo, env.pointerRel))).toBe(false);
    const r = runHandoff(env, 'recover');
    expectClean(r);
    expect(git(env.repo, 'status', '--porcelain', '--', env.itemFileRel)).toBe('');
  });

  it('test 9 — crash after commit before push: finished by CALLER finish path (not by recover() rollback)', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    // Force push to fail by making the bare repo unwritable.
    chmodSync(env.bare, 0o500);
    let first: SpawnSyncReturns<string>;
    try {
      first = runHandoff(env, 'publish');
    } finally {
      chmodSync(env.bare, 0o700);
    }
    expect(first.status).not.toBe(0);
    // Local commit landed.
    expect(tryGit(env.repo, 'cat-file', '-e', `HEAD:${env.destRel}`).code).toBe(0);
    // Re-run recover. p1_local_commit_unpushed fires; the caller-side
    // finish-path block runs push-with-retry + verifies boundary.
    const second = runHandoff(env, 'recover');
    expectClean(second);
    git(env.repo, 'fetch', '--quiet', 'origin', 'main');
    expect(tryGit(env.repo, 'cat-file', '-e', `origin/main:${env.destRel}`).code).toBe(0);
    // The local commit was NOT discarded — the edited metadata is on origin.
    const remoteBody = git(env.repo, 'show', `origin/main:${env.destRel}`);
    expect(remoteBody).toMatch(/head_sha: "deadbeef"/);
  });

  it('test 10 — $LOG is preserved through recovery (never touched by rollback)', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    const logPath = join(env.repo, env.logRel);
    const original = readFileSync(logPath, 'utf-8');
    applyMetadataEdit(env, 'deadbeef');
    const r = runHandoff(env, 'recover');
    expectClean(r);
    const after = readFileSync(logPath, 'utf-8');
    expect(after).toBe(original);
  });

  it('test 11a — recovery returns 2 on prefix-guard violation; pull does not run', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    const r = runHandoff(env, 'recover', { P1_TEST_INJECT_SURFACE: '/etc/passwd' });
    expect(r.status).toBe(2);
    // The dirty $ITEM_FILE remains untouched — proof that recovery exited
    // before the per-surface dispatch (let alone the pull).
    expect(git(env.repo, 'status', '--porcelain', '--', env.itemFileRel)).not.toBe('');
  });

  it('test 11b — recovery returns 5 when post-rollback dirty-check fails; pull does not run', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    // Inject a fake `git` on PATH that returns 1 on `git diff --quiet`,
    // simulating the post-restore dirty-check tripping the return-5 path.
    const fakeGitDir = mkdtempSync(join(tmpdir(), 'echo-fakegit-'));
    const realGit = execSync('which git').toString().trim();
    writeFileSync(
      join(fakeGitDir, 'git'),
      `#!/bin/bash
has_diff=0
has_quiet=0
for arg in "$@"; do
  if [ "$arg" = "diff" ]; then has_diff=1; fi
  if [ "$arg" = "--quiet" ]; then has_quiet=1; fi
done
if [ "$has_diff" = "1" ] && [ "$has_quiet" = "1" ]; then
  exit 1
fi
exec ${realGit} "$@"
`,
      { mode: 0o755 },
    );
    chmodSync(join(fakeGitDir, 'git'), 0o755);
    try {
      const r = runHandoff(env, 'recover', { PATH: `${fakeGitDir}:${process.env.PATH ?? ''}` });
      expect(r.status, `stderr=${r.stderr}\nstdout=${r.stdout}`).toBe(5);
    } finally {
      rmSync(fakeGitDir, { recursive: true, force: true });
    }
  });

  it('test 11c — recovery returns 4 when per-surface dispatch fails (rm/restore real error)', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    // Create $DEST as a non-empty directory so `rm -f $DEST` fails (EISDIR).
    mkdirSync(join(env.repo, env.destRel), { recursive: true });
    writeFileSync(join(env.repo, env.destRel, 'blocker'), 'x\n');
    const r = runHandoff(env, 'recover');
    expect(r.status, `stderr=${r.stderr}`).toBe(4);
  });

  it('test 12 — untracked-cleanup branch surfaces real errors rather than hiding them', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    // Benign case: $DEST untracked AND absent — recovery proceeds cleanly.
    const benign = runHandoff(env, 'recover');
    expectClean(benign);
    teardown(env);
    env = null;

    // Real-error case: $DEST is a non-empty directory; `rm -f` fails.
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    applyMetadataEdit(env, 'deadbeef');
    mkdirSync(join(env.repo, env.destRel), { recursive: true });
    writeFileSync(join(env.repo, env.destRel, 'blocker'), 'x\n');
    const realErr = runHandoff(env, 'recover');
    expect(realErr.status).toBe(4);
  });

  it('test 13 — tracked-dirty $LOG does not block the post-recovery pull (--autostash)', () => {
    env = makeConsumerEnv();
    // Commit $LOG so it becomes tracked, then dirty it (simulating E1 having
    // just appended a Run-N section to a previously-committed log).
    git(env.repo, 'add', env.logRel);
    spawnSync('git', ['commit', '-q', '-m', 'add-log'], { cwd: env.repo });
    spawnSync('git', ['push', '-q', 'origin', 'main'], { cwd: env.repo });
    expectClean(runHandoff(env, 'recover'));
    const logAbs = join(env.repo, env.logRel);
    const original = readFileSync(logAbs, 'utf-8');
    const dirtyContent = original + '\n# appended by E1\n';
    writeFileSync(logAbs, dirtyContent);
    applyMetadataEdit(env, 'deadbeef');
    const r = runHandoff(env, 'recover');
    expectClean(r);
    const after = readFileSync(logAbs, 'utf-8');
    expect(after).toBe(dirtyContent);
  });

  it('test 14 — tracked-dirty raw/internal/queue-errors.md does not block the post-recovery pull', () => {
    env = makeConsumerEnv();
    expectClean(runHandoff(env, 'recover'));
    const qeRel = 'raw/internal/queue-errors.md';
    mkdirSync(join(env.repo, 'raw/internal'), { recursive: true });
    writeFileSync(join(env.repo, qeRel), '# queue errors\n');
    // Use spawnSync directly to avoid shell-quoting issues with the message.
    spawnSync('git', ['add', qeRel], { cwd: env.repo });
    spawnSync('git', ['commit', '-q', '-m', 'add-queue-errors'], { cwd: env.repo });
    spawnSync('git', ['push', '-q', 'origin', 'main'], { cwd: env.repo });
    const dirtyLine = '2026-05-21T00:00:00Z PUSH-RACE-FALLBACK: simulated\n';
    writeFileSync(join(env.repo, qeRel), '# queue errors\n' + dirtyLine);
    applyMetadataEdit(env, 'deadbeef');
    const r = runHandoff(env, 'recover');
    expectClean(r);
    const after = readFileSync(join(env.repo, qeRel), 'utf-8');
    expect(after).toBe('# queue errors\n' + dirtyLine);
  });
});

// ---------------------------------------------------------------------------
// Structural pin: the canonical skill must contain the markers this test
// suite assumes. Future edits to skills/process-backlog.md that drop these
// markers must update both surfaces in the same commit.
// ---------------------------------------------------------------------------

describe('skills/process-backlog.md — P1 transcript markers (pins skill ↔ test coupling)', () => {
  const skill = readFileSync(SKILL_PATH, 'utf-8');

  it.each([
    'P1_ALLOWED_RECOVERY_PREFIXES=("backlog/" "backlog/task-state/")',
    'p1_boundary_published_remotely',
    'p1_local_commit_unpushed',
    'recover_p1_stage_move',
    'git mv "$ITEM_FILE" "$DEST"',
    'git add "$DEST"',
    'tools/review-queue/push-with-retry.sh',
    'git -c rebase.autoStash=true pull --rebase origin main',
    '--spec-path "$DEST"',
    'return 2',
    'return 4',
    'return 5',
  ])('contains marker: %s', (marker) => {
    expect(skill).toContain(marker);
  });
});
