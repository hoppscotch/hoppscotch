import { platform } from "~/platform"
import * as E from "fp-ts/Either"

// Default proxy URL
export const DEFAULT_HOPP_PROXY_URL = "https://proxy.hoppscotch.io/"

// Mirrors the backend validateUrl regex (packages/hoppscotch-backend/src/utils.ts).
// Keep these in sync — the backend rejects PROXY_APP_URL values that don't match.
export const PROXY_URL_REGEX = /^(http|https):\/\/[^ "]+$/

export const isValidProxyUrl = (value: string): boolean =>
  PROXY_URL_REGEX.test(value)

// Get default proxy URL from platform or return default.
// Validates the server response so a legacy/empty DB row or a bad env-sync
// can't seed buildDefaultSettings() with junk that would then bypass the
// store-side validation in KernelInterceptorProxyStore.
export const getDefaultProxyUrl = async () => {
  const proxyAppUrl = platform?.infra?.getProxyAppUrl

  if (proxyAppUrl) {
    const res = await proxyAppUrl()

    if (E.isRight(res) && isValidProxyUrl(res.right.value)) {
      return res.right.value
    }

    return DEFAULT_HOPP_PROXY_URL
  }

  return DEFAULT_HOPP_PROXY_URL
}
