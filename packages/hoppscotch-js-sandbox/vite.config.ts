import { defineConfig } from "vite"

export default defineConfig({
  build: {
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
})
