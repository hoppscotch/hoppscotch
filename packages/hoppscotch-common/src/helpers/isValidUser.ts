import { platform } from "~/platform"

export type ValidUserResponse = {
  valid: boolean
  error: string
}

export const SESSION_EXPIRED = "Session expired. Please log in again."

/**
 * Attempts to refresh the authentication token
 * @returns Promise resolving to a ValidUserResponse with the result
 */
const attemptTokenRefresh = async (): Promise<ValidUserResponse> => {
  if (!platform.auth.refreshAuthToken)
    return { valid: false, error: SESSION_EXPIRED }

  try {
    const refreshSuccessful = await platform.auth.refreshAuthToken()
    return {
      valid: refreshSuccessful,
      error: refreshSuccessful ? "" : SESSION_EXPIRED,
    }
  } catch {
    return { valid: false, error: SESSION_EXPIRED }
  }
}

/**
 * Validates user authentication and token validity by making an API call.
 * Refreshes tokens if they are expired.
 *
 * This function is kept separate from `handleTokenValidation()` to enable different use cases:
 * - Silent validation for conditional UI states (e.g., disabling components on token expiration)
 * - Background checks without triggering user notifications
 * - Custom error handling based on validation results
 *
 * Use `handleTokenValidation()` when you need automatic toast error notifications.
 * Use `isValidUser()` for silent validation or custom error handling scenarios.
 *
 * @returns {Promise<ValidUserResponse>} Authentication status with user existence and token validity
 */
export const isValidUser = async (): Promise<ValidUserResponse> => {
  const user = platform.auth.getCurrentUser()

  // If no user is logged in, consider it valid (allows public actions)
  if (!user) return { valid: true, error: "" }

  try {
    // If the platform provides a method to verify auth tokens, use it
    if (platform.auth.verifyAuthTokens) {
      const hasValidTokens = await platform.auth.verifyAuthTokens()

      if (hasValidTokens) {
        return { valid: true, error: "" }
      }

      // Try token refresh if verification failed
      return attemptTokenRefresh()
    }

    // For platforms without token verification capability
    return { valid: true, error: "" }
  } catch (error) {
    // Handle errors from token verification
    return attemptTokenRefresh()
  }
}
