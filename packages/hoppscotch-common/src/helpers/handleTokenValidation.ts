import { useToast } from "@composables/toast"
import { isValidUser } from "~/helpers/isValidUser"

/**
 * High-level authentication validation handler with automatic error notifications.
 *
 * This wrapper around `isValidUser()` provides automatic toast error messages for invalid tokens.
 * Use this when you want standard error handling with user notifications.
 *
 * For silent validation or custom error handling, use `isValidUser()` directly.
 *
 * @returns {Promise<boolean>} True if user is valid, false otherwise (with toast error shown)
 */
export const handleTokenValidation = async (): Promise<boolean> => {
  const toast = useToast()
  const { valid, error } = await isValidUser()
  if (!valid) toast.error(error)
  return valid
}
