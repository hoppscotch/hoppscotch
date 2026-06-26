import { defineConfig } from "vitest/config"
import * as path from "path"
import Vue from "@vitejs/plugin-vue"

/**
 * Dedicated config for the memory benchmark harness (memory-bench/**).
 *
 * Runs in a single fork so `process.memoryUsage().heapUsed` reflects one V8
 * isolate (no cross-worker noise), and disables isolation so module state /
 * stores persist deterministically across the file's tests.
 *
 * Requires `--expose-gc` (provided via NODE_OPTIONS in the `bench:memory` script)
 * so the harness can force GC before sampling retained heap.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    include: ["memory-bench/**/*.bench.spec.ts"],
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    isolate: false,
    // GC + sampling loops are intentionally slow; keep the suite from timing out.
    testTimeout: 180_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@composables": path.resolve(__dirname, "./src/composables"),
      "@helpers": path.resolve(__dirname, "./src/helpers"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@workers": path.resolve(__dirname, "./src/workers"),
      "@functional": path.resolve(__dirname, "./src/helpers/functional"),
    },
  },
  plugins: [Vue()],
})
