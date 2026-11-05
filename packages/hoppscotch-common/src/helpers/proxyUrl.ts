import { platform } from "~/platform"
import * as E from "fp-ts/Either"

// Default proxy URL
export const DEFAULT_HOPP_PROXY_URL = "https://proxy.hoppscotch.io/"

// Mirrors the backend validateUrl regex (packages/hoppscotch-backend/src/utils.ts).
// Keep these in sync — the backend rejects PROXY_APP_URL values that don't match.
export const PROXY_URL_REGEX = /^(http|https):\/\/[^ "]+$/

export const isValidProxyUrl = (value: string): boolean =>
  PROXY_URL_REGEX.test(value)

export const getEnvProxyUrl = (): string | null => {
  const envUrl = import.meta.env.VITE_PROXY_APP_URL
  return typeof envUrl === "string" && isValidProxyUrl(envUrl) ? envUrl : null
}

// Get default proxy URL from deployment env, platform, or hardcoded default.
// Validates the server response so a legacy/empty DB row or a bad env-sync
// can't seed buildDefaultSettings() with junk that would then bypass the
// store-side validation in KernelInterceptorProxyStore.
export const getDefaultProxyUrl = async () => {
  const envUrl = getEnvProxyUrl()
  if (envUrl) {
    return envUrl
  }

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
