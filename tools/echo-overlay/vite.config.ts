import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const overlayDir = path.dirname(fileURLToPath(import.meta.url));
process.env.VITE_ECHO_REPO_PATH ??= path.resolve(overlayDir, "../..");

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
