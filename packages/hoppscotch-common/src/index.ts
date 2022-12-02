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
    "%cWe ❤︎ open source!",
    "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
  )
  console.info(
    "%cContribute: https://github.com/hoppscotch/hoppscotch",
    "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
  )
}
