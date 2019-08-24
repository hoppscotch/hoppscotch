// Some helpful application constants.
// TODO: Use these when rendering the pages (rather than just for head/meta tags...)
const meta = {
  name: "Postwoman",
  shortDescription: "Lightweight API request builder",
  description: "The Postwoman API request builder helps you create your requests faster, saving you precious time on your development."
};

export default {
  mode: 'spa',
  /*
  ** Headers of the page
  */
  head: {
    title: `${meta.name} \u2022 ${meta.shortDescription}`,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, minimum-scale=1, shrink-to-fit=no, minimal-ui' },
      { hid: 'description', name: 'description', content: meta.description || '' },

      { name: 'X-UA-Compatible', content: "IE=edge, chrome=1" },
      { itemprop: "name", content: `${meta.name} \u2022 ${meta.shortDescription}` },
      { itemprop: "description", content: meta.description },
      { itemprop: "image", content: "/icons/icon-192x192.png" },

      // Add to homescreen for Chrome on Android. Fallback for PWA (handled by nuxt)
      { name: 'application-name', content: meta.name },

      // Add to homescreen for Safari on iOS
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: meta.name },

      // Windows phone tile icon
      { name: 'msapplication-TileImage', content: 'icons/icon-144x144.png' },
      { name: 'msapplication-TileColor', content: '#121212' },
      { name: 'msapplication-tap-highlight', content: 'no' },

      // OpenGraph
      { property: 'og:site_name', content: meta.name },
      { property: 'og:url', content: 'https://liyasthomas.github.io/postwoman' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${meta.name} \u2022 ${meta.shortDescription}` },
      { property: 'og:description', content: meta.description },
      { property: 'og:image', content: '/icons/icon-144x144.png' },

      // Twitter
      { name: 'twitter:card', content: "summary" },
      { name: 'twitter:site', content: "@liyasthomas" },
      { name: 'twitter:creator', content: "@liyasthomas" },
      { name: 'twitter:url', content: "https://liyasthomas.github.io/postwoman" },
      { name: 'twitter:title', content: meta.name },
      { name: 'twitter:description', content: meta.shortDescription },
      { name: 'twitter:image', content: '/icons/icon-144x144.png' },

    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },

      // Home-screen icons (iOS)
      { rel: 'apple-touch-icon', href: '/icons/icon-48x48.png' },
      { rel: 'apple-touch-icon', sizes: '72x72', href: '/icons/icon-72x72.png' },
      { rel: 'apple-touch-icon', sizes: '96x96', href: '/icons/icon-96x96.png' },
      { rel: 'apple-touch-icon', sizes: '144x144', href: '/icons/icon-144x144.png' },
      { rel: 'apple-touch-icon', sizes: '192x192', href: '/icons/icon-192x192.png' },
    ]
  },
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#88FB4F' },
  /*
  ** Global CSS
  */
  css: [
    '@/assets/css/fonts.scss',
    '@/assets/css/styles.scss'
  ],
  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
  ],
  /*
  ** Nuxt.js dev-modules
  */
  buildModules: [
  ],
  /*
  ** Nuxt.js modules
  */
  modules: [
    // See https://goo.gl/OOhYW5
    ['@nuxtjs/pwa', {
      manifest: {
        name: meta.name,
        short_name: meta.name,
        description: meta.shortDescription,

        display: "standalone",
        theme_color: "#121212",
        background_color: "#121212",

        icons: ((sizes) => {
          let icons = [];

          for(let size of sizes){
            icons.push({
              "src": `/icons/icon-${size}x${size}.png`,
              "type": "image/png",
              "sizes": `${size}x${size}`
            });
          }

          return icons;
        })([48, 72, 96, 144, 192, 512])
      }
    }]
  ],
  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend (config, ctx) {
    }
  }
}
