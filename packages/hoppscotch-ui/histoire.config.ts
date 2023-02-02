import { HstVue } from "@histoire/plugin-vue"
import { defineConfig } from "histoire"

export default defineConfig({
  setupFile: "histoire.setup.ts",
  plugins: [HstVue()],
})
