const firefoxStrategy = (req, _store) => new Promise((resolve, reject) => {

  const eventListener = (event) => {
    window.removeEventListener("firefoxExtSendRequestComplete", eventListener);

    if (event.detail.error) reject(JSON.parse(event.detail.error));
    else resolve(JSON.parse(event.detail.response));
  };

  window.addEventListener("firefoxExtSendRequestComplete", eventListener);

  window.firefoxExtSendRequest(req);
});

export default firefoxStrategy;
