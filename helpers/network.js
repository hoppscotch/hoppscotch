import AxiosStrategy, {
  cancelRunningAxiosRequest,
} from "./strategies/AxiosStrategy"
import ExtensionStrategy, {
  cancelRunningExtensionRequest,
  hasExtensionInstalled,
} from "./strategies/ExtensionStrategy"
import { settingsStore } from "~/newstore/settings"

export const cancelRunningRequest = () => {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    cancelRunningExtensionRequest()
  } else {
    cancelRunningAxiosRequest()
  }
}

const isExtensionsAllowed = () => settingsStore.value.EXTENSIONS_ENABLED

const runAppropriateStrategy = (req) => {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    return ExtensionStrategy(req)
  }

  return AxiosStrategy(req)
}

/**
 * Returns an identifier for how a request will be ran
 * if the system is asked to fire a request
 *
 * @returns {"normal" | "extension" | "proxy"}
 */
export function getCurrentStrategyID() {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    return "extension"
  } else if (settingsStore.value.PROXY_ENABLED) {
    return "proxy"
  } else {
    return "normal"
  }
}

export const sendNetworkRequest = (req) =>
  runAppropriateStrategy(req).finally(() => window.$nuxt.$loading.finish())
