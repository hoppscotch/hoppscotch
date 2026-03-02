/**
 * Error message helpers for network and CORS errors
 * Provides user-friendly error messages with explanations and workarounds
 */

/**
 * Detects if an error is a CORS-related error
 */
export const isCorsError = (error: any): boolean => {
  return (
    error?.kind === "network" ||
    error?.message?.includes("CORS") ||
    error?.message?.includes("Access to fetch") ||
    error?.message?.includes("Cross-Origin") ||
    error?.code === "ERR_NETWORK" ||
    error?.name === "TypeError"
  )
}

/**
 * Returns a user-friendly error message for CORS errors
 * Includes explanation and workaround suggestions
 */
export const getCorsErrorMessage = (): {
  title: string
  message: string
  explanation: string
  workaround: string
} => {
  return {
    title: "CORS Error Detected",
    message:
      "The request failed due to Cross-Origin Resource Sharing (CORS) restrictions.",
    explanation:
      "CORS is a browser security feature that prevents web pages from making requests to different domains unless the server explicitly allows it. This is not a Hoppscotch issue, but a browser security policy.",
    workaround:
      "To work around this: 1) Enable the Hoppscotch Proxy in Settings, 2) Use the Hoppscotch Desktop app (no CORS restrictions), 3) Install a CORS bypass extension for development, or 4) Configure your API server to allow requests from Hoppscotch's domain.",
  }
}

/**
 * Returns a user-friendly error message for general network errors
 */
export const getNetworkErrorMessage = (error?: any): {
  title: string
  message: string
  suggestions: string[]
} => {
  return {
    title: "Network Error",
    message:
      error?.message || "The request failed due to a network error.",
    suggestions: [
      "Check your internet connection",
      "Verify the URL is correct and accessible",
      "Check if the server is running and responding",
      "Try using the Hoppscotch Proxy in Settings",
      "Check browser console (F12) for more details",
    ],
  }
}
