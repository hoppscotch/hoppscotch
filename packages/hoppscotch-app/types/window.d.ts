import { PWExtensionHook } from "./pw-ext-hook"
import { ExtensionStatus } from "~/newstore/HoppExtension"

declare global {
  interface Window {
    __POSTWOMAN_EXTENSION_HOOK__: PWExtensionHook | undefined
    __HOPP_EXTENSION_STATUS_PROXY__:
      | {
          status: ExtensionStatus
        }
      | undefined
  }
}
