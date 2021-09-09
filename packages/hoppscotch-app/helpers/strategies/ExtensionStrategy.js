import { decodeB64StringToArrayBuffer } from "../utils/b64"
import { settingsStore } from "~/newstore/settings"

export const hasExtensionInstalled = () =>
  typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined"

export const hasChromeExtensionInstalled = () =>
  hasExtensionInstalled() &&
  /Chrome/i.test(navigator.userAgent) &&
  /Google/i.test(navigator.vendor)

export const hasFirefoxExtensionInstalled = () =>
  hasExtensionInstalled() && /Firefox/i.test(navigator.userAgent)

export const cancelRunningExtensionRequest = () => {
  if (
    hasExtensionInstalled() &&
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest
  ) {
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest()
  }
}

const extensionWithProxy = async (req) => {
  const backupTimeDataStart = new Date().getTime()

  const res = await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
    method: "post",
    url: settingsStore.value.PROXY_URL || "https://proxy.hoppscotch.io/",
    data: {
      ...req,
      wantsBinary: true,
    },
  })

  const backupTimeDataEnd = new Date().getTime()

  const parsedData = JSON.parse(res.data)

  if (!parsedData.success) {
    throw new Error(parsedData.data.message || "Proxy Error")
  }

  if (parsedData.isBinary) {
    parsedData.data = decodeB64StringToArrayBuffer(parsedData.data)
  }

  if (!(res && res.config && res.config.timeData)) {
    res.config = {
      timeData: {
        startTime: backupTimeDataStart,
        endTime: backupTimeDataEnd,
      },
    }
  }

  parsedData.config = res.config

  return parsedData
}

const extensionWithoutProxy = async (req) => {
  const backupTimeDataStart = new Date().getTime()

  const res = await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
    ...req,
    wantsBinary: true,
  })

  const backupTimeDataEnd = new Date().getTime()

  if (!(res && res.config && res.config.timeData)) {
    res.config = {
      timeData: {
        startTime: backupTimeDataStart,
        endTime: backupTimeDataEnd,
      },
    }
  }
  return res
}

const extensionStrategy = (req) => {
  if (settingsStore.value.PROXY_ENABLED) {
    return extensionWithProxy(req)
  }
  return extensionWithoutProxy(req)
}

export default extensionStrategy
