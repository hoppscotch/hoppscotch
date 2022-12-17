import { createApp } from "vue"
import { setupLocalPersistence } from "./newstore/localpersistence"
import { performMigrations } from "./helpers/migrations"
import { initializeFirebase } from "./helpers/fb"
import { initUserInfo } from "./helpers/teams/BackendUserInfo"
import { HOPP_MODULES } from "@modules/."

import "virtual:windi.css"
import "../assets/scss/themes.scss"
import "../assets/scss/styles.scss"
import "nprogress/nprogress.css"

import App from "./App.vue"

export function createHoppApp(el: string | Element) {
  const app = createApp(App)

  // Some basic work that needs to be done before module inits even
  initializeFirebase()
  setupLocalPersistence()
  performMigrations()
  initUserInfo()

  HOPP_MODULES.forEach((mod) => mod.onVueAppInit?.(app))

  app.mount(el)

  console.info(
    "%cWE ♥️ OPEN SOURCE",
    "margin:8px 0;font-family:Inter;font-weight:600;font-size:60px;color:violet;"
  )
  console.info(
    "%cContribute: https://github.com/hoppscotch/hoppscotch",
    "margin:8px 0;font-family:Inter;font-weight:500;font-size:24px;color:violet;"
  )
}
