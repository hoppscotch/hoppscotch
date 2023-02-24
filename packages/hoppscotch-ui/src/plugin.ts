import type { Plugin, App } from "vue"

import "./assets/scss/styles.scss"
import "virtual:windi.css"

/**
@constant HOPP_UI_OPTIONS
A constant representing the key for storing HoppUI plugin options in the global context.
*/

export const HOPP_UI_OPTIONS = "HOPP_UI_OPTIONS"

/**
@typedef {Object} HoppUIPluginOptions
@property [t] - A function for handling translations for the plugin.
@property [onModalOpen] - A callback function that is called when a modal is opened.
@property [onModalClose] - A callback function that is called when a modal is closed.
*/

export type HoppUIPluginOptions = {
  t?: (key: string) => string
  onModalOpen?: () => void
  onModalClose?: () => void
}

export const plugin: Plugin = {
  install(app: App, options: HoppUIPluginOptions = {}) {
    app.provide(HOPP_UI_OPTIONS, options)
  },
}
