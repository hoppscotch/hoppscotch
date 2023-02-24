/// <reference types="vite/client" />
/// <reference types="vite-plugin-pages/client" />
/// <reference types="unplugin-icons/types/vue" />

// // Hoppscotch Browser Extension
interface PWExtensionHook {
  getVersion: () => { major: number; minor: number }
  sendRequest: (
    req: AxiosRequestConfig & { wantsBinary: boolean }
  ) => Promise<NetworkResponse>
  cancelRequest: () => void
}

type HoppExtensionStatusHook = {
  status: ExtensionStatus
  _subscribers: {
    status?: ((...args: any[]) => any)[] | undefined
  }
  subscribe(prop: "status", func: (...args: any[]) => any): void
}
export declare global {
  interface Window {
    __POSTWOMAN_EXTENSION_HOOK__: PWExtensionHook | undefined
    __HOPP_EXTENSION_STATUS_PROXY__: HoppExtensionStatusHook | undefined
  }
}
