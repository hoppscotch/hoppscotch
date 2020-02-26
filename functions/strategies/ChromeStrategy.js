const EXTENSION_ID = "amknoiejhlmhancpahfcfcfhllgkpbld";

// Check if the Chrome Extension is present
// The Chrome extension injects an empty span to help detection.
// Also check for the presence of window.chrome object to confirm smooth operations
export const hasChromeExtensionInstalled = () =>
  document.getElementById("chromePWExtensionDetect") !== null;

const chromeWithoutProxy = (req, _store) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        messageType: "send-req",
        data: {
          config: req
        }
      },
      ({ data }) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.response);
        }
      }
    );
  });

const chromeWithProxy = (req, { state }) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        messageType: "send-req",
        data: {
          config: {
            method: "post",
            url:
              state.postwoman.settings.PROXY_URL ||
              "https://postwoman.apollosoftware.xyz/",
            data: req
          }
        }
      },
      ({ data }) => {
        if (data.error) {
          reject(error);
        } else {
          resolve(data.response.data);
        }
      }
    );
  });

const chromeStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return chromeWithProxy(req, store);
  } else {
    return chromeWithoutProxy(req, store);
  }
};

export default chromeStrategy;
