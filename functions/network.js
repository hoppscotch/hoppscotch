import AxiosStrategy from './strategies/AxiosStrategy'
import ExtensionStrategy, { hasExtensionInstalled } from './strategies/ExtensionStrategy'
import FirefoxStrategy from './strategies/FirefoxStrategy'
import ChromeStrategy, { hasChromeExtensionInstalled } from './strategies/ChromeStrategy'

const isExtensionsAllowed = ({ state }) =>
  typeof state.postwoman.settings.EXTENSIONS_ENABLED === 'undefined' ||
  state.postwoman.settings.EXTENSIONS_ENABLED

const runAppropriateStrategy = (req, store) => {
  if (isExtensionsAllowed(store)) {
    if (hasExtensionInstalled()) {
      return ExtensionStrategy(req, store)
    }

    // The following strategies are deprecated and kept to support older version of the extensions

    // Chrome Provides a chrome object for scripts to access
    // Check its availability to say whether you are in Google Chrome
    if (window.chrome && hasChromeExtensionInstalled()) {
      return ChromeStrategy(req, store)
    }
    // The firefox plugin injects a function to send requests through it
    // If that is available, then we can use the FirefoxStrategy
    if (window.firefoxExtSendRequest) {
      return FirefoxStrategy(req, store)
    }
  }

  return AxiosStrategy(req, store)
}

const sendNetworkRequest = (req, store) =>
  runAppropriateStrategy(req, store).finally(() => window.$nuxt.$loading.finish())

export { sendNetworkRequest }
