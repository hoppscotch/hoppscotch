import { HOPP_MODULES } from "@modules/."
import { createApp } from "vue"
import { initializeApp } from "./helpers/app"
import { initBackendGQLClient } from "./helpers/backend/GQLClient"
import { performMigrations } from "./helpers/migrations"
import { PlatformDef, setPlatformDef } from "./platform"

import "@fontsource-variable/inter"
import "@fontsource-variable/material-symbols-rounded"
import "@fontsource-variable/roboto-mono"
import "nprogress/nprogress.css"
import "../assets/scss/styles.scss"
import "../assets/scss/tailwind.scss"
import "../assets/themes/themes.scss"

import App from "./App.vue"

import { getService } from "./modules/dioc"
import { PersistenceService } from "./services/persistence.service"

const persistenceServiceInstance = getService(PersistenceService)

export function createHoppApp(el: string | Element, platformDef: PlatformDef) {
  setPlatformDef(platformDef)

  const app = createApp(App)

  // Some basic work that needs to be done before module inits even
  initBackendGQLClient()
  initializeApp()
  persistenceServiceInstance.setupLocalPersistence()
  performMigrations()

  HOPP_MODULES.forEach((mod) => mod.onVueAppInit?.(app))
  platformDef.addedHoppModules?.forEach((mod) => mod.onVueAppInit?.(app))

  app.mount(el)

  console.info(
    "%cWE ♥️ OPEN SOURCE",
    "margin:8px 0;font-family:sans-serif;font-weight:600;font-size:60px;color:violet;"
  )
  console.info(
    "%cContribute: https://github.com/hoppscotch/hoppscotch",
    "margin:8px 0;font-family:sans-serif;font-weight:500;font-size:24px;color:violet;"
  )
}
