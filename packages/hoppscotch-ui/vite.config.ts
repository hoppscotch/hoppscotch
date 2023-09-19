import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"
import path from "path"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import WindiCSS from "vite-plugin-windicss"
import Unfonts from "unplugin-fonts/vite"

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      skipDiagnostics: true,
      outputDir: ["dist"],
    }),
    WindiCSS({
      root: path.resolve(__dirname),
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
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "hopp-ui",
      formats: ["es"],
      fileName: (format, entry) => `${entry}.${format}.js`,
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
