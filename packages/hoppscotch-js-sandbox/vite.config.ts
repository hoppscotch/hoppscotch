import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    lib: {
      entry: {
        web: "./src/web/index.ts",
        node: "./src/node/index.ts",
        scripting: "./src/scripting.ts",
      },
      name: "js-sandbox",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["module"],
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./setupFiles.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
})
