import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Security-patched Vitest/Vite startup plus process-spawning integration
    // fixtures can exceed the upstream 5s default on macOS and CI runners.
    testTimeout: 15_000,
    // Several product-suite fixtures synchronously pack, install, or spawn the
    // real CLI. Run files one at a time under Vitest 3 so those integration
    // processes do not starve each other on hosted macOS runners.
    fileParallelism: false,
    exclude: [
      'tests/product/**',
      'tests/review-queue/**',
      'tests/backlog/backlog-index.test.ts',
      'tests/backlog/process-backlog-skill.test.ts',
      'tests/coord/no-pre-push-spawn.test.ts',
      'tests/skills/atomic-state-transition-harness.test.ts',
      'tests/task-state/lint.test.ts',
      'tests/task-state/patch-builder-state.test.ts',
    ],
  },
});
