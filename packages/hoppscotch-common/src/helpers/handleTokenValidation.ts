import { useToast } from "@composables/toast"
import { isValidUser } from "~/helpers/isValidUser"

export const handleTokenValidation = async (): Promise<boolean> => {
  const toast = useToast()
  const { valid, error } = await isValidUser()
  if (!valid) toast.error(error)
  return valid
}
