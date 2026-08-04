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
