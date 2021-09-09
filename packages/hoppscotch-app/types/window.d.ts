export {}

declare global {
  interface Window {
    __POSTWOMAN_EXTENSION_HOOK__: PWExtensionHook
  }
}
