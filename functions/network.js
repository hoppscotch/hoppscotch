import AxiosStrategy from "./strategies/AxiosStrategy";
import ProxyStrategy from "./strategies/ProxyStrategy";

const sendNetworkRequest = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return ProxyStrategy(req, store);
  }

  return AxiosStrategy(req, store);
};

export { sendNetworkRequest };
