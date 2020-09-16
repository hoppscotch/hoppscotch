/*
 ** TailwindCSS Configuration File
 **
 ** Docs: https://tailwindcss.com/docs/configuration
 ** Default: https://github.com/tailwindcss/tailwindcss/blob/master/stubs/defaultConfig.stub.js
 */
module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  experimental: "all",
  corePlugins: {
    clear: false,
    float: false,
    skew: false,
  },
  theme: {
    extend: {
      colors: {},
      inset: {},
    },
    fontFamily: {
      body: "var(--font-body)",
      icon: "var(--font-icon)",
    },
  },
  variants: {},
  plugins: [],
  purge: {
    // Learn more on https://tailwindcss.com/docs/controlling-file-size/#removing-unused-css
    enabled: process.env.NODE_ENV === "production",
    content: [
      "components/**/*.vue",
      "layouts/**/*.vue",
      "pages/**/*.vue",
      "plugins/**/*.js",
      "nuxt.config.js",
      "content/**/*.md",
    ],
    // These options are passed through directly to PurgeCSS
    options: {
      whitelistPatterns: [/^bg-/, /^text-/, /^border-/, /^h-/, /^w-/, /^hover:/],
    },
  },
}
