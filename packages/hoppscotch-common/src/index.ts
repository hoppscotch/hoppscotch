import { HOPP_MODULES } from "@modules/."
import { createApp } from "vue"
import { initializeApp } from "./helpers/app"
import { initBackendGQLClient } from "./helpers/backend/GQLClient"
import { performMigrations } from "./helpers/migrations"
import { getService } from "./modules/dioc"
import { PlatformDef, setPlatformDef } from "./platform"
import { PersonalWorkspaceProviderService } from "./services/new-workspace/providers/personal.workspace"
import { TestWorkspaceProviderService } from "./services/new-workspace/providers/test.workspace"

import { PersistenceService } from "./services/persistence"

import "@fontsource-variable/inter"
import "@fontsource-variable/material-symbols-rounded"
import "@fontsource-variable/roboto-mono"
import "nprogress/nprogress.css"
import "../assets/scss/styles.scss"
import "../assets/scss/tailwind.scss"
import "../assets/themes/themes.scss"

import App from "./App.vue"

export function createHoppApp(el: string | Element, platformDef: PlatformDef) {
  setPlatformDef(platformDef)

  const app = createApp(App)

  HOPP_MODULES.forEach((mod) => mod.onVueAppInit?.(app))
  platformDef.addedHoppModules?.forEach((mod) => mod.onVueAppInit?.(app))

  // Some basic work that needs to be done before module inits even
  initBackendGQLClient()
  initializeApp()
  // TODO: Explore possibilities of moving this invocation to the service constructor
  // `toast` was coming up as `null` in the previous attempts
  getService(PersistenceService).setupLocalPersistence()
  performMigrations()

  // TODO: Remove this
  getService(TestWorkspaceProviderService)
  getService(PersonalWorkspaceProviderService)

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
