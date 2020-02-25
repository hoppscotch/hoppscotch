// Some helpful application constants.
// TODO: Use these when rendering the pages (rather than just for head/meta tags...)
export const meta = {
  name: "Postwoman",
  shortDescription: "A free, fast and beautiful API request builder",
  description:
    "Web alternative to Postman - Helps you create requests faster, saving precious time on development.",
}
// Sets the base path for the router.
// Important for deploying to GitHub pages.
// -- Travis includes the author in the repo slug,
//    so if there's a /, we need to get everything after it.
let repoName = (process.env.TRAVIS_REPO_SLUG || "").split("/").pop()
export const routerBase =
  process.env.DEPLOY_ENV === "GH_PAGES"
    ? {
        router: {
          base: `/${repoName}/`,
        },
      }
    : {
        router: {
          base: "/",
        },
      }
export default {
  mode: "spa",
  /*
   ** Headers of the page
   */
  server: {
    host: "0.0.0.0", // default: localhost
  },
  render: {
    bundleRenderer: {
      shouldPreload: (file, type) => {
        return ["script", "style", "font"].includes(type)
      },
    },
  },
  head: {
    title: `${meta.name} \u2022 ${meta.shortDescription}`,
    meta: [
      {
        charset: "utf-8",
      },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover, minimal-ui",
      },
      {
        hid: "description",
        name: "description",
        content: meta.description || "",
      },
      {
        name: "keywords",
        content:
          "postwoman, postwoman chrome, postwoman online, postwoman for mac, postwoman app, postwoman for windows, postwoman google chrome, postwoman chrome app, get postwoman, postwoman web, postwoman android, postwoman app for chrome, postwoman mobile app, postwoman web app, api, request, testing, tool, rest, websocket, sse, graphql",
      },
      {
        name: "X-UA-Compatible",
        content: "IE=edge, chrome=1",
      },
      {
        itemprop: "name",
        content: `${meta.name} \u2022 ${meta.shortDescription}`,
      },
      {
        itemprop: "description",
        content: meta.description,
      },
      {
        itemprop: "image",
        content: `https://postwoman.io/logo.jpg`,
      },
      // Add to homescreen for Chrome on Android. Fallback for PWA (handled by nuxt)
      {
        name: "application-name",
        content: meta.name,
      },
      // Add to homescreen for Safari on iOS
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "apple-mobile-web-app-title",
        content: meta.name,
      },
      // Windows phone tile icon
      {
        name: "msapplication-TileImage",
        content: `${routerBase.router.base}icons/icon-144x144.png`,
      },
      {
        name: "msapplication-TileColor",
        content: "#202124",
      },
      {
        name: "msapplication-tap-highlight",
        content: "no",
      },
      // OpenGraph
      {
        property: "og:site_name",
        content: meta.name,
      },
      {
        property: "og:url",
        content: "https://postwoman.io",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:title",
        content: `${meta.name} \u2022 ${meta.shortDescription}`,
      },
      {
        property: "og:description",
        content: meta.description,
      },
      {
        property: "og:image",
        content: `https://postwoman.io/logo.jpg`,
      },
      // Twitter
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:site",
        content: "@liyasthomas",
      },
      {
        name: "twitter:creator",
        content: "@liyasthomas",
      },
      {
        name: "twitter:url",
        content: "https://postwoman.io",
      },
      {
        name: "twitter:title",
        content: `${meta.name} \u2022 ${meta.shortDescription}`,
      },
      {
        name: "twitter:description",
        content: meta.description,
      },
      {
        name: "twitter:image",
        content: "https://postwoman.io/logo.jpg",
      },
    ],
    link: [
      {
        rel: "icon",
        type: "image/x-icon",
        href: `${routerBase.router.base}favicon.ico`,
      },
      // Home-screen icons (iOS)
      {
        rel: "apple-touch-icon",
        href: `${routerBase.router.base}icons/icon-48x48.png`,
      },
      {
        rel: "apple-touch-icon",
        sizes: "72x72",
        href: `${routerBase.router.base}icons/icon-72x72.png`,
      },
      {
        rel: "apple-touch-icon",
        sizes: "96x96",
        href: `${routerBase.router.base}icons/icon-96x96.png`,
      },
      {
        rel: "apple-touch-icon",
        sizes: "144x144",
        href: `${routerBase.router.base}icons/icon-144x144.png`,
      },
      {
        rel: "apple-touch-icon",
        sizes: "192x192",
        href: `${routerBase.router.base}icons/icon-192x192.png`,
      },
    ],
  },
  /*
   ** Customize the progress-bar color
   */
  loading: {
    color: "var(--ac-color)",
  },
  /*
   ** Customize the loading indicator
   */
  loadingIndicator: {
    name: "pulse",
    color: "var(--ac-color)",
    background: "var(--bg-color)",
  },
  /*
   ** Global CSS
   */
  css: ["~/assets/css/styles.scss", "~/assets/css/themes.scss", "~/assets/css/fonts.scss"],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    {
      src: "~/plugins/vuex-persist",
    },
    {
      src: "~/plugins/v-tooltip",
    },
  ],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // See https://goo.gl/OOhYW5
    ["@nuxtjs/pwa"],
    ["@nuxtjs/axios"],
    ["@nuxtjs/toast"],
    ["@nuxtjs/google-analytics"],
    ["@nuxtjs/sitemap"],
    [
      "@nuxtjs/google-tag-manager",
      {
        id: process.env.GTM_ID || "GTM-MXWD8NQ",
      },
    ],
    ["@nuxtjs/robots"],
    ["nuxt-i18n"],
  ],
  pwa: {
    manifest: {
      name: meta.name,
      short_name: meta.name,

      display: "standalone",

      theme_color: "#202124",
      background_color: "#202124",
      start_url: `${routerBase.router.base}`,
    },

    meta: {
      description: meta.shortDescription,
      theme_color: "#202124",
    },

    icons: (sizes => {
      let icons = []
      for (let size of sizes) {
        icons.push({
          src: `${routerBase.router.base}icons/icon-${size}x${size}.png`,
          type: "image/png",
          sizes: `${size}x${size}`,
        })
      }
      return icons
    })([48, 72, 96, 144, 192, 512]),
  },
  toast: {
    position: "bottom-center",
    duration: 3000,
    theme: "bubble",
    keepOnHover: true,
  },
  googleAnalytics: {
    id: process.env.GA_ID || "UA-61422507-2",
  },
  sitemap: {
    hostname: "https://postwoman.io",
  },
  robots: {
    UserAgent: "*",
    Disallow: "",
    Allow: "/",
    Sitemap: "https://postwoman.io/sitemap.xml",
  },
  i18n: {
    locales: [
      {
        code: "en",
        name: "English",
        iso: "en-US",
        file: "en-US.js",
      },
      {
        code: "es",
        name: "Español",
        iso: "es-ES",
        file: "es-ES.js",
      },
      {
        code: "fr",
        name: "Français",
        iso: "fr-FR",
        file: "fr-FR.js",
      },
      {
        code: "fa",
        name: "Farsi",
        iso: "fa-IR",
        file: "fa-IR.js",
      },
      {
        code: "pt",
        name: "Português Brasileiro",
        iso: "pt-BR",
        file: "pt-BR.js",
      },
      {
        code: "cn",
        name: "简体中文",
        iso: "zh-CN",
        file: "zh-CN.js",
      },
      {
        code: "id",
        name: "Bahasa Indonesia",
        iso: "id-ID",
        file: "id-ID.js",
      },
      {
        code: "tr",
        name: "Türkçe",
        iso: "tr-TR",
        file: "tr-TR.js",
      },
      {
        code: "de",
        name: "Deutsch",
        iso: "de-DE",
        file: "de-DE.js",
      },
      {
        code: "ja",
        name: "日本語",
        iso: "ja-JP",
        file: "ja-JP.js",
      },
    ],
    defaultLocale: "en",
    vueI18n: {
      fallbackLocale: "en",
    },
    lazy: true,
    langDir: "lang/",
  },
  /*
   ** Build configuration
   */
  build: {
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {},
  },
  /*
   ** Generate configuration
   */
  generate: {
    fallback: true,
  },
  /*
   ** Router configuration
   */
  ...routerBase,
}
