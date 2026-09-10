import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: [
      "packages/cascade-engine/test/**/*.test.ts",
      "packages/cascade-validate/test/**/*.test.ts",
      "apps/web/test/**/*.test.ts",
    ],
  },
});
