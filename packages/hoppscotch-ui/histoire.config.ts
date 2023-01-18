import { HstVue } from "@histoire/plugin-vue"
import { defineConfig } from "histoire"
import * as path from "path"
import { FileSystemIconLoader } from "unplugin-icons/loaders"
import IconResolver from "unplugin-icons/resolver"
import Icons from "unplugin-icons/vite"
import Components from "unplugin-vue-components/vite"
import WindiCSS from "vite-plugin-windicss"

export default defineConfig({
  setupFile: "histoire.setup.ts",
  plugins: [HstVue()],
  vite(config, env) {},
})
