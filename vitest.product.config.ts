import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
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
