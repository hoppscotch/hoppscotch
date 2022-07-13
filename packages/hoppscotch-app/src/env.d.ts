/// <reference types="vite/client" />
/// <reference types="vite-plugin-pages/client" />

import { TippyComponent } from 'vue-tippy'
import { PWExtensionHook, HoppExtensionStatusHook } from "./types/pw-ext-hook"

// Environment Variables Intellisense
interface ImportMetaEnv {
  readonly VITE_GA_ID: string

  readonly VITE_GTM_ID: string

  readonly VITE_API_KEY: string
  readonly VITE_AUTH_DOMAIN: string
  readonly VITE_DATABASE_URL: string
  readonly VITE_PROJECT_ID: string
  readonly VITE_STORAGE_BUCKET: string
  readonly VITE_MESSAGING_SENDER_ID: string
  readonly VITE_APP_ID: string
  readonly VITE_MEASUREMENT_ID: string

  readonly VITE_BASE_URL: string

  readonly VITE_BACKEND_GQL_URL: string
  readonly VITE_BACKEND_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Hoppscotch Browser Extension
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

// Tippy
declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    tippy: TippyComponent
  }
}
