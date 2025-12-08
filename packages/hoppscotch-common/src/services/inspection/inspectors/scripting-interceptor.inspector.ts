import { Service } from "dioc"
import {
  InspectionService,
  Inspector,
  InspectorResult,
} from "~/services/inspection"
import { computed, markRaw, Ref } from "vue"
import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { getI18n } from "~/modules/i18n"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { platform } from "~/platform"

/**
 * Inspector that validates proper interceptor usage when scripts make HTTP requests.
 *
 * This inspector warns users when:
 * 1. Using Extension/Proxy interceptors with fetch/hopp.fetch/pm.sendRequest
 *    - Extension has limited support, Proxy behavior is unknown
 *    - Recommends Agent (web) or Native (desktop) for reliable scripting
 *
 * 2. Using Browser interceptor with same-origin requests (only when hasCookieBasedAuth=true)
 *    - Platforms with cookie-based auth auto-include cookies in same-origin requests
 *    - Creates CSRF vulnerability if script is malicious
 *    - Recommends Agent interceptor for same-origin requests
 *    - Only applies to SH web; SH desktop uses bearer tokens
 */
export class ScriptingInterceptorInspectorService
  extends Service
  implements Inspector
{
  public static readonly ID = "SCRIPTING_INTERCEPTOR_INSPECTOR_SERVICE"
  public readonly inspectorID = "scripting-interceptor"

  private readonly t = getI18n()
  private readonly inspection = this.bind(InspectionService)
  private readonly kernelInterceptor = this.bind(KernelInterceptorService)

  override onServiceInit() {
    this.inspection.registerInspector(this)
  }

  /**
   * Detects if script contains fetch(), hopp.fetch(), or pm.sendRequest() calls.
   * Returns the API name if found, null otherwise.
   */
  private scriptContainsFetchAPI(script: string): string | null {
    if (!script || script.trim() === "") {
      return null
    }

    if (/pm\.sendRequest\s*\(/i.test(script)) {
      return "pm.sendRequest()"
    } else if (/hopp\.fetch\s*\(/i.test(script)) {
      return "hopp.fetch()"
    } else if (/(?<!hopp\.)fetch\s*\(/i.test(script)) {
      return "fetch()"
    }

    return null
  }

  /**
   * Checks if script contains same-origin fetch calls.
   * Detects:
   * 1. Relative URLs (starts with /, ./, or ../)
   * 2. window.location references
   * 3. Absolute URLs matching current origin
   * 4. Request objects with same-origin URLs (for pm.sendRequest)
   */
  private scriptContainsSameOriginFetch(script: string): boolean {
    if (!script || script.trim() === "") {
      return false
    }

    const currentOrigin = window.location.origin

    // Check for relative URLs in string arguments
    const relativeUrlPatterns = [
      /(?:fetch|sendRequest)\s*\(\s*['"`]\/[^/]/i,
      /(?:fetch|sendRequest)\s*\(\s*['"`]\.\//i,
      /(?:fetch|sendRequest)\s*\(\s*['"`]\.\.\//i,
    ]

    if (relativeUrlPatterns.some((pattern) => pattern.test(script))) {
      return true
    }

    // Check for window.location usage
    if (/(?:window\.)?location\.(?:origin|href|hostname)/i.test(script)) {
      return true
    }

    // Check for absolute URLs matching current origin in string arguments
    const fetchUrlPattern =
      /(?:fetch|sendRequest)\s*\(\s*['"`](https?:\/\/[^'"`]+)['"`]/gi
    const matches = script.matchAll(fetchUrlPattern)

    for (const match of matches) {
      const url = match[1]
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === currentOrigin) {
          return true
        }
      } catch {
        continue
      }
    }

    // Check for request objects with same-origin URLs (pm.sendRequest pattern)
    // Matches patterns like: pm.sendRequest({url: '/path'}, ...) or pm.sendRequest({url: 'http://...'}, ...)
    const requestObjectPattern =
      /(?:sendRequest)\s*\(\s*\{[^}]*url\s*:\s*['"`]([^'"`]+)['"`][^}]*\}/gi
    const requestObjectMatches = script.matchAll(requestObjectPattern)

    for (const match of requestObjectMatches) {
      const url = match[1]

      // Check if it's a relative URL
      if (
        url.startsWith("/") ||
        url.startsWith("./") ||
        url.startsWith("../")
      ) {
        return true
      }

      // Check if it's an absolute URL matching current origin
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === currentOrigin) {
          return true
        }
      } catch {
        // Invalid URL, skip
        continue
      }
    }

    return false
  }

  getInspections(
    req: Readonly<Ref<HoppRESTRequest | HoppRESTResponseOriginalRequest>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _res: Readonly<Ref<HoppRESTResponse | null | undefined>>
  ): Ref<InspectorResult[]> {
    return computed(() => {
      const results: InspectorResult[] = []

      if (!req.value || !("preRequestScript" in req.value)) {
        return results
      }

      const request = req.value as HoppRESTRequest
      const currentInterceptorId = this.kernelInterceptor.getCurrentId()

      // Check both scripts for fetch API usage
      const preRequestAPI = this.scriptContainsFetchAPI(
        request.preRequestScript
      )
      const postRequestAPI = this.scriptContainsFetchAPI(request.testScript)

      if (!preRequestAPI && !postRequestAPI) {
        return results
      }

      // Determine which script type(s) use the API
      const scriptType = preRequestAPI
        ? postRequestAPI
          ? this.t("inspections.scripting_interceptor.both_scripts")
          : this.t("inspections.scripting_interceptor.pre_request")
        : this.t("inspections.scripting_interceptor.post_request")

      const apiUsed = preRequestAPI || postRequestAPI!

      // Warning 1: Extension/Proxy interceptors don't support scripting API calls
      if (
        currentInterceptorId === "extension" ||
        currentInterceptorId === "proxy"
      ) {
        results.push({
          id: "unsupported-interceptor",
          icon: markRaw(IconAlertTriangle),
          text: {
            type: "text",
            text: this.t(
              "inspections.scripting_interceptor.unsupported_interceptor",
              { scriptType, apiUsed, interceptor: currentInterceptorId }
            ),
          },
          severity: 2,
          isApplicable: true,
          locations: { type: "response" },
        })
      }

      // Warning 2: CSRF concern with Browser interceptor + same-origin (only for cookie-based auth)
      if (
        currentInterceptorId === "browser" &&
        platform.platformFeatureFlags.hasCookieBasedAuth
      ) {
        const preRequestHasSameOrigin = this.scriptContainsSameOriginFetch(
          request.preRequestScript
        )
        const postRequestHasSameOrigin = this.scriptContainsSameOriginFetch(
          request.testScript
        )

        if (preRequestHasSameOrigin || postRequestHasSameOrigin) {
          const sameOriginScriptType = preRequestHasSameOrigin
            ? postRequestHasSameOrigin
              ? this.t("inspections.scripting_interceptor.both_scripts")
              : this.t("inspections.scripting_interceptor.pre_request")
            : this.t("inspections.scripting_interceptor.post_request")

          const sameOriginApiUsed = preRequestHasSameOrigin
            ? this.scriptContainsFetchAPI(request.preRequestScript)
            : this.scriptContainsFetchAPI(request.testScript)

          results.push({
            id: "same-origin-fetch-csrf",
            icon: markRaw(IconAlertTriangle),
            text: {
              type: "text",
              text: this.t(
                "inspections.scripting_interceptor.same_origin_csrf_warning",
                {
                  scriptType: sameOriginScriptType,
                  apiUsed: sameOriginApiUsed,
                }
              ),
            },
            severity: 2,
            isApplicable: true,
            locations: { type: "response" },
          })
        }
      }

      return results
    })
  }
}
