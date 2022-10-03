import { tuple } from "io-ts"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "hoppscotch-data",
      formats: [
        "es", "cjs"
      ],
    }
  }
})
