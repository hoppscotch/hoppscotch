import AxiosStrategy from "./strategies/AxiosStrategy";
import ProxyStrategy from "./strategies/ProxyStrategy";
import FirefoxStrategy from "./strategies/FirefoxStrategy";


const runAppropriateStrategy = (req, store) => {
  // The firefox plugin injects a function to send requests through it
  // If that is available, then we can use the FirefoxStrategy
  if (window.firefoxExtSendRequest) {
    return FirefoxStrategy(req, store); 
  }

  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return ProxyStrategy(req, store);
  }

  return AxiosStrategy(req, store);
}

const sendNetworkRequest = (req, store) => 
  runAppropriateStrategy(req, store)
    .finally(() => window.$nuxt.$loading.finish());

export { sendNetworkRequest };
