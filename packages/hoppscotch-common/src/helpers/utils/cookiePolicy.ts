import { HoppRESTRequest } from "@hoppscotch/data"
import { settingsStore } from "~/newstore/settings"

/**
 * Evaluates the effective cookie isolation policy for a request.
 * Cookies are disabled if the per-request control or the global setting is enabled.
 */
export function getEffectiveCookieJarDisabled(
  request: HoppRESTRequest
): boolean {
  return (
    (request.requestOptions?.disableCookies ?? false) ||
    settingsStore.value.DISABLE_COOKIES
  )
}

/**
 * Evaluates the cookie isolation policy for a request and returns the parts,
 * preserving provenance so that scripts can override the request-level setting.
 */
export function getCookiePolicy(request: HoppRESTRequest) {
  return {
    globalDisabled: settingsStore.value.DISABLE_COOKIES,
    requestDisabled: request.requestOptions?.disableCookies ?? false,
  }
}
