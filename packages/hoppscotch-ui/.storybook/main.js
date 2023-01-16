const path = require("path")
const WindiCSS = require("vite-plugin-windicss").default

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
      })
    )
    // config.resolve.alias = {
    //   ...config.resolve.alias,
    //   "~icons": path.resolve(__dirname, "../../hoppscotch-common/assets/icons"),
    // }
    return config
  },
}
