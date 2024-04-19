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
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
})
