// Some helpful application constants.
// TODO: Use these when rendering the pages (rather than just for head/meta tags...)
export const options = {
  name: "Postwoman",
  shortDescription: "A free, fast and beautiful API request builder",
  description:
    "Web alternative to Postman - Helps you create requests faster, saving precious time on development.",
  loading: {
    color: "#202124",
  },
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
  head: {
    title: `${options.name} \u2022 ${options.shortDescription}`,
    meta: [
      {
        name: "keywords",
        content:
          "postwoman, postwoman chrome, postwoman online, postwoman for mac, postwoman app, postwoman for windows, postwoman google chrome, postwoman chrome app, get postwoman, postwoman web, postwoman android, postwoman app for chrome, postwoman mobile app, postwoman web app, api, request, testing, tool, rest, websocket, sse, graphql, socketio",
      },
      {
        name: "X-UA-Compatible",
        content: "IE=edge, chrome=1",
      },
      {
        itemprop: "name",
        content: `${options.name} \u2022 ${options.shortDescription}`,
      },
      {
        itemprop: "description",
        content: options.description,
      },
      {
        itemprop: "image",
        content: `https://postwoman.io/logo.jpg`,
      },
      {
        property: "og:image",
        content: `https://postwoman.io/logo.jpg`,
      },
      // Add to homescreen for Chrome on Android. Fallback for PWA (handled by nuxt)
      {
        name: "application-name",
        content: options.name,
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
    continuous: true,
  },
  /*
   ** Customize the loading indicator
   */
  loadingIndicator: {
    name: "pulse",
    color: "var(--ac-color)",
    background: "#202124",
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
  buildModules: ["@nuxtjs/gtm"],
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
    ["@nuxtjs/robots"],
    ["nuxt-i18n"],
  ],
  pwa: {
    manifest: {
      name: options.name,
      short_name: options.name,
      start_url: `${routerBase.router.base}`,
      display: "standalone",
      background_color: "#202124",
      description: options.shortDescription,
      theme_color: "#202124",
    },

    meta: {
      ogHost: "https://postwoman.io",
      twitterCard: "summary_large_image",
      twitterSite: "@liyasthomas",
      twitterCreator: "@liyasthomas",
      description: options.shortDescription,
      theme_color: "#202124",
    },
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
  gtm: {
    id: process.env.GTM_ID || "GTM-MXWD8NQ",
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
        file: "en-US.json",
      },
      {
        code: "es",
        name: "Español",
        iso: "es-ES",
        file: "es-ES.json",
      },
      {
        code: "fr",
        name: "Français",
        iso: "fr-FR",
        file: "fr-FR.json",
      },
      {
        code: "fa",
        name: "Farsi",
        iso: "fa-IR",
        file: "fa-IR.json",
      },
      {
        code: "pt",
        name: "Português Brasileiro",
        iso: "pt-BR",
        file: "pt-BR.json",
      },
      {
        code: "cn",
        name: "简体中文",
        iso: "zh-CN",
        file: "zh-CN.json",
      },
      {
        code: "id",
        name: "Bahasa Indonesia",
        iso: "id-ID",
        file: "id-ID.json",
      },
      {
        code: "tr",
        name: "Türkçe",
        iso: "tr-TR",
        file: "tr-TR.json",
      },
      {
        code: "de",
        name: "Deutsch",
        iso: "de-DE",
        file: "de-DE.json",
      },
      {
        code: "ja",
        name: "日本語",
        iso: "ja-JP",
        file: "ja-JP.json",
      },
      {
        code: "ko",
        name: "한국어",
        iso: "ko-KR",
        file: "ko-KR.json",
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
