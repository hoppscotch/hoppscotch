import { HstVue } from "@histoire/plugin-vue"
import { defineConfig } from "histoire"

export default defineConfig({
  theme: {
    title: "Hoppscotch Design • Hoppscotch",
    logo: {
      square: "/logo.svg",
      light: "/logo.svg",
      dark: "/logo.svg",
    },
    logoHref: "/",
    favicon: "favicon.ico",
  },
  setupFile: "histoire.setup.ts",
  plugins: [HstVue()],
  viteIgnorePlugins: ["vite:dts"],
})
