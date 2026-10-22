import { defineConfig } from "vitest/config"
import * as path from "path"

export default defineConfig({
  test: {
    // `mainDiag` reads `window.__TAURI_INTERNALS__` on every launcher
    // step, so the launcher code needs a DOM even in a unit run.
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "@hoppscotch/common": path.resolve(__dirname, "../hoppscotch-common/src"),
    },
  },
})
