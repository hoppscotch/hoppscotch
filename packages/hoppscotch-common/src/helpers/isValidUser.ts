import { platform } from "~/platform"
import { verifyAuthTokens } from "~/helpers/backend/helpers"

export type ValidUserResponse = {
  valid: boolean
  error: string
}

export const SESSION_EXPIRED = "Session expired. Please log in again."

/**
 * Validates user authentication and token validity by making an API call
 * @returns {Promise<ValidUserResponse>} Authentication status with user existence and token validity
 */
export const isValidUser = async (): Promise<ValidUserResponse> => {
  const user = platform.auth.getCurrentUser()

  if (user) {
    try {
      const hasValidTokens = await verifyAuthTokens()
      return {
        valid: hasValidTokens,
        error: hasValidTokens ? "" : SESSION_EXPIRED,
      }
    } catch (error) {
      console.debug("Token validation failed:", error)
      return { valid: false, error: SESSION_EXPIRED }
    }
  }

  // allow user to perform actions without being logged in
  return { valid: true, error: "" }
}
