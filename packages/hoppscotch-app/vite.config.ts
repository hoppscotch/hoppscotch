import { defineConfig, loadEnv } from "vite"
import { META_TAGS } from "./meta"
import HtmlConfig from "vite-plugin-html-config"
import Vue from "@vitejs/plugin-vue"
import VueI18n from "@intlify/vite-plugin-vue-i18n"
import Components from "unplugin-vue-components/vite"
import Icons from "unplugin-icons/vite"
import Inspect from "vite-plugin-inspect"
import WindiCSS from "vite-plugin-windicss"
import Checker from "vite-plugin-checker"
import { VitePWA } from "vite-plugin-pwa"
import Pages from "vite-plugin-pages"
import Layouts from "vite-plugin-vue-layouts"
import IconResolver from "unplugin-icons/resolver"
import { FileSystemIconLoader } from "unplugin-icons/loaders"
import * as path from "path"
import { VitePluginFonts } from "vite-plugin-fonts"

const ENV = loadEnv("development", process.cwd())

export const APP_INFO = {
  name: "Hoppscotch",
  shortDescription: "Open source API development ecosystem",
  description:
    "Helps you create requests faster, saving precious time on development.",
  keywords:
    "hoppscotch, hopp scotch, hoppscotch online, hoppscotch app, postwoman, postwoman chrome, postwoman online, postwoman for mac, postwoman app, postwoman for windows, postwoman google chrome, postwoman chrome app, get postwoman, postwoman web, postwoman android, postwoman app for chrome, postwoman mobile app, postwoman web app, api, request, testing, tool, rest, websocket, sse, graphql, socketio",
  loading: {
    color: "var(--divider-dark-color)",
    background: "var(--primary-color)",
    accent: "var(--accent-color)",
  },
  app: {
    background: "#202124",
  },
  social: {
    twitter: "@hoppscotch_io",
  },
} as const

export default defineConfig({
  // TODO: Migrate @hoppscotch/data to full ESM
  define: {
    // For 'util' polyfill required by dep of '@apidevtools/swagger-parser'
    "process.env": {},
  },
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@composables": path.resolve(__dirname, "./src/composables"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@helpers": path.resolve(__dirname, "./src/helpers"),
      "@functional": path.resolve(__dirname, "./src/helpers/functional"),
      "@workers": path.resolve(__dirname, "./src/workers"),

      stream: "stream-browserify",
      util: "util",
    },
  },
  plugins: [
    Inspect(), // go to url -> /__inspect
    Checker({
      eslint: {
        lintCommand: "eslint src --ext .ts,.js,.vue --ignore-path .gitignore .",
      },
      overlay: {
        initialIsOpen: true,
        position: "br",
      },
    }),
    HtmlConfig({
      metas: META_TAGS(ENV),
    }),
    Vue(),
    Pages({
      routeStyle: "nuxt",
      dirs: "src/pages",
      importMode: "async",
    }),
    Layouts({
      layoutsDirs: "./src/layouts",
      defaultLayout: "default",
    }),
    VueI18n({
      runtimeOnly: false,
      compositionOnly: true,
      include: [path.resolve(__dirname, "locales")],
    }),
    WindiCSS(),
    Components({
      dts: "./src/components.d.ts",
      directoryAsNamespace: true,
      resolvers: [
        IconResolver({
          prefix: "icon",
          customCollections: ["hopp", "auth", "brands"],
        }),
      ],
      types: [
        {
          from: "vue-tippy",
          names: ["Tippy"],
        },
      ],
    }),
    Icons({
      compiler: "vue3",
      customCollections: {
        hopp: FileSystemIconLoader("./assets/icons"),
        auth: FileSystemIconLoader("./assets/icons/auth"),
        brands: FileSystemIconLoader("./assets/icons/brands"),
      },
    }),
    VitePWA({
      manifest: {
        name: APP_INFO.name,
        short_name: APP_INFO.name,
        description: APP_INFO.shortDescription,
        start_url: "?source=pwa",
        background_color: APP_INFO.app.background,
      },
      registerType: "prompt",
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4194304,
      },
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
  ],
})
