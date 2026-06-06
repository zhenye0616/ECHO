import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/review-queue/**/*.test.ts'],
  },
});
