import AxiosStrategy from "./strategies/AxiosStrategy";
import FirefoxStrategy from "./strategies/FirefoxStrategy";
import ChromeStrategy, { hasChromeExtensionInstalled } from "./strategies/ChromeStrategy";

const isExtensionsAllowed = ({ state }) => {
  return typeof(state.postwoman.settings.EXTENSIONS_ENABLED) === 'undefined'
    || state.postwoman.settings.EXTENSIONS_ENABLED;
}

const runAppropriateStrategy = (req, store) => {
  if (isExtensionsAllowed(store)) {
    // Chrome Provides a chrome object for scripts to access
    // Check its availability to say whether you are in Google Chrome
    if (window.chrome && hasChromeExtensionInstalled()) {
        return ChromeStrategy(req, store);
    }
    // The firefox plugin injects a function to send requests through it
    // If that is available, then we can use the FirefoxStrategy
    if (window.firefoxExtSendRequest) {
      return FirefoxStrategy(req, store);
    }
  }

  return AxiosStrategy(req, store);
}

const sendNetworkRequest = (req, store) =>
  runAppropriateStrategy(req, store)
    .finally(() => window.$nuxt.$loading.finish());

export { sendNetworkRequest };
