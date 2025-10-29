/**
 * Helper functions for interceptor configuration
 */

// Valid interceptor IDs
const VALID_INTERCEPTORS = [
  "browser",
  "proxy",
  "agent",
  "extension",
  "native",
] as const
export type ValidInterceptorId = (typeof VALID_INTERCEPTORS)[number]

/**
 * Get the default interceptor from environment variable or fallback
 * @param fallback The fallback interceptor ID if no env variable is set
 * @returns The validated interceptor ID
 */
export function getDefaultInterceptor(fallback: string): string {
  const envInterceptor = import.meta.env.VITE_DEFAULT_INTERCEPTOR

  if (!envInterceptor) {
    return fallback
  }

  // Validate the environment variable value
  if (!VALID_INTERCEPTORS.includes(envInterceptor as ValidInterceptorId)) {
    console.error(
      `[Config Error] Invalid DEFAULT_INTERCEPTOR value: "${envInterceptor}". ` +
        `Valid values are: ${VALID_INTERCEPTORS.join(", ")}. ` +
        `Using fallback: "${fallback}"`
    )
    return fallback
  }

  return envInterceptor
}

/**
 * Check if the interceptor ID is valid
 * @param interceptorId The interceptor ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidInterceptor(
  interceptorId: string
): interceptorId is ValidInterceptorId {
  return VALID_INTERCEPTORS.includes(interceptorId as ValidInterceptorId)
}
