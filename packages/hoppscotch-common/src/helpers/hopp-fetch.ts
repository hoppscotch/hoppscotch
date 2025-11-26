import * as E from "fp-ts/Either"
import type { HoppFetchHook, FetchCallMeta } from "@hoppscotch/js-sandbox"
import type { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import type { RelayRequest } from "@hoppscotch/kernel"

/**
 * Creates a hopp.fetch() hook implementation for the web app.
 * Routes fetch requests through the KernelInterceptorService to respect
 * user's interceptor preference (browser/proxy/extension/native).
 *
 * @param kernelInterceptor - The kernel interceptor service instance
 * @param onFetchCall - Optional callback to track fetch calls for inspector warnings
 * @returns HoppFetchHook implementation
 */
export const createHoppFetchHook = (
  kernelInterceptor: KernelInterceptorService,
  onFetchCall?: (meta: FetchCallMeta) => void
): HoppFetchHook => {
  return async (input, init) => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const method = (init?.method || "GET").toUpperCase()

    // Track the fetch call for inspector warnings
    onFetchCall?.({
      url: urlStr,
      method,
      timestamp: Date.now(),
    })

    // Convert Fetch API request to RelayRequest
    const relayRequest = await convertFetchToRelayRequest(input, init)

    // Execute via interceptor
    const execution = kernelInterceptor.execute(relayRequest)
    const result = await execution.response

    if (E.isLeft(result)) {
      const error = result.left

      const errorMessage =
        typeof error === "string"
          ? error
          : typeof error === "object" &&
              error !== null &&
              "humanMessage" in error
            ? typeof error.humanMessage.heading === "function"
              ? error.humanMessage.heading(() => "Unknown error")
              : "Unknown error"
            : "Unknown error"
      throw new Error(`Fetch failed: ${errorMessage}`)
    }

    // Convert RelayResponse to serializable Response-like object
    // Native Response objects can't cross VM boundaries
    return convertRelayResponseToSerializableResponse(result.right)
  }
}

/**
 * Converts Fetch API request to RelayRequest format
 */
async function convertFetchToRelayRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<RelayRequest> {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url

  // Extract method from Request object if available
  const requestMethod = input instanceof Request ? input.method : undefined
  const method = (
    init?.method ||
    requestMethod ||
    "GET"
  ).toUpperCase() as RelayRequest["method"]

  // Convert headers - merge from Request object if present
  const headers: Record<string, string> = {}

  // First, add headers from Request object if input is a Request
  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers[key] = value
    })
  }

  // Then overlay with init.headers (takes precedence)
  if (init?.headers) {
    const headersObj =
      init.headers instanceof Headers ? init.headers : new Headers(init.headers)

    headersObj.forEach((value, key) => {
      headers[key] = value
    })
  }

  // Handle body based on type
  let content: RelayRequest["content"] | undefined

  // Check both init.body and Request body (init.body takes precedence)
  // For Request objects, we need to clone and read the body since it's a stream
  let bodyToUse: BodyInit | null | undefined

  if (init?.body !== undefined) {
    bodyToUse = init.body
  } else if (input instanceof Request && input.body !== null) {
    // Clone the request to avoid consuming the original body
    const clonedRequest = input.clone()
    // Read the body as arrayBuffer to preserve binary data
    // We'll convert to appropriate type based on content-type
    const bodyBuffer = await clonedRequest.arrayBuffer()

    // Check content-type to determine if body is text or binary
    const contentType = input.headers.get("content-type") || ""
    const isTextContent =
      contentType.includes("text/") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("javascript") ||
      contentType.includes("form-urlencoded")

    if (isTextContent) {
      // Decode as text for text-based content types
      const decoder = new TextDecoder()
      bodyToUse = decoder.decode(bodyBuffer)
    } else {
      // Keep as ArrayBuffer for binary content
      bodyToUse = bodyBuffer
    }
  } else {
    bodyToUse = undefined
  }

  if (bodyToUse) {
    if (typeof bodyToUse === "string") {
      // Headers API normalizes keys to lowercase during forEach iteration
      const mediaType = headers["content-type"] || "text/plain"

      // Use "text" kind for string bodies (including JSON strings)
      content = {
        kind: "text",
        content: bodyToUse,
        mediaType,
      }
    } else if (bodyToUse instanceof FormData) {
      content = {
        kind: "multipart",
        content: bodyToUse,
        mediaType: "multipart/form-data",
      }
    } else if (bodyToUse instanceof URLSearchParams) {
      // Handle URLSearchParams bodies
      content = {
        kind: "text",
        content: bodyToUse.toString(),
        mediaType: "application/x-www-form-urlencoded",
      }
    } else if (bodyToUse instanceof Blob) {
      const arrayBuffer = await bodyToUse.arrayBuffer()
      content = {
        kind: "binary",
        content: new Uint8Array(arrayBuffer),
        mediaType: bodyToUse.type || "application/octet-stream",
      }
    } else if (bodyToUse instanceof ArrayBuffer) {
      content = {
        kind: "binary",
        content: new Uint8Array(bodyToUse),
        mediaType: "application/octet-stream",
      }
    } else if (ArrayBuffer.isView(bodyToUse)) {
      content = {
        kind: "binary",
        content: new Uint8Array(
          bodyToUse.buffer,
          bodyToUse.byteOffset,
          bodyToUse.byteLength
        ),
        mediaType: "application/octet-stream",
      }
    }
  }

  const relayRequest = {
    id: Math.floor(Math.random() * 1000000), // Random ID for tracking
    url: urlStr,
    method,
    version: "HTTP/1.1", // HTTP version
    headers,
    params: undefined, // Undefined so preProcessRelayRequest doesn't try to process it
    auth: { kind: "none" }, // Required field - no auth for fetch()
    content,
    // Note: auth, proxy, security are inherited from interceptor configuration
  }

  return relayRequest
}

