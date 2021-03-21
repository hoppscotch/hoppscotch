/*
 ** TailwindCSS Configuration File
 **
 ** Docs: https://tailwindcss.com/docs/configuration
 ** Default: https://github.com/tailwindcss/tailwindcss/blob/master/stubs/defaultConfig.stub.js
 */
module.exports = {
  dark: "class",
  corePlugins: {
    float: false,
    clear: false,
    transitionDelay: false,
    skew: false,
  },
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bgColor: "var(--bg-color)",
        bgLightColor: "var(--bg-light-color)",
        bgDarkColor: "var(--bg-dark-color)",
        fgColor: "var(--fg-color)",
        fgLightColor: "var(--fg-light-color)",
        brdColor: "var(--brd-color)",
        errColor: "var(--err-color)",
        acColor: "var(--ac-color)",
        actColor: "var(--act-color)",
        ttColor: "var(--tt-color)",
      },
    },
    fontFamily: {
      body: "var(--font-body)",
      mono: "var(--font-mono)",
      icon: "var(--font-icon)",
    },
  },
  variants: {},
  plugins: [],
  purge: {
    content: [
      "components/**/*.vue",
      "layouts/**/*.vue",
      "pages/**/*.vue",
      "plugins/**/*.js",
      "nuxt.config.js",
    ],
  },
}
