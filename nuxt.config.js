// Some helpful application constants.
// TODO: Use these when rendering the pages (rather than just for head/meta tags...)
export const options = {
  name: "Hoppscotch",
  shortDescription: "A free, fast and beautiful API request builder",
  description: "Helps you create requests faster, saving precious time on development.",
  loading: {
    color: "var(--ac-color)",
    background: "var(--bg-color)",
  },
  app: {
    color: "#ffffff",
    background: "#202124",
    accent: "#50fa7b",
  },
  social: {
    twitter: "@liyasthomas",
  },
}
export default {
  ssr: false,
  target: "static",
  server: {
    host: "0.0.0.0", // default: localhost
  },
  /*
   ** Headers of the page
   */
  head: {
    title: `${options.name} • ${options.shortDescription}`,
    meta: [
      {
        name: "keywords",
        content:
          "hoppscotch, hopp scotch, hoppscotch online, hoppscotch app, postwoman, postwoman chrome, postwoman online, postwoman for mac, postwoman app, postwoman for windows, postwoman google chrome, postwoman chrome app, get postwoman, postwoman web, postwoman android, postwoman app for chrome, postwoman mobile app, postwoman web app, api, request, testing, tool, rest, websocket, sse, graphql, socketio",
      },
      {
        name: "X-UA-Compatible",
        content: "IE=edge, chrome=1",
      },
      {
        itemprop: "name",
        content: `${options.name} • ${options.shortDescription}`,
      },
      {
        itemprop: "description",
        content: options.description,
      },
      {
        itemprop: "image",
        content: `${process.env.BASE_URL}banner.jpg`,
      },
      {
        property: "og:image",
        content: `${process.env.BASE_URL}banner.jpg`,
      },
      // Add to homescreen for Chrome on Android. Fallback for PWA (handled by nuxt)
      {
        name: "application-name",
        content: options.name,
      },
      // Windows phone tile icon
      {
        name: "msapplication-TileImage",
        content: `/icon.png`,
      },
      {
        name: "msapplication-TileColor",
        content: options.app.background,
      },
      {
        name: "msapplication-tap-highlight",
        content: "no",
      },
    ],
    link: [
      {
        rel: "apple-touch-icon",
        href: "/icon.png",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/icon.png",
      },
    ],
  },
  /*
   ** Customize the progress-bar color
   */
  loading: {
    color: options.loading.color,
    continuous: true,
  },
  /*
   ** Customize the loading indicator
   */
  loadingIndicator: {
    name: "pulse",
    color: options.loading.color,
    background: options.loading.background,
  },
  /*
   ** Global CSS
   */
  css: ["~/assets/scss/styles.scss", "~/assets/scss/themes.scss", "~/assets/scss/fonts.scss"],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: ["~/plugins/vuex-persist", "~/plugins/v-tooltip"],
  /*
   ** Auto import components
   ** See https://nuxtjs.org/api/configuration-components
   */
  components: true,
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [
    // https://pwa.nuxtjs.org
    "@nuxtjs/pwa",
    // Doc: https://github.com/nuxt-community/analytics-module
    "@nuxtjs/google-analytics",
    // Doc: https://github.com/nuxt-community/gtm-module
    "@nuxtjs/gtm",
    // Doc: https://github.com/nuxt-community/svg-module
    "@nuxtjs/svg",
    // Doc: https://tailwindcss.nuxtjs.org
    "@nuxtjs/tailwindcss",
    // Doc: https://color-mode.nuxtjs.org
    "@nuxtjs/color-mode",
  ],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // https://axios.nuxtjs.org
    "@nuxtjs/axios",
    // https://github.com/nuxt-community/modules/tree/master/packages/toast
    "@nuxtjs/toast",
    // Doc: https://github.com/nuxt-community/nuxt-i18n
    "nuxt-i18n",
    // Doc: https://github.com/nuxt-community/robots-module
    "@nuxtjs/robots",
    // Doc: https://github.com/nuxt-community/sitemap-module
    "@nuxtjs/sitemap",
  ],
  pwa: {
    meta: {
      ogHost: process.env.BASE_URL,
      twitterCard: "summary_large_image",
      twitterSite: options.social.twitter,
      twitterCreator: options.social.twitter,
      description: options.shortDescription,
      theme_color: options.app.background,
    },
    manifest: {
      name: options.name,
      short_name: options.name,
      description: options.shortDescription,
      start_url: "/",
      background_color: options.app.background,
      theme_color: options.app.background,
    },
  },
  toast: {
    position: "bottom-center",
    duration: 3000,
    theme: "bubble",
    keepOnHover: true,
  },
  googleAnalytics: {
    id: process.env.GA_ID,
  },
  gtm: {
    id: process.env.GTM_ID,
  },
  sitemap: {
    hostname: process.env.BASE_URL || "https://hoppscotch.io/",
  },
  robots: {
    UserAgent: "*",
    Disallow: "",
    Allow: "/",
    Sitemap: `${process.env.BASE_URL}sitemap.xml`,
  },
  colorMode: { preference: "dark" },
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
        name: "Português",
        iso: "pt-PT",
        file: "pt-PT.json",
      },
      {
        code: "pt-br",
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
        code: "tw",
        name: "繁體中文",
        iso: "zh-TW",
        file: "zh-TW.json",
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
    detectBrowserLanguage: {
      alwaysRedirect: true,
      fallbackLocale: "en",
    },
  },
  /*
   ** Build configuration
   */
  build: {
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      // Sets webpack's mode to development if `isDev` is true.
      if (ctx.isDev) {
        config.mode = "development"
      }
      config.node = {
        fs: "empty",
      }
    },
    parallel: true,
    cache: true,
    // hardSource: true,
  },
  /*
   ** Generate configuration
   */
  generate: {
    fallback: true,
  },
  publicRuntimeConfig: {
    GA_ID: process.env.GA_ID || "UA-61422507-4",
    GTM_ID: process.env.GTM_ID || "GTM-NMKVBMV",
    BASE_URL: process.env.BASE_URL || "https://hoppscotch.io/",
  },
  privateRuntimeConfig: {
    API_KEY: process.env.API_KEY,
    AUTH_DOMAIN: process.env.AUTH_DOMAIN,
    DATABASE_URL: process.env.DATABASE_URL,
    PROJECT_ID: process.env.PROJECT_ID,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    MESSAGING_SENDER_ID: process.env.MESSAGING_SENDER_ID,
    APP_ID: process.env.APP_ID,
    MEASUREMENT_ID: process.env.MEASUREMENT_ID,
  },
}
