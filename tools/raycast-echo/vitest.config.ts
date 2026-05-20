import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@raycast/api": new URL("./test/raycast-api-mock.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
  },
});
