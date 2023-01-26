import { Plugin } from "vue"
import * as components from "./components/"

const HoppUI = { ...components }

// Hopp UI will be available globally when in a browser environment
if (typeof window !== "undefined") {
  ;(window as any)["HoppUI"] = HoppUI
}

import "./assets/scss/styles.scss"
import "virtual:windi.css"

export type HoppUIPluginOptions = {
  t?: (key: string) => string
  onModalOpen?: () => void
  onModalClose?: () => void
}

const plugin: Plugin = {
  install(app, options: HoppUIPluginOptions = {}) {
    app.provide("HOPP_UI_OPTIONS", options)
  },
}

export default plugin

export * from "./components/"
