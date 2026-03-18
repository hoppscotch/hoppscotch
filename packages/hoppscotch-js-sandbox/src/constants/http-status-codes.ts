/**
 * HTTP Status Code Reason Phrases
 *
 * Standard HTTP status codes and their corresponding reason phrases
 * as defined in RFC 7231 and related specifications.
 *
 * @see https://tools.ietf.org/html/rfc7231#section-6
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
export const HTTP_STATUS_REASONS: Readonly<Record<number, string>> = {
  // 1xx Informational
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",

  // 2xx Success
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",

  // 3xx Redirection
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",

  // 4xx Client Error
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",

  // 5xx Server Error
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
} as const

/**
 * Get the reason phrase for an HTTP status code
 * @param statusCode - The HTTP status code
 * @returns The reason phrase, or "Unknown" if not found
 */
export const getStatusReason = (statusCode: number): string => {
  return HTTP_STATUS_REASONS[statusCode] || "Unknown"
}

/**
 * Check if a status code is informational (1xx)
 */
export const isInformational = (statusCode: number): boolean => {
  return statusCode >= 100 && statusCode < 200
}

/**
 * Check if a status code is successful (2xx)
 */
export const isSuccess = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 300
}

/**
 * Check if a status code is a redirection (3xx)
 */
export const isRedirection = (statusCode: number): boolean => {
  return statusCode >= 300 && statusCode < 400
}

/**
 * Check if a status code is a client error (4xx)
 */
export const isClientError = (statusCode: number): boolean => {
  return statusCode >= 400 && statusCode < 500
}

/**
 * Check if a status code is a server error (5xx)
 */
export const isServerError = (statusCode: number): boolean => {
  return statusCode >= 500 && statusCode < 600
}
