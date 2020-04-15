import AxiosStrategy from "./strategies/AxiosStrategy"
import ExtensionStrategy, { hasExtensionInstalled } from "./strategies/ExtensionStrategy"

const isExtensionsAllowed = ({ state }) =>
  typeof state.postwoman.settings.EXTENSIONS_ENABLED === "undefined" ||
  state.postwoman.settings.EXTENSIONS_ENABLED

const runAppropriateStrategy = (req, store) => {
  if (isExtensionsAllowed(store) && hasExtensionInstalled()) {
    return ExtensionStrategy(req, store)
  }

  return AxiosStrategy(req, store)
}

const sendNetworkRequest = (req, store) =>
  runAppropriateStrategy(req, store).finally(() => window.$nuxt.$loading.finish())

export { sendNetworkRequest }
