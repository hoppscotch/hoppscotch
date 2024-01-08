import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    lib: {
      entry: {
        web: "./src/web.ts",
        node: "./src/node.ts",
      },
      name: "js-sandbox",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["vm"],
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
})
