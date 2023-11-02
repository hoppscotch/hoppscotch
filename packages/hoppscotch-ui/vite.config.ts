import vue from "@vitejs/plugin-vue"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import Unfonts from "unplugin-fonts/vite"

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      skipDiagnostics: true,
      outputDir: ["dist"],
    }),
    Icons({
      compiler: "vue3",
    }),
    Unfonts({
      fontsource: {
        families: [
          {
            name: "Inter Variable",
            variables: ["variable-full"],
          },
          {
            name: "Material Symbols Rounded Variable",
            variables: ["variable-full"],
          },
          {
            name: "Roboto Mono Variable",
            variables: ["variable-full"],
          },
        ],
      },
    }),
  ], // to process SFC
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: "./src/index.ts",
        "ui-preset": "./ui-preset.ts",
        "postcss.config": "./postcss.config.cjs",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        exports: "named",
      },
    },
    emptyOutDir: true,
  },
})
