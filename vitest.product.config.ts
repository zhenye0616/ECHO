import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/product/**/*.test.ts'],
    setupFiles: ['tests/product/setup.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
