import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./setupFiles.ts"],
    include: ["**/src/__tests__/**/**/*.{test,spec}.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/src/__tests__/functions/**/*.ts",
      // echo.hoppscotch.io failing service-side, breaking these live e2e tests; re-enable once echo recovers.
      "**/src/__tests__/e2e/**",
    ],
  },
});
