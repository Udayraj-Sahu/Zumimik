import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@vmsg/psychometrics": path.resolve(__dirname, "./src/vendor/psychometrics/index.ts"),
      "@vmsg/shared-types": path.resolve(__dirname, "./src/vendor/shared-types/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "src/app/**",
        "src/lib/types/**",
        "src/providers/**",
        "next.config.mjs",
        "*.config.ts",
      ],
    },
  },
});