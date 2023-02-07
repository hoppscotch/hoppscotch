import { HstVue } from "@histoire/plugin-vue"
import { defineConfig } from "histoire"

export default defineConfig({
  theme: {
    title: "Hoppscotch • UI",
    logo: {
      square: "/logo.png",
      light: "/logo.png",
      dark: "/logo.png",
    },
    // logoHref: "https://ui.hoppscotch.io",
    favicon: 'favicon.ico',
  },
  setupFile: "histoire.setup.ts",
  plugins: [HstVue()],
})