/**
 * Converts RelayResponse to a serializable Response-like object.
 *
 * Native Response objects can't cross the QuickJS boundary due to internal state.
 * Returns a plain object with all data loaded upfront.
 */
function convertRelayResponseToSerializableResponse(
  relayResponse: any
): Response {
  const status = relayResponse.status || 200
  const statusText = relayResponse.statusText || ""
  const ok = status >= 200 && status < 300

  // Convert headers to plain object (serializable)
  // Set-Cookie headers kept separate - commas can appear in cookie values
  const headersObj: Record<string, string> = {}
  const setCookieHeaders: string[] = []

  // Agent interceptor provides multiHeaders with Set-Cookie preserved separately
  if (relayResponse.multiHeaders && Array.isArray(relayResponse.multiHeaders)) {
    for (const header of relayResponse.multiHeaders) {
      if (header.key.toLowerCase() === "set-cookie") {
        setCookieHeaders.push(header.value)
      } else {
        headersObj[header.key] = header.value
      }
    }
  } else if (relayResponse.headers) {
    // Fallback for other interceptors: process regular headers
    Object.entries(relayResponse.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === "set-cookie") {
        // Preserve Set-Cookie headers as array for getSetCookie() compatibility
        if (Array.isArray(value)) {
          setCookieHeaders.push(...value)
        } else {
          setCookieHeaders.push(String(value))
        }
        // Store first Set-Cookie for backward compatibility
        headersObj[key] = Array.isArray(value) ? value[0] : String(value)
      } else {
        // Other headers can be safely used directly
        headersObj[key] = String(value)
      }
    })
  }

  // Store body as plain array for VM serialization
  let bodyBytes: number[] = []

  // Extract body data - nested inside relayResponse.body.body
  const actualBody = relayResponse.body?.body || relayResponse.body

  if (actualBody) {
    if (Array.isArray(actualBody)) {
      // Already an array
      bodyBytes = actualBody
    } else if (actualBody instanceof ArrayBuffer) {
      // ArrayBuffer (used by Agent interceptor) - convert to plain array
      bodyBytes = Array.from(new Uint8Array(actualBody))
    } else if (actualBody instanceof Uint8Array) {
      // Array copy needed for VM serialization
      bodyBytes = Array.from(actualBody)
    } else if (ArrayBuffer.isView(actualBody)) {
      // Other typed array
      bodyBytes = Array.from(new Uint8Array(actualBody.buffer))
    } else if (typeof actualBody === "object") {
      // Check if it's a Buffer-like object with 'type' and 'data' properties
      if ("type" in actualBody && "data" in actualBody) {
        // This is likely a serialized Buffer: {type: 'Buffer', data: [1,2,3,...]}
        if (Array.isArray(actualBody.data)) {
          bodyBytes = actualBody.data
        }
      } else {
        // Plain object with numeric keys (like {0: 72, 1: 101, ...})
        const keys = Object.keys(actualBody)
          .map(Number)
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b)
        bodyBytes = keys.map((k) => actualBody[k])
      }
    }
  }

  // Create Response-like object with all methods implemented using stored data
  const serializableResponse = {
    status,
    statusText,
    ok,
    // Store raw headers data for fetch module to use
    _headersData: headersObj,
    headers: {
      get(name: string): string | null {
        // Case-insensitive header lookup
        const lowerName = name.toLowerCase()
        for (const [key, value] of Object.entries(headersObj)) {
          if (key.toLowerCase() === lowerName) {
            return value
          }
        }
        return null
      },
      has(name: string): boolean {
        return this.get(name) !== null
      },
      entries(): IterableIterator<[string, string]> {
        return Object.entries(headersObj)[Symbol.iterator]()
      },
      keys(): IterableIterator<string> {
        return Object.keys(headersObj)[Symbol.iterator]()
      },
      values(): IterableIterator<string> {
        return Object.values(headersObj)[Symbol.iterator]()
      },
      forEach(callback: (value: string, key: string) => void) {
        Object.entries(headersObj).forEach(([key, value]) =>
          callback(value, key)
        )
      },
      // Returns all Set-Cookie headers as array
      getSetCookie(): string[] {
        return setCookieHeaders
      },
    },
    _bodyBytes: bodyBytes,

    // Body methods overridden by fetch module with VM-native versions
    async text(): Promise<string> {
      return new TextDecoder().decode(new Uint8Array(bodyBytes))
    },

    async json(): Promise<any> {
      const text = await this.text()
      return JSON.parse(text)
    },

    async arrayBuffer(): Promise<ArrayBuffer> {
      return new Uint8Array(bodyBytes).buffer
    },

    async blob(): Promise<Blob> {
      return new Blob([new Uint8Array(bodyBytes)])
    },

    // Required Response properties
    type: "basic" as ResponseType,
    url: "",
    redirected: false,
    bodyUsed: false,
  }

  // Cast to Response for type compatibility
  return serializableResponse as unknown as Response
}
