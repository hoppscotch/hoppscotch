import { createApp } from "vue"
import { PlatformDef, setPlatformDef } from "./platform"
import { setupLocalPersistence } from "./newstore/localpersistence"
import { performMigrations } from "./helpers/migrations"
import { initializeApp } from "./helpers/app"
import { initBackendGQLClient } from "./helpers/backend/GQLClient"
import { HOPP_MODULES } from "@modules/."

import "virtual:windi.css"
import "../assets/scss/themes.scss"
import "../assets/scss/styles.scss"
import "nprogress/nprogress.css"
import "@fontsource-variable/inter"
import "@fontsource-variable/material-symbols-rounded"
import "@fontsource-variable/roboto-mono"

import App from "./App.vue"

export function createHoppApp(el: string | Element, platformDef: PlatformDef) {
  setPlatformDef(platformDef)

  const app = createApp(App)

  // Some basic work that needs to be done before module inits even
  initBackendGQLClient()
  initializeApp()
  setupLocalPersistence()
  performMigrations()

  HOPP_MODULES.forEach((mod) => mod.onVueAppInit?.(app))
  platformDef.addedHoppModules?.forEach((mod) => mod.onVueAppInit?.(app))

  app.mount(el)
}
