import AxiosStrategy, { cancelRunningAxiosRequest } from "./strategies/AxiosStrategy"
import ExtensionStrategy, {
  cancelRunningExtensionRequest,
  hasExtensionInstalled,
} from "./strategies/ExtensionStrategy"

export const cancelRunningRequest = (store) => {
  if (isExtensionsAllowed(store) && hasExtensionInstalled()) {
    cancelRunningExtensionRequest()
  } else {
    cancelRunningAxiosRequest()
  }
}

const isExtensionsAllowed = ({ state }) =>
  typeof state.postwoman.settings.EXTENSIONS_ENABLED === "undefined" ||
  state.postwoman.settings.EXTENSIONS_ENABLED

const runAppropriateStrategy = (req, store) => {
  if (isExtensionsAllowed(store) && hasExtensionInstalled()) {
    return ExtensionStrategy(req, store)
  }

  return AxiosStrategy(req, store)
}

export const sendNetworkRequest = (req, store) =>
  runAppropriateStrategy(req, store).finally(() => window.$nuxt.$loading.finish())
