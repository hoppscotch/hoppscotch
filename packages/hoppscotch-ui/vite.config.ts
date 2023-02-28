import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"
import path from "path"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import WindiCSS from "vite-plugin-windicss"

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      skipDiagnostics: true,
      outputDir: ['dist']
    }),
    WindiCSS({
      root: path.resolve(__dirname),
    }),
    Icons({
      compiler: "vue3"
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
      external: ["vue", "vue-router"],
      output: {
        exports: "named",
      },
    },
    emptyOutDir: true
  },
})
