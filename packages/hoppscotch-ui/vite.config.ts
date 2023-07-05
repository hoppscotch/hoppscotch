import vue from "@vitejs/plugin-vue"
import path from "path"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
import { VitePluginFonts } from "vite-plugin-fonts"

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
    VitePluginFonts({
      google: {
        families: [
          "Inter:wght@400;500;600;700;800",
          "Roboto+Mono:wght@400;500",
          "Material+Icons",
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
        "tailwind.config": "./tailwind.config.ts",
        "postcss.config": "./postcss.config.cjs",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vue", "vue-router"],
      output: {
        exports: "named",
      },
    },
    emptyOutDir: true,
  },
})
