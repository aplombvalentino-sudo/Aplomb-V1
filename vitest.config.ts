import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Resolves the `@/*` path alias the same way Next does (reads tsconfig.json).
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Excluded by default but spelled out so it's clear we don't traverse them.
    exclude: ["node_modules/**", ".next/**", "scripts/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Only count what we actually have tests for; keep noise out of the report.
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
});
