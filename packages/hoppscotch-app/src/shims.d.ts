/// <reference types="vite/client" />
/// <reference types="vite-plugin-pages/client" />
/// <reference types="unplugin-icons/types/vue" />

// // Hoppscotch Browser Extension
interface PWExtensionHook {
  getVersion: () => { major: number; minor: number }
  sendRequest: (
    req: AxiosRequestConfig & { wantsBinary: boolean }
  ) => Promise<NetworkResponse>
  cancelRunningRequest: () => void
}

type HoppExtensionStatusHook = {
  status: ExtensionStatus
  _subscribers: {
    status?: ((...args: any[]) => any)[] | undefined
  }
  subscribe(prop: "status", func: (...args: any[]) => any): void
}
declare global {
  interface Window {
    __POSTWOMAN_EXTENSION_HOOK__: PWExtensionHook | undefined
    __HOPP_EXTENSION_STATUS_PROXY__: HoppExtensionStatusHook | undefined
  }
}

// Vue builtins
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
