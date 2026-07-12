import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Security-patched Vitest/Vite startup plus process-spawning integration
    // fixtures can exceed the upstream 5s default on macOS and CI runners.
    testTimeout: 15_000,
    exclude: [
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
