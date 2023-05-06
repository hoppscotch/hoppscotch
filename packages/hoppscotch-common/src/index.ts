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
