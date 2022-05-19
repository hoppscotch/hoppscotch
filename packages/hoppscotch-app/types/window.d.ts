import { HoppExtensionStatusHook, PWExtensionHook } from "./pw-ext-hook"

declare global {
  interface Window {
    __POSTWOMAN_EXTENSION_HOOK__: PWExtensionHook | undefined
    __HOPP_EXTENSION_STATUS_PROXY__: HoppExtensionStatusHook | undefined
  }
}
