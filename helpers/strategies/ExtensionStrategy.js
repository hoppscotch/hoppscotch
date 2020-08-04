import { decodeB64StringToArrayBuffer } from "../utils/b64"

export const hasExtensionInstalled = () =>
  typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined"

export const hasChromeExtensionInstalled = () =>
  hasExtensionInstalled() && /Chrome/i.test(navigator.userAgent) && /Google/i.test(navigator.vendor)

export const hasFirefoxExtensionInstalled = () =>
  hasExtensionInstalled() && /Firefox/i.test(navigator.userAgent)

export const cancelRunningExtensionRequest = () => {
  if (hasExtensionInstalled() && window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest) {
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest()
  }
}

const extensionWithProxy = async (req, { state }) => {
  const { data } = await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
    method: "post",
    url: state.postwoman.settings.PROXY_URL || "https://postwoman.apollosoftware.xyz/",
    data: {
      ...req,
      wantsBinary: true,
    },
  })

  const parsedData = JSON.parse(data)

  if (!parsedData.success) {
    throw new Error(parsedData.data.message || "Proxy Error")
  }

  if (parsedData.isBinary) {
    parsedData.data = decodeB64StringToArrayBuffer(data.data)
  }

  return parsedData
}

const extensionWithoutProxy = async (req, _store) => {
  const res = await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
    ...req,
    wantsBinary: true,
  })
  return res
}

const extensionStrategy = (req, store) => {
  if (store.state.postwoman.settings.PROXY_ENABLED) {
    return extensionWithProxy(req, store)
  }
  return extensionWithoutProxy(req, store)
}

export default extensionStrategy
