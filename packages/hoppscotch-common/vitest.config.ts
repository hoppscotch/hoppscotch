import { defineConfig } from "vitest/config"
import * as path from "path"
import Icons from "unplugin-icons/vite"
import { FileSystemIconLoader } from "unplugin-icons/loaders"
import Vue from "@vitejs/plugin-vue"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../hoppscotch-common/src"),
      "@composables": path.resolve(
        __dirname,
        "../hoppscotch-common/src/composables"
      ),
    },
  },
  plugins: [
    Vue(),
    Icons({
      compiler: "vue3",
      customCollections: {
        hopp: FileSystemIconLoader("../hoppscotch-common/assets/icons"),
        auth: FileSystemIconLoader("../hoppscotch-common/assets/icons/auth"),
        brands: FileSystemIconLoader(
          "../hoppscotch-common/assets/icons/brands"
        ),
      },
    }) as any,
  ],
})
