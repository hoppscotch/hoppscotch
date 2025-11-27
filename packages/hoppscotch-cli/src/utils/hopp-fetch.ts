import axios, { Method } from "axios";
import type { HoppFetchHook } from "@hoppscotch/js-sandbox";
import { wrapper as axiosCookieJarSupport } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

/**
 * Creates a hopp.fetch() hook implementation for CLI.
 * Uses axios directly for network requests since CLI has no interceptor concept.
 *
 * @returns HoppFetchHook implementation
 */
export const createHoppFetchHook = (): HoppFetchHook => {
  // Cookie jar maintains cookies across redirects (matches Postman behavior)
  const jar = new CookieJar();
  const axiosWithCookies = axiosCookieJarSupport(axios.create());

  return async (input, init) => {
    // Extract URL from different input types
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Extract method from Request object if available (init takes precedence)
    const requestMethod = input instanceof Request ? input.method : undefined;
    const method = (init?.method || requestMethod || "GET") as Method;

    // Merge headers from Request object and init (init takes precedence)
    const headers: Record<string, string> = {};

    // First, add headers from Request object if input is a Request
    if (input instanceof Request) {
      input.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }

    // Then overlay with init.headers (takes precedence)
    if (init?.headers) {
      Object.assign(headers, headersToObject(init.headers));
    }

    // Extract body from Request object if available (init takes precedence)
    // Note: Request.body is a ReadableStream which axios cannot handle,
    // so we need to read it first
    let body: BodyInit | null | undefined;
    if (init?.body !== undefined) {
      body = init.body;
    } else if (input instanceof Request && input.body !== null) {
      // Read the ReadableStream into an ArrayBuffer that axios can send
      const clonedRequest = input.clone();
      body = await clonedRequest.arrayBuffer();
    } else {
      body = undefined;
    }

    // Convert Fetch API options to axios config
    // Note: Using 'any' for config because axios-cookiejar-support extends AxiosRequestConfig
    // with 'jar' property that isn't in standard types
    const config: any = {
      url: urlStr,
      method,
      headers: Object.keys(headers).length > 0 ? headers : {},
      data: body,
      responseType: "arraybuffer", // Prevents binary corruption from string encoding
      validateStatus: () => true, // Don't throw on any status code
      jar,
      withCredentials: true, // Required for cookie jar
    };

    // Handle AbortController signal if provided
    if (init?.signal) {
      config.signal = init.signal;
    }

    try {
      const axiosResponse = await axiosWithCookies(config);

      // Convert axios response to serializable response (with _bodyBytes)
      // Native Response objects can't cross VM boundaries
      return createSerializableResponse(
        axiosResponse.status,
        axiosResponse.statusText,
        axiosResponse.headers,
        axiosResponse.data
      );
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error) && error.response) {
        // Return error response as serializable Response object
        return createSerializableResponse(
          error.response.status,
          error.response.statusText,
          error.response.headers,
          error.response.data
        );
      }

      // Network error or other failure
      throw new Error(
        `Fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };
};

/**
 * Creates a serializable Response-like object with _bodyBytes.
 *
 * Native Response objects can't cross the QuickJS boundary due to internal state.
 * Returns a plain object with all data loaded upfront.
 */
function createSerializableResponse(
  status: number,
  statusText: string,
  headers: any,
  body: any
): Response {
  const ok = status >= 200 && status < 300;

  // Convert headers to plain object (serializable)
  // Set-Cookie headers kept separate - commas can appear in cookie values
  const headersObj: Record<string, string> = {};
  const setCookieHeaders: string[] = [];

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key.toLowerCase() === "set-cookie") {
        // Preserve Set-Cookie headers as array for getSetCookie() compatibility
        if (Array.isArray(value)) {
          setCookieHeaders.push(...value);
        } else {
          setCookieHeaders.push(String(value));
        }
        // Also store first Set-Cookie in headersObj for backward compatibility
        headersObj[key] = Array.isArray(value) ? value[0] : String(value);
      } else {
        // Other headers can be safely concatenated with commas
        headersObj[key] = Array.isArray(value)
          ? value.join(", ")
          : String(value);
      }
    }
  });

  // Store body as plain number array for VM serialization
  let bodyBytes: number[] = [];

  if (body) {
    if (Array.isArray(body)) {
      // Already an array
      bodyBytes = body;
    } else if (body instanceof ArrayBuffer) {
      // ArrayBuffer (from axios) - convert to plain array
      bodyBytes = Array.from(new Uint8Array(body));
    } else if (body instanceof Uint8Array) {
      // Uint8Array - convert to plain array
      bodyBytes = Array.from(body);
    } else if (ArrayBuffer.isView(body)) {
      // Other typed array
      bodyBytes = Array.from(new Uint8Array(body.buffer));
    } else if (typeof body === "string") {
      // String body
      bodyBytes = Array.from(new TextEncoder().encode(body));
    } else if (typeof body === "object") {
      // Check if it's a Buffer-like object with 'type' and 'data' properties
      if ("type" in body && "data" in body && Array.isArray(body.data)) {
        bodyBytes = body.data;
      } else {
        // Plain object with numeric keys (like {0: 72, 1: 101, ...})
        const keys = Object.keys(body)
          .map(Number)
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);
        bodyBytes = keys.map((k) => body[k]);
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
        const lowerName = name.toLowerCase();
        for (const [key, value] of Object.entries(headersObj)) {
          if (key.toLowerCase() === lowerName) {
            return value;
          }
        }
        return null;
      },
      has(name: string): boolean {
        return this.get(name) !== null;
      },
      entries(): IterableIterator<[string, string]> {
        return Object.entries(headersObj)[Symbol.iterator]();
      },
      keys(): IterableIterator<string> {
        return Object.keys(headersObj)[Symbol.iterator]();
      },
      values(): IterableIterator<string> {
        return Object.values(headersObj)[Symbol.iterator]();
      },
      forEach(callback: (value: string, key: string) => void) {
        Object.entries(headersObj).forEach(([key, value]) =>
          callback(value, key)
        );
      },
      // Returns all Set-Cookie headers as array
      getSetCookie(): string[] {
        return setCookieHeaders;
      },
    },
    _bodyBytes: bodyBytes,

    // Body methods - will be overridden by custom fetch module with VM-native versions
    async text(): Promise<string> {
      return new TextDecoder().decode(new Uint8Array(bodyBytes));
    },

    async json(): Promise<any> {
      const text = await this.text();
      return JSON.parse(text);
    },

    async arrayBuffer(): Promise<ArrayBuffer> {
      return new Uint8Array(bodyBytes).buffer;
    },

    async blob(): Promise<Blob> {
      return new Blob([new Uint8Array(bodyBytes)]);
    },

    // Required Response properties
    type: "basic" as ResponseType,
    url: "",
    redirected: false,
    bodyUsed: false,
  };

  // Cast to Response for type compatibility
  return serializableResponse as unknown as Response;
}

/**
 * Converts Fetch API headers to plain object for axios
 */
function headersToObject(headers: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      result[key] = value;
    });
  } else {
    Object.entries(headers).forEach(([key, value]) => {
      result[key] = value;
    });
  }

  return result;
}
