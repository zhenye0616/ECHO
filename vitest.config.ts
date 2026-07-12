import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Security-patched Vitest/Vite startup plus process-spawning integration
    // fixtures can exceed the upstream 5s default on macOS and CI runners.
    testTimeout: 15_000,
  },
});
