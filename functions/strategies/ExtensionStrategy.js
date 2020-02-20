const extensionWithProxy = async (req, { state }) => {
  const { data } = await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
    method: "post",
    url:
      state.postwoman.settings.PROXY_URL || "https://postwoman.apollotv.xyz/",
    data: req
  });
  return data;
};

const extensionWithoutProxy = async (req, _store) => {
  const res = await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest(req);
  return res;
};

const extensionStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return extensionWithProxy(req, store);
  }
  return extensionWithoutProxy(req, store);
};

export default extensionStrategy;
