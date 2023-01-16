const path = require("path")
const WindiCSS = require("vite-plugin-windicss").default
const IconResolver = require("unplugin-icons/resolver")
const Icons = require("unplugin-icons/vite")
const { FileSystemIconLoader } = require("unplugin-icons/loaders")
const Components = require("unplugin-vue-components/vite")

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: "@storybook/vue3",
  core: {
    builder: "@storybook/builder-vite",
  },
  features: {
    storyStoreV7: true,
  },
  async viteFinal(config, { configType }) {
    config.plugins = config.plugins ?? []
    config.plugins.push(
      WindiCSS({
        config: path.join(__dirname, "..", "windi.config.ts"),
      }),
      Components({
        dts: "./src/components.d.ts",
        dirs: ["./src/components"],
        directoryAsNamespace: true,
        resolvers: [
          IconResolver({
            prefix: "icon",
            customCollections: ["hopp", "auth", "brands"],
          }),
        ],
      }),
      Icons({
        compiler: "vue3",
        customCollections: {
          hopp: FileSystemIconLoader("../hoppscotch-common/assets/icons"),
          auth: FileSystemIconLoader("../hoppscotch-common/assets/icons/auth"),
          brands: FileSystemIconLoader(
            "../hoppscotch-common/assets/icons/brands"
          ),
        },
      })
    )
    config.resolve.alias = {
      ...config.resolve.alias,
      "~": path.resolve(__dirname, "../src/"),
      "@composables": path.resolve(__dirname, "../src/composables"),
    }
    return config
  },
}
