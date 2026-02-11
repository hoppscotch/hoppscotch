import { RelayResponse } from "@hoppscotch/kernel"
import { HoppRESTRequest } from "@hoppscotch/data"
import {
  HoppRESTResponseHeader,
  HoppRESTSuccessResponse,
} from "~/helpers/types/HoppRESTResponse"
import { getService } from "~/modules/dioc"
import { CookieJarService } from "~/services/cookie-jar.service"

export type HoppRESTTransformError = {
  type: "fail"
  error: {
    type: "transform_error"
    message: string
  }
}

const extractTiming = (response: RelayResponse): number =>
  response.meta?.timing
    ? response.meta.timing.end - response.meta.timing.start
    : 0

const extractSize = (response: RelayResponse): number =>
  response.meta?.size?.total ?? 0

/**
 * Response headers processor to handle multiple `\n` split Set-Cookie
 * headers.
 *
 *
 * TODO: This is a special case handler, a temporary workaround.
 * Temporary workaround often get calcified as permanent but a complete
 * solution, but the other more better option is rather involved,
 * like swapping `Record`/`HashMap` with a flat array and propagating
 * the refactor throughout the codebase, from the underlying networking
 * to the FE.
 *
 * The problem with that approach is you lose that O(1) lookup. There's
 * also little point in going from key-value to key-pair-value since
 * you'd just be putting this same workaround somewhere else.
 * A simpler approach is `HashMap<String, Vec<String>>` but even that
 * doesn't substantially reduces the refactor surface area.
 * Given all of those issues, a temporary workaround is perhaps the best
 * solution at the moment.
 *
 * Headers should always be present from the `RelayResponse`, this defends
 * against potential serde/boundary issues between typed conversions.
 */
const processHeaders = (
  headers?: Record<string, string> | null
): HoppRESTResponseHeader[] => {
  const processedHeaders: HoppRESTResponseHeader[] = []

  // `headers` should theoretically exist, always
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === "set-cookie") {
      // To split concatenated `Set-Cookie` headers and create separate header entries,
      // see `if key.to_lowercase() == "set-cookie" {` in `transfer.rs`
      const cookieStrings = value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
      for (const cookieString of cookieStrings) {
        processedHeaders.push({ key: "Set-Cookie", value: cookieString })
      }
    } else {
      processedHeaders.push({ key, value })
    }
  }

  return processedHeaders
}

export const RESTResponse = {
  async toResponse(
    response: RelayResponse,
    originalRequest: HoppRESTRequest
  ): Promise<HoppRESTSuccessResponse | HoppRESTTransformError> {
    if (!response.body.body || !(response.body.body instanceof Uint8Array)) {
      return {
        type: "fail",
        error: {
          type: "transform_error",
          message: "Invalid response body format",
        },
      }
    }

    // Process headers to handle Set-Cookie splitting
    const headers = processHeaders(response.headers)

    // Extract Set-Cookie headers and store them in the cookie jar
    const setCookieHeaders = headers
      .filter(header => header.key.toLowerCase() === 'set-cookie')
      .map(header => header.value)

    console.log('[Cookie Debug] Set-Cookie headers found:', setCookieHeaders.length, setCookieHeaders)

    if (setCookieHeaders.length > 0) {
      try {
        // Get CookieJarService instance and extract cookies
        const cookieJarService = getService(CookieJarService)
        console.log('[Cookie Debug] Extracting cookies for URL:', originalRequest.endpoint)
        cookieJarService.extractCookiesFromResponse(setCookieHeaders, originalRequest.endpoint)
        console.log('[Cookie Debug] Cookies extracted successfully')
      } catch (error) {
        console.warn("Failed to extract cookies from response:", error)
        // Don't fail the response if cookie extraction fails
      }
    }

    return {
      type: "success",
      headers,
      body: response.body.body.buffer,
      statusCode: response.status,
      statusText: response.statusText ?? "",
      meta: {
        responseSize: extractSize(response),
        responseDuration: extractTiming(response),
      },
      req: originalRequest,
    }
  },
}
