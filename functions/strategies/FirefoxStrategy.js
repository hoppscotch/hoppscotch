
const firefoxWithProxy = (req, store) => new Promise((resolve, reject) => {
  const eventListener = (event) => {
    window.removeEventListener("firefoxExtSendRequestComplete", event);

    if (event.detail.error) reject(JSON.parse(event.detail.error));
    else resolve(JSON.parse(event.detail.response));
  };

  window.addEventListener("firefoxExtSendRequestComplete", eventListener);

  window.firefoxExtSendRequest({
    method: "post",
    url: store.state.postwoman.settings.PROXY_URL || "https://postwoman.apollotv.xyz/",
    data: req
  });
});

const firefoxWithoutProxy = (req, _store) => new Promise((resolve, reject) => {
  const eventListener = (event) => {
    window.removeEventListener("firefoxExtSendRequestComplete", eventListener);

    if (event.detail.error) reject(JSON.parse(event.detail.error));
    else resolve(JSON.parse(event.detail.response));
  };

  window.addEventListener("firefoxExtSendRequestComplete", eventListener);

  window.firefoxExtSendRequest(req);
});

const firefoxStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED)
    return firefoxWithProxy(req, store);
  else return firefoxWithoutProxy(req, store);
}

export default firefoxStrategy;
