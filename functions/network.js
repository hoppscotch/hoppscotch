import AxiosStrategy from "./strategies/AxiosStrategy";
import ProxyStrategy from "./strategies/ProxyStrategy";
import FirefoxStrategy from "./strategies/FirefoxStrategy";


const runAppropriateStrategy = (req, store) => {

  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return ProxyStrategy(req, store);
  }

  return AxiosStrategy(req, store);
}

const sendNetworkRequest = (req, store) => 
  runAppropriateStrategy(req, store)
    .finally(() => window.$nuxt.$loading.finish());

export { sendNetworkRequest };
