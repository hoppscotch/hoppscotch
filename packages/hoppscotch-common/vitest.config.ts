import { defineConfig } from "vitest/config"
import * as path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../hoppscotch-common/src"),
    },
  },
})
