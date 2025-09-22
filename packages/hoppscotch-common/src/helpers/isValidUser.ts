import { platform } from "~/platform"

export type ValidUserResponse = {
  valid: boolean
  error: string
}

export const SESSION_EXPIRED = "Session expired. Please log in again."

/**
 * Validates user authentication and token validity by making an API call.
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

  if (user) {
    try {
      // If the platform provides a method to verify auth tokens, use it else assume tokens are valid (for central instance where firebase handles it)
      const hasValidTokens = platform.auth.verifyAuthTokens
        ? await platform.auth.verifyAuthTokens()
        : true

      return {
        valid: hasValidTokens,
        error: hasValidTokens ? "" : SESSION_EXPIRED,
      }
    } catch (error) {
      return { valid: false, error: SESSION_EXPIRED }
    }
  }

  // allow user to perform actions without being logged in
  return { valid: true, error: "" }
}
