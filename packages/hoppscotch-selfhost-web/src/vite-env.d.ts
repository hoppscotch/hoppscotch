/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_INTERCEPTOR?: string
}

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<{}, {}, any>
  export default component
}