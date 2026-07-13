import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Security-patched Vitest/Vite startup plus process-spawning integration
    // fixtures can exceed the upstream 5s default on macOS and CI runners.
    testTimeout: 30_000,
    // These integration tests intentionally perform long synchronous child-process
    // sequences. Vitest 3's worker RPC can time out while a worker is blocked;
    // one test thread preserves error reporting without ignoring failures.
    pool: 'threads',
    fileParallelism: false,
    poolOptions: { threads: { singleThread: true } },
    include: [
      'tests/review-queue/**/*.test.ts',
      'tests/backlog/backlog-index.test.ts',
      'tests/backlog/process-backlog-skill.test.ts',
      'tests/coord/no-pre-push-spawn.test.ts',
      'tests/skills/atomic-state-transition-harness.test.ts',
      'tests/task-state/lint.test.ts',
      'tests/task-state/patch-builder-state.test.ts',
    ],
  },
});
